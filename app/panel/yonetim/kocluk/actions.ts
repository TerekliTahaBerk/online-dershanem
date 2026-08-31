"use server";

import { revalidatePath } from "next/cache";
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
 */
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
    })
    .parse(Object.fromEntries(formData));

  const cadence = parsed.cadenceDays?.trim() ? Number(parsed.cadenceDays) : null;
  const cadenceDays = cadence !== null && Number.isFinite(cadence) && cadence > 0 ? Math.floor(cadence) : null;

  // Koçun gerçekten koç olarak işaretli olduğunu doğrula.
  const coach = await prisma.teacherProfile.findFirst({
    where: { id: parsed.coachId, isCoach: true },
    select: { id: true, user: { select: { fullName: true, email: true } } },
  });
  const student = await prisma.studentProfile.findUnique({
    where: { id: parsed.studentId },
    select: { id: true, user: { select: { fullName: true, email: true } } },
  });
  if (!coach || !student) return;

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
  });

  revalidatePath("/panel/yonetim/kocluk");
  revalidatePath("/panel/yonetim/ogrenciler");
}
