import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * ÖĞRETMEN ÖDEVLERİ yükleyicisi.
 *
 *  - `loadTeacherAssignmentRows`: web `app/panel/ogretmen/odevler` ile mobil
 *    `GET /api/panel/staff/teacher/assignments` aynı sorguyu kullanır
 *    (öğretmenin gruplarının ödevleri).
 *  - Değerlendirme kuyruğu / ayrıntısı: MEVCUT değerlendirme ucunun kapsamıyla
 *    birebir (`SUBMITTED`, aktif ödev, öğretmenin AKTİF grubu, öğrencinin
 *    AKTİF kaydı). Kuyrukta görünen her teslim uçta da değerlendirilebilir.
 */
export async function loadTeacherAssignmentRows(teacherId: string) {
  return prisma.assignment.findMany({
      where: { group: { teacherId: teacherId } },
      orderBy: [{ isActive: "desc" }, { dueAt: "asc" }],
      take: 60,
      include: {
        group: { select: { name: true } },
        progress: { select: { status: true, studentId: true } },
        outcomeLinks: { include: { outcome: { select: { code: true } } } },
        rubricCriteria: { orderBy: { position: "asc" } },
        submissions: {
          orderBy: { submittedAt: "asc" },
          include: {
            student: {
              include: { user: { select: { fullName: true, email: true } } },
            },
            scores: true,
          },
        },
      },
    });
}

const reviewScope = (teacherId: string) => ({ status: "SUBMITTED" as const, assignment: { isActive: true, group: { teacherId, isActive: true } } });

async function enrolled(rows: Array<{ studentId: string; assignment: { groupId: string } }>) {
  if (!rows.length) return new Set<string>();
  const active = await prisma.enrollment.findMany({
    where: { endedAt: null, OR: rows.map((row) => ({ studentId: row.studentId, groupId: row.assignment.groupId })) },
    select: { studentId: true, groupId: true },
  });
  return new Set(active.map((row) => `${row.studentId}:${row.groupId}`));
}

export async function loadTeacherSubmissionQueue(teacherId: string) {
  const rows = await prisma.assignmentSubmission.findMany({
    where: reviewScope(teacherId),
    orderBy: { submittedAt: "asc" },
    take: 60,
    select: {
      id: true,
      studentId: true,
      attemptNumber: true,
      submittedAt: true,
      student: { select: { user: { select: { fullName: true, email: true } } } },
      assignment: { select: { title: true, groupId: true, group: { select: { name: true } } } },
    },
  });
  const active = await enrolled(rows);
  return rows.filter((row) => active.has(`${row.studentId}:${row.assignment.groupId}`));
}

export async function loadTeacherSubmission(teacherId: string, id: string) {
  const row = await prisma.assignmentSubmission.findFirst({
    where: { id, assignment: { isActive: true, group: { teacherId, isActive: true } } },
    select: {
      id: true,
      version: true,
      status: true,
      attemptNumber: true,
      submittedAt: true,
      textEvidence: true,
      studentId: true,
      assignmentId: true,
      student: { select: { user: { select: { fullName: true, email: true } } } },
      assignment: { select: { id: true, title: true, description: true, dueAt: true, groupId: true, group: { select: { name: true } }, rubricCriteria: { orderBy: { position: "asc" }, select: { id: true, label: true } } } },
    },
  });
  if (!row) return null;
  if (!(await enrolled([row])).has(`${row.studentId}:${row.assignment.groupId}`)) return null;
  const previous = await prisma.assignmentSubmission.findMany({
    where: { assignmentId: row.assignmentId, studentId: row.studentId, attemptNumber: { lt: row.attemptNumber } },
    orderBy: { attemptNumber: "desc" },
    take: 5,
    select: { attemptNumber: true, status: true, feedback: true, reviewedAt: true, scores: { select: { criterionId: true, level: true } } },
  });
  return { ...row, previous };
}
