/**
 * Sunucu okuma modelleri → mobil sözleşme (`lib/mobile-contracts/student.ts`).
 * SAF dönüştürücüler: hesap / iş kuralı YOK; yalnız alan seçimi ve
 * `Date → ISO`. Gereksiz iç veri (ör. ham toplantı bağlantısı, grup kimliği)
 * mobile çıkmaz.
 */

import type { MobileInsights, MobileLessonDetail, MobileRecovery, MobileReviewQueue, MobileWeeklyDigest } from "@/lib/mobile-contracts/student";
import { MOBILE_STUDENT_CONTRACT_VERSION } from "@/lib/mobile-contracts/student";
import type { StudentLessonDetailView } from "@/lib/panel/student-lesson-detail";
import type { StudentRecoveryPackageView, StudentReviewQueueView, StudentWeeklyDigestView } from "@/lib/panel/student-review-recovery-server";
import type { ProgressInsightBundle } from "@/lib/progress-insights/types";

export function toMobileLessonDetail(view: StudentLessonDetailView): MobileLessonDetail {
  return {
    contractVersion: MOBILE_STUDENT_CONTRACT_VERSION,
    lesson: {
      id: view.lesson.id,
      title: view.lesson.title,
      startsAt: view.lesson.startsAt.toISOString(),
      endsAt: view.lesson.endsAt.toISOString(),
      status: view.lesson.status,
      groupName: view.lesson.group.name,
      subject: view.lesson.group.subject,
      teacherName: view.lesson.teacher.fullName,
    },
    attendance: { status: view.attendance, label: view.attendanceView.label, tone: view.attendanceView.tone },
    topic: view.sharedNote?.topic ?? null,
    homework: view.sharedNote?.homework ?? null,
    nextGoal: view.sharedNote?.nextGoal ?? null,
    personalNote: view.personalNote,
    assignments: view.assignments.map((row) => ({ id: row.id, title: row.title, dueAt: row.dueAt.toISOString(), done: row.done })),
    // Bağlantı yalnız pencere açıkken (`lessonJoinState`); aksi halde null.
    join: { state: view.join.state, url: view.join.url, opensAt: view.join.opensAt?.toISOString() ?? null },
    recovery: view.recoveryStatus ? { status: view.recoveryStatus } : null,
    enrollmentActive: view.enrollmentActive,
  };
}

/**
 * Gidişat (web Analiz ile aynı `loadStudentProgressInsight` çıktısı).
 * Metrik yeniden hesaplanmaz. Yön Koçluk plan tamamlama oranı OD mobil
 * görünümüne ALINMAZ (plan görevleri Yön çalışma alanına aittir; M3).
 */
export function toMobileInsights(input: {
  bundle: ProgressInsightBundle;
  periodRange: string;
  weeklyGoal: string | null;
  weeklyGoalUpdatedAt: Date | null;
  mockExamAnalysis: boolean;
}): MobileInsights {
  const { bundle } = input;
  return {
    contractVersion: MOBILE_STUDENT_CONTRACT_VERSION,
    state: "READY",
    periodLabel: bundle.period.label,
    periodRange: input.periodRange,
    narrative: bundle.narrative,
    isEmpty: bundle.isEmpty,
    academic: {
      examCount: bundle.academic.examCount,
      netDelta: bundle.academic.netDelta,
      netTrend: bundle.academic.netTrend.map((point) => ({ label: point.label, net: point.net })),
      labels: bundle.academic.labels,
      subjects: bundle.academic.subjectSeries.map((series) => ({ name: series.name, direction: series.direction, nets: series.nets })),
      strengths: bundle.academic.strengths,
      supportAreas: bundle.academic.supportAreas,
      subjectCaption: bundle.academic.subjectCaption ?? null,
    },
    behavioral: { attendance: bundle.behavioral.attendance, assignments: bundle.behavioral.assignments },
    weeklyGoal: input.weeklyGoal,
    weeklyGoalUpdatedAt: input.weeklyGoalUpdatedAt?.toISOString() ?? null,
    mockExamAnalysis: input.mockExamAnalysis,
  };
}

export function toMobileReviewQueue(view: StudentReviewQueueView | null): MobileReviewQueue {
  if (!view) return { contractVersion: MOBILE_STUDENT_CONTRACT_VERSION, state: "NO_PROFILE" };
  return {
    contractVersion: MOBILE_STUDENT_CONTRACT_VERSION,
    state: "READY",
    dailyLimit: view.dailyLimit,
    activeCount: view.activeCount,
    masteredCount: view.masteredCount,
    items: view.items.map((item) => ({ ...item, solutionNote: item.solutionNote || null, dueAt: item.dueAt.toISOString() })),
  };
}

/**
 * Telafi adımı hedefi: kimlikli materyal dosyası mobilde Bearer ile indirilir
 * (web `href`'i `/api/panel/materials/[id]/file` doğrudan açılmaz); ödev adımı
 * Çalışmalar'a gider. Pasif materyal / ödev → hedef yok.
 */
export function toMobileRecovery(packages: StudentRecoveryPackageView[] | null): MobileRecovery {
  if (!packages) return { contractVersion: MOBILE_STUDENT_CONTRACT_VERSION, state: "NO_PROFILE" };
  return {
    contractVersion: MOBILE_STUDENT_CONTRACT_VERSION,
    state: "READY",
    packages: packages.map((item) => ({
      id: item.id,
      lessonId: item.lessonId,
      status: item.status,
      lessonTitle: item.lessonTitle,
      lessonDate: item.lessonDate.toISOString(),
      summaryTopic: item.summaryTopic,
      sharedNote: item.sharedNote,
      summaryNextStep: item.summaryNextStep,
      checkpointPrompt: item.checkpointPrompt,
      checkpointResponse: item.checkpointResponse,
      dueAt: item.dueAt.toISOString(),
      outcomeTitles: item.outcomeTitles,
      items: item.items.map((row) => ({
        id: row.id,
        kind: row.kind,
        title: row.title,
        completed: row.completed,
        target:
          row.kind === "MATERIAL"
            ? row.material
              ? { type: "material" as const, materialId: row.material.id, hasFile: row.material.hasFile, url: row.material.hasFile ? null : row.material.url }
              : { type: "none" as const }
            : row.assignmentActive
              ? { type: "assignments" as const }
              : { type: "none" as const },
      })),
    })),
  };
}

export function toMobileWeeklyDigest(view: StudentWeeklyDigestView | null): MobileWeeklyDigest {
  if (!view) return { contractVersion: MOBILE_STUDENT_CONTRACT_VERSION, state: "NONE" };
  return {
    contractVersion: MOBILE_STUDENT_CONTRACT_VERSION,
    state: "READY",
    digest: {
      id: view.id,
      goodThingOne: view.goodThingOne,
      goodThingTwo: view.goodThingTwo,
      supportArea: view.supportArea,
      homeQuestion: view.homeQuestion,
      dataThrough: view.dataThrough.toISOString(),
      trendBand: view.trendBand,
    },
    feedback: view.feedback,
  };
}
