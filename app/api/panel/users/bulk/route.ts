import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { guardMutation } from "@/lib/security/mutation-guard";
import { requireApiAccountRole, requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import {
  buildInviteMessage,
  buildInviteUrl,
  issueInvitePlaceholderSecret,
  issueUserInvite,
  resolveAppOrigin,
} from "@/lib/auth/invitation";
import { hashPassword } from "@/lib/auth/password";
import { revokeAllUserSessions } from "@/lib/auth/session";
import {
  GROUP_MUTATION_ISOLATION,
  GroupLifecycleError,
  ensureActiveGroup,
  ensureActiveStudent,
  transferStudentBetweenGroups,
} from "@/lib/panel/group-lifecycle";
import { buildUserWhere, parseUserListFilters } from "@/lib/panel/user-filters";

const BULK_LIMIT = 500;

const bodySchema = z.object({
  mode: z.enum(["PREVIEW", "EXECUTE"]),
  action: z.enum(["RESEND_INVITE", "TRANSFER_STUDENTS_TO_GROUP", "OFFBOARD_TEACHERS"]),
  filters: z
    .object({
      q: z.string().optional(),
      rol: z.string().optional(),
      urun: z.string().optional(),
      durum: z.string().optional(),
    })
    .optional(),
  options: z
    .object({
      targetGroupId: z.string().min(1).optional(),
      transferTeacherId: z.string().min(1).optional(),
      transferCoachTeacherId: z.string().min(1).optional(),
      transferInterventionOwnerId: z.string().min(1).optional(),
    })
    .optional(),
});

type TeacherSnapshot = {
  id: string;
  email: string;
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  profileId: string | null;
  isCoach: boolean;
  counts: { coachAssignments: number; openInterventions: number };
};

async function loadTeacherSnapshot(teacherId: string): Promise<TeacherSnapshot | null> {
  const teacher = await prisma.user.findFirst({
    where: { id: teacherId, role: "TEACHER" },
    select: {
      id: true,
      email: true,
      status: true,
      teacherProfile: { select: { id: true, isCoach: true } },
    },
  });
  if (!teacher) return null;
  const [coachAssignments, openInterventions] = await Promise.all([
    teacher.teacherProfile?.isCoach
      ? prisma.coachAssignment.count({ where: { coachId: teacher.teacherProfile.id, endedAt: null } })
      : Promise.resolve(0),
    prisma.interventionCase.count({
      where: { ownerId: teacher.id, status: { in: ["OPEN", "IN_PROGRESS", "SNOOZED"] } },
    }),
  ]);
  return {
    id: teacher.id,
    email: teacher.email,
    status: teacher.status,
    profileId: teacher.teacherProfile?.id ?? null,
    isCoach: teacher.teacherProfile?.isCoach ?? false,
    counts: { coachAssignments, openInterventions },
  };
}

export async function POST(request: Request) {
  const payload = bodySchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json({ error: "Toplu işlem isteğini kontrol edin." }, { status: 400 });
  }
  const auth =
    payload.data.mode === "PREVIEW"
      ? await requireApiAccountRole("ADMIN")
      : await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;

  const guard = await guardMutation({
    action:
      payload.data.mode === "PREVIEW"
        ? "panel.users.bulk.preview"
        : "panel.users.bulk.execute",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:users:bulk:${payload.data.mode.toLowerCase()}:${auth.session.userId}`,
    rateLimit: { max: payload.data.mode === "PREVIEW" ? 80 : 30, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.code === "RATE_LIMIT" ? "Çok fazla işlem. Biraz sonra tekrar deneyin." : guard.message },
      { status: guard.code === "RATE_LIMIT" ? 429 : 403 },
    );
  }

  const filters = parseUserListFilters(payload.data.filters ?? {});
  const baseWhere = buildUserWhere(filters);
  const actionWhere =
    payload.data.action === "TRANSFER_STUDENTS_TO_GROUP"
      ? { role: "STUDENT" as const }
      : payload.data.action === "OFFBOARD_TEACHERS"
        ? { role: "TEACHER" as const }
        : {};
  const where = { AND: [baseWhere, actionWhere] };
  const matched = await prisma.user.count({ where });
  const capped = matched > BULK_LIMIT;
  const users = await prisma.user.findMany({
    where,
    take: BULK_LIMIT,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      status: true,
      studentProfile: {
        select: {
          id: true,
          enrollments: {
            where: { endedAt: null },
            orderBy: { startedAt: "desc" },
            take: 1,
            select: { groupId: true },
          },
        },
      },
    },
  });

  if (payload.data.mode === "PREVIEW") {
    return NextResponse.json({
      mode: "PREVIEW",
      action: payload.data.action,
      matched,
      capped,
      sample: users.slice(0, 5).map((user) => ({
        id: user.id,
        name: user.fullName || user.email,
        email: user.email,
        role: user.role,
      })),
    });
  }

  if (payload.data.action === "TRANSFER_STUDENTS_TO_GROUP" && !payload.data.options?.targetGroupId) {
    return NextResponse.json({ error: "Hedef grup seçin." }, { status: 400 });
  }
  if (payload.data.action === "OFFBOARD_TEACHERS" && !payload.data.options?.transferTeacherId) {
    return NextResponse.json({ error: "Devralacak öğretmen seçin." }, { status: 400 });
  }

  const origin = resolveAppOrigin(new URL(request.url).origin);
  const errors: Array<{ id: string; email: string; reason: string }> = [];
  const invites: Array<{ id: string; email: string; url: string; message: string; expiresAt: string }> = [];
  let succeeded = 0;

  const transferTeacherId = payload.data.options?.transferTeacherId ?? "";
  const transferCoachTeacherId = payload.data.options?.transferCoachTeacherId || transferTeacherId;
  const transferInterventionOwnerId =
    payload.data.options?.transferInterventionOwnerId || transferTeacherId;
  const targetGroupId = payload.data.options?.targetGroupId ?? "";

  const [targetTeacher, targetCoachTeacher, targetInterventionOwner] =
    payload.data.action === "OFFBOARD_TEACHERS"
      ? await Promise.all([
          prisma.user.findFirst({
            where: { id: transferTeacherId, role: "TEACHER", status: "ACTIVE" },
            select: { id: true },
          }),
          prisma.user.findFirst({
            where: {
              id: transferCoachTeacherId,
              role: "TEACHER",
              status: "ACTIVE",
              teacherProfile: { is: { isCoach: true } },
            },
            select: { id: true, teacherProfile: { select: { id: true } } },
          }),
          prisma.user.findFirst({
            where: {
              id: transferInterventionOwnerId,
              role: { in: ["ADMIN", "TEACHER"] },
              status: "ACTIVE",
            },
            select: { id: true },
          }),
        ])
      : [null, null, null];

  if (payload.data.action === "OFFBOARD_TEACHERS" && !targetTeacher) {
    return NextResponse.json({ error: "Devralacak aktif öğretmen bulunamadı." }, { status: 404 });
  }

  for (const user of users) {
    try {
      if (payload.data.action === "RESEND_INVITE") {
        if (user.status !== "ACTIVE") {
          errors.push({ id: user.id, email: user.email, reason: "Yalnız aktif hesaplara davet yenilenir." });
          continue;
        }
        const invite = issueUserInvite();
        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordHash: await hashPassword(issueInvitePlaceholderSecret()),
            mustChangePassword: true,
            failedAttempts: 0,
            lockedUntil: null,
            inviteTokenHash: invite.tokenHash,
            inviteTokenExpiresAt: invite.expiresAt,
            inviteSentAt: new Date(),
            inviteAcceptedAt: null,
          },
        });
        await revokeAllUserSessions(user.id);
        const inviteUrl = buildInviteUrl(origin, invite.token);
        invites.push({
          id: user.id,
          email: user.email,
          url: inviteUrl,
          message: buildInviteMessage({
            fullName: user.fullName,
            email: user.email,
            inviteUrl,
            expiresAt: invite.expiresAt,
          }),
          expiresAt: invite.expiresAt.toISOString(),
        });
        succeeded += 1;
        continue;
      }

      if (payload.data.action === "TRANSFER_STUDENTS_TO_GROUP") {
        if (!user.studentProfile?.id) {
          errors.push({ id: user.id, email: user.email, reason: "Öğrenci profili bulunamadı." });
          continue;
        }
        const sourceGroupId = user.studentProfile.enrollments[0]?.groupId;
        if (!sourceGroupId) {
          errors.push({ id: user.id, email: user.email, reason: "Aktif grup kaydı bulunamadı." });
          continue;
        }
        if (sourceGroupId === targetGroupId) {
          errors.push({ id: user.id, email: user.email, reason: "Kaynak ve hedef grup aynı olamaz." });
          continue;
        }
        await prisma.$transaction(
          async (tx) => {
            const targetGroup = await ensureActiveGroup(tx, targetGroupId);
            await ensureActiveStudent(tx, user.studentProfile!.id);
            await transferStudentBetweenGroups(tx, sourceGroupId, targetGroup, user.studentProfile!.id);
          },
          { isolationLevel: GROUP_MUTATION_ISOLATION },
        );
        succeeded += 1;
        continue;
      }

      const teacher = await loadTeacherSnapshot(user.id);
      if (!teacher) {
        errors.push({ id: user.id, email: user.email, reason: "Öğretmen bulunamadı." });
        continue;
      }
      if (teacher.status !== "ACTIVE") {
        errors.push({ id: user.id, email: user.email, reason: "Yalnız aktif öğretmen devredilebilir." });
        continue;
      }
      if (teacher.id === transferTeacherId) {
        errors.push({ id: user.id, email: user.email, reason: "Öğretmen kendi hesabına devredemez." });
        continue;
      }
      if (teacher.counts.coachAssignments > 0 && !targetCoachTeacher?.teacherProfile?.id) {
        errors.push({ id: user.id, email: user.email, reason: "Koç atamaları için aktif koç öğretmen gerekir." });
        continue;
      }
      if (teacher.counts.openInterventions > 0 && !targetInterventionOwner?.id) {
        errors.push({ id: user.id, email: user.email, reason: "Açık müdahale sahiplikleri için aktif sorumlu gerekir." });
        continue;
      }
      await prisma.$transaction(async (tx) => {
        await tx.group.updateMany({
          where: { teacherId: teacher.id, isActive: true },
          data: { teacherId: transferTeacherId },
        });
        await tx.lesson.updateMany({
          where: { teacherId: teacher.id, status: "PLANNED", startsAt: { gte: new Date() } },
          data: { teacherId: transferTeacherId },
        });
        if (teacher.counts.coachAssignments > 0 && teacher.isCoach && teacher.profileId && targetCoachTeacher?.teacherProfile?.id) {
          await tx.coachAssignment.updateMany({
            where: { coachId: teacher.profileId, endedAt: null },
            data: { coachId: targetCoachTeacher.teacherProfile.id, assignedById: auth.session.userId },
          });
        }
        if (teacher.counts.openInterventions > 0 && targetInterventionOwner?.id) {
          await tx.interventionCase.updateMany({
            where: { ownerId: teacher.id, status: { in: ["OPEN", "IN_PROGRESS", "SNOOZED"] } },
            data: { ownerId: targetInterventionOwner.id },
          });
        }
        await tx.user.update({ where: { id: teacher.id }, data: { status: "SUSPENDED" } });
      });
      await revokeAllUserSessions(teacher.id);
      await logAudit({
        actorUserId: auth.session.userId,
        entityType: "User",
        entityId: teacher.id,
        action: "panel.teacher_offboarded",
        summary: `${teacher.email} toplu işlemle güvenli devir sonrası askıya alındı`,
        payload: { transferTeacherId, transferCoachTeacherId, transferInterventionOwnerId },
      });
      succeeded += 1;
    } catch (error) {
      const reason =
        error instanceof GroupLifecycleError
          ? error.message
          : error instanceof Error
            ? error.message
            : "İşlem tamamlanamadı.";
      errors.push({ id: user.id, email: user.email, reason });
    }
  }

  await logAudit({
    actorUserId: auth.session.userId,
    entityType: "User",
    entityId: "bulk",
    action: "panel.users.bulk.execute",
    summary: `${payload.data.action} toplu işlemi çalıştırıldı`,
    payload: {
      action: payload.data.action,
      filters,
      matched,
      processed: users.length,
      succeeded,
      failed: errors.length,
      capped,
    },
  });

  return NextResponse.json({
    mode: "EXECUTE",
    action: payload.data.action,
    matched,
    succeeded,
    failed: errors.length,
    capped,
    invites,
    errors: errors.slice(0, 100),
  });
}
