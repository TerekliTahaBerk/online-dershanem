import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { filterNotificationRows, queuePanelNotificationEmails } from "@/lib/panel-notifications";
import {
  GROUP_MUTATION_ISOLATION,
  GroupLifecycleError,
  addStudentToGroup,
  ensureActiveGroup,
  ensureActiveStudent,
  previewStudentTransfer,
  removeStudentFromGroup,
  transferStudentsBetweenGroups,
} from "@/lib/panel/group-lifecycle";
import { logAudit } from "@/lib/audit";
import {
  LessonLifecycleError,
  assertLessonNoConflict,
} from "@/lib/panel/lesson-lifecycle";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("UPDATE_META"),
    name: z.string().trim().min(2).max(80),
    subject: z.string().trim().min(2).max(80),
    level: z.string().trim().max(40).optional(),
  }),
  z.object({
    action: z.literal("CHANGE_TEACHER"),
    teacherId: z.string().min(1),
  }),
  z.object({
    action: z.literal("SET_ACTIVE"),
    isActive: z.boolean(),
  }),
  z.object({
    action: z.literal("ADD_STUDENT"),
    studentId: z.string().min(1),
  }),
  z.object({
    action: z.literal("REMOVE_STUDENT"),
    studentId: z.string().min(1),
  }),
  z.object({
    action: z.literal("PREVIEW_TRANSFER"),
    studentId: z.string().min(1),
    targetGroupId: z.string().min(1),
  }),
  z.object({
    action: z.literal("TRANSFER_STUDENT"),
    studentId: z.string().min(1),
    targetGroupId: z.string().min(1),
    /** Preview → confirm sonrası true olmalı; tek tık mutation engellenir. */
    confirmed: z.literal(true),
  }),
]);

const legacySchema = z.object({
  name: z.string().trim().min(2).max(80),
  subject: z.string().trim().min(2).max(80),
  level: z.string().trim().max(40).optional(),
  teacherId: z.string().min(1),
  isActive: z.boolean(),
});

async function notifyGroupAudience(
  rows: Array<{ userId: string; title: string; body: string; href?: string }>,
) {
  if (!rows.length) return;
  const raw = rows.map((row) => ({ ...row, type: "SYSTEM" as const }));
  const notificationRows = await filterNotificationRows(raw);
  if (notificationRows.length) await prisma.notification.createMany({ data: notificationRows });
  await queuePanelNotificationEmails(raw);
}

function lifecycleError(error: unknown) {
  if (error instanceof LessonLifecycleError) {
    if (error.code === "SCHEDULE_CONFLICT") {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
  }
  if (!(error instanceof GroupLifecycleError)) return null;
  if (error.code === "GROUP_NOT_FOUND") {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 404 });
  }
  if (error.code === "STUDENT_NOT_FOUND") {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
  }
  if (
    error.code === "GROUP_INACTIVE" ||
    error.code === "GROUP_CAPACITY_FULL" ||
    error.code === "ALREADY_ENROLLED" ||
    error.code === "NOT_ENROLLED" ||
    error.code === "TRANSFER_BLOCKED" ||
    error.code === "SCHEDULE_CONFLICT"
  ) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
  }
  return NextResponse.json({ error: "İşlem tamamlanamadı.", code: error.code }, { status: 400 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({
    action: "panel.groups.update",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:groups:update:${auth.session.userId}`,
    rateLimit: { max: 120, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });

  const { id } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsedAction = actionSchema.safeParse(payload);
  const parsedLegacy = parsedAction.success ? null : legacySchema.safeParse(payload);
  if (!parsedAction.success && !parsedLegacy?.success) {
    return NextResponse.json({ error: "Grup bilgilerini kontrol edin." }, { status: 400 });
  }
  const legacyData = parsedLegacy && parsedLegacy.success ? parsedLegacy.data : null;
  const action = parsedAction.success
    ? parsedAction.data
    : ({
        action: "UPDATE_META",
        name: legacyData!.name,
        subject: legacyData!.subject,
        level: legacyData!.level,
      } as const);

  try {
    if (action.action === "UPDATE_META") {
      const existing = await prisma.group.findUnique({ where: { id }, select: { id: true } });
      if (!existing) return NextResponse.json({ error: "Grup bulunamadı." }, { status: 404 });
      await prisma.group.update({
        where: { id },
        data: { name: action.name, subject: action.subject, level: action.level || null },
      });
      await logAudit({
        actorUserId: auth.session.userId,
        entityType: "Group",
        entityId: id,
        action: "group.updated",
        summary: `${action.name} grubu güncellendi`,
        payload: { subject: action.subject, level: action.level || null },
      });
      return NextResponse.json({ ok: true });
    }

    if (action.action === "CHANGE_TEACHER") {
      const [group, teacher] = await Promise.all([
        prisma.group.findUnique({
          where: { id },
          include: {
            enrollments: {
              where: { endedAt: null },
              include: { student: { select: { id: true, userId: true, parents: { select: { parentId: true } } } } },
            },
          },
        }),
        prisma.user.findFirst({
          where: { id: action.teacherId, role: "TEACHER", status: "ACTIVE" },
          select: { id: true, fullName: true, email: true },
        }),
      ]);
      if (!group) return NextResponse.json({ error: "Grup bulunamadı." }, { status: 404 });
      if (!teacher) return NextResponse.json({ error: "Aktif öğretmen bulunamadı." }, { status: 400 });
      const previousTeacherId = group.teacherId;
      const studentIds = group.enrollments.map((item) => item.student.id);
      try {
        await prisma.$transaction(async (tx) => {
          const upcoming = await tx.lesson.findMany({
            where: { groupId: id, startsAt: { gte: new Date() }, status: "PLANNED" },
            select: { id: true, startsAt: true, endsAt: true },
          });
          for (const lesson of upcoming) {
            await assertLessonNoConflict(tx, {
              lessonId: lesson.id,
              teacherId: teacher.id,
              groupId: id,
              startsAt: lesson.startsAt,
              endsAt: lesson.endsAt,
              studentIds,
            });
          }
          await tx.group.update({ where: { id }, data: { teacherId: teacher.id } });
          await tx.lessonSeries.updateMany({
            where: { groupId: id, isActive: true },
            data: { teacherId: teacher.id },
          });
          await tx.lesson.updateMany({
            where: { groupId: id, startsAt: { gte: new Date() }, status: "PLANNED" },
            data: { teacherId: teacher.id },
          });
        });
      } catch (error) {
        const mapped = lifecycleError(error);
        if (mapped) return mapped;
        throw error;
      }
      await notifyGroupAudience([
        { userId: teacher.id, title: "Yeni grup ataması", body: `${group.name} grubu sana atandı.`, href: "/panel/ogretmen" },
        ...(previousTeacherId !== teacher.id ? [{ userId: previousTeacherId, title: "Grup ataması güncellendi", body: `${group.name} grubu üzerindeki sorumluluğun değişti.`, href: "/panel/ogretmen" }] : []),
        ...group.enrollments.map((item) => ({ userId: item.student.userId, title: "Öğretmen değişikliği", body: `${group.name} grubunun öğretmeni güncellendi.`, href: "/panel/ogrenci/takvim" })),
        ...group.enrollments.flatMap((item) => item.student.parents.map((parent) => ({ userId: parent.parentId, title: "Öğretmen değişikliği", body: `${group.name} grubunda öğretmen değişikliği yapıldı.`, href: `/panel/veli/takvim?studentId=${item.student.id}` }))),
      ]);
      await logAudit({
        actorUserId: auth.session.userId,
        entityType: "Group",
        entityId: id,
        action: "group.teacher_changed",
        summary: `${group.name} öğretmeni güncellendi`,
        payload: { previousTeacherId, teacherId: teacher.id },
      });
      return NextResponse.json({ ok: true });
    }

    if (action.action === "SET_ACTIVE") {
      const group = await prisma.group.findUnique({ where: { id }, select: { id: true, name: true, isActive: true } });
      if (!group) return NextResponse.json({ error: "Grup bulunamadı." }, { status: 404 });
      await prisma.group.update({ where: { id }, data: { isActive: action.isActive } });
      await prisma.lessonSeries.updateMany({ where: { groupId: id }, data: { isActive: action.isActive } });
      await logAudit({
        actorUserId: auth.session.userId,
        entityType: "Group",
        entityId: id,
        action: action.isActive ? "group.reopened" : "group.closed",
        summary: action.isActive ? `${group.name} tekrar açıldı` : `${group.name} kapatıldı`,
        payload: { previous: group.isActive, next: action.isActive },
      });
      return NextResponse.json({ ok: true });
    }

    if (action.action === "ADD_STUDENT") {
      const audience = await prisma.$transaction(
        async (tx) => {
          const group = await ensureActiveGroup(tx, id);
          const student = await ensureActiveStudent(tx, action.studentId);
          await addStudentToGroup(tx, group, action.studentId);
          return {
            group,
            student,
          };
        },
        { isolationLevel: GROUP_MUTATION_ISOLATION },
      );
      await notifyGroupAudience([
        {
          userId: audience.student.userId,
          title: "Grup kaydın güncellendi",
          body: `${audience.group.name} grubuna eklendin.`,
          href: "/panel/ogrenci/takvim",
        },
        ...audience.student.parents.map((parent) => ({
          userId: parent.parentId,
          title: "Öğrenci grup kaydı güncellendi",
          body: `${audience.student.user.fullName || audience.student.user.email} öğrencisi ${audience.group.name} grubuna eklendi.`,
          href: `/panel/veli/takvim?studentId=${audience.student.id}`,
        })),
        {
          userId: audience.group.teacherId,
          title: "Gruba yeni öğrenci eklendi",
          body: `${audience.student.user.fullName || audience.student.user.email} öğrencisi ${audience.group.name} grubuna eklendi.`,
          href: "/panel/ogretmen/ogrenci",
        },
      ]);
      await logAudit({
        actorUserId: auth.session.userId,
        entityType: "Group",
        entityId: id,
        action: "group.membership_added",
        summary: "Öğrenci gruba eklendi",
        payload: { studentId: action.studentId },
      });
      return NextResponse.json({ ok: true });
    }

    if (action.action === "REMOVE_STUDENT") {
      const audience = await prisma.$transaction(
        async (tx) => {
          const group = await ensureActiveGroup(tx, id);
          const student = await ensureActiveStudent(tx, action.studentId);
          await removeStudentFromGroup(tx, id, action.studentId);
          return { group, student };
        },
        { isolationLevel: GROUP_MUTATION_ISOLATION },
      );
      await notifyGroupAudience([
        {
          userId: audience.student.userId,
          title: "Grup kaydın güncellendi",
          body: `${audience.group.name} grubundan çıkarıldın.`,
          href: "/panel/ogrenci/takvim",
        },
        ...audience.student.parents.map((parent) => ({
          userId: parent.parentId,
          title: "Öğrenci grup kaydı güncellendi",
          body: `${audience.student.user.fullName || audience.student.user.email} öğrencisi ${audience.group.name} grubundan çıkarıldı.`,
          href: `/panel/veli/takvim?studentId=${audience.student.id}`,
        })),
      ]);
      await logAudit({
        actorUserId: auth.session.userId,
        entityType: "Group",
        entityId: id,
        action: "group.membership_removed",
        summary: "Öğrenci gruptan çıkarıldı",
        payload: { studentId: action.studentId },
      });
      return NextResponse.json({ ok: true });
    }

    if (action.action === "PREVIEW_TRANSFER") {
      if (action.targetGroupId === id) {
        return NextResponse.json({ error: "Hedef grup farklı olmalı." }, { status: 400 });
      }
      const preview = await prisma.$transaction((tx) =>
        previewStudentTransfer(tx, {
          sourceGroupId: id,
          targetGroupId: action.targetGroupId,
          studentIds: [action.studentId],
        }),
      );
      return NextResponse.json({ ok: true, preview });
    }

    const source = await prisma.group.findUnique({
      where: { id },
      select: { id: true, name: true, teacherId: true },
    });
    if (!source) return NextResponse.json({ error: "Grup bulunamadı." }, { status: 404 });
    if (action.targetGroupId === id) return NextResponse.json({ error: "Hedef grup farklı olmalı." }, { status: 400 });

    const audience = await prisma.$transaction(
      async (tx) => {
        const student = await ensureActiveStudent(tx, action.studentId);
        await transferStudentsBetweenGroups(tx, id, action.targetGroupId, [action.studentId]);
        const targetGroup = await ensureActiveGroup(tx, action.targetGroupId);
        return { student, targetGroup };
      },
      { isolationLevel: GROUP_MUTATION_ISOLATION },
    );
    await notifyGroupAudience([
      {
        userId: audience.student.userId,
        title: "Grup kaydın güncellendi",
        body: `${source.name} grubundan ${audience.targetGroup.name} grubuna taşındın.`,
        href: "/panel/ogrenci/takvim",
      },
      ...audience.student.parents.map((parent) => ({
        userId: parent.parentId,
        title: "Öğrenci grup kaydı güncellendi",
        body: `${audience.student.user.fullName || audience.student.user.email} öğrencisi ${source.name} grubundan ${audience.targetGroup.name} grubuna taşındı.`,
        href: `/panel/veli/takvim?studentId=${audience.student.id}`,
      })),
      {
        userId: source.teacherId,
        title: "Öğrenci transferi",
        body: `${audience.student.user.fullName || audience.student.user.email} öğrencisi ${source.name} grubundan alındı.`,
        href: "/panel/ogretmen/ogrenci",
      },
      {
        userId: audience.targetGroup.teacherId,
        title: "Öğrenci transferi",
        body: `${audience.student.user.fullName || audience.student.user.email} öğrencisi ${audience.targetGroup.name} grubuna taşındı.`,
        href: "/panel/ogretmen/ogrenci",
      },
    ]);
    await logAudit({
      actorUserId: auth.session.userId,
      entityType: "Group",
      entityId: id,
      action: "group.membership_transferred",
      summary: "Öğrenci başka gruba taşındı",
      payload: {
        studentId: action.studentId,
        sourceGroupId: id,
        targetGroupId: action.targetGroupId,
        confirmed: true,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const mapped = lifecycleError(error);
    if (mapped) return mapped;
    throw error;
  }
}
