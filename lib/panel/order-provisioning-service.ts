import "server-only";

import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { OdProvisioningError, provisionOdOrder } from "@/lib/od/provisioning";
import { OdkProvisioningError, provisionOdkOrder } from "@/lib/odk/provisioning";
import { provisioningErrorGuidance } from "@/lib/lifecycle/states";

/**
 * ERİŞİM AÇMAYI YENİDEN DENE servisi — web Server Action'ı ve mobil yönetim
 * ucu (`POST /api/panel/admin/orders/[id]/provisioning-retry`) aynı akışı
 * çağırır. İkinci bir provisioning yolu YOKTUR; `provisionOdOrder` /
 * `provisionOdkOrder` idempotenttir. Ödemeye DOKUNMAZ.
 */
export async function retryOrderProvisioningService(input: { actorUserId: string; orderId: string }): Promise<{ found: false } | { found: true; outcome: string; userId: string | null }> {
  const orderId = input.orderId;
  const [odOrder, odkOrder] = await Promise.all([
    prisma.odOrder.findUnique({ where: { id: orderId }, select: { id: true, status: true, userId: true } }),
    prisma.odkOrder.findUnique({ where: { id: orderId }, select: { id: true, status: true, studentUserId: true } }),
  ]);
  if (!odOrder && !odkOrder) return { found: false };

  let outcome: string;
  let entityType: "OdOrder" | "OdkOrder" = "OdOrder";
  try {
    if (odOrder) {
      const result = await provisionOdOrder(orderId);
      outcome = result.alreadyProvisioned
        ? "already_provisioned"
        : result.status === "SUCCEEDED"
          ? "succeeded"
          : `manual_review:${result.reason ?? "sebep belirtilmedi"}`;
    } else {
      entityType = "OdkOrder";
      const result = await provisionOdkOrder(orderId);
      outcome = result.alreadyProvisioned
        ? "already_provisioned"
        : result.awaitingStudentAccount
          ? "manual_review:öğrenci hesabı yönetim tarafından açılmayı bekliyor"
          : "succeeded";
    }
  } catch (error) {
    const code =
      error instanceof OdProvisioningError || error instanceof OdkProvisioningError
        ? error.code
        : error instanceof Error
          ? error.message
          : "bilinmeyen";
    outcome = `error:${code}:${provisioningErrorGuidance(code)}`;
  }

  await logAudit({
    actorUserId: input.actorUserId,
    entityType,
    entityId: orderId,
    action: "order.provisioning.retry",
    summary: `Admin erişim açmayı yeniden denedi · sonuç: ${outcome}`,
  });

  return { found: true, outcome, userId: odOrder?.userId ?? odkOrder?.studentUserId ?? null };
}

/**
 * Sonuç dizgisinin kullanıcı metni (mobil yanıt). Biçim yukarıdaki servisle
 * sabit: `succeeded` | `already_provisioned` | `manual_review:<neden>` |
 * `error:<kod>:<yönlendirme>`.
 */
export function describeProvisioningOutcome(outcome: string): { succeeded: boolean; message: string } {
  if (outcome === "succeeded") return { succeeded: true, message: "Erişim açıldı." };
  if (outcome === "already_provisioned") return { succeeded: true, message: "Erişim zaten açıktı." };
  if (outcome.startsWith("manual_review:")) return { succeeded: false, message: `Elle inceleme gerekiyor: ${outcome.slice("manual_review:".length)}` };
  const guidance = outcome.startsWith("error:") ? outcome.split(":").slice(2).join(":").trim() : "";
  return { succeeded: false, message: guidance ? `Erişim açılamadı: ${guidance}` : "Erişim açılamadı." };
}
