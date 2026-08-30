import "server-only";
import type { Prisma } from "@prisma/client";

/**
 * Ders kapanışının iyimser kilidi.
 *
 * Kapanış tek bir koşullu `UPDATE` ile SAHİPLENİLİR: yetki (`teacherId`) ve
 * beklenen sürüm (`closeVersion`) aynı ifadenin içindedir. Önce okuyup sonra
 * yazan bir akış, iki sekme aynı anda kapatırken birinin notlarını sessizce
 * ezerdi; burada ikinci istek satırı bulamaz ve `false` döner.
 *
 * Route'tan AYRI bir modülde durmasının nedeni bu sözleşmenin gerçek Postgres'e
 * karşı test edilebilmesi (`tests/integration/lesson-close.integration.ts`).
 */
export async function claimLessonClose(
  tx: Prisma.TransactionClient,
  input: {
    lessonId: string;
    teacherId: string;
    expectedVersion: number | undefined;
    idempotencyKey: string | undefined;
    requestHash: string | null;
    now?: Date;
  },
): Promise<boolean> {
  // Sürüm bilinmiyorsa `where` koşulu düşer ve kilit tamamen kaybolurdu.
  // Route bunu zaten 400 ile eler; burada da kapalı tarafa düşüyoruz.
  if (input.expectedVersion === undefined) return false;

  const claimed = await tx.lesson.updateMany({
    where: { id: input.lessonId, teacherId: input.teacherId, closeVersion: input.expectedVersion },
    data: {
      closeVersion: { increment: 1 },
      closeIdempotencyKey: input.idempotencyKey,
      closeRequestHash: input.requestHash,
      completedAt: input.now ?? new Date(),
    },
  });
  return claimed.count === 1;
}
