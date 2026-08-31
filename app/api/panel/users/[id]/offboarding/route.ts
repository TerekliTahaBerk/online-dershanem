import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { guardMutation } from "@/lib/security/mutation-guard";
import { requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import { revokeAllUserSessions } from "@/lib/auth/session";

const offboardingSchema = z.object({
  transferTeacherId: z.string().min(1),
  transferCoachTeacherId: z.string().min(1).optional(),
  transferInterventionOwnerId: z.string().min(1).optional(),
});

type OffboardingSnapshot = {
  teacher: {
    id: string;
    email: string;
    fullName: string | null;
    status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
    profile: { id: string; isCoach: boolean; subjects: string[]; coachCapacity: number | null } | null;
  };
  counts: {
    activeGroups: number;
    upcomingLessons: number;
    pendingLessonClosures: number;
    openHelpRequests: number;
    coachAssignments: number;
    openInterventions: number;
  };
};

async function loadOffboardingSnapshot(teacherId: string, now: Date): Promise<OffboardingSnapshot | null> {
  const teacher = await prisma.user.findFirst({
    where: { id: teacherId, role: "TEACHER" },
    select: {
      id: true,
      email: true,
      fullName: true,
      status: true,
      teacherProfile: {
        select: { id: true, isCoach: true, subjects: true, coachCapacity: true },
      },
    },
  });
  if (!teacher) return null;

  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const [activeGroups, upcomingLessons, pendingLessonClosures, openHelpRequests, openInterventions, coachAssignments] =
    await Promise.all([
      prisma.group.count({ where: { teacherId, isActive: true } }),
      prisma.lesson.count({
        where: { teacherId, status: "PLANNED", startsAt: { gte: now } },
      }),
      prisma.lesson.count({
        where: {
          teacherId,
          startsAt: { lt: now, gte: twoWeeksAgo },
          status: { in: ["PLANNED", "COMPLETED"] },
          notes: { none: { studentId: null } },
        },
      }),
      prisma.studentHelpRequest.count({
        where: { status: "OPEN", group: { teacherId, isActive: true } },
      }),
      prisma.interventionCase.count({
        where: { ownerId: teacherId, status: { in: ["OPEN", "IN_PROGRESS", "SNOOZED"] } },
      }),
      teacher.teacherProfile?.isCoach
        ? prisma.coachAssignment.count({
            where: { coachId: teacher.teacherProfile.id, endedAt: null },
          })
        : Promise.resolve(0),
    ]);

  return {
    teacher: {
      id: teacher.id,
      email: teacher.email,
      fullName: teacher.fullName,
      status: teacher.status,
      profile: teacher.teacherProfile,
    },
    counts: {
      activeGroups,
      upcomingLessons,
      pendingLessonClosures,
      openHelpRequests,
      coachAssignments,
      openInterventions,
    },
  };
}

function buildOffboardingBlockers(snapshot: OffboardingSnapshot) {
  const blockers: Array<{ code: string; label: string; count: number }> = [];
  if (snapshot.counts.coachAssignments > 0) {
    blockers.push({
      code: "coach_assignments",
      label: "Aktif koç atamaları devredilmeli",
      count: snapshot.counts.coachAssignments,
    });
  }
  if (snapshot.counts.openInterventions > 0) {
    blockers.push({
      code: "open_interventions",
      label: "Açık müdahale sahiplikleri devredilmeli",
      count: snapshot.counts.openInterventions,
    });
  }
  return blockers;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;

  const guard = await guardMutation({
    action: "panel.users.offboarding.preview",
    requireSameOrigin: true,
    headers: { get: (name: string) => request.headers.get(name) },
    rateLimitKey: `panel:users:offboarding:preview:${auth.session.userId}`,
    rateLimit: { max: 80, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.code === "RATE_LIMIT" ? "Çok fazla işlem. Biraz sonra tekrar deneyin." : guard.message },
      { status: guard.code === "RATE_LIMIT" ? 429 : 403 },
    );
  }

  const { id } = await context.params;
  const snapshot = await loadOffboardingSnapshot(id, new Date());
  if (!snapshot) {
    return NextResponse.json({ error: "Öğretmen bulunamadı." }, { status: 404 });
  }

  const [teacherTransfers, coachTransfers, interventionOwners] = await Promise.all([
    prisma.user.findMany({
      where: { role: "TEACHER", status: "ACTIVE", id: { not: id } },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        teacherProfile: { select: { isCoach: true } },
      },
    }),
    prisma.user.findMany({
      where: {
        role: "TEACHER",
        status: "ACTIVE",
        id: { not: id },
        teacherProfile: { is: { isCoach: true } },
      },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, email: true },
    }),
    prisma.user.findMany({
      where: {
        role: { in: ["ADMIN", "TEACHER"] },
        status: "ACTIVE",
        id: { not: id },
      },
      orderBy: [{ role: "asc" }, { fullName: "asc" }],
      select: { id: true, role: true, fullName: true, email: true },
    }),
  ]);

  return NextResponse.json({
    teacher: {
      id: snapshot.teacher.id,
      name: snapshot.teacher.fullName || snapshot.teacher.email,
      email: snapshot.teacher.email,
      status: snapshot.teacher.status,
      subjects: snapshot.teacher.profile?.subjects ?? [],
      isCoach: snapshot.teacher.profile?.isCoach ?? false,
      coachCapacity: snapshot.teacher.profile?.coachCapacity ?? null,
    },
    counts: snapshot.counts,
    blockers: buildOffboardingBlockers(snapshot),
    options: {
      teacherTransfers: teacherTransfers.map((teacher) => ({
        id: teacher.id,
        name: teacher.fullName || teacher.email,
        email: teacher.email,
        isCoach: teacher.teacherProfile?.isCoach ?? false,
      })),
      coachTransfers: coachTransfers.map((teacher) => ({
        id: teacher.id,
        name: teacher.fullName || teacher.email,
        email: teacher.email,
      })),
      interventionOwners: interventionOwners.map((owner) => ({
        id: owner.id,
        role: owner.role,
        name: owner.fullName || owner.email,
        email: owner.email,
      })),
    },
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;

  const guard = await guardMutation({
    action: "panel.users.offboarding.execute",
    requireSameOrigin: true,
    headers: { get: (name: string) => request.headers.get(name) },
    rateLimitKey: `panel:users:offboarding:execute:${auth.session.userId}`,
    rateLimit: { max: 40, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.code === "RATE_LIMIT" ? "Çok fazla işlem. Biraz sonra tekrar deneyin." : guard.message },
      { status: guard.code === "RATE_LIMIT" ? 429 : 403 },
    );
  }

  const parsed = offboardingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Devretme bilgilerini kontrol edin." }, { status: 400 });
  }

  const { id } = await context.params;
  if (id === parsed.data.transferTeacherId) {
    return NextResponse.json({ error: "Öğretmen kendi hesabına devredemez." }, { status: 400 });
  }

  const now = new Date();
  const snapshot = await loadOffboardingSnapshot(id, now);
  if (!snapshot) {
    return NextResponse.json({ error: "Öğretmen bulunamadı." }, { status: 404 });
  }
  if (!snapshot.teacher.profile) {
    return NextResponse.json({ error: "Öğretmen profili eksik." }, { status: 409 });
  }
  if (snapshot.teacher.status !== "ACTIVE") {
    return NextResponse.json({ error: "Yalnız aktif öğretmen güvenli offboarding ile askıya alınabilir." }, { status: 409 });
  }
  const sourceCoachProfileId = snapshot.teacher.profile.id;

  const transferCoachTeacherId = parsed.data.transferCoachTeacherId ?? parsed.data.transferTeacherId;
  const transferInterventionOwnerId =
    parsed.data.transferInterventionOwnerId ?? parsed.data.transferTeacherId;

  const [targetTeacher, targetCoachTeacher, targetInterventionOwner] = await Promise.all([
    prisma.user.findFirst({
      where: { id: parsed.data.transferTeacherId, role: "TEACHER", status: "ACTIVE" },
      select: { id: true, email: true },
    }),
    snapshot.counts.coachAssignments > 0
      ? prisma.user.findFirst({
          where: {
            id: transferCoachTeacherId,
            role: "TEACHER",
            status: "ACTIVE",
            teacherProfile: { is: { isCoach: true } },
          },
          select: { id: true, teacherProfile: { select: { id: true } } },
        })
      : Promise.resolve(null),
    snapshot.counts.openInterventions > 0
      ? prisma.user.findFirst({
          where: {
            id: transferInterventionOwnerId,
            status: "ACTIVE",
            role: { in: ["ADMIN", "TEACHER"] },
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (!targetTeacher) {
    return NextResponse.json({ error: "Devralacak aktif öğretmen bulunamadı." }, { status: 404 });
  }
  if (snapshot.counts.coachAssignments > 0 && !targetCoachTeacher?.teacherProfile?.id) {
    return NextResponse.json(
      { error: "Aktif koç atamaları için koç yetkisi olan aktif bir öğretmen seçin." },
      { status: 409 },
    );
  }
  if (snapshot.counts.openInterventions > 0 && !targetInterventionOwner) {
    return NextResponse.json(
      { error: "Açık müdahale sorumlulukları için aktif bir sorumlu seçin." },
      { status: 409 },
    );
  }

  const transferResult = await prisma.$transaction(async (tx) => {
    const groups = await tx.group.updateMany({
      where: { teacherId: snapshot.teacher.id, isActive: true },
      data: { teacherId: targetTeacher.id },
    });
    const lessons = await tx.lesson.updateMany({
      where: {
        teacherId: snapshot.teacher.id,
        status: "PLANNED",
        startsAt: { gte: now },
      },
      data: { teacherId: targetTeacher.id },
    });

    const coachAssignments = snapshot.counts.coachAssignments > 0 && targetCoachTeacher?.teacherProfile?.id
      ? await tx.coachAssignment.updateMany({
          where: {
            coachId: sourceCoachProfileId,
            endedAt: null,
          },
          data: {
            coachId: targetCoachTeacher.teacherProfile.id,
            assignedById: auth.session.userId,
          },
        })
      : { count: 0 };

    const interventions = snapshot.counts.openInterventions > 0 && targetInterventionOwner
      ? await tx.interventionCase.updateMany({
          where: {
            ownerId: snapshot.teacher.id,
            status: { in: ["OPEN", "IN_PROGRESS", "SNOOZED"] },
          },
          data: { ownerId: targetInterventionOwner.id },
        })
      : { count: 0 };

    await tx.user.update({
      where: { id: snapshot.teacher.id },
      data: { status: "SUSPENDED" },
    });

    return {
      groups: groups.count,
      lessons: lessons.count,
      coachAssignments: coachAssignments.count,
      interventions: interventions.count,
    };
  });

  const revokedSessions = await revokeAllUserSessions(snapshot.teacher.id);

  await logAudit({
    actorUserId: auth.session.userId,
    entityType: "User",
    entityId: snapshot.teacher.id,
    action: "panel.teacher_offboarded",
    summary: `${snapshot.teacher.email} güvenli offboarding ile askıya alındı`,
    payload: {
      transferTeacherId: targetTeacher.id,
      transferCoachTeacherId: transferCoachTeacherId,
      transferInterventionOwnerId: transferInterventionOwnerId,
      transferred: transferResult,
      revokedSessions,
    },
  });

  return NextResponse.json({
    ok: true,
    status: "SUSPENDED",
    revokedSessions,
    transferred: transferResult,
  });
}
