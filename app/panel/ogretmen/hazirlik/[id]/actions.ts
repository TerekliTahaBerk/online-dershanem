"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { findCoachAssignmentForCoach } from "@/lib/panel/coaching";
import { enforceMutation } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";

/**
 * EĞİTMEN · KOÇ GÖRÜŞMESİNİ KAYDET (Panel.dc.html → ePrep).
 *
 * Tasarımdaki "Görüşmeyi tamamlandı işaretle" ve "Haftanın odağı / koç notu"
 * alanları. Bu ekran daha önce bu düğmeyi TAŞIMIYORDU çünkü şemada görüşme
 * modeli yoktu; `CoachingSession` eklendikten sonra gerçek işlem oldu.
 *
 * GÜVENLİK: koçun bu öğrenciye ATANMIŞ olduğu `findCoachAssignmentForCoach`
 * ile doğrulanır. Başka bir koçun öğrencisine görüşme yazılamaz.
 *
 * GİZLİLİK: iki not alanı ayrıdır ve öyle kalır — `sharedNote` öğrenciye ve
 * veliye açılır, `privateNote` yalnız koç ve yönetici içindir.
 */
export async function recordCoachingSession(formData: FormData) {
  const session = await requireRole("TEACHER");
  await enforceMutation({
    action: "coaching.session.record",
    userId: session.userId,
    requireSameOrigin: true,
    rateLimit: { max: 60, windowMs: 60_000 },
  });

  const parsed = z
    .object({
      studentId: z.string().min(1),
      focus: z.string().max(300).optional(),
      sharedNote: z.string().max(4000).optional(),
      privateNote: z.string().max(4000).optional(),
      nextAt: z.string().optional(),
    })
    .parse(Object.fromEntries(formData));

  const assignment = await findCoachAssignmentForCoach(session.userId, parsed.studentId);
  if (!assignment) return;

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Bekleyen planlı görüşme varsa onu tamamla; yoksa gerçekleşmiş görüşmeyi
    // kaydet. Böylece takvimde planlanan görüşme kopya kayıt üretmez.
    const planned = await tx.coachingSession.findFirst({
      where: { assignmentId: assignment.id, status: "PLANNED" },
      orderBy: { scheduledAt: "asc" },
      select: { id: true },
    });

    if (planned) {
      await tx.coachingSession.update({
        where: { id: planned.id },
        data: {
          status: "COMPLETED",
          completedAt: now,
          focus: parsed.focus?.trim() || null,
          sharedNote: parsed.sharedNote?.trim() || null,
          privateNote: parsed.privateNote?.trim() || null,
        },
      });
    } else {
      await tx.coachingSession.create({
        data: {
          assignmentId: assignment.id,
          scheduledAt: now,
          status: "COMPLETED",
          completedAt: now,
          focus: parsed.focus?.trim() || null,
          sharedNote: parsed.sharedNote?.trim() || null,
          privateNote: parsed.privateNote?.trim() || null,
        },
      });
    }

    // Sonraki görüşme: koç tarih verdiyse onu, vermediyse sıklıktan hesapla.
    const explicit = parsed.nextAt?.trim() ? new Date(parsed.nextAt) : null;
    const nextAt =
      explicit && !Number.isNaN(explicit.getTime())
        ? explicit
        : assignment.cadenceDays
          ? new Date(now.getTime() + assignment.cadenceDays * 86_400_000)
          : null;

    if (nextAt) {
      await tx.coachingSession.create({
        data: { assignmentId: assignment.id, scheduledAt: nextAt, status: "PLANNED" },
      });
    }
  });

  await logAudit({
    actorUserId: session.userId,
    entityType: "CoachingSession",
    entityId: assignment.id,
    action: "coaching.session.record",
    summary: "Koç görüşmesi tamamlandı olarak kaydedildi",
  });

  revalidatePath(`/panel/ogretmen/hazirlik/${parsed.studentId}`);
}
