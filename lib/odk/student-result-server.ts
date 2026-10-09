import "server-only";

import { prisma } from "@/lib/prisma";
import { getAccessibleProducts } from "@/lib/auth/products";
import type { UserRole } from "@prisma/client";
import { getReleasedStudentResult } from "@/lib/odk/student-exam-server";
import { buildResultNextStepRecommendations } from "@/lib/odk/result-next-step";

/**
 * Deneme Ligi öğrenci SONUCU — okuma TEK yerde. Web
 * (`app/panel/odk/ogrenci/denemeler/[id]/sonuc`) ve mobil
 * (`GET /api/odk/student/exams/[id]/result`) aynı fonksiyonu çağırır.
 *
 * Yayın koşulu `getReleasedStudentResult`'tadır: aktif hak + `studentReports`
 * hakkı + sınav RELEASED + sözleşmeye göre yayın zamanı geçmiş + öğrencinin
 * kendi teslim edilmiş ve YAYINLANMIŞ (`PUBLISHED`) skoru. Biri eksikse null.
 * Çapraz ürün önerileri yalnız erişilen ürünler ve öğrencinin kendi
 * kaynaklarıyla kurulur (`buildResultNextStepRecommendations`).
 */
export async function loadOdkStudentResult(input: { userId: string; role: UserRole; examId: string }) {
  const data = await getReleasedStudentResult(input.examId, input.userId);
  if (!data) return null;
  const products = await getAccessibleProducts(input.userId, input.role);
  const hasOK = products.includes("OK");
  const hasOD = products.includes("OD");
  const student = await prisma.studentProfile.findUnique({
    where: { userId: input.userId },
    select: { id: true, fieldTrack: true },
  });
  const weak = data.weakOutcomeSignals.filter((signal) => signal.needsReview);
  const topSignal = weak[0] || data.weakOutcomeSignals[0] || null;
  const [latestPlan, relatedReviewItem, relatedRecovery] = await Promise.all([
    hasOK && student
      ? prisma.weeklyPlan.findFirst({ where: { studentId: student.id }, orderBy: { weekStart: "desc" }, select: { status: true } })
      : Promise.resolve(null),
    hasOD && student && topSignal
      ? prisma.reviewItem.findFirst({ where: { studentId: student.id, outcomeId: topSignal.outcomeId, status: "ACTIVE" }, select: { id: true } })
      : Promise.resolve(null),
    hasOD && student && topSignal
      ? prisma.recoveryPackage.findFirst({
          where: {
            studentId: student.id,
            status: { in: ["PUBLISHED", "COMPLETED"] },
            lesson: { outcomeLinks: { some: { outcomeId: topSignal.outcomeId } } },
          },
          orderBy: { dueAt: "asc" },
          select: { lessonId: true },
        })
      : Promise.resolve(null),
  ]);
  const recommendations = buildResultNextStepRecommendations({
    weakOutcomeSignals: data.weakOutcomeSignals,
    hasOK,
    hasOD,
    hasPlan: Boolean(latestPlan),
    answerKeyAvailable: data.answerKeyAvailable,
    answerKeyHref: `/api/odk/student/exams/${input.examId}/answer-key`,
    reviewHref: relatedReviewItem ? "/panel/ogrenci/tekrar" : undefined,
    recoveryHref: relatedRecovery ? `/panel/ogrenci/telafi?lessonId=${encodeURIComponent(relatedRecovery.lessonId)}` : undefined,
  });
  return { data, hasOK, hasOD, fieldTrack: student?.fieldTrack ?? null, weak, topSignal, recommendations, recoveryLessonId: relatedRecovery?.lessonId ?? null };
}

export type OdkStudentResultData = NonNullable<Awaited<ReturnType<typeof loadOdkStudentResult>>>;
