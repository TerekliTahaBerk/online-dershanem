/**
 * Round 5 — Parent insight aggregator.
 *
 * Bir velinin tüm çocukları için "haftalık özet" datası:
 *  - Devamsızlık (son 7 gün)
 *  - Bekleyen / geciken ödev
 *  - Son ödev puanları
 *  - Yaklaşan dersler (sonraki 7 gün)
 *  - Son deneme net (ODK)
 *  - Kritik uyarılar (absent ≥3/hafta, overdue ≥2, hiç deneme yok ≥30g)
 *
 * Hem `/panel/veli` dashboard'unda hem haftalık digest e-postada kullanılır.
 */
import "server-only";
import { prisma } from "@/lib/prisma";

export type ParentChildSummary = {
  studentId: string;
  fullName: string;
  classLevel: string | null;
  examType: string | null;
  attendance7: { total: number; present: number; absent: number; late: number };
  pendingAssignments: number;
  overdueAssignments: number;
  lastGradedScore: number | null;
  lastGradedTitle: string | null;
  upcomingLessons7: number;
  lastOdkNet: number | null;
  lastOdkExam: string | null;
  alerts: ParentAlert[];
};

export type ParentAlert = {
  id: string;
  severity: "info" | "warning" | "critical";
  message: string;
};

const SINCE = (days: number) => new Date(Date.now() - days * 86400000);
const UNTIL = (days: number) => new Date(Date.now() + days * 86400000);

export async function getParentChildSummaries(parentId: string): Promise<ParentChildSummary[]> {
  const links = await prisma.parentStudent.findMany({
    where: { parentId },
    include: {
      student: { select: { id: true, fullName: true, classLevel: true, examType: true, userId: true } },
    },
  });
  if (links.length === 0) return [];

  const studentIds = links.map((l) => l.student.id);
  const userIds = links.map((l) => l.student.userId).filter((u): u is string => !!u);
  const since7 = SINCE(7);
  const since30 = SINCE(30);
  const upTo7 = UNTIL(7);
  const now = new Date();

  const [att7, pending, overdueRows, lastGraded, upcoming, lastOdk] = await Promise.all([
    prisma.attendance.findMany({
      where: { studentId: { in: studentIds }, sessionDate: { gte: since7 } },
      select: { studentId: true, status: true },
    }),
    prisma.assignment.findMany({
      where: {
        OR: [
          { studentId: { in: studentIds } },
          { classroom: { students: { some: { studentId: { in: studentIds }, leftAt: null } } } },
        ],
        dueAt: { gte: now },
        submissions: { none: { studentId: { in: studentIds }, submittedAt: { not: null } } },
      },
      select: { id: true, studentId: true, classroomId: true },
    }),
    prisma.$queryRawUnsafe<{ studentId: string; cnt: bigint }[]>(
      `SELECT a."studentId" as "studentId", COUNT(DISTINCT a."id")::bigint as cnt
       FROM "Assignment" a
       WHERE a."dueAt" < NOW()
         AND a."studentId" = ANY($1::text[])
         AND NOT EXISTS (
           SELECT 1 FROM "AssignmentSubmission" s
           WHERE s."assignmentId" = a."id" AND s."studentId" = a."studentId" AND s."submittedAt" IS NOT NULL
         )
       GROUP BY a."studentId"`,
      studentIds,
    ).catch(() => [] as { studentId: string; cnt: bigint }[]),
    prisma.assignmentSubmission.findMany({
      where: { studentId: { in: studentIds }, status: "GRADED", score: { not: null } },
      orderBy: { gradedAt: "desc" },
      take: studentIds.length * 3,
      select: { studentId: true, score: true, gradedAt: true, assignment: { select: { title: true } } },
    }),
    prisma.lesson.findMany({
      where: {
        OR: [
          { studentId: { in: studentIds } },
          { classroom: { students: { some: { studentId: { in: studentIds }, leftAt: null } } } },
        ],
        scheduledAt: { gte: now, lte: upTo7 },
        status: "SCHEDULED",
      },
      select: { id: true, studentId: true, classroomId: true },
    }),
    userIds.length
      ? prisma.odkExamAttempt.findMany({
          where: { userId: { in: userIds }, status: "SUBMITTED" },
          orderBy: { submittedAt: "desc" },
          take: userIds.length * 2,
          select: { userId: true, correctCount: true, wrongCount: true, submittedAt: true, exam: { select: { title: true } } },
        })
      : Promise.resolve([] as { userId: string; correctCount: number; wrongCount: number; submittedAt: Date | null; exam: { title: string } | null }[]),
  ]);

  // Index: classroomId → studentIds (for classroom-wide assignments/lessons)
  const classroomMembers = await prisma.classroomStudent.findMany({
    where: { studentId: { in: studentIds }, leftAt: null },
    select: { studentId: true, classroomId: true },
  });
  const classroomToStudents = new Map<string, Set<string>>();
  for (const cm of classroomMembers) {
    const set = classroomToStudents.get(cm.classroomId) ?? new Set();
    set.add(cm.studentId);
    classroomToStudents.set(cm.classroomId, set);
  }

  function countForStudent(rows: { studentId: string | null; classroomId: string | null }[], sid: string): number {
    let n = 0;
    for (const r of rows) {
      if (r.studentId === sid) n++;
      else if (r.classroomId && classroomToStudents.get(r.classroomId)?.has(sid)) n++;
    }
    return n;
  }

  const overdueMap = new Map(overdueRows.map((r) => [r.studentId, Number(r.cnt)]));
  const userToStudent = new Map(links.map((l) => [l.student.userId, l.student.id] as const));

  return links.map(({ student }) => {
    const sid = student.id;
    const myAtt = att7.filter((a) => a.studentId === sid);
    const present = myAtt.filter((a) => a.status === "PRESENT").length;
    const absent = myAtt.filter((a) => a.status === "ABSENT").length;
    const late = myAtt.filter((a) => a.status === "LATE").length;

    const pendingCnt = countForStudent(pending, sid);
    const overdueCnt = overdueMap.get(sid) ?? 0;
    const upcomingCnt = countForStudent(upcoming, sid);

    const myGraded = lastGraded.find((g) => g.studentId === sid);
    const myOdk = student.userId ? lastOdk.find((o) => o.userId === student.userId) : null;
    const odkNet = myOdk ? Math.round((myOdk.correctCount - myOdk.wrongCount / 4) * 100) / 100 : null;

    const alerts: ParentAlert[] = [];
    if (absent >= 3) {
      alerts.push({ id: `${sid}-absent`, severity: "critical", message: `Son 7 günde ${absent} devamsızlık` });
    } else if (absent >= 2) {
      alerts.push({ id: `${sid}-absent-warn`, severity: "warning", message: `Son 7 günde ${absent} devamsızlık` });
    }
    if (overdueCnt >= 2) {
      alerts.push({ id: `${sid}-overdue`, severity: "critical", message: `${overdueCnt} geciken ödev` });
    } else if (overdueCnt >= 1) {
      alerts.push({ id: `${sid}-overdue-warn`, severity: "warning", message: `${overdueCnt} geciken ödev` });
    }
    if (pendingCnt >= 3) {
      alerts.push({ id: `${sid}-pending`, severity: "info", message: `${pendingCnt} bekleyen ödev (vade dolmadı)` });
    }
    if (student.userId && !myOdk) {
      // Hiç ODK denemesi yok — sadece info olarak
      const last30 = lastOdk.find((o) => userToStudent.get(o.userId) === sid && o.submittedAt && o.submittedAt > since30);
      if (!last30) {
        alerts.push({ id: `${sid}-no-odk`, severity: "info", message: "Son 30 günde deneme yok" });
      }
    }

    return {
      studentId: sid,
      fullName: student.fullName,
      classLevel: student.classLevel,
      examType: student.examType,
      attendance7: { total: myAtt.length, present, absent, late },
      pendingAssignments: pendingCnt,
      overdueAssignments: overdueCnt,
      lastGradedScore: myGraded?.score ?? null,
      lastGradedTitle: myGraded?.assignment.title ?? null,
      upcomingLessons7: upcomingCnt,
      lastOdkNet: odkNet,
      lastOdkExam: myOdk?.exam?.title ?? null,
      alerts,
    };
  });
}

export function summaryHasCriticalAlert(s: ParentChildSummary): boolean {
  return s.alerts.some((a) => a.severity === "critical");
}
