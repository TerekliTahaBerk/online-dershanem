import "server-only";

import type { z } from "zod";
import { integrityReviewSchema } from "@/lib/odk/admin-schemas";
import { CommandError, runWithReceipt } from "@/lib/panel/command-receipt";
import { attemptReviewRevision } from "./ops-console-server";

/**
 * BÜTÜNLÜK İNCELEMESİ (K04) — web `PATCH /api/odk/admin/attempts/[id]` ve mobil
 * operasyon ucu AYNI kuralı kullanır:
 *  - MARK_REVIEWED: incelendi; `REVIEW_REQUIRED` kayıt `SUBMITTED`'a döner.
 *  - REQUIRE_REVIEW: `REVIEW_REQUIRED`, inceleme anı silinir.
 *  - CLEAR_REVIEW: yalnız inceleme anı silinir.
 * Kayıt + audit makbuzu tek Serializable transaction. Mobil `expectedRevision`
 * (durum + inceleme anı) farklıysa 409; aynı işlem anahtarı ilk sonucu döndürür.
 */
export type IntegrityReviewInput = z.output<typeof integrityReviewSchema>;
export type IntegrityReviewResult = { id: string; status: string; integrityReviewedAt: string | null; revision: string };

export async function reviewAttemptIntegrity(actorUserId: string, attemptId: string, input: IntegrityReviewInput, control: { idempotencyKey?: string; expectedRevision?: string } = {}) {
  return runWithReceipt<IntegrityReviewResult>({
    actorUserId,
    namespace: "odk-integrity-review",
    idempotencyKey: control.idempotencyKey,
    digestOf: { attemptId, input, expectedRevision: control.expectedRevision ?? null },
    transactional: async (tx) => {
      const attempt = await tx.odkExamAttempt.findUnique({ where: { id: attemptId }, select: { id: true, examId: true, status: true, integrityLevel: true, integrityReviewedAt: true } });
      if (!attempt) throw new CommandError(404, "NOT_FOUND", "Oturum bulunamadı.");
      if (control.expectedRevision && attemptReviewRevision(attempt) !== control.expectedRevision) {
        throw new CommandError(409, "STALE_REVISION", "Kayıt başka bir işlemde değişti. Güncel durumu kontrol edin.");
      }
      const data =
        input.action === "MARK_REVIEWED"
          ? { integrityReviewedAt: new Date(), ...(attempt.status === "REVIEW_REQUIRED" ? { status: "SUBMITTED" as const } : {}) }
          : input.action === "REQUIRE_REVIEW"
            ? { status: "REVIEW_REQUIRED" as const, integrityReviewedAt: null }
            : { integrityReviewedAt: null };
      const updated = await tx.odkExamAttempt.update({ where: { id: attemptId }, data, select: { id: true, status: true, integrityLevel: true, integrityReviewedAt: true } });
      return {
        entityType: "OdkExamAttempt",
        entityId: attemptId,
        action: "odk.attempt_integrity_reviewed",
        summary: `Integrity incelemesi: ${input.action}`,
        payload: { examId: attempt.examId, note: input.note || null, previousLevel: attempt.integrityLevel },
        result: { id: updated.id, status: updated.status, integrityReviewedAt: updated.integrityReviewedAt?.toISOString() ?? null, revision: attemptReviewRevision(updated) },
      };
    },
  });
}
