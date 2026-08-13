import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  subject: z.string().trim().min(2).max(80),
  level: z.string().trim().max(40).optional(),
  teacherId: z.string().min(1),
  studentIds: z.array(z.string().min(1)).max(4),
  isActive: z.boolean(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.groups.update", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:groups:update:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Grup bilgilerini kontrol edin." }, { status: 400 });
  const { id } = await context.params;
  const studentIds = [...new Set(parsed.data.studentIds)];
  const [group, teacher, students] = await Promise.all([
    prisma.group.findUnique({ where: { id }, include: { enrollments: true } }),
    prisma.user.findFirst({ where: { id: parsed.data.teacherId, role: "TEACHER", status: "ACTIVE" }, select: { id: true } }),
    prisma.studentProfile.findMany({ where: { id: { in: studentIds }, user: { status: "ACTIVE" } }, select: { id: true } }),
  ]);
  if (!group) return NextResponse.json({ error: "Grup bulunamadı." }, { status: 404 });
  if (!teacher || students.length !== studentIds.length) return NextResponse.json({ error: "Öğretmen veya öğrenci seçimini kontrol edin." }, { status: 400 });

  const requestedStudents = new Set(studentIds);
  const knownStudents = new Set(group.enrollments.map((item) => item.studentId));
  const addedStudentIds = studentIds.filter((studentId) => !knownStudents.has(studentId));
  const reactivatedStudentIds = group.enrollments.filter((item) => item.endedAt && requestedStudents.has(item.studentId)).map((item) => item.studentId);
  const revokedStudentIds = group.enrollments.filter((item) => !item.endedAt && !requestedStudents.has(item.studentId)).map((item) => item.studentId);
  const selected = new Set(studentIds);
  await prisma.$transaction(async (tx) => {
    await tx.group.update({ where: { id }, data: { name: parsed.data.name, subject: parsed.data.subject, level: parsed.data.level || null, teacherId: teacher.id, isActive: parsed.data.isActive } });
    if (group.teacherId !== teacher.id) {
      await tx.lesson.updateMany({ where: { groupId: id, startsAt: { gte: new Date() }, status: "PLANNED" }, data: { teacherId: teacher.id } });
    }
    for (const enrollment of group.enrollments) {
      const shouldBeActive = selected.has(enrollment.studentId);
      if (shouldBeActive && enrollment.endedAt) await tx.enrollment.update({ where: { id: enrollment.id }, data: { endedAt: null, startedAt: new Date() } });
      if (!shouldBeActive && !enrollment.endedAt) await tx.enrollment.update({ where: { id: enrollment.id }, data: { endedAt: new Date() } });
      selected.delete(enrollment.studentId);
    }
    for (const studentId of selected) await tx.enrollment.create({ data: { groupId: id, studentId } });
    await tx.auditLog.create({
      data: {
        actorUserId: auth.session.userId,
        actorType: "USER",
        entityType: "Group",
        entityId: id,
        action: "group.updated",
        summary: `${parsed.data.name} grubu güncellendi`,
        payload: { teacherId: teacher.id, studentCount: studentIds.length, isActive: parsed.data.isActive },
      },
    });
    if (addedStudentIds.length || reactivatedStudentIds.length || revokedStudentIds.length) {
      await tx.auditLog.create({
        data: {
          actorUserId: auth.session.userId,
          actorType: "USER",
          entityType: "Group",
          entityId: id,
          action: "group.membership_access_changed",
          summary: "Öğrenci grup erişimleri güncellendi",
          payload: { addedStudentIds, reactivatedStudentIds, revokedStudentIds },
        },
      });
    }
  });
  return NextResponse.json({ ok: true });
}
