"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { enforceMutation } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { OdProvisioningError, provisionOdOrder } from "@/lib/od/provisioning";

/**
 * ADMIN · ERİŞİM AÇMAYI YENİDEN DENE (Panel.dc.html → aOrder).
 *
 * Tasarımdaki düğme mevcut `provisionOdOrder` akışına bağlanır — ikinci bir
 * provisioning yolu YAZILMAZ. O fonksiyon zaten idempotent: siparişi
 * `RUNNING`a çekerek atomik olarak sahiplenir, çift tıklama ya da eşzamanlı
 * iki admin ikinci kez hesap/üyelik oluşturmaz.
 *
 * ÖDEME İLE ERİŞİM AYRI SÜREÇLERDİR: bu aksiyon ödemeye DOKUNMAZ, yalnız
 * erişim açmayı tekrar dener. Bu yüzden ödenmemiş siparişte çalışmaz.
 */
export async function retryOrderProvisioning(formData: FormData) {
  const session = await requireRole("ADMIN");
  await enforceMutation({
    action: "od.order.provisioning.retry",
    userId: session.userId,
    requireSameOrigin: true,
    rateLimit: { max: 20, windowMs: 60_000 },
  });

  const { orderId } = z
    .object({ orderId: z.string().min(1) })
    .parse(Object.fromEntries(formData));

  const order = await prisma.odOrder.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  });
  if (!order) return;

  let outcome: string;
  try {
    const result = await provisionOdOrder(orderId);
    outcome = result.alreadyProvisioned
      ? "already_provisioned"
      : result.status === "SUCCEEDED"
        ? "succeeded"
        : `manual_review:${result.reason ?? "sebep belirtilmedi"}`;
  } catch (error) {
    // Hata yutulmaz: sebebi denetim kaydına yazılır, ekran da sipariş
    // üzerindeki `provisioningError` alanından güncel durumu gösterir.
    outcome =
      error instanceof OdProvisioningError
        ? `error:${error.code}`
        : `error:${error instanceof Error ? error.message : "bilinmeyen"}`;
  }

  await logAudit({
    actorUserId: session.userId,
    entityType: "OdOrder",
    entityId: orderId,
    action: "od.order.provisioning.retry",
    summary: `Admin erişim açmayı yeniden denedi · sonuç: ${outcome}`,
  });

  revalidatePath(`/panel/yonetim/siparisler/${orderId}`);
}
