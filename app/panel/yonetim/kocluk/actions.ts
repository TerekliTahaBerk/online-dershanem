"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { enforceMutation } from "@/lib/security/mutation-guard";
import { assignCoachService, type AssignCoachError } from "@/lib/panel/coach-assignment-service";
import { COACHING_QUEUES, type CoachingQueue } from "./queues";

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

export type { AssignCoachError };

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
      returnQueue: z.string().optional(),
    })
    .parse(Object.fromEntries(formData));

  const result = await assignCoachService({ actorUserId: session.userId, studentId: parsed.studentId, coachId: parsed.coachId, cadenceDays: parsed.cadenceDays, overrideReason: parsed.overrideReason });
  if (!result.ok) fail(result.code);

  revalidatePath("/panel/yonetim/kocluk");
  revalidatePath("/panel/yonetim/ogrenciler");
  // Yan panelden atandıysa paneli kapatıp aynı kuyruğa dön (yalnız bilinen kuyruk adları).
  if (parsed.returnQueue !== undefined) {
    const queue = COACHING_QUEUES.includes(parsed.returnQueue as CoachingQueue) ? parsed.returnQueue : COACHING_QUEUES[0];
    redirect(`/panel/yonetim/kocluk?kuyruk=${queue}&atandi=1`);
  }
}
