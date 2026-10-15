import "server-only";

import { NextResponse } from "next/server";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { transactionalAudit } from "@/lib/panel/education-write";
import { bookletCodesOf, CANONICAL_BOOKLET, pickBalancedBooklet } from "@/lib/odk/booklets";

/**
 * Çoklu kitapçık ataması (sunucu):
 * - Aynı sürümde yeniden giren öğrenci önceki kitapçığını korur.
 * - Yöneticinin başlamadan önce seçtiği kitapçık (atama satırı) önceliklidir.
 * - Aksi hâlde sürümde en az öğrenciye verilmiş kitapçık seçilir; deneme başına
 *   danışma kilidi eşzamanlı başlatmalarda sayımı tutarlı tutar.
 */
type Tx = Prisma.TransactionClient;

export async function chooseAttemptBooklet(tx: Tx, input: { examId: string; versionId: string; studentUserId: string; codes: readonly string[] }): Promise<string> {
  const { examId, versionId, studentUserId, codes } = input;
  if (codes.length <= 1) return codes[0] ?? CANONICAL_BOOKLET;
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`odk-booklet:${examId}`}, 0))::text`;
  const previous = await tx.odkExamAttempt.findFirst({ where: { examId, versionId, studentUserId }, orderBy: { attemptNumber: "desc" }, select: { bookletCode: true } });
  if (previous && codes.includes(previous.bookletCode)) return previous.bookletCode;
  const chosen = await tx.odkExamAssignment.findUnique({ where: { examId_studentUserId: { examId, studentUserId } }, select: { bookletCode: true, isActive: true } });
  if (chosen?.isActive && chosen.bookletCode && codes.includes(chosen.bookletCode)) return chosen.bookletCode;
  const rows = await tx.$queryRaw<Array<{ booklet_code: string; students: bigint }>>`
    SELECT booklet_code, COUNT(DISTINCT student_user_id) AS students
    FROM odk_exam_attempts
    WHERE exam_id = ${examId} AND version_id = ${versionId} AND status <> 'VOID'
    GROUP BY booklet_code`;
  const counts = Object.fromEntries(rows.map((row) => [row.booklet_code, Number(row.students)]));
  return pickBalancedBooklet(codes, counts, `${examId}:${studentUserId}`);
}

type Db = PrismaClient;

/** Kitapçık atama tablosu: atanmış öğrenciler, seçili kitapçık ve başlamışsa gerçek kitapçık. */
export async function loadBookletAssignments(examId: string, db: Db = prisma) {
  const exam = await db.odkExam.findUnique({
    where: { id: examId },
    select: { currentVersion: { select: { id: true, bookletOrders: { select: { bookletCode: true }, distinct: ["bookletCode"] } } } },
  });
  if (!exam?.currentVersion) return null;
  const versionId = exam.currentVersion.id;
  const codes = bookletCodesOf(exam.currentVersion.bookletOrders);
  const [assignments, attempts] = await Promise.all([
    db.odkExamAssignment.findMany({ where: { examId, isActive: true }, orderBy: { assignedAt: "asc" }, take: 2000, select: { studentUserId: true, bookletCode: true, student: { select: { fullName: true, email: true } } } }),
    db.odkExamAttempt.findMany({ where: { examId, versionId, status: { not: "VOID" } }, orderBy: { attemptNumber: "desc" }, select: { studentUserId: true, bookletCode: true } }),
  ]);
  const started = new Map<string, string>();
  for (const attempt of attempts) if (!started.has(attempt.studentUserId)) started.set(attempt.studentUserId, attempt.bookletCode);
  const counts = Object.fromEntries(codes.map((code) => [code, [...started.values()].filter((value) => value === code).length]));
  return {
    codes,
    counts,
    rows: assignments.map((row) => ({ studentUserId: row.studentUserId, studentName: row.student.fullName, studentEmail: row.student.email, chosenBooklet: row.bookletCode, startedBooklet: started.get(row.studentUserId) ?? null })),
  };
}

export async function setBookletAssignment(examId: string, input: { studentUserId: string; bookletCode: string | null }, actorId: string, db: Db = prisma) {
  const exam = await db.odkExam.findUnique({ where: { id: examId }, select: { status: true, currentVersion: { select: { id: true, bookletOrders: { select: { bookletCode: true }, distinct: ["bookletCode"] } } } } });
  if (!exam?.currentVersion) return NextResponse.json({ error: "Deneme bulunamadı." }, { status: 404 });
  if (["ENDED", "SCORED", "RELEASED", "ARCHIVED"].includes(exam.status)) return NextResponse.json({ error: "Sınav bittikten sonra kitapçık seçimi değiştirilemez." }, { status: 409 });
  const codes = bookletCodesOf(exam.currentVersion.bookletOrders);
  if (input.bookletCode && !codes.includes(input.bookletCode)) return NextResponse.json({ error: `${input.bookletCode} kitapçığı bu denemede tanımlı değil.`, code: "BOOKLET_NOT_DEFINED" }, { status: 400 });
  const versionId = exam.currentVersion.id;
  try {
    const previous = await db.$transaction(async (tx) => {
      // Başlatma ile aynı kilit: seçim ile ilk başlatma yarışamaz.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`odk-booklet:${examId}`}, 0))::text`;
      const assignment = await tx.odkExamAssignment.findUnique({ where: { examId_studentUserId: { examId, studentUserId: input.studentUserId } }, select: { id: true, isActive: true, bookletCode: true } });
      if (!assignment?.isActive) throw new AssignmentError(404, "Öğrenci bu denemeye atanmamış.", "NOT_ASSIGNED");
      const started = await tx.odkExamAttempt.count({ where: { examId, versionId, studentUserId: input.studentUserId } });
      if (started) throw new AssignmentError(409, "Öğrenci denemeye başladı; kitapçığı artık değiştirilemez.", "ATTEMPT_STARTED");
      await tx.odkExamAssignment.update({ where: { id: assignment.id }, data: { bookletCode: input.bookletCode } });
      return assignment.bookletCode;
    });
    await transactionalAudit(db)({ actorUserId: actorId, entityType: "OdkExam", entityId: examId, action: "odk.booklet_assignment_set", summary: `Öğrenci kitapçığı: ${input.bookletCode ?? "otomatik"}`, payload: { studentUserId: input.studentUserId, previous, next: input.bookletCode } });
    return NextResponse.json({ ok: true, bookletCode: input.bookletCode });
  } catch (error) {
    if (error instanceof AssignmentError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    throw error;
  }
}

class AssignmentError extends Error {
  constructor(readonly status: number, message: string, readonly code: string) {
    super(message);
  }
}
