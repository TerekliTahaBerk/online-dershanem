import { MOBILE_PARENT_CONTRACT_VERSION, parentNavIdForWebPath, type MobileParentAssignments, type MobileParentCoaching, type MobileParentDigest, type MobileParentExternalExams, type MobileParentHome, type MobileParentInsights, type MobileParentLessons, type MobileParentOdkReport, type ParentProductCode } from "@/lib/mobile-contracts/parent";
import type { ParentCalmHome } from "@/lib/panel/parent-calm";
import type { ParentLessons } from "@/lib/panel/parent-lessons-server";
import type { ParentAssignmentRow } from "@/lib/panel/parent-assignments-server";
import type { ParentCoachingView } from "@/lib/panel/parent-coaching-server";
import type { ParentDigestUpcoming } from "@/lib/panel/parent-digest-server";
import type { ProgressInsightBundle } from "@/lib/progress-insights/types";
import { netChange, previousComparable, reportSummarySentences, WEAK_ACCURACY, type ReportExam } from "@/lib/odk/parent-report";
import { netScore } from "@/lib/goals";

/**
 * VELİ MOBİL PROJEKSİYONLARI (M6) — paylaşılan yükleyici çıktısı → izin
 * listeli DTO. Burada iş kuralı yeniden hesaplanmaz; yalnız alan seçilir,
 * tarih ISO'ya çevrilir, web yolları menü kimliğine (`navId`) çevrilir ve
 * personel e-postası maskelenir.
 */

const PRODUCTS: readonly ParentProductCode[] = ["OD", "OK", "ODK"];

export function parentProducts(codes: readonly string[]): ParentProductCode[] {
  return PRODUCTS.filter((code) => codes.includes(code));
}

/** Personel adı: ad yoksa e-postaya düşen mevcut yardımcıların çıktısı maskelenir. */
export function staffName(name: string | null | undefined, fallback = "Öğretmen"): string {
  const value = name?.trim();
  return !value || value.includes("@") ? fallback : value;
}

function optionalStaffName(name: string | null | undefined): string | null {
  const value = name?.trim();
  return !value || value.includes("@") ? null : value;
}

export function toMobileParentHome(home: ParentCalmHome, products: readonly string[]): MobileParentHome {
  return {
    contractVersion: MOBILE_PARENT_CONTRACT_VERSION,
    studentId: home.studentId,
    studentName: home.studentName,
    products: parentProducts(products),
    status: { code: home.statusCode, label: home.statusLabel, sentence: home.statusSentence },
    weekSummary: home.weekSummary,
    thisWeek: {
      planLabel: home.thisWeek.planLabel,
      attendanceLabel: home.thisWeek.attendanceLabel,
      assignmentsLabel: home.thisWeek.assignmentsLabel,
      upcoming: home.thisWeek.upcoming.map((item) => ({ id: item.id, title: item.title, detail: item.detail, navId: parentNavIdForWebPath(item.href) })),
    },
    academic: {
      subjectTrends: home.academic.subjectTrends.map((trend) => ({ subject: trend.subject, direction: trend.direction, sentence: trend.sentence })),
      examTrendSentence: home.academic.examTrendSentence,
      strengths: home.academic.strengths,
      supportAreas: home.academic.supportAreas,
    },
    coaching: home.coaching
      ? { coachName: optionalStaffName(home.coaching.coachName), weeklyGoal: home.coaching.weeklyGoal, planRealization: home.coaching.planRealization, sharedNote: home.coaching.sharedNote }
      : null,
    actions: home.actions.map((action) => ({ id: action.id, kind: action.kind, title: action.title, body: action.body, ctaLabel: action.ctaLabel, navId: parentNavIdForWebPath(action.href) })),
    digest: { available: home.digest.available, published: home.digest.published, preview: home.digest.preview, supportArea: home.digest.supportArea },
  };
}

export function toMobileParentLessons(studentId: string, view: ParentLessons): MobileParentLessons {
  return {
    contractVersion: MOBILE_PARENT_CONTRACT_VERSION,
    studentId,
    available: view.available,
    lessons: view.lessons.map((lesson) => ({
      id: lesson.id,
      startsAt: lesson.startsAt.toISOString(),
      title: lesson.title,
      topic: lesson.topic,
      teacherName: optionalStaffName(lesson.teacherName),
      attendance: lesson.attendance,
    })),
    lastSummary: view.lastSummary,
  };
}

const ASSIGNMENT_TONE = { ATANDI: "neutral", GORULDU: "neutral", DEVAM_EDIYOR: "info", TAMAMLANDI: "success", GEC: "critical", DEGERLENDIRILDI: "success" } as const;

export function toMobileParentAssignments(studentId: string, available: boolean, rows: ParentAssignmentRow[]): MobileParentAssignments {
  return {
    contractVersion: MOBILE_PARENT_CONTRACT_VERSION,
    studentId,
    available,
    counts: {
      active: rows.filter((row) => row.group === "active").length,
      late: rows.filter((row) => row.group === "late").length,
      done: rows.filter((row) => row.group === "done").length,
    },
    assignments: rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      teacherName: optionalStaffName(row.createdByName),
      dueAt: row.dueAt.toISOString(),
      status: { key: row.status, label: row.label, tone: ASSIGNMENT_TONE[row.status] },
      group: row.group,
    })),
  };
}

export function toMobileParentInsights(input: { studentId: string; bundle: ProgressInsightBundle | null; periodRange: string; hasExamAccess: boolean }): MobileParentInsights {
  const { bundle } = input;
  if (!bundle) return { contractVersion: MOBILE_PARENT_CONTRACT_VERSION, studentId: input.studentId, state: "PREPARING" };
  return {
    contractVersion: MOBILE_PARENT_CONTRACT_VERSION,
    studentId: input.studentId,
    state: "READY",
    hasExamAccess: input.hasExamAccess,
    periodLabel: bundle.period.label,
    periodRange: input.periodRange,
    narrative: bundle.narrative,
    isEmpty: bundle.isEmpty,
    academic: input.hasExamAccess
      ? {
          examCount: bundle.academic.examCount,
          netDelta: bundle.academic.netDelta,
          netTrend: bundle.academic.netTrend.map((point) => ({ label: point.label, net: point.net })),
          subjects: bundle.academic.subjectSeries.map((series) => ({ name: series.name, direction: series.direction, nets: series.nets })),
          labels: bundle.academic.labels,
          strengths: bundle.academic.strengths,
          supportAreas: bundle.academic.supportAreas,
          subjectCaption: bundle.academic.subjectCaption ?? null,
        }
      : { examCount: 0, netDelta: null, netTrend: [], subjects: [], labels: [], strengths: [], supportAreas: [], subjectCaption: null },
    // Plan tamamlama (Yön) bu görünüme alınmaz; Yön koçluk ekranında yayınlanmış plandan gelir.
    behavioral: { attendance: bundle.behavioral.attendance, assignments: bundle.behavioral.assignments },
  };
}

export function toMobileParentCoaching(input: {
  studentId: string;
  available: boolean;
  view: ParentCoachingView | null;
  sessions: Array<{ id: string; scheduledAt: Date; rescheduleRequested: boolean; proposedAt: Date | null }>;
}): MobileParentCoaching {
  const { view } = input;
  const coaching = view?.coaching ?? null;
  const summary = view?.week?.summary ?? null;
  return {
    contractVersion: MOBILE_PARENT_CONTRACT_VERSION,
    studentId: input.studentId,
    available: input.available,
    coach: coaching
      ? {
          name: staffName(coaching.coachName, "Koç"),
          nextScheduledAt: coaching.overdue ? null : coaching.nextScheduledAt?.toISOString() ?? null,
          awaitingNewTime: coaching.overdue,
          focus: coaching.focus,
          sharedNote: coaching.sharedNote,
        }
      : null,
    sessions: input.sessions.map((session) => ({ id: session.id, scheduledAt: session.scheduledAt.toISOString(), rescheduleRequested: session.rescheduleRequested, proposedAt: session.proposedAt?.toISOString() ?? null })),
    week:
      view?.week && summary
        ? {
            start: view.week.start.toISOString(),
            end: view.week.end.toISOString(),
            planCompletionPct: summary.planCompletionPct === null ? null : Math.max(0, Math.round(summary.planCompletionPct)),
            lines: [summary.studyRhythm, summary.goalProgressLine, summary.overdueTrend].filter((line): line is string => Boolean(line)),
          }
        : null,
    summary:
      summary && (summary.coachSummary || summary.strengths || summary.focusAreas || summary.nextWeekFocus)
        ? { coachSummary: summary.coachSummary, strengths: summary.strengths, focusAreas: summary.focusAreas, nextWeekFocus: summary.nextWeekFocus }
        : null,
    notes: (view?.notes ?? []).map((note) => ({ id: note.id, body: note.body, createdAt: note.createdAt.toISOString() })),
    goals: (view?.goals ?? []).slice(0, 5).map((goal) => ({ id: goal.id, label: goal.label, percent: goal.percent })),
  };
}

const TREND_BANDS = ["IMPROVING", "STEADY", "BUILDING", "LIMITED_DATA"] as const;
type TrendBand = (typeof TREND_BANDS)[number];

export function toMobileParentDigest(input: {
  studentId: string;
  feedbackAvailable: boolean;
  digest: {
    id: string;
    weekStart: Date;
    publishedAt: Date | null;
    dataThrough: Date;
    trendBand: string;
    goodThingOne: string;
    goodThingTwo: string;
    supportArea: string;
    homeQuestion: string;
    feedback: Array<{ helpful: boolean | null; anxietyPulse: number | null }>;
  } | null;
  upcoming: ParentDigestUpcoming[];
}): MobileParentDigest {
  const { digest } = input;
  const band: TrendBand = digest && (TREND_BANDS as readonly string[]).includes(digest.trendBand) ? (digest.trendBand as TrendBand) : "LIMITED_DATA";
  const feedback = digest?.feedback[0] ?? null;
  return {
    contractVersion: MOBILE_PARENT_CONTRACT_VERSION,
    studentId: input.studentId,
    feedbackAvailable: input.feedbackAvailable,
    digest: digest
      ? {
          id: digest.id,
          weekStart: digest.weekStart.toISOString(),
          publishedAt: digest.publishedAt?.toISOString() ?? null,
          dataThrough: digest.dataThrough.toISOString(),
          trendBand: band,
          goodThingOne: digest.goodThingOne,
          goodThingTwo: digest.goodThingTwo,
          supportArea: digest.supportArea.trim() || null,
          homeQuestion: digest.homeQuestion.trim() || null,
          feedback: feedback ? { helpful: feedback.helpful, anxietyPulse: feedback.anxietyPulse } : null,
        }
      : null,
    upcoming: input.upcoming.map((item) => ({ kind: item.kind, title: item.title, at: item.at.toISOString() })),
  };
}

export function toMobileParentExternalExams(input: {
  studentId: string;
  available: boolean;
  exams: Array<{ id: string; title: string | null; examType?: string | null; takenAt: Date; sections: Array<{ subjectName: string; correctCount: number; incorrectCount: number }> }>;
}): MobileParentExternalExams {
  return {
    contractVersion: MOBILE_PARENT_CONTRACT_VERSION,
    studentId: input.studentId,
    available: input.available,
    exams: input.exams.map((exam) => {
      const sections = exam.sections.map((section) => ({
        subjectName: section.subjectName,
        correctCount: section.correctCount,
        incorrectCount: section.incorrectCount,
        net: Number(netScore(section.correctCount, section.incorrectCount).toFixed(2)),
      }));
      return {
        id: exam.id,
        title: exam.title?.trim() || exam.examType || "Deneme",
        takenAt: exam.takenAt.toISOString(),
        totalNet: Number(sections.reduce((sum, section) => sum + section.net, 0).toFixed(2)),
        sections,
      };
    }),
  };
}

type OdkReport = {
  exams: Array<ReportExam & { correctCount: number; wrongCount: number; blankCount: number }>;
  trends: Array<{ outcomeId: string; code: string; title: string; unitName: string; latestAccuracy: number; delta: number | null; questionCount: number; evidenceCount: number }>;
};

export function toMobileParentOdkReport(studentId: string, report: OdkReport | null): MobileParentOdkReport {
  if (!report) {
    return { contractVersion: MOBILE_PARENT_CONTRACT_VERSION, studentId, available: false, summary: [], exams: [], comparison: null, outcomes: [], weakThreshold: WEAK_ACCURACY };
  }
  const pair = previousComparable(report.exams);
  return {
    contractVersion: MOBILE_PARENT_CONTRACT_VERSION,
    studentId,
    available: true,
    summary: reportSummarySentences(report.exams, report.trends),
    // Bütünlük (integrity) bildirimi, kazanım ham puanı ve deneme içeriği alınmaz.
    exams: [...report.exams]
      .sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime())
      .map((exam) => ({ id: exam.id, title: exam.title, family: exam.family, takenAt: exam.takenAt.toISOString(), correctCount: exam.correctCount, wrongCount: exam.wrongCount, blankCount: exam.blankCount, totalNet: exam.totalNet })),
    comparison: pair
      ? { latestExamId: pair.latest.id, previousExamId: pair.previous?.id ?? null, sameFamily: Boolean(pair.previous && pair.previous.family === pair.latest.family), netChange: netChange(pair.latest, pair.previous) }
      : null,
    outcomes: report.trends.map((trend) => ({ id: trend.outcomeId, code: trend.code, title: trend.title, unitName: trend.unitName, latestAccuracy: trend.latestAccuracy, delta: trend.delta, questionCount: trend.questionCount, evidenceCount: trend.evidenceCount })),
    weakThreshold: WEAK_ACCURACY,
  };
}
