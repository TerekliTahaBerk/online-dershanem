"use server";

import { redirect } from "next/navigation";
import { OrderRetryConflict } from "@/lib/panel/order-retry-core";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRecentAdminStepUp } from "@/lib/auth/guards";
import { enforceMutation } from "@/lib/security/mutation-guard";
import { retryOrderProvisioningService } from "@/lib/panel/order-provisioning-service";

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
  const session = await requireRecentAdminStepUp();
  await enforceMutation({
    action: "order.provisioning.retry",
    userId: session.userId,
    requireSameOrigin: true,
    rateLimit: { max: 20, windowMs: 60_000 },
  });

  const { orderId, idempotencyKey, expectedRevision } = z
    .object({ orderId: z.string().min(1), idempotencyKey: z.string().uuid(), expectedRevision: z.string().regex(/^[a-f0-9]{64}$/) })
    .parse(Object.fromEntries(formData));

  let result;
  try { result = await retryOrderProvisioningService({ actorUserId: session.userId, orderId, idempotencyKey, expectedRevision }); }
  catch (error) { if (error instanceof OrderRetryConflict) redirect(`/panel/yonetim/siparisler/${encodeURIComponent(orderId)}?hata=conflict`); throw error; }
  if (!result.found) return;

  revalidatePath(`/panel/yonetim/siparisler/${orderId}`);
  revalidatePath("/panel/yonetim/ogrenciler");
  revalidatePath("/panel/yonetim");
  if (result.userId) revalidatePath(`/panel/yonetim/kullanicilar/${result.userId}`);
}
