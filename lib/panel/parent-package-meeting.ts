import "server-only";

import { listParentVisibleChildren } from "@/lib/panel/parent-product-policy";
import { CommandError, runWithReceipt } from "@/lib/panel/command-receipt";

/**
 * VELİ · PAKET DEĞİŞİKLİĞİ GÖRÜŞME TALEBİ (V10) — web Server Action'ı ve
 * mobil `/api/panel/parent/account/package-meeting` AYNI kuralı kullanır.
 *
 * Yeni bir model UYDURULMADI: talep mevcut `LeadSubmission` kuyruğuna düşer ve
 * admin bunu `/panel/yonetim/isler` ekranında görüp ilerletir.
 *
 * GÜVENLİK: öğrenci yalnız velinin `account` amaçlı bağlantıları arasında
 * aranır; bağlı olmayan kimlik 404. Kayıt + audit makbuzu tek transaction;
 * aynı işlem anahtarı ikinci bir talep açmaz.
 */
export async function requestParentPackageMeeting(actor: { userId: string; email: string }, studentId: string, idempotencyKey?: string) {
  const children = await listParentVisibleChildren(actor.userId, "account");
  const selected = children.find((child) => child.id === studentId);
  if (!selected) throw new CommandError(404, "NOT_FOUND", "Öğrenci bulunamadı.");
  return runWithReceipt<{ ok: true; message: string }>({
    actorUserId: actor.userId,
    namespace: "parent-package-meeting",
    idempotencyKey,
    digestOf: { studentId },
    transactional: async (tx) => {
      const [parent, profile] = await Promise.all([
        tx.user.findUnique({ where: { id: actor.userId }, select: { fullName: true, phone: true, email: true } }),
        tx.studentProfile.findUnique({ where: { id: selected.id }, select: { classLevel: true, targetGoal: true } }),
      ]);
      await tx.leadSubmission.create({
        data: {
          fullName: parent?.fullName || parent?.email || actor.email,
          // Panel kaydında telefon boş olabilir; kuyrukta görünsün diye
          // e-postaya düşülür, uydurma numara yazılmaz.
          phone: parent?.phone || actor.email,
          classLevel: profile?.classLevel || "belirtilmedi",
          examType: profile?.targetGoal || "belirtilmedi",
          targetGoal: `Paket değişikliği görüşmesi · ${selected.name}`,
          currentNet: "belirtilmedi",
          kvkkConsent: true,
          source: "panel-veli-paket-degisikligi",
          submittedAt: new Date(),
        },
      });
      return {
        entityType: "LeadSubmission",
        entityId: selected.id,
        action: "parent.package.meeting.requested",
        summary: `Veli ${selected.name} için paket görüşmesi talep etti`,
        result: { ok: true, message: "Görüşme talebiniz alındı. Ekibimiz sizinle iletişime geçecek." },
      };
    },
  });
}
