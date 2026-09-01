/**
 * Öğretmen öğrenci listesi — aksiyon odaklı roster.
 *
 * Saf domain: filtre eşleşmesi ve satır özeti. Yatay yetki sunucu
 * sorgusunda kurulur; bu dosya yalnız görünüm kararını üretir.
 */

export type TeacherRosterFilter =
  | "all"
  | "risky"
  | "help"
  | "overdue"
  | "plan_behind"
  | "upcoming_meeting";

export type TeacherRosterRiskLevel = "none" | "low" | "medium" | "high";

export type TeacherRosterRow = {
  studentId: string;
  name: string;
  groupName: string;
  riskLevel: TeacherRosterRiskLevel;
  riskReason: string | null;
  lastLessonAt: string | null;
  lastLessonTitle: string | null;
  planLabel: string | null;
  examDelta: number | null;
  examDeltaLabel: string | null;
  tags: Exclude<TeacherRosterFilter, "all">[];
};

export type TeacherRosterSourceStudent = {
  studentId: string;
  name: string;
  groupName: string;
  lastLessonAt: Date | null;
  lastLessonTitle: string | null;
  absenceCount14d: number;
  overdueAssignmentCount: number;
  openHelpCount: number;
  planStatus: "DRAFT" | "CHANGE_REQUESTED" | "APPROVED" | "ARCHIVED" | null;
  planCompletionPercent: number | null;
  planTaskTotal: number;
  examDelta: number | null;
  nextLessonAt: Date | null;
};

export type TeacherRosterFlags = {
  adaptivePlan: boolean;
  mockExamAnalysis: boolean;
  studentCheckIn: boolean;
};

export const TEACHER_ROSTER_FILTER_LABELS: Record<TeacherRosterFilter, string> = {
  all: "Tümü",
  risky: "Riskli",
  help: "Yardım isteyen",
  overdue: "Ödev geciktiren",
  plan_behind: "Planı geride",
  upcoming_meeting: "Yaklaşan görüşme",
};

export function parseTeacherRosterFilter(raw: string | string[] | undefined): TeacherRosterFilter {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (
    value === "risky" ||
    value === "help" ||
    value === "overdue" ||
    value === "plan_behind" ||
    value === "upcoming_meeting"
  ) {
    return value;
  }
  return "all";
}

export function deriveTeacherRosterRisk(input: {
  absenceCount14d: number;
  overdueAssignmentCount: number;
  openHelpCount: number;
  planBehind: boolean;
  examDelta: number | null;
}): { level: TeacherRosterRiskLevel; reason: string | null; score: number } {
  const reasons: string[] = [];
  let score = 0;

  if (input.openHelpCount > 0) {
    reasons.push("Açık yardım talebi var");
    score += 25;
  }
  if (input.absenceCount14d >= 2) {
    reasons.push(`Son 14 günde ${input.absenceCount14d} ders kaçırdı`);
    score += 10 * input.absenceCount14d;
  }
  if (input.overdueAssignmentCount >= 1) {
    reasons.push(`${input.overdueAssignmentCount} ödev gecikmiş`);
    score += 10 * input.overdueAssignmentCount;
  }
  if (input.planBehind) {
    reasons.push("Haftalık plan geride");
    score += 15;
  }
  if (input.examDelta != null && input.examDelta >= 3) {
    reasons.push(`Deneme neti ${input.examDelta.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} düştü`);
    score += 15;
  }

  let level: TeacherRosterRiskLevel = "none";
  if (score >= 40) level = "high";
  else if (score >= 20) level = "medium";
  else if (score > 0) level = "low";

  return { level, reason: reasons[0] ?? null, score };
}

export function buildTeacherRosterRows(
  students: TeacherRosterSourceStudent[],
  flags: TeacherRosterFlags,
): TeacherRosterRow[] {
  return students
    .map((student) => {
      const planBehind =
        flags.adaptivePlan &&
        ((student.planStatus === "APPROVED" &&
          student.planTaskTotal >= 3 &&
          student.planCompletionPercent != null &&
          student.planCompletionPercent < 50) ||
          student.planStatus === "DRAFT" ||
          student.planStatus === "CHANGE_REQUESTED");

      const risk = deriveTeacherRosterRisk({
        absenceCount14d: student.absenceCount14d,
        overdueAssignmentCount: student.overdueAssignmentCount,
        openHelpCount: flags.studentCheckIn ? student.openHelpCount : 0,
        planBehind,
        examDelta: flags.mockExamAnalysis ? student.examDelta : null,
      });

      const tags: TeacherRosterRow["tags"] = [];
      if (risk.level !== "none") tags.push("risky");
      if (flags.studentCheckIn && student.openHelpCount > 0) tags.push("help");
      if (student.overdueAssignmentCount > 0) tags.push("overdue");
      if (planBehind) tags.push("plan_behind");
      if (student.nextLessonAt) tags.push("upcoming_meeting");

      let planLabel: string | null = null;
      if (flags.adaptivePlan) {
        if (!student.planStatus) planLabel = "Plan yok";
        else if (student.planStatus === "DRAFT") planLabel = "Onay bekliyor";
        else if (student.planStatus === "CHANGE_REQUESTED") planLabel = "Değişiklik talebi";
        else if (student.planCompletionPercent != null) planLabel = `%${student.planCompletionPercent}`;
        else planLabel = "Onaylı";
      }

      const examDelta = flags.mockExamAnalysis ? student.examDelta : null;
      let examDeltaLabel: string | null = null;
      if (examDelta != null) {
        const formatted = Math.abs(examDelta).toLocaleString("tr-TR", { maximumFractionDigits: 1 });
        examDeltaLabel = examDelta > 0 ? `−${formatted}` : examDelta < 0 ? `+${formatted}` : "0";
      }

      return {
        studentId: student.studentId,
        name: student.name,
        groupName: student.groupName,
        riskLevel: risk.level,
        riskReason: risk.reason,
        lastLessonAt: student.lastLessonAt?.toISOString() ?? null,
        lastLessonTitle: student.lastLessonTitle,
        planLabel,
        examDelta,
        examDeltaLabel,
        tags,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

export function filterTeacherRosterRows(
  rows: TeacherRosterRow[],
  filter: TeacherRosterFilter,
): TeacherRosterRow[] {
  if (filter === "all") return rows;
  return rows.filter((row) => row.tags.includes(filter));
}

export function visibleTeacherRosterFilters(flags: TeacherRosterFlags): TeacherRosterFilter[] {
  const filters: TeacherRosterFilter[] = ["all", "risky", "overdue", "upcoming_meeting"];
  if (flags.studentCheckIn) filters.splice(2, 0, "help");
  if (flags.adaptivePlan) filters.splice(filters.indexOf("overdue") + 1, 0, "plan_behind");
  return filters;
}
