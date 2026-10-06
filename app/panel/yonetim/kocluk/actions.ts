"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { enforceMutation } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";

/**
 * ADMIN · KOÇ ATAMA / DEVRETME (Panel.dc.html → aCoach).
 *
 * Tasarımdaki "Koç ata" ve "Devret" aksiyonları. İkisi de aynı işlemdir:
 * varsa mevcut aktif atamayı KAPAT, yenisini aç. Tek işlemde (transaction)
 * yapılır, çünkü veritabanındaki kısmi tekil indeks bir öğrenciye aynı anda
 * iki aktif koç bağlanmasını reddeder — önce kapatmadan yeni atama eklenemez.
 *
 * Kurallar (B12):
 *  - öğrencinin AKTİF Yön Koçluk (OK) üyeliği olmalı,
 *  - koç aktif hesap ve koç olarak işaretli olmalı,
 *  - koç kapasitesi (`coachCapacity`) doluysa atama ancak gerekçeyle yapılır;
 *    aşım gerekçesi denetim kaydına yazılır.
 * Reddedilen istek sayfaya `?hata=<kod>` ile döner.
 */

export type AssignCoachError = "student" | "coach" | "membership" | "capacity";

function fail(code: AssignCoachError): never {
  redirect(`/panel/yonetim/kocluk?hata=${code}`);
}
export async function assignCoach(formData: FormData) {
  const session = await requireRole("ADMIN");
  await enforceMutation({
    action: "coaching.assign",
    userId: session.userId,
    requireSameOrigin: true,
    rateLimit: { max: 60, windowMs: 60_000 },
  });

  const parsed = z
    .object({
      studentId: z.string().min(1),
      coachId: z.string().min(1),
      cadenceDays: z.string().optional(),
      overrideReason: z.string().max(500).optional(),
    })
    .parse(Object.fromEntries(formData));

  const cadence = parsed.cadenceDays?.trim() ? Number(parsed.cadenceDays) : null;
  const cadenceDays = cadence !== null && Number.isFinite(cadence) && cadence > 0 ? Math.floor(cadence) : null;

  // Koçun gerçekten koç olarak işaretli ve aktif olduğunu doğrula.
  const coach = await prisma.teacherProfile.findFirst({
    where: { id: parsed.coachId, isCoach: true, user: { status: "ACTIVE", role: "TEACHER" } },
    select: {
      id: true,
      coachCapacity: true,
      user: { select: { fullName: true, email: true } },
    },
  });
  if (!coach) fail("coach");
  const student = await prisma.studentProfile.findUnique({
    where: { id: parsed.studentId },
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
  if (!student) fail("student");
  if (student.user.productMemberships.length === 0) fail("membership");

  const overrideReason = parsed.overrideReason?.trim() || null;
  let capacityOverride = false;
  if (coach.coachCapacity !== null) {
    const load = await prisma.coachAssignment.count({
      where: { coachId: coach.id, endedAt: null, studentId: { not: student.id } },
    });
    if (load >= coach.coachCapacity) {
      if (!overrideReason || overrideReason.length < 3) fail("capacity");
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
        assignedById: session.userId,
      },
    });
  });

  await logAudit({
    actorUserId: session.userId,
    entityType: "CoachAssignment",
    entityId: student.id,
    action: "coaching.assign",
    summary: `${student.user.fullName || student.user.email} → koç ${coach.user.fullName || coach.user.email}`,
    payload: capacityOverride
      ? { coachId: coach.id, capacityOverride: true, coachCapacity: coach.coachCapacity, overrideReason }
      : { coachId: coach.id },
  });

  revalidatePath("/panel/yonetim/kocluk");
  revalidatePath("/panel/yonetim/ogrenciler");
}
