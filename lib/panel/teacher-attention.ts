import { checkInLabels } from "@/lib/student-check-in";
import { netScore } from "@/lib/goals";

/** Son 14 günde tekrarlayan devamsızlık eşiği (güçlü sinyal). */
export const ATTENTION_ABSENT_THRESHOLD = 3;
/** Teslim tarihi geçmiş ve tamamlanmamış çalışma eşiği. */
export const ATTENTION_OVERDUE_ASSIGNMENT_THRESHOLD = 2;
/** Son iki deneme arasında aksiyon üreten net düşüşü. */
export const ATTENTION_EXAM_NET_DROP = 8;
export const ATTENTION_WINDOW_DAYS = 14;
export const ATTENTION_EXAM_WINDOW_DAYS = 90;
export const ATTENTION_MAX_VISIBLE_ITEMS = 8;

export type TeacherAttentionPriority = "P0" | "P1" | "P2";
export type TeacherAttentionSource =
  | "HELP_REQUEST"
  | "LESSON_NOTE"
  | "ATTENDANCE"
  | "ASSIGNMENT"
  | "INTERVENTION"
  | "EXAM";

export type TeacherAttentionCta = {
  label: string;
  href: string;
};

export type TeacherAttentionRow = {
  id: string;
  studentId: string | null;
  studentName: string | null;
  context: string;
  headline: string;
  reason: string;
  source: TeacherAttentionSource;
  priority: TeacherAttentionPriority;
  severity: "overdue" | "high" | "normal";
  createdAt: string;
  dueAt: string | null;
  cta: TeacherAttentionCta;
};

export type TeacherAttentionInbox = {
  rows: TeacherAttentionRow[];
  totalRowCount: number;
  hiddenRowCount: number;
  scopedStudentCount: number;
  quietStudentCount: number;
};

export type TeacherAttentionRosterStudent = {
  id: string;
  name: string;
  groupName: string;
};

export type TeacherAttentionHelpRequest = {
  id: string;
  studentId: string;
  groupName: string;
  barrier: keyof typeof checkInLabels.barrier;
  createdAt: Date;
  dueAt: Date;
};

export type TeacherAttentionPendingNote = {
  id: string;
  groupName: string;
  startsAt: Date;
};

export type TeacherAttentionCount = {
  studentId: string;
  count: number;
};

export type TeacherAttentionIntervention = {
  id: string;
  studentId: string;
  explanation: string;
  dueAt: Date;
};

export type TeacherAttentionExam = {
  studentId: string;
  takenAt: Date;
  sections: Array<{ correctCount: number; incorrectCount: number }>;
};

export type TeacherAttentionSourceData = {
  now: Date;
  roster: TeacherAttentionRosterStudent[];
  helpRequests: TeacherAttentionHelpRequest[];
  pendingNotes: TeacherAttentionPendingNote[];
  attendanceAbsentCounts: TeacherAttentionCount[];
  assignmentOverdueCounts: TeacherAttentionCount[];
  interventions: TeacherAttentionIntervention[];
  exams: TeacherAttentionExam[];
};

export type TeacherAttentionFeatureFlags = {
  studentCheckIn: boolean;
  interventionInbox: boolean;
  mockExamAnalysis: boolean;
};

export type TeacherAttentionQueries = {
  listRoster(teacherId: string): Promise<TeacherAttentionRosterStudent[]>;
  listOpenHelp(teacherId: string): Promise<TeacherAttentionHelpRequest[]>;
  listPendingNotes(teacherId: string, now: Date, since: Date): Promise<TeacherAttentionPendingNote[]>;
  countAbsences(teacherId: string, studentIds: string[], since: Date): Promise<TeacherAttentionCount[]>;
  countOverdueAssignments(teacherId: string, studentIds: string[], now: Date): Promise<TeacherAttentionCount[]>;
  listOpenInterventions(teacherId: string): Promise<TeacherAttentionIntervention[]>;
  listRecentExams(teacherId: string, studentIds: string[], since: Date): Promise<TeacherAttentionExam[]>;
};

const PRIORITY_RANK: Record<TeacherAttentionPriority, number> = { P0: 0, P1: 1, P2: 2 };
const P2_SOURCE_RANK: Record<TeacherAttentionSource, number> = {
  HELP_REQUEST: 0,
  LESSON_NOTE: 0,
  INTERVENTION: 0,
  ATTENDANCE: 1,
  ASSIGNMENT: 2,
  EXAM: 3,
};

export function formatAttentionAge(from: Date, now: Date): string {
  const ms = now.getTime() - from.getTime();
  if (ms < 60_000) return "az önce";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes} dakika önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

function examTotalNet(sections: TeacherAttentionExam["sections"]): number {
  return sections.reduce((sum, section) => sum + netScore(section.correctCount, section.incorrectCount), 0);
}

function latestTwoExamNets(exams: TeacherAttentionExam[]): Map<string, { previous: number; latest: number; takenAt: Date }> {
  const byStudent = new Map<string, TeacherAttentionExam[]>();
  for (const exam of exams) {
    const list = byStudent.get(exam.studentId);
    if (list) list.push(exam);
    else byStudent.set(exam.studentId, [exam]);
  }

  const trends = new Map<string, { previous: number; latest: number; takenAt: Date }>();
  for (const [studentId, list] of byStudent) {
    const ordered = [...list].sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
    if (ordered.length < 2) continue;
    const latest = examTotalNet(ordered[0].sections);
    const previous = examTotalNet(ordered[1].sections);
    trends.set(studentId, { previous, latest, takenAt: ordered[0].takenAt });
  }
  return trends;
}

function formatNet(value: number): string {
  return value.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}

export function buildTeacherAttentionInbox(input: TeacherAttentionSourceData): TeacherAttentionInbox {
  const rosterById = new Map<string, TeacherAttentionRosterStudent>();
  for (const student of input.roster) {
    if (!rosterById.has(student.id)) rosterById.set(student.id, student);
  }

  const rows: TeacherAttentionRow[] = [];

  for (const request of input.helpRequests) {
    const student = rosterById.get(request.studentId);
    if (!student) continue;
    const overdue = request.dueAt.getTime() < input.now.getTime();
    rows.push({
      id: `help:${request.id}`,
      studentId: student.id,
      studentName: student.name,
      context: request.groupName || student.groupName,
      headline: overdue
        ? `Yardım istedi · süresi geçti`
        : `Yardım istedi · ${formatAttentionAge(request.createdAt, input.now)}`,
      reason: checkInLabels.barrier[request.barrier],
      source: "HELP_REQUEST",
      priority: "P0",
      severity: overdue ? "overdue" : "high",
      createdAt: request.createdAt.toISOString(),
      dueAt: request.dueAt.toISOString(),
      cta: { label: "Yanıtla", href: `/panel/ogretmen/yardim#yardim-${request.id}` },
    });
  }

  const absentByStudent = new Map<string, number>();
  for (const row of input.attendanceAbsentCounts) {
    absentByStudent.set(row.studentId, (absentByStudent.get(row.studentId) ?? 0) + row.count);
  }
  for (const [studentId, count] of absentByStudent) {
    if (count < ATTENTION_ABSENT_THRESHOLD) continue;
    const student = rosterById.get(studentId);
    if (!student) continue;
    rows.push({
      id: `attendance:${studentId}`,
      studentId,
      studentName: student.name,
      context: student.groupName,
      headline: `Son ${ATTENTION_WINDOW_DAYS} günde ${count} devamsızlık`,
      reason: `Son ${ATTENTION_WINDOW_DAYS} günde ${count} derse katılmadı.`,
      source: "ATTENDANCE",
      priority: "P2",
      severity: count >= ATTENTION_ABSENT_THRESHOLD + 1 ? "high" : "normal",
      createdAt: input.now.toISOString(),
      dueAt: null,
      cta: { label: "Öğrenciyi Gör", href: `/panel/ogretmen/ogrenci/${studentId}` },
    });
  }

  const overdueByStudent = new Map<string, number>();
  for (const row of input.assignmentOverdueCounts) {
    overdueByStudent.set(row.studentId, (overdueByStudent.get(row.studentId) ?? 0) + row.count);
  }
  for (const [studentId, count] of overdueByStudent) {
    if (count < ATTENTION_OVERDUE_ASSIGNMENT_THRESHOLD) continue;
    const student = rosterById.get(studentId);
    if (!student) continue;
    rows.push({
      id: `assignment:${studentId}`,
      studentId,
      studentName: student.name,
      context: student.groupName,
      headline: `${count} çalışma teslim tarihi geçti`,
      reason: `Teslim tarihi geçmiş ${count} çalışma henüz tamamlanmadı.`,
      source: "ASSIGNMENT",
      priority: "P2",
      severity: "high",
      createdAt: input.now.toISOString(),
      dueAt: null,
      cta: { label: "Öğrenciyi Gör", href: `/panel/ogretmen/ogrenci/${studentId}` },
    });
  }

  for (const item of input.interventions) {
    const student = rosterById.get(item.studentId);
    if (!student) continue;
    const overdue = item.dueAt.getTime() < input.now.getTime();
    rows.push({
      id: `intervention:${item.id}`,
      studentId: student.id,
      studentName: student.name,
      context: student.groupName,
      headline: overdue ? "Açık müdahale kaydı · süresi geçti" : "Açık müdahale kaydı",
      reason: item.explanation,
      source: "INTERVENTION",
      priority: "P2",
      severity: overdue ? "overdue" : "high",
      createdAt: input.now.toISOString(),
      dueAt: item.dueAt.toISOString(),
      cta: { label: "Müdahaleyi Gör", href: "/panel/ogretmen/mudahale" },
    });
  }

  for (const [studentId, trend] of latestTwoExamNets(input.exams)) {
    const drop = trend.previous - trend.latest;
    if (drop < ATTENTION_EXAM_NET_DROP) continue;
    const student = rosterById.get(studentId);
    if (!student) continue;
    rows.push({
      id: `exam:${studentId}`,
      studentId,
      studentName: student.name,
      context: student.groupName,
      headline: "Son iki denemede net geriledi",
      reason: `Son iki denemede net ${formatNet(trend.previous)} → ${formatNet(trend.latest)}.`,
      source: "EXAM",
      priority: "P2",
      severity: "high",
      createdAt: trend.takenAt.toISOString(),
      dueAt: null,
      cta: { label: "Öğrenciyi Gör", href: `/panel/ogretmen/ogrenci/${studentId}` },
    });
  }

  const ranked = rankTeacherAttentionRows(rows);
  const seenStudents = new Set<string>();
  const deduped: TeacherAttentionRow[] = [];
  for (const row of ranked) {
    if (row.studentId) {
      if (seenStudents.has(row.studentId)) continue;
      seenStudents.add(row.studentId);
    }
    deduped.push(row);
  }

  const totalRowCount = deduped.length;
  const visibleRows = deduped.slice(0, ATTENTION_MAX_VISIBLE_ITEMS);
  const scopedStudentCount = rosterById.size;
  return {
    rows: visibleRows,
    totalRowCount,
    hiddenRowCount: Math.max(0, totalRowCount - visibleRows.length),
    scopedStudentCount,
    quietStudentCount: Math.max(0, scopedStudentCount - seenStudents.size),
  };
}

export function rankTeacherAttentionRows(rows: TeacherAttentionRow[]): TeacherAttentionRow[] {
  return [...rows].sort((a, b) => {
    const priority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priority !== 0) return priority;

    if (a.priority === "P0") {
      const aOverdue = a.severity === "overdue" ? 0 : 1;
      const bOverdue = b.severity === "overdue" ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;
      const byTime = (a.dueAt ?? a.createdAt).localeCompare(b.dueAt ?? b.createdAt);
      return byTime !== 0 ? byTime : a.id.localeCompare(b.id);
    }

    if (a.priority === "P1") {
      const byTime = a.createdAt.localeCompare(b.createdAt);
      return byTime !== 0 ? byTime : a.id.localeCompare(b.id);
    }

    const source = P2_SOURCE_RANK[a.source] - P2_SOURCE_RANK[b.source];
    if (source !== 0) return source;
    const aOverdue = a.severity === "overdue" ? 0 : 1;
    const bOverdue = b.severity === "overdue" ? 0 : 1;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;
    const byTime = (a.dueAt ?? a.createdAt).localeCompare(b.dueAt ?? b.createdAt);
    return byTime !== 0 ? byTime : a.id.localeCompare(b.id);
  });
}

export async function loadTeacherAttentionInbox(input: {
  teacherId: string;
  now?: Date;
  flags?: TeacherAttentionFeatureFlags;
  queries: TeacherAttentionQueries;
}): Promise<TeacherAttentionInbox> {
  const now = input.now ?? new Date();
  const flags = input.flags ?? {
    studentCheckIn: false,
    interventionInbox: false,
    mockExamAnalysis: false,
  };
  const since = new Date(now.getTime() - ATTENTION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const examSince = new Date(now.getTime() - ATTENTION_EXAM_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [roster, helpRequests, interventions] = await Promise.all([
    input.queries.listRoster(input.teacherId),
    flags.studentCheckIn ? input.queries.listOpenHelp(input.teacherId) : Promise.resolve([]),
    flags.interventionInbox ? input.queries.listOpenInterventions(input.teacherId) : Promise.resolve([]),
  ]);

  const studentIds = [...new Set(roster.map((student) => student.id))];
  const [attendanceAbsentCounts, assignmentOverdueCounts, exams] = studentIds.length
    ? await Promise.all([
        input.queries.countAbsences(input.teacherId, studentIds, since),
        input.queries.countOverdueAssignments(input.teacherId, studentIds, now),
        flags.mockExamAnalysis
          ? input.queries.listRecentExams(input.teacherId, studentIds, examSince)
          : Promise.resolve([]),
      ])
    : [[], [], []];

  return buildTeacherAttentionInbox({
    now,
    roster,
    helpRequests,
    pendingNotes: [],
    attendanceAbsentCounts,
    assignmentOverdueCounts,
    interventions,
    exams,
  });
}
