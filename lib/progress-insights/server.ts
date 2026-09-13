import "server-only";

import { prisma } from "@/lib/prisma";
import { addIstanbulCalendarDays, formatIstanbulDateInput } from "@/lib/istanbul-time";
import {
  computeProgressInsightBundle,
  type ExamInput,
} from "@/lib/progress-insights/compute";
import { buildNarrativeForAudience } from "@/lib/progress-insights/narrative";
import { stripForParentCalm } from "@/lib/progress-insights/privacy";
import { buildTeacherGidisatOverview } from "@/lib/progress-insights/aggregate";
import type {
  InsightAudience,
  ProgressInsightBundle,
  ProgressInsightPeriod,
  TeacherGidisatOverview,
} from "@/lib/progress-insights/types";
import { teacherGroupIds } from "@/lib/panel/teacher-scope";

const ATTENDANCE_TAKE = 12;
const EXAM_TAKE = 8;

function defaultPeriod(now = new Date()): ProgressInsightPeriod {
  const from = addIstanbulCalendarDays(now, -30);
  return {
    label: "Son 30 gün · son 6 deneme",
    fromIso: from.toISOString(),
    toIso: now.toISOString(),
  };
}

async function loadRawStudentInsightData(studentProfileId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: studentProfileId, endedAt: null },
    select: { groupId: true },
  });
  const groupIds = enrollments.map((e) => e.groupId);

  const [profile, attendance, assignments, exams, plan] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      select: {
        id: true,
        classLevel: true,
        user: { select: { fullName: true, email: true } },
      },
    }),
    prisma.attendance.findMany({
      where: { studentId: studentProfileId },
      orderBy: { createdAt: "desc" },
      take: ATTENDANCE_TAKE,
      select: { status: true },
    }),
    groupIds.length
      ? prisma.assignment.findMany({
          where: { isActive: true, groupId: { in: groupIds } },
          include: {
            progress: {
              where: { studentId: studentProfileId },
              select: { status: true },
            },
          },
        })
      : Promise.resolve([]),
    prisma.mockExam.findMany({
      where: { studentId: studentProfileId },
      orderBy: { takenAt: "desc" },
      take: EXAM_TAKE,
      include: { sections: { orderBy: { position: "asc" } } },
    }),
    prisma.weeklyPlan.findFirst({
      where: { studentId: studentProfileId },
      orderBy: { weekStart: "desc" },
      include: { tasks: { select: { status: true } } },
    }),
  ]);

  return { profile, attendance, assignments, exams, plan };
}

function toExamInputs(
  exams: Array<{
    takenAt: Date;
    sections: Array<{
      subjectName: string;
      correctCount: number;
      incorrectCount: number;
    }>;
  }>,
): ExamInput[] {
  return exams.map((exam) => ({
    takenAt: exam.takenAt,
    sections: exam.sections.map((s) => ({
      subjectName: s.subjectName,
      correctCount: s.correctCount,
      incorrectCount: s.incorrectCount,
    })),
  }));
}

export async function loadStudentProgressInsight(input: {
  studentProfileId: string;
  audience: InsightAudience;
  includeExams?: boolean;
  riskHint?: string | null;
  now?: Date;
}): Promise<ProgressInsightBundle | null> {
  const raw = await loadRawStudentInsightData(input.studentProfileId);
  if (!raw.profile) return null;

  const name = raw.profile.user.fullName || raw.profile.user.email;
  const period = defaultPeriod(input.now);

  let bundle = computeProgressInsightBundle({
    studentId: raw.profile.id,
    studentName: name,
    period,
    exams: toExamInputs(raw.exams),
    attendance: raw.attendance,
    assignments: raw.assignments.map((a) => ({
      done: a.progress[0]?.status === "DONE",
    })),
    planTasks: (raw.plan?.tasks ?? []).map((t) => ({ done: t.status === "DONE" })),
    riskHint: input.riskHint ?? null,
    includeExams: input.includeExams,
  });

  bundle = {
    ...bundle,
    narrative: buildNarrativeForAudience(bundle, input.audience),
  };

  if (input.audience === "parent_calm") {
    return stripForParentCalm(bundle);
  }
  return bundle;
}

export async function loadTeacherGidisatOverview(input: {
  teacherUserId: string;
  includeExams?: boolean;
  now?: Date;
}): Promise<TeacherGidisatOverview> {
  const groupIds = await teacherGroupIds(input.teacherUserId);
  const period = defaultPeriod(input.now);

  if (!groupIds.length) {
    return {
      period,
      studentCount: 0,
      averages: {
        attendancePercent: null,
        assignmentPercent: null,
        planPercent: null,
        medianNetDelta: null,
      },
      declining: [],
      rows: [],
      narrative: ["Atanmış aktif grup yok; gidişat özeti boş."],
    };
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { endedAt: null, groupId: { in: groupIds } },
    select: {
      studentId: true,
      student: {
        select: {
          id: true,
          classLevel: true,
          user: { select: { fullName: true, email: true } },
        },
      },
    },
  });

  const uniqueStudents = new Map<
    string,
    { studentId: string; studentName: string; classLevel: string | null }
  >();
  for (const row of enrollments) {
    if (uniqueStudents.has(row.studentId)) continue;
    uniqueStudents.set(row.studentId, {
      studentId: row.student.id,
      studentName: row.student.user.fullName || row.student.user.email,
      classLevel: row.student.classLevel,
    });
  }

  const studentIds = [...uniqueStudents.keys()];
  // Performans: paralel ama öğrenci başına birer sorgu yerine batch
  const [attendanceRows, assignmentRows, exams, plans] = await Promise.all([
    prisma.attendance.findMany({
      where: { studentId: { in: studentIds } },
      orderBy: { createdAt: "desc" },
      select: { studentId: true, status: true, createdAt: true },
    }),
    prisma.assignment.findMany({
      where: { isActive: true, groupId: { in: groupIds } },
      include: {
        progress: {
          where: { studentId: { in: studentIds } },
          select: { studentId: true, status: true },
        },
      },
    }),
    input.includeExams === false
      ? Promise.resolve([])
      : prisma.mockExam.findMany({
          where: { studentId: { in: studentIds } },
          orderBy: { takenAt: "desc" },
          include: { sections: { orderBy: { position: "asc" } } },
        }),
    prisma.weeklyPlan.findMany({
      where: { studentId: { in: studentIds } },
      orderBy: { weekStart: "desc" },
      include: { tasks: { select: { status: true } } },
    }),
  ]);

  // Son N attendance / öğrenci
  const attendanceByStudent = new Map<string, typeof attendanceRows>();
  for (const row of attendanceRows) {
    const list = attendanceByStudent.get(row.studentId) ?? [];
    if (list.length >= ATTENDANCE_TAKE) continue;
    list.push(row);
    attendanceByStudent.set(row.studentId, list);
  }

  const examsByStudent = new Map<string, typeof exams>();
  for (const exam of exams) {
    const list = examsByStudent.get(exam.studentId) ?? [];
    if (list.length >= EXAM_TAKE) continue;
    list.push(exam);
    examsByStudent.set(exam.studentId, list);
  }

  const planByStudent = new Map<string, (typeof plans)[number]>();
  for (const plan of plans) {
    if (!planByStudent.has(plan.studentId)) {
      planByStudent.set(plan.studentId, plan);
    }
  }

  const bundles: ProgressInsightBundle[] = [];
  for (const meta of uniqueStudents.values()) {
    const studentAttendance = attendanceByStudent.get(meta.studentId) ?? [];
    const studentExams = examsByStudent.get(meta.studentId) ?? [];
    const plan = planByStudent.get(meta.studentId);
    const assignmentDoneFlags = assignmentRows.map((a) => {
      const progress = a.progress.find((p) => p.studentId === meta.studentId);
      return { done: progress?.status === "DONE" };
    });

    let bundle = computeProgressInsightBundle({
      studentId: meta.studentId,
      studentName: meta.studentName,
      period,
      exams: toExamInputs(studentExams),
      attendance: studentAttendance,
      assignments: assignmentDoneFlags,
      planTasks: (plan?.tasks ?? []).map((t) => ({ done: t.status === "DONE" })),
      includeExams: input.includeExams,
    });
    bundle = {
      ...bundle,
      narrative: buildNarrativeForAudience(bundle, "teacher"),
    };
    bundles.push(bundle);
  }

  return buildTeacherGidisatOverview({
    period,
    bundles,
    studentMeta: [...uniqueStudents.values()],
  });
}

export function formatPeriodRangeLabel(period: ProgressInsightPeriod): string {
  try {
    const from = formatIstanbulDateInput(new Date(period.fromIso));
    const to = formatIstanbulDateInput(new Date(period.toIso));
    return `${from} – ${to}`;
  } catch {
    return period.label;
  }
}
