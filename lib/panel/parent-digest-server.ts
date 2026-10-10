import "server-only";

import { prisma } from "@/lib/prisma";
import { getStudentCoaching } from "@/lib/panel/coaching";
import { addIstanbulCalendarDays, istanbulWeekStart } from "@/lib/istanbul-time";
import type { ParentChild } from "@/lib/panel/parent-product-policy";

/**
 * VELİ · HAFTALIK ÖZET yükleyicisi — web `app/panel/veli/haftalik` ve mobil
 * `GET /api/panel/parent/digests` aynı fonksiyonu kullanır.
 *
 *  - Yalnız `PUBLISHED` öğretmen özeti (taslak asla). Geri bildirim yalnız
 *    BU velinin kaydı.
 *  - "Yaklaşanlar" otomatik takvim / koçluk kayıtlarıdır; öğretmen özeti
 *    DEĞİLDİR ve ayrı alanda döner (insan yazımı rapor gibi sunulmaz).
 */
export type ParentDigestUpcoming = { kind: "LESSON" | "COACHING"; title: string; at: Date };

export async function loadParentDigest(parentUserId: string, child: ParentChild, now = new Date()) {
  const nextWeekEnd = addIstanbulCalendarDays(istanbulWeekStart(now), 14);
  const [digest, nextLessons, coaching] = await Promise.all([
    prisma.weeklyDigest.findFirst({
      where: { studentId: child.id, status: "PUBLISHED" },
      orderBy: { weekStart: "desc" },
      select: {
        id: true,
        weekStart: true,
        publishedAt: true,
        dataThrough: true,
        trendBand: true,
        goodThingOne: true,
        goodThingTwo: true,
        supportArea: true,
        homeQuestion: true,
        feedback: { where: { userId: parentUserId }, take: 1, select: { helpful: true, anxietyPulse: true } },
      },
    }),
    child.products.includes("OD")
      ? prisma.lesson.findMany({
          where: { status: "PLANNED", startsAt: { gte: now, lt: nextWeekEnd }, attendances: { some: { studentId: child.id } } },
          orderBy: { startsAt: "asc" },
          take: 4,
          select: { title: true, startsAt: true },
        })
      : Promise.resolve([]),
    child.products.includes("OK") ? getStudentCoaching(child.id) : Promise.resolve(null),
  ]);
  const upcoming: ParentDigestUpcoming[] = nextLessons.map((lesson) => ({ kind: "LESSON", title: lesson.title, at: lesson.startsAt }));
  if (coaching?.nextScheduledAt) upcoming.push({ kind: "COACHING", title: "Koçluk görüşmesi", at: coaching.nextScheduledAt });
  return { digest, upcoming };
}
