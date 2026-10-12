import "server-only";

import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { operationDigest } from "./group-mutation-core";
import { CoachAssignmentConflict, coachAssignmentRevision, readCoachReceipt } from "./coach-assignment-core";
export { CoachAssignmentConflict, coachAssignmentRevision } from "./coach-assignment-core";

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
  idempotencyKey?: string;
  expectedRevision?: string;
}): Promise<{ ok: true; replayed: boolean } | { ok: false; code: AssignCoachError }> {
  const key = `coach-assignment:${input.actorUserId}:${input.idempotencyKey ?? randomUUID()}`;
  const digest = operationDigest({ studentId: input.studentId, coachId: input.coachId, cadenceDays: input.cadenceDays ?? null, overrideReason: input.overrideReason ?? null, expectedRevision: input.expectedRevision ?? null });
  const replay = async () => {
    const saved = await prisma.auditLog.findUnique({ where: { idempotencyKey: key }, select: { payload: true } });
    return saved ? readCoachReceipt(saved.payload, digest) : null;
  };
  const prior = await replay();
  if (prior) return prior;
  try {
    return await prisma.$transaction(async (tx) => {
      // Tüm web/mobil atamalar aynı kilidi alır; iki öğrenci son kontenjanı paylaşamaz.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('coach-assignment', 0))::text`;
      const receipt = await tx.auditLog.findUnique({ where: { idempotencyKey: key }, select: { payload: true } });
      if (receipt) return readCoachReceipt(receipt.payload, digest);
      const current = await tx.coachAssignment.findFirst({ where: { studentId: input.studentId, endedAt: null } });
      if (input.expectedRevision !== undefined && coachAssignmentRevision(current) !== input.expectedRevision) throw new CoachAssignmentConflict();
      const cadence = input.cadenceDays?.trim() ? Number(input.cadenceDays) : null;
      const cadenceDays = cadence !== null && Number.isFinite(cadence) && cadence > 0 ? Math.floor(cadence) : null;

      // Koçun gerçekten koç olarak işaretli ve aktif olduğunu doğrula.
      const coach = await tx.teacherProfile.findFirst({
        where: { id: input.coachId, isCoach: true, user: { status: "ACTIVE", role: "TEACHER" } },
        select: {
          id: true,
          coachCapacity: true,
          user: { select: { fullName: true, email: true } },
        },
      });
      if (!coach) return { ok: false, code: "coach" };
      const student = await tx.studentProfile.findFirst({
        where: { id: input.studentId, user: { status: "ACTIVE", role: "STUDENT" } },
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
        const load = await tx.coachAssignment.count({
          where: { coachId: coach.id, endedAt: null, studentId: { not: student.id } },
        });
        if (load >= coach.coachCapacity) {
          if (!overrideReason || overrideReason.length < 3) return { ok: false, code: "capacity" };
          capacityOverride = true;
        }
      }

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

      await tx.auditLog.create({ data: {
        actorUserId: input.actorUserId,
        actorType: "USER",
        idempotencyKey: key,
        entityType: "CoachAssignment",
        entityId: student.id,
        action: "coaching.assign",
        summary: `${student.user.fullName || student.user.email} → koç ${coach.user.fullName || coach.user.email}`,
        payload: { operationDigest: digest, coachId: coach.id, ...(capacityOverride ? { capacityOverride: true, coachCapacity: coach.coachCapacity, overrideReason } : {}) },
      } });
      return { ok: true as const, replayed: false };
    }, { isolationLevel: "Serializable", timeout: 15_000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code)) {
      const saved = await replay();
      if (saved) return saved;
      throw new CoachAssignmentConflict();
    }
    throw error;
  }
}
