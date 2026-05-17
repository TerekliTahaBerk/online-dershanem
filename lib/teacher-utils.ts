/**
 * Round 4 — Teacher utility layer.
 *
 * - `getTeacherStudentRisks(teacherId, studentIds)` → öğretmenin kendi
 *   öğrencileri için risk skoru map (cache'li, 5dk TTL).
 * - `getNextPendingSubmissionId(teacherId, currentSubmissionId)` →
 *   submission grade auto-advance için sıradaki SUBMITTED gönderim.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { cacheWrap } from "@/lib/cache";

export type TeacherRiskRow = {
  studentId: string;
  score: number;
  level: "low" | "medium" | "high";
};

/**
 * Lightweight risk: son 30g devamsızlık + geciken ödev sayısı.
 * Full `computeStudentRisk` çağırmak yerine inline aggregate — N öğrenci için tek sorgu çifti.
 */
async function computeTeacherRisks(teacherId: string, studentIds: string[]): Promise<Map<string, TeacherRiskRow>> {
  if (studentIds.length === 0) return new Map();
  const since30 = new Date(Date.now() - 30 * 86400000);

  const [attGroups, overdueGroups] = await Promise.all([
    prisma.attendance.groupBy({
      by: ["studentId", "status"],
      where: { studentId: { in: studentIds }, sessionDate: { gte: since30 } },
      _count: { _all: true },
    }),
    prisma.$queryRawUnsafe<{ studentId: string; cnt: bigint }[]>(
      `SELECT a."studentId" as "studentId", COUNT(DISTINCT a."id")::bigint as cnt
       FROM "Assignment" a
       WHERE a."dueAt" < NOW()
         AND a."studentId" = ANY($1::text[])
         AND a."teacherId" = $2
         AND NOT EXISTS (
           SELECT 1 FROM "AssignmentSubmission" s
           WHERE s."assignmentId" = a."id" AND s."studentId" = a."studentId" AND s."submittedAt" IS NOT NULL
         )
       GROUP BY a."studentId"`,
      studentIds,
      teacherId,
    ).catch(() => [] as { studentId: string; cnt: bigint }[]),
  ]);

  const attMap = new Map<string, { total: number; absent: number }>();
  for (const g of attGroups) {
    const cur = attMap.get(g.studentId) ?? { total: 0, absent: 0 };
    cur.total += g._count._all;
    if (g.status === "ABSENT") cur.absent += g._count._all;
    attMap.set(g.studentId, cur);
  }
  const overdueMap = new Map(overdueGroups.map((g) => [g.studentId, Number(g.cnt)]));

  const out = new Map<string, TeacherRiskRow>();
  for (const sid of studentIds) {
    let score = 0;
    const att = attMap.get(sid);
    if (att && att.total > 0) {
      const rate = (att.absent / att.total) * 100;
      if (rate >= 30) score += 30;
      else if (rate >= 15) score += 15;
    }
    const overdue = overdueMap.get(sid) ?? 0;
    if (overdue >= 5) score += 25;
    else if (overdue >= 2) score += 12;
    score = Math.min(100, score);
    const level: TeacherRiskRow["level"] = score >= 70 ? "high" : score >= 40 ? "medium" : "low";
    out.set(sid, { studentId: sid, score, level });
  }
  return out;
}

export async function getTeacherStudentRisks(
  teacherId: string,
  studentIds: string[],
): Promise<Map<string, TeacherRiskRow>> {
  // Cache key: teacher + sorted student id hash
  const sorted = [...studentIds].sort().join(",");
  const keyHash = sorted.length > 80 ? `${sorted.length}:${sorted.slice(0, 60)}` : sorted;
  const key = `teacher:risk:${teacherId}:${keyHash}`;
  const cached = await cacheWrap<TeacherRiskRow[]>(key, 300, async () => {
    const m = await computeTeacherRisks(teacherId, studentIds);
    return Array.from(m.values());
  });
  return new Map(cached.map((r) => [r.studentId, r]));
}

/**
 * Bir gönderim puanlandıktan sonra, **aynı ödev** içinde sıradaki SUBMITTED
 * (henüz GRADED olmamış) gönderimin id'sini döner. Yoksa null.
 *
 * Auto-advance UX: öğretmen "Kaydet"e basınca otomatik bir sonraki öğrenciye geçer.
 */
export async function getNextPendingSubmissionId(
  teacherId: string,
  currentSubmissionId: string,
): Promise<{ assignmentId: string; nextSubmissionId: string | null } | null> {
  const cur = await prisma.assignmentSubmission.findUnique({
    where: { id: currentSubmissionId },
    include: { assignment: { select: { id: true, teacherId: true } } },
  });
  if (!cur || cur.assignment.teacherId !== teacherId) return null;
  const next = await prisma.assignmentSubmission.findFirst({
    where: {
      assignmentId: cur.assignmentId,
      id: { not: currentSubmissionId },
      status: "SUBMITTED",
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return { assignmentId: cur.assignmentId, nextSubmissionId: next?.id ?? null };
}
