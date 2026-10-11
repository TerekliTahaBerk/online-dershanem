"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
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

  const result = await retryOrderProvisioningService({ actorUserId: session.userId, orderId });
  if (!result.found) return;

  revalidatePath(`/panel/yonetim/siparisler/${orderId}`);
  revalidatePath("/panel/yonetim/ogrenciler");
  revalidatePath("/panel/yonetim");
  if (result.userId) revalidatePath(`/panel/yonetim/kullanicilar/${result.userId}`);
}
