import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

/**
 * KOÇ ATAMA / DEVRETME servisi — web Server Action'ı
 * (`app/panel/yonetim/kocluk/actions.ts`) ve mobil yönetim ucu
 * (`POST /api/panel/admin/coach-assignments`) AYNI kuralları buradan çalıştırır:
 *  - öğrencinin AKTİF Yön Koçluk (OK) üyeliği olmalı,
 *  - koç aktif hesap ve koç olarak işaretli olmalı,
 *  - kapasite doluysa atama ancak gerekçeyle (denetim kaydına yazılır),
 *  - mevcut aktif atama kapatılıp yenisi tek işlemde açılır.
 */
export type AssignCoachError = "student" | "coach" | "membership" | "capacity";

export const ASSIGN_COACH_ERROR_MESSAGE: Record<AssignCoachError, string> = {
  student: "Öğrenci bulunamadı.",
  coach: "Aktif koç bulunamadı.",
  membership: "Öğrencinin aktif Yön Koçluk üyeliği yok.",
  capacity: "Koç kapasitesi dolu; atama için en az 3 karakterlik gerekçe gerekli.",
};

export async function assignCoachService(input: {
  actorUserId: string;
  studentId: string;
  coachId: string;
  cadenceDays?: string | null;
  overrideReason?: string | null;
}): Promise<{ ok: true } | { ok: false; code: AssignCoachError }> {
  const cadence = input.cadenceDays?.trim() ? Number(input.cadenceDays) : null;
  const cadenceDays = cadence !== null && Number.isFinite(cadence) && cadence > 0 ? Math.floor(cadence) : null;

  // Koçun gerçekten koç olarak işaretli ve aktif olduğunu doğrula.
  const coach = await prisma.teacherProfile.findFirst({
    where: { id: input.coachId, isCoach: true, user: { status: "ACTIVE", role: "TEACHER" } },
    select: {
      id: true,
      coachCapacity: true,
      user: { select: { fullName: true, email: true } },
    },
  });
  if (!coach) return { ok: false, code: "coach" };
  const student = await prisma.studentProfile.findUnique({
    where: { id: input.studentId },
    select: {
      id: true,
      user: {
        select: {
          fullName: true,
          email: true,
          productMemberships: {
            where: {
              product: "OK",
              revokedAt: null,
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });
  if (!student) return { ok: false, code: "student" };
  if (student.user.productMemberships.length === 0) return { ok: false, code: "membership" };

  const overrideReason = input.overrideReason?.trim() || null;
  let capacityOverride = false;
  if (coach.coachCapacity !== null) {
    const load = await prisma.coachAssignment.count({
      where: { coachId: coach.id, endedAt: null, studentId: { not: student.id } },
    });
    if (load >= coach.coachCapacity) {
      if (!overrideReason || overrideReason.length < 3) return { ok: false, code: "capacity" };
      capacityOverride = true;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.coachAssignment.updateMany({
      where: { studentId: student.id, endedAt: null },
      data: { endedAt: new Date() },
    });
    await tx.coachAssignment.create({
      data: {
        studentId: student.id,
        coachId: coach.id,
        cadenceDays,
        assignedById: input.actorUserId,
      },
    });
  });

  await logAudit({
    actorUserId: input.actorUserId,
    entityType: "CoachAssignment",
    entityId: student.id,
    action: "coaching.assign",
    summary: `${student.user.fullName || student.user.email} → koç ${coach.user.fullName || coach.user.email}`,
    payload: capacityOverride
      ? { coachId: coach.id, capacityOverride: true, coachCapacity: coach.coachCapacity, overrideReason }
      : { coachId: coach.id },
  });

  return { ok: true };
}
