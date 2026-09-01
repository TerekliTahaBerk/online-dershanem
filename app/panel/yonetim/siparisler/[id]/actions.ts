"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { enforceMutation } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { OdProvisioningError, provisionOdOrder } from "@/lib/od/provisioning";
import { OdkProvisioningError, provisionOdkOrder } from "@/lib/odk/provisioning";
import { provisioningErrorGuidance } from "@/lib/lifecycle/states";

/**
 * ADMIN · ERİŞİM AÇMAYI YENİDEN DENE (Panel.dc.html → aOrder).
 *
 * Tasarımdaki düğme mevcut `provisionOdOrder` / `provisionOdkOrder` akışına
 * bağlanır — ikinci bir provisioning yolu YAZILMAZ. Fonksiyonlar idempotent:
 * siparişi `RUNNING`a çekerek atomik sahiplenir; çift tıklama veya eşzamanlı
 * iki admin ikinci kez hesap/üyelik/parent/invite oluşturmaz.
 *
 * ÖDEME İLE ERİŞİM AYRI SÜREÇLERDİR: bu aksiyon ödemeye DOKUNMAZ.
 */
export async function retryOrderProvisioning(formData: FormData) {
  const session = await requireRole("ADMIN");
  await enforceMutation({
    action: "order.provisioning.retry",
    userId: session.userId,
    requireSameOrigin: true,
    rateLimit: { max: 20, windowMs: 60_000 },
  });

  const { orderId } = z
    .object({ orderId: z.string().min(1) })
    .parse(Object.fromEntries(formData));

  const [odOrder, odkOrder] = await Promise.all([
    prisma.odOrder.findUnique({ where: { id: orderId }, select: { id: true, status: true, userId: true } }),
    prisma.odkOrder.findUnique({ where: { id: orderId }, select: { id: true, status: true, studentUserId: true } }),
  ]);
  if (!odOrder && !odkOrder) return;

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
      outcome = result.alreadyProvisioned ? "already_provisioned" : "succeeded";
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
    actorUserId: session.userId,
    entityType,
    entityId: orderId,
    action: "order.provisioning.retry",
    summary: `Admin erişim açmayı yeniden denedi · sonuç: ${outcome}`,
  });

  revalidatePath(`/panel/yonetim/siparisler/${orderId}`);
  revalidatePath("/panel/yonetim/ogrenciler");
  revalidatePath("/panel/yonetim");
  const userId = odOrder?.userId ?? odkOrder?.studentUserId;
  if (userId) revalidatePath(`/panel/yonetim/kullanicilar/${userId}`);
}
