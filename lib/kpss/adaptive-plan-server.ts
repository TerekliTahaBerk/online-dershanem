import "server-only";

import type { StudentPlanPreference } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PlanCandidate } from "@/lib/adaptive-plan";
import { buildOutcomeTrends, buildWeakOutcomeSignals } from "@/lib/odk/reporting";
import { KPSS_PRODUCT_CODE } from "@/lib/kocum/plan-product";

/**
 * KPSS PLAN ÜRETİM GİRDİSİ — deneme sonuçlarından zayıf kazanımlar.
 *
 * NEDEN AYRI BİR TOPLAYICI: Online Koçum'un girdisi (`collectPlanCandidates`)
 * öğretmenli K-12 bağlamına aittir — `Assignment` eksikleri, ders kazanım
 * dönüşleri, telafi paketleri, koç sinyalleri. KPSS adayının ne bir ödev
 * akışı ne de bir öğretmeni vardır; elindeki tek kanıt DENEME SONUCUDUR.
 *
 * Bu bir DALLANMA'dır, yerine geçme değil: `collectPlanCandidates` hiç
 * çağrılmaz ve tek satırı değişmez; OK planları eskisi gibi üretilir.
 * Çekirdek zamanlama/kapasite çözücüsü (`buildAdaptiveWeek`,
 * `ruleVersion: "adaptive-v1"`) İKİ ÜRÜNDE DE AYNIDIR — değişen yalnız
 * çözücüye giren aday listesidir.
 *
 * Kural: "son N denemede en düşük performans gösterilen kazanımlar, önümüzdeki
 * haftanın görevlerine öncelikli girer." Zayıflık kararı yeniden yazılmaz;
 * ODK raporlamasının halihazırda test edilmiş sinyal motoru
 * (`buildOutcomeTrends` + `buildWeakOutcomeSignals`) kullanılır.
 */

/** Kanıt penceresi: son N deneme. Daha eskisi adayın bugünkü seviyesini temsil etmiyor. */
export const KPSS_ATTEMPT_WINDOW = 5;
/** Bir haftaya konacak en fazla zayıf-kazanım görevi. */
export const KPSS_MAX_WEAK_OUTCOME_TASKS = 6;
/** Tek kazanım tekrarının hedef süresi. */
export const KPSS_WEAK_OUTCOME_MINUTES = 25;

export async function collectKpssPlanCandidates(
  studentId: string,
  preference: StudentPlanPreference,
  now = new Date(),
): Promise<PlanCandidate[]> {
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    select: { userId: true },
  });
  if (!student?.userId) return [];

  /*
   * Kapsam KPSS sınav ailelerine kilitli: adayın başka bir üründe (ör. ODK/LGS)
   * girdiği denemeler KPSS planını şekillendirmemeli. Aile listesi registry'den
   * okunur — yeni bir KPSS ailesi eklendiğinde burada kod değişmez.
   */
  const attempts = await prisma.odkExamAttempt.findMany({
    where: {
      studentUserId: student.userId,
      status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
      exam: { status: "RELEASED", examFamilyRef: { product: { code: KPSS_PRODUCT_CODE } } },
      score: { isNot: null },
    },
    orderBy: [{ exam: { startsAt: "desc" } }, { submittedAt: "desc" }, { attemptNumber: "desc" }],
    take: KPSS_ATTEMPT_WINDOW * 4,
    select: {
      examId: true,
      submittedAt: true,
      exam: { select: { startsAt: true } },
      score: {
        select: {
          outcomeScores: {
            select: {
              outcomeId: true,
              questionCount: true,
              accuracyRate: true,
              outcome: { select: { code: true, title: true, unit: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });

  const candidates: PlanCandidate[] = [];

  // Sınav başına EN SON deneme: aynı denemeyi iki kez çözmek kanıtı çoğaltmaz.
  const latestByExam = new Map<string, (typeof attempts)[number]>();
  for (const row of attempts) if (!latestByExam.has(row.examId)) latestByExam.set(row.examId, row);
  const orderedAttempts = [...latestByExam.values()]
    .sort(
      (a, b) =>
        (b.exam.startsAt || b.submittedAt || new Date(0)).getTime() -
        (a.exam.startsAt || a.submittedAt || new Date(0)).getTime(),
    )
    .slice(0, KPSS_ATTEMPT_WINDOW);

  const latestAttempt = orderedAttempts[0];
  if (latestAttempt?.score) {
    const rows = orderedAttempts.flatMap((attemptRow) =>
      attemptRow.score
        ? attemptRow.score.outcomeScores.map((score) => ({
            examId: attemptRow.examId,
            takenAt: attemptRow.exam.startsAt || attemptRow.submittedAt || new Date(0),
            outcomeId: score.outcomeId,
            code: score.outcome.code,
            title: score.outcome.title,
            unitName: score.outcome.unit.name,
            questionCount: score.questionCount,
            accuracyRate: Number(score.accuracyRate),
          }))
        : [],
    );
    const weakSignals = buildWeakOutcomeSignals({
      latestScores: latestAttempt.score.outcomeScores.map((score) => ({
        outcomeId: score.outcomeId,
        code: score.outcome.code,
        title: score.outcome.title,
        unitName: score.outcome.unit.name,
        questionCount: score.questionCount,
        accuracyRate: Number(score.accuracyRate),
      })),
      trends: buildOutcomeTrends(rows),
    })
      .filter((signal) => signal.needsReview)
      // En düşük doğruluk önce: haftanın ilk görevleri en zayıf kazanımlar olur.
      .sort(
        (a, b) =>
          a.latestAccuracy - b.latestAccuracy || a.code.localeCompare(b.code, "tr"),
      )
      .slice(0, KPSS_MAX_WEAK_OUTCOME_TASKS);

    for (const signal of weakSignals) {
      candidates.push({
        sourceType: "WEAK_OUTCOME",
        sourceReferenceId: signal.outcomeId,
        title: signal.title,
        durationMinutes: KPSS_WEAK_OUTCOME_MINUTES,
        reasonCode: "NEEDS_REVIEW",
        // Deterministik: aynı sinyal her zaman aynı önceliği üretir.
        priority: Math.max(68, Math.min(96, signal.priority + Math.round(signal.confidenceScore * 10))),
        signalMeta: {
          source: "ODK_RESULT",
          confidence: signal.confidenceScore,
          evidenceCount: signal.evidenceCount,
          questionCount: signal.questionCount,
          latestAccuracy: signal.latestAccuracy,
          previousAccuracy: signal.previousAccuracy,
        },
      });
    }
  }

  /*
   * Hedef sınav tarihi biliniyorsa haftaya bir deneme adımı eklenir. Kapasite
   * çarpanından (bkz. `examCountdownCapacity`) BAĞIMSIZDIR: o günün hacmini,
   * bu görevin kendisini belirler.
   */
  if (preference.nextExamAt && preference.nextExamAt > now) {
    candidates.push({
      sourceType: "EXAM_PREP",
      title: `${preference.examLabel || "KPSS"} için deneme çalışması`,
      durationMinutes: 30,
      reasonCode: "EXAM_APPROACHING",
      priority: 85,
      dueAt: preference.nextExamAt,
    });
  }

  return candidates;
}
