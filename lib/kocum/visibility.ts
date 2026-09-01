/**
 * Online Koçum — görünürlük ve yatay erişim kuralları (saf).
 */

export type CoachNoteVisibility = "INTERNAL" | "STUDENT_VISIBLE" | "PARENT_VISIBLE";
export type TimelineVisibility = "INTERNAL" | "STAFF" | "STUDENT" | "PARENT";
export type ViewerRole = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

export function canViewerSeeCoachNote(
  visibility: CoachNoteVisibility,
  viewer: ViewerRole,
): boolean {
  if (viewer === "ADMIN" || viewer === "TEACHER") return true;
  if (viewer === "STUDENT") return visibility === "STUDENT_VISIBLE" || visibility === "PARENT_VISIBLE";
  if (viewer === "PARENT") return visibility === "PARENT_VISIBLE";
  return false;
}

/**
 * INTERNAL — yalnız admin (risk / müdahale metadata)
 * STAFF — koç / öğretmen / admin
 * STUDENT — öğrenci + personel
 * PARENT — veli + öğrenci + personel
 */
export function canViewerSeeTimelineEvent(
  visibility: TimelineVisibility,
  viewer: ViewerRole,
): boolean {
  if (viewer === "ADMIN") return true;
  if (viewer === "TEACHER") {
    return visibility === "STAFF" || visibility === "STUDENT" || visibility === "PARENT";
  }
  if (viewer === "STUDENT") return visibility === "STUDENT" || visibility === "PARENT";
  if (viewer === "PARENT") return visibility === "PARENT";
  return false;
}

/** Parent-facing weekly summary — operational task lists excluded. */
export type ParentKocumSummary = {
  planCompletionPct: number | null;
  studyRhythm: string | null;
  goalProgressLine: string | null;
  overdueTrend: string | null;
  coachSummary: string | null;
  nextWeekFocus: string | null;
  strengths: string | null;
  focusAreas: string | null;
};

export function buildParentKocumSummary(input: {
  planCompletionPct: number | null;
  completedMinutes: number | null;
  plannedMinutes: number | null;
  overdueCount: number | null;
  previousOverdueCount: number | null;
  goalLabel: string | null;
  goalPercent: number | null;
  publishedParentText: string | null;
  strengths: string | null;
  focusAreas: string | null;
  nextWeekFocus: string | null;
}): ParentKocumSummary {
  let studyRhythm: string | null = null;
  if (input.plannedMinutes != null && input.completedMinutes != null && input.plannedMinutes > 0) {
    const ratio = input.completedMinutes / input.plannedMinutes;
    if (ratio >= 0.9) studyRhythm = "Çalışma düzeni plana yakın.";
    else if (ratio >= 0.6) studyRhythm = "Çalışma düzeni kısmen sürüyor.";
    else studyRhythm = "Bu hafta planlanan sürenin altında kalındı.";
  }

  let overdueTrend: string | null = null;
  if (input.overdueCount != null) {
    if (input.previousOverdueCount == null) {
      overdueTrend =
        input.overdueCount === 0
          ? "Geciken görev yok."
          : `${input.overdueCount} görev gecikti.`;
    } else if (input.overdueCount < input.previousOverdueCount) {
      overdueTrend = "Gecikmeler geçen haftaya göre azaldı.";
    } else if (input.overdueCount > input.previousOverdueCount) {
      overdueTrend = "Gecikmeler geçen haftaya göre arttı.";
    } else {
      overdueTrend =
        input.overdueCount === 0
          ? "Geciken görev yok."
          : "Gecikme sayısı geçen haftayla aynı.";
    }
  }

  let goalProgressLine: string | null = null;
  if (input.goalLabel && input.goalPercent != null) {
    goalProgressLine = `${input.goalLabel}: %${input.goalPercent}`;
  }

  return {
    planCompletionPct: input.planCompletionPct,
    studyRhythm,
    goalProgressLine,
    overdueTrend,
    coachSummary: input.publishedParentText,
    nextWeekFocus: input.nextWeekFocus,
    strengths: input.strengths,
    focusAreas: input.focusAreas,
  };
}

export type ManagementKocumSignalCode =
  | "NO_PLAN"
  | "NO_COACH"
  | "PLAN_UNPUBLISHED"
  | "LOW_COMPLETION"
  | "STALE_COACH_ACTIVITY";

export type ManagementKocumSignal = {
  code: ManagementKocumSignalCode;
  studentId: string;
  studentName: string;
  detail: string;
};

export function rankManagementSignals(signals: ManagementKocumSignal[]): ManagementKocumSignal[] {
  const weight: Record<ManagementKocumSignalCode, number> = {
    NO_COACH: 5,
    NO_PLAN: 4,
    PLAN_UNPUBLISHED: 3,
    LOW_COMPLETION: 2,
    STALE_COACH_ACTIVITY: 1,
  };
  return [...signals].sort(
    (a, b) =>
      weight[b.code] - weight[a.code] ||
      a.studentName.localeCompare(b.studentName, "tr"),
  );
}

export function lowCompletion(pct: number | null, threshold = 50): boolean {
  return pct != null && pct < threshold;
}
