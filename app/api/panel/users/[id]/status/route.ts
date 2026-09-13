import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { guardMutation } from "@/lib/security/mutation-guard";
import { requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import { revokeAllUserSessions } from "@/lib/auth/session";

/**
 * Hesabı askıya alma / yeniden açma.
 *
 * Varsayılan güvenli aksiyon ASKIDA tutmaktır. Kalıcı silme ayrı endpointte
 * bağımlılık kontrollerinden geçer; riskli geçmiş varsa yine askıya alma önerilir.
 *
 * İki kilitlenme tuzağı burada kapatılıyor (aşağıdaki kontroller).
 */

const schema = z.object({ status: z.enum(["ACTIVE", "SUSPENDED", "ARCHIVED"]) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;

  const guard = await guardMutation({
    action: "panel.users.status",
    requireSameOrigin: true,
    headers: { get: (name: string) => request.headers.get(name) },
    rateLimitKey: `panel:users:status:${auth.session.userId}`,
    rateLimit: { max: 60, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.code === "RATE_LIMIT" ? "Çok fazla işlem. Biraz sonra tekrar deneyin." : guard.message },
      { status: guard.code === "RATE_LIMIT" ? 429 : 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const { id } = await context.params;

  // TUZAK 1: Admin kendini askıya/arşive alırsa oturumu anında geçersizleşir ve
  // kendini dışarı kilitler. Geri almak için başka bir admin gerekir.
  if (id === auth.session.userId && parsed.data.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Kendi hesabınızı askıya alamaz veya arşivleyemezsiniz." },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
  }

  const currentStatus = target.status;
  const nextStatus = parsed.data.status;

  const statusChanged = currentStatus !== nextStatus;

  // TUZAK 2: Son aktif admin askıya/arsive alınırsa panele bir daha KİMSE giremez —
  // hesabı yalnızca admin açabildiği için kurtarma yolu da kalmaz.
  if (
    statusChanged &&
    target.role === "ADMIN" &&
    currentStatus === "ACTIVE" &&
    (nextStatus === "SUSPENDED" || nextStatus === "ARCHIVED")
  ) {
    const activeAdmins = await prisma.user.count({
      where: { role: "ADMIN", status: "ACTIVE" },
    });
    if (activeAdmins <= 1) {
      return NextResponse.json(
        { error: "Son aktif yöneticiyi askıya alamazsınız. Önce başka bir yönetici hesabı açın." },
        { status: 400 },
      );
    }
  }

  if (
    statusChanged &&
    target.role === "TEACHER" &&
    currentStatus === "ACTIVE" &&
    (nextStatus === "SUSPENDED" || nextStatus === "ARCHIVED")
  ) {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: target.id },
      select: { id: true, isCoach: true },
    });
    const now = new Date();
    const [activeGroups, upcomingLessons, activeCoachAssignments, openInterventions] = await Promise.all([
      prisma.group.count({ where: { teacherId: target.id, isActive: true } }),
      prisma.lesson.count({ where: { teacherId: target.id, status: "PLANNED", startsAt: { gte: now } } }),
      teacherProfile?.isCoach
        ? prisma.coachAssignment.count({ where: { coachId: teacherProfile.id, endedAt: null } })
        : Promise.resolve(0),
      prisma.interventionCase.count({
        where: { ownerId: target.id, status: { in: ["OPEN", "IN_PROGRESS", "SNOOZED"] } },
      }),
    ]);
    if (activeGroups > 0 || upcomingLessons > 0 || activeCoachAssignments > 0 || openInterventions > 0) {
      return NextResponse.json(
        {
          error:
            "Öğretmen askıya alınmadan önce grup, gelecek ders ve aktif sorumluluk devri tamamlanmalı. Kişi detayındaki güvenli offboarding akışını kullanın.",
        },
        { status: 409 },
      );
    }
  }

  const allowedTransitions: Record<"ACTIVE" | "SUSPENDED" | "ARCHIVED", Array<"ACTIVE" | "SUSPENDED" | "ARCHIVED">> = {
    ACTIVE: ["SUSPENDED", "ARCHIVED"],
    SUSPENDED: ["ACTIVE", "ARCHIVED"],
    ARCHIVED: ["ACTIVE"],
  };

  if (statusChanged && !allowedTransitions[currentStatus].includes(nextStatus)) {
    return NextResponse.json(
      { error: `${currentStatus} durumundan ${nextStatus} durumuna geçilemez.` },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: target.id },
    data: {
      status: nextStatus,
      archivedAt: nextStatus === "ARCHIVED" ? target.archivedAt ?? new Date() : null,
      archivedById: nextStatus === "ARCHIVED" ? target.archivedById ?? auth.session.userId : null,
    },
  });

  // Askıya alınan/arşivlenen kullanıcı ANINDA dışarı atılır; açık oturumu kalmamalı.
  let revoked = 0;
  if (statusChanged && (nextStatus === "SUSPENDED" || nextStatus === "ARCHIVED")) {
    revoked = await revokeAllUserSessions(target.id);
  }

  if (statusChanged) {
    await logAudit({
      actorUserId: auth.session.userId,
      entityType: "User",
      entityId: target.id,
      action:
        nextStatus === "SUSPENDED"
          ? "panel.user_suspended"
          : nextStatus === "ARCHIVED"
            ? "panel.user_archived"
            : "panel.user_activated",
      summary:
        nextStatus === "SUSPENDED"
          ? `${target.email} askıya alındı; ${revoked} oturum kapatıldı`
          : nextStatus === "ARCHIVED"
            ? `${target.email} arşivlendi; ${revoked} oturum kapatıldı`
            : `${target.email} yeniden aktifleştirildi`,
    });
  }

  return NextResponse.json({ status: nextStatus });
}
