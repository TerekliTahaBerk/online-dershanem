/**
 * Deneme Ligi sunucu okuma modelleri → mobil sözleşme (`lib/mobile-contracts/odk.ts`).
 *
 * İZİN LİSTELİ PROJEKSİYON: ham Prisma nesneleri veya `getStudentExam`
 * çıktısı (cevaplar, sürüm ayarı, dosya, Meet bağlantısı) doğrudan dönmez;
 * yalnız aşağıda adı geçen alanlar kopyalanır. Durum, sıralama, yayın,
 * karşılaştırma ve sınıflandırma kuralları sunucu modüllerinden gelir
 * (`studentExamState`, `releasedResultsWithDelta`, `student-result-view`).
 *
 * CEVAP ANAHTARI: soru başına doğru cevap yalnız
 * `contractAnswerKeyAvailable` true iken taşınır; sonuç yayını tek başına
 * cevap anahtarını açmaz.
 */

import type { MobileOdkExamDetail, MobileOdkExamList, MobileOdkExamRow, MobileOdkHome, MobileOdkRecommendationTarget, MobileOdkResult, OdkListView } from "@/lib/mobile-contracts/odk";
import { MOBILE_ODK_CONTRACT_VERSION } from "@/lib/mobile-contracts/odk";
import { attemptStartError } from "@/lib/odk/attempt-domain";
import { readSessionPlan, sessionPlanTotalMinutes } from "@/lib/odk/exam-sessions";
import { getOdkExamFamilyCode } from "@/lib/odk/exam-family";
import { studentExamState, type StudentExamState } from "@/lib/odk/student-exam-state";
import { classifyOutcome, inTrack, previousComparableDelta, resultTrackView } from "@/lib/odk/student-result-view";
import type { OdkExamRow, loadOdkStudentExamList, loadOdkStudentHome } from "@/lib/odk/student-dashboard-server";
import type { OdkStudentResultData } from "@/lib/odk/student-result-server";
import type { getStudentExam } from "@/lib/odk/student-exam-server";

const iso = (value: Date | null | undefined) => (value ? value.toISOString() : null);

function stateDto(state: StudentExamState) {
  return { key: state.key, label: state.label, tone: state.tone, actionLabel: state.actionLabel, tab: state.tab };
}

export function toMobileOdkExamRow(row: OdkExamRow, net: number | null): MobileOdkExamRow {
  const attempt = row.exam.attempts[0];
  return {
    id: row.exam.id,
    title: row.exam.title,
    family: String(row.exam.family),
    startsAt: iso(row.exam.startsAt),
    endsAt: iso(row.exam.endsAt),
    durationMinutes: row.exam.currentVersion?.durationMinutes ?? null,
    state: stateDto(row.state),
    net: row.state.key === "RESULT_RELEASED" ? net : null,
    deadlineAt: row.state.key === "IN_PROGRESS" && attempt ? iso(attempt.deadlineAt) : null,
  };
}

export function toMobileOdkExamList(
  data: Awaited<ReturnType<typeof loadOdkStudentExamList>>,
  view: OdkListView,
  limit: number,
  now = new Date(),
): MobileOdkExamList {
  return {
    contractVersion: MOBILE_ODK_CONTRACT_VERSION,
    generatedAt: now.toISOString(),
    view,
    counts: data.counts,
    active: data.active ? toMobileOdkExamRow(data.active, null) : null,
    exams: data.visible.map((row) => toMobileOdkExamRow(row, data.netOf(row))),
    truncated: data.truncated,
    limit,
  };
}

export function toMobileOdkHome(data: Awaited<ReturnType<typeof loadOdkStudentHome>>): MobileOdkHome {
  const row = (item: { examId: string; title: string; family: string; at: Date; net: number; delta: number | null }) => ({
    examId: item.examId,
    title: item.title,
    family: String(item.family),
    at: item.at.toISOString(),
    net: item.net,
    delta: item.delta,
  });
  return {
    contractVersion: MOBILE_ODK_CONTRACT_VERSION,
    generatedAt: data.now.toISOString(),
    next: data.next ? toMobileOdkExamRow(data.next, null) : null,
    results: data.results.slice(0, 3).map(row),
    resultsTotal: data.results.length,
    trend: data.trend.length >= 2 && data.trendFamily ? { family: String(data.trendFamily), points: data.trend.map(row) } : null,
    focus:
      data.latest && data.focus.length
        ? {
            examId: data.latest.examId,
            examTitle: data.latest.title,
            items: data.focus.map((item) => ({ code: item.outcome.code, title: item.outcome.title, accuracy: Number(item.accuracyRate), questionCount: item.questionCount })),
          }
        : null,
  };
}

type StudentExamData = NonNullable<Awaited<ReturnType<typeof getStudentExam>>>;

/**
 * Ayrıntı — yalnız başlamadan önce gösterilmeye yetkili bilgi. Süresi dolmuş
 * ama hâlâ IN_PROGRESS kayıtlı deneme (mobil okuma yazma yapmaz) teslim
 * edilmiş gibi değerlendirilir: sunucunun bir sonraki yazma yolunda yapacağı
 * otomatik teslimle aynı sonuç.
 */
export function toMobileOdkExamDetail(data: StudentExamData): MobileOdkExamDetail | null {
  const { exam, attempt, startDecision, resultAvailable } = data;
  const version = exam.currentVersion;
  if (!version) return null;
  const effectiveStatus = attempt ? (data.attemptExpired ? "AUTO_SUBMITTED" : attempt.status) : null;
  const state = studentExamState({ id: exam.id, attempts: effectiveStatus ? [{ status: effectiveStatus }] : [], startDecision, resultAvailable });
  const plan = readSessionPlan(version.settings);
  const titleByCode = new Map(version.sections.map((section) => [section.code, section.title]));
  return {
    contractVersion: MOBILE_ODK_CONTRACT_VERSION,
    serverNow: data.serverNow.toISOString(),
    exam: {
      id: exam.id,
      title: exam.title,
      family: getOdkExamFamilyCode(exam),
      startsAt: iso(exam.startsAt),
      endsAt: iso(exam.endsAt),
      lateEntryMinutes: exam.lateEntryMinutes,
      attemptLimit: exam.attemptLimit,
      durationMinutes: version.durationMinutes,
      questionCount: version.sections.reduce((sum, section) => sum + section.questions.length, 0),
      sections: version.sections.map((section) => ({ code: section.code, title: section.title, questionCount: section.questions.length })),
      sessionPlan: plan
        ? plan.map((item) => ({
            key: item.key,
            title: item.title,
            durationMinutes: item.durationMinutes,
            breakAfterMinutes: item.breakAfterMinutes,
            sectionTitles: item.sectionCodes.map((code) => titleByCode.get(code) ?? code),
          }))
        : null,
      sessionTotalMinutes: plan ? sessionPlanTotalMinutes(plan) : null,
      meetRequired: Boolean(exam.meetRequired),
    },
    state: stateDto(state),
    startBlockedReason: startDecision.ok ? null : attemptStartError[startDecision.code],
    attempt: attempt
      ? {
          inProgress: attempt.status === "IN_PROGRESS" && !data.attemptExpired,
          deadlineAt: attempt.status === "IN_PROGRESS" ? iso(attempt.deadlineAt) : null,
          submittedAt: iso(attempt.submittedAt),
          expired: data.attemptExpired,
        }
      : null,
    resultAvailable,
    webPath: state.key === "IN_PROGRESS" ? `/panel/odk/ogrenci/denemeler/${exam.id}/coz` : `/panel/odk/ogrenci/denemeler/${exam.id}`,
  };
}

type SectionRow = { code?: string; title?: string; net?: number; correct?: number; wrong?: number; blank?: number };
const intOrNull = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : null);
const numOrNull = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

function recommendationTarget(href: string | undefined, recoveryLessonId: string | null): MobileOdkRecommendationTarget {
  if (!href) return { type: "none" };
  if (href === "/panel/ogrenci/plan") return { type: "yon-plan" };
  if (href.startsWith("/panel/ogrenci/tekrar")) return { type: "od-review" };
  if (href.startsWith("/panel/ogrenci/telafi") && recoveryLessonId) return { type: "od-recovery", lessonId: recoveryLessonId };
  if (href.includes("/answer-key")) return { type: "answer-key" };
  return { type: "none" };
}

export function toMobileOdkResult(loaded: OdkStudentResultData): MobileOdkResult {
  const { data, fieldTrack, recommendations, hasOK } = loaded;
  const { exam, score, attempt, answerKeyAvailable, weakOutcomeSignals, timeAnalysis, comparison, coachSuggestions } = data;
  const family = getOdkExamFamilyCode(exam);
  const track = resultTrackView(family, fieldTrack);
  const sectionRows = (Array.isArray(data.sectionBreakdown) ? (data.sectionBreakdown as SectionRow[]) : []).map((section, index) => ({
    code: typeof section.code === "string" ? section.code : null,
    title: section.title || section.code || `Bölüm ${index + 1}`,
    correct: intOrNull(section.correct),
    wrong: intOrNull(section.wrong),
    blank: intOrNull(section.blank),
    net: numOrNull(section.net),
    inTrack: inTrack(track, section.code),
  }));
  const trackNet = track.sectionCodes ? sectionRows.filter((row) => row.inTrack).reduce((sum, row) => sum + Number(row.net ?? 0), 0) : null;
  const marked = new Set(attempt.answers.map((answer) => answer.questionId));
  const timing = new Map(attempt.timings.map((row) => [row.questionId, row.activeDurationMs]));
  const totalNet = Number(score.totalNet);
  const { delta, previousTitle } = previousComparableDelta(comparison, exam.id, totalNet);
  const hasTiming = timeAnalysis.sections.some((section) => section.totalActiveMs > 0);
  return {
    contractVersion: MOBILE_ODK_CONTRACT_VERSION,
    exam: { id: exam.id, title: exam.title, family, resultsReleasedAt: iso(exam.resultsReleasedAt) },
    summary: {
      totalNet,
      correct: score.correctCount,
      wrong: score.wrongCount,
      blank: score.blankCount,
      activeDurationMs: score.activeDurationMs ?? null,
      delta,
      previousTitle,
    },
    track: track.sectionCodes && track.track && track.label && trackNet !== null ? { code: track.track, label: track.label, trackNet: Math.round(trackNet * 100) / 100 } : null,
    sections: sectionRows,
    questions: score.questionResults.map((item) => ({
      id: item.questionId,
      number: item.question.questionNumber,
      sectionCode: item.question.section.code,
      sectionTitle: item.question.section.title,
      selectedOption: item.selectedOption,
      result: item.result,
      marked: marked.has(item.questionId),
      outcomes: item.question.outcomes.map((link) => ({ code: link.outcome.code, title: link.outcome.title, primary: link.isPrimary })),
      activeDurationMs: timing.has(item.questionId) ? (timing.get(item.questionId) ?? null) : null,
      // Cevap anahtarı politikası bağımsızdır: yayın açık değilse doğru cevap HİÇ taşınmaz.
      correctOption: answerKeyAvailable ? item.correctOption : null,
      inTrack: inTrack(track, item.question.section.code),
    })),
    answerKey: { available: answerKeyAvailable, hasFile: answerKeyAvailable && Boolean(exam.currentVersion?.files.length) },
    outcomes: score.outcomeScores.map((item) => {
      const accuracy = Number(item.accuracyRate);
      const signal = weakOutcomeSignals.find((entry) => entry.outcomeId === item.outcomeId) || null;
      return {
        code: item.outcome.code,
        title: item.outcome.title,
        unitName: item.outcome.unit.name,
        questionCount: item.questionCount,
        correct: item.correctCount,
        wrong: item.wrongCount,
        blank: item.blankCount,
        accuracy,
        avgSecondsPerQuestion: item.activeDurationMs ? Math.round(item.activeDurationMs / Math.max(1, item.questionCount) / 1000) : null,
        evidenceCount: signal ? signal.evidenceCount : null,
        lowEvidence: signal?.confidence === "LOW",
        group: classifyOutcome(accuracy, signal),
      };
    }),
    time: {
      // Geçerli süre kanıtı yoksa (tüm süreler 0) bölüm satırı üretilmez: dürüst boş durum.
      sections: hasTiming
        ? timeAnalysis.sections.map((section) => ({
            code: section.sectionCode,
            title: section.sectionTitle,
            totalActiveMs: section.totalActiveMs,
            correctAvgMs: section.correctAvgMs,
            wrongAvgMs: section.wrongAvgMs,
            inTrack: inTrack(track, section.sectionCode),
          }))
        : [],
      fastWrongCount: timeAnalysis.fastWrongs.length,
      longWrongCount: timeAnalysis.longWrongs.length,
    },
    comparison: comparison.map((item) => ({ examId: item.examId, title: item.title, takenAt: item.takenAt.toISOString(), totalNet: item.totalNet, current: item.examId === exam.id })),
    recommendations: recommendations.map((item) => ({
      title: item.title,
      detail: item.detail,
      actionLabel: item.actionLabel ?? null,
      primary: item.tone === "primary",
      target: recommendationTarget(item.href, loaded.recoveryLessonId),
    })),
    coachSuggestions: hasOK ? coachSuggestions.map((item) => ({ outcomeCode: item.outcomeCode, subject: item.subject, topic: item.topic, label: item.label })) : [],
  };
}
