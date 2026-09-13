/**
 * ÖĞRETMEN GÜNLÜK ÇALIŞMA ALANI — saf domain mantığı.
 *
 * "Bugün ne yapmam gerekiyor?" sorusunu cevaplayan ana sayfa bölümlerini
 * üretir. Veritabanına dokunmaz; feature flag kapalıysa ilgili kalemler
 * kaynağa hiç girmez ve UI sadeleşir.
 */

export type TeacherWorkspaceFlags = {
  quickLessonClose: boolean;
  interventionInbox: boolean;
  adaptivePlan: boolean;
  reviewQueue: boolean;
  studentCheckIn: boolean;
  mockExamAnalysis: boolean;
  assignmentEvidence: boolean;
};

export type TeacherWorkspaceLessonPrep = "needs_prep" | "ready" | "needs_close" | "closed";

export type TeacherWorkspaceLesson = {
  id: string;
  startsAt: string;
  endsAt: string;
  title: string;
  groupId: string;
  groupName: string;
  subject: string;
  lessonType: "ONE_TO_ONE" | "GROUP";
  studentCount: number;
  primaryStudentId: string | null;
  prepStatus: TeacherWorkspaceLessonPrep;
  prepLabel: string;
  meetingUrl: string | null;
  materialCount: number;
  status: "PLANNED" | "COMPLETED" | "CANCELLED";
};

export type TeacherWorkspacePendingKind =
  | "LESSON_CLOSE"
  | "UNGRADED_ASSIGNMENT"
  | "HELP_REQUEST"
  | "INTERVENTION"
  | "PLAN_APPROVAL"
  | "REVIEW_QUEUE";

export type TeacherWorkspacePendingItem = {
  id: string;
  kind: TeacherWorkspacePendingKind;
  title: string;
  detail: string;
  href: string;
  ctaLabel: string;
  dueAt: string | null;
  priority: number;
};

export type TeacherWorkspaceRiskStudent = {
  studentId: string;
  studentName: string;
  groupName: string;
  whyRisky: string;
  lastSignal: string;
  href: string;
  score: number;
};

export type TeacherWorkspaceUpcomingKind = "TOMORROW_LESSON" | "EXAM" | "PLAN_DEADLINE";

export type TeacherWorkspaceUpcomingItem = {
  id: string;
  kind: TeacherWorkspaceUpcomingKind;
  title: string;
  detail: string;
  at: string;
  href: string;
};

export type TeacherWorkspace = {
  generatedAt: string;
  summary: string;
  todayLessons: TeacherWorkspaceLesson[];
  pending: TeacherWorkspacePendingItem[];
  riskyStudents: TeacherWorkspaceRiskStudent[];
  upcoming: TeacherWorkspaceUpcomingItem[];
};

export type TeacherWorkspaceLessonSource = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  title: string;
  status: "PLANNED" | "COMPLETED" | "CANCELLED";
  meetingUrl: string | null;
  groupId: string;
  groupName: string;
  subject: string;
  studentIds: string[];
  hasGroupNote: boolean;
  materialCount: number;
};

export type TeacherWorkspacePendingSource = {
  kind: TeacherWorkspacePendingKind;
  id: string;
  title: string;
  detail: string;
  href: string;
  ctaLabel: string;
  dueAt: Date | null;
  createdAt: Date;
};

export type TeacherWorkspaceRiskSource = {
  studentId: string;
  studentName: string;
  groupName: string;
  whyRisky: string;
  lastSignalAt: Date;
  lastSignalLabel: string;
  score: number;
};

export type TeacherWorkspaceUpcomingSource = {
  kind: TeacherWorkspaceUpcomingKind;
  id: string;
  title: string;
  detail: string;
  at: Date;
  href: string;
};

export type TeacherWorkspaceSourceData = {
  now: Date;
  todayLessons: TeacherWorkspaceLessonSource[];
  pending: TeacherWorkspacePendingSource[];
  riskyStudents: TeacherWorkspaceRiskSource[];
  upcoming: TeacherWorkspaceUpcomingSource[];
};

export const TEACHER_WORKSPACE_MAX_RISK = 8;
export const TEACHER_WORKSPACE_MAX_PENDING = 12;
export const TEACHER_WORKSPACE_MAX_UPCOMING = 8;

const PENDING_PRIORITY: Record<TeacherWorkspacePendingKind, number> = {
  HELP_REQUEST: 0,
  LESSON_CLOSE: 1,
  INTERVENTION: 2,
  UNGRADED_ASSIGNMENT: 3,
  PLAN_APPROVAL: 4,
  REVIEW_QUEUE: 5,
};

const PREP_LABELS: Record<TeacherWorkspaceLessonPrep, string> = {
  needs_prep: "Hazırlık eksik",
  ready: "Hazır",
  needs_close: "Kapanış bekliyor",
  closed: "Kapandı",
};

export function deriveLessonPrepStatus(input: {
  status: TeacherWorkspaceLessonSource["status"];
  startsAt: Date;
  hasGroupNote: boolean;
  materialCount: number;
  now: Date;
}): TeacherWorkspaceLessonPrep {
  if (input.status === "COMPLETED") return "closed";
  if (input.startsAt.getTime() <= input.now.getTime() && !input.hasGroupNote) return "needs_close";
  if (input.hasGroupNote || input.materialCount > 0) return "ready";
  return "needs_prep";
}

export function mapWorkspaceLesson(
  lesson: TeacherWorkspaceLessonSource,
  now: Date,
): TeacherWorkspaceLesson {
  const studentCount = lesson.studentIds.length;
  const prepStatus = deriveLessonPrepStatus({
    status: lesson.status,
    startsAt: lesson.startsAt,
    hasGroupNote: lesson.hasGroupNote,
    materialCount: lesson.materialCount,
    now,
  });
  return {
    id: lesson.id,
    startsAt: lesson.startsAt.toISOString(),
    endsAt: lesson.endsAt.toISOString(),
    title: lesson.title,
    groupId: lesson.groupId,
    groupName: lesson.groupName,
    subject: lesson.subject,
    lessonType: studentCount <= 1 ? "ONE_TO_ONE" : "GROUP",
    studentCount,
    primaryStudentId: studentCount === 1 ? lesson.studentIds[0] ?? null : null,
    prepStatus,
    prepLabel: PREP_LABELS[prepStatus],
    meetingUrl: lesson.meetingUrl,
    materialCount: lesson.materialCount,
    status: lesson.status,
  };
}

export function buildTeacherWorkspace(input: TeacherWorkspaceSourceData): TeacherWorkspace {
  const todayLessons = input.todayLessons
    .filter((lesson) => lesson.status !== "CANCELLED")
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
    .map((lesson) => mapWorkspaceLesson(lesson, input.now));

  const pending = [...input.pending]
    .sort((a, b) => {
      const byKind = PENDING_PRIORITY[a.kind] - PENDING_PRIORITY[b.kind];
      if (byKind !== 0) return byKind;
      const aDue = a.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;
      const bDue = b.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;
      if (aDue !== bDue) return aDue - bDue;
      return a.createdAt.getTime() - b.createdAt.getTime();
    })
    .slice(0, TEACHER_WORKSPACE_MAX_PENDING)
    .map((item) => ({
      id: `${item.kind}:${item.id}`,
      kind: item.kind,
      title: item.title,
      detail: item.detail,
      href: item.href,
      ctaLabel: item.ctaLabel,
      dueAt: item.dueAt?.toISOString() ?? null,
      priority: PENDING_PRIORITY[item.kind],
    }));

  const riskyStudents = [...input.riskyStudents]
    .sort((a, b) => b.score - a.score || a.studentName.localeCompare(b.studentName, "tr"))
    .slice(0, TEACHER_WORKSPACE_MAX_RISK)
    .map((row) => ({
      studentId: row.studentId,
      studentName: row.studentName,
      groupName: row.groupName,
      whyRisky: row.whyRisky,
      lastSignal: row.lastSignalLabel,
      href: `/panel/ogretmen/ogrenci/${row.studentId}`,
      score: row.score,
    }));

  const upcoming = [...input.upcoming]
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, TEACHER_WORKSPACE_MAX_UPCOMING)
    .map((item) => ({
      id: `${item.kind}:${item.id}`,
      kind: item.kind,
      title: item.title,
      detail: item.detail,
      at: item.at.toISOString(),
      href: item.href,
    }));

  const summaryParts = [
    todayLessons.length ? `${todayLessons.length} ders` : null,
    pending.length ? `${pending.length} bekleyen iş` : null,
    riskyStudents.length ? `${riskyStudents.length} riskli öğrenci` : null,
  ].filter((part): part is string => Boolean(part));

  return {
    generatedAt: input.now.toISOString(),
    summary: summaryParts.join(" · ") || "Bugün planlanmış iş yok.",
    todayLessons,
    pending,
    riskyStudents,
    upcoming,
  };
}

export function lessonTypeLabel(type: TeacherWorkspaceLesson["lessonType"]): string {
  return type === "ONE_TO_ONE" ? "Birebir" : "Grup";
}

export function pendingKindLabel(kind: TeacherWorkspacePendingKind): string {
  switch (kind) {
    case "LESSON_CLOSE":
      return "Ders kapanışı";
    case "UNGRADED_ASSIGNMENT":
      return "Ödev değerlendirme";
    case "HELP_REQUEST":
      return "Yardım talebi";
    case "INTERVENTION":
      return "Müdahale";
    case "PLAN_APPROVAL":
      return "Plan onayı";
    case "REVIEW_QUEUE":
      return "Tekrar kuyruğu";
  }
}

export function upcomingKindLabel(kind: TeacherWorkspaceUpcomingKind): string {
  switch (kind) {
    case "TOMORROW_LESSON":
      return "Yarın";
    case "EXAM":
      return "Deneme";
    case "PLAN_DEADLINE":
      return "Plan";
  }
}
