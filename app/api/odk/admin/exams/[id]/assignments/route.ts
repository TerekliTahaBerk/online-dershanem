import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { assignmentCreateSchema } from "@/lib/odk/admin-schemas";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const assignments = await prisma.odkExamAssignment.findMany({
    where: { examId: id },
    orderBy: { assignedAt: "desc" },
    include: { student: { select: { id: true, fullName: true, email: true } } },
    take: 2000,
  });
  return NextResponse.json({
    assignments: assignments.map((item) => ({
      id: item.id,
      studentUserId: item.studentUserId,
      studentName: item.student.fullName,
      studentEmail: item.student.email,
      source: item.source,
      sourceRefId: item.sourceRefId,
      snapshot: item.snapshot,
      isActive: item.isActive,
      assignedAt: item.assignedAt,
    })),
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.exam.assign", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:assign:${auth.session.userId}`, rateLimit: { max: 40, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const { id } = await context.params;
  const parsed = assignmentCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Atama geçersiz." }, { status: 400 });
  const exam = await prisma.odkExam.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!exam) return NextResponse.json({ error: "Deneme bulunamadı." }, { status: 404 });
  if (["ARCHIVED"].includes(exam.status)) return NextResponse.json({ error: "Arşivlenmiş denemeye atama yapılamaz." }, { status: 409 });

  let studentIds = [...new Set(parsed.data.studentUserIds || [])];
  const source = parsed.data.source;
  const sourceRefId = parsed.data.groupId || parsed.data.classId || parsed.data.cohortId || null;

  if (!studentIds.length) {
    return NextResponse.json({
      error: "Atama için öğrenci listesi gerekli. Grup/sınıf/cohort kaynağı snapshot’ta saklanır; üye çözümlemesi öğrenci ID listesiyle yapılır.",
    }, { status: 400 });
  }

  const students = await prisma.user.findMany({
    where: { id: { in: studentIds }, role: "STUDENT", status: "ACTIVE" },
    select: { id: true, fullName: true, email: true },
  });
  if (students.length !== studentIds.length) return NextResponse.json({ error: "Bazı öğrenciler bulunamadı veya aktif değil." }, { status: 400 });

  let created = 0;
  let updated = 0;
  await prisma.$transaction(async (tx) => {
    for (const student of students) {
      const existing = await tx.odkExamAssignment.findUnique({ where: { examId_studentUserId: { examId: id, studentUserId: student.id } } });
      const snapshot = { fullName: student.fullName, email: student.email, source, sourceRefId, assignedAt: new Date().toISOString() };
      if (existing) {
        await tx.odkExamAssignment.update({
          where: { id: existing.id },
          data: { isActive: true, revokedAt: null, source, sourceRefId, snapshot, assignedById: auth.session.userId, assignedAt: new Date() },
        });
        updated += 1;
      } else {
        await tx.odkExamAssignment.create({
          data: {
            examId: id,
            studentUserId: student.id,
            source,
            sourceRefId,
            snapshot,
            assignedById: auth.session.userId,
          },
        });
        created += 1;
      }
    }
  });

  await logAudit({
    actorUserId: auth.session.userId,
    entityType: "OdkExam",
    entityId: id,
    action: "odk.exam_assigned",
    summary: `${created + updated} öğrenci denemeye atandı`,
    payload: { created, updated, source, sourceRefId },
  });
  return NextResponse.json({ created, updated, total: created + updated }, { status: 201 });
}
