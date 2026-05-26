import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 15 dk önce başlayacak dersler için push hatırlatma.
 * Çalıştırma: Vercel Cron (her 5 dk) → header `Authorization: Bearer ${CRON_SECRET}`.
 *
 * Sprint 6 — Fan-out dedup: aynı sessionGroupId paylaşan satırlar için
 * öğretmen push'u yalnızca BİR KEZ gönderilir (öğretmen aynı seansın N
 * öğrenci satırı için N kez bildirim almasın). Öğrenci push'u DEĞİŞMEDİ —
 * her öğrenci kendi Lesson satırından kendi push'unu alır.
 */
function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev'de aç
  const header = req.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // 13–17 dk sonrası penceresi (5 dk genişlik → 5 dk cadence ile çakışmaz)
  const windowStart = new Date(now.getTime() + 13 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 17 * 60 * 1000);

  const lessons = await prisma.lesson.findMany({
    where: {
      scheduledAt: { gte: windowStart, lt: windowEnd },
      status: { in: ["SCHEDULED"] },
    },
    include: {
      student: { select: { userId: true, fullName: true } },
      teacher: { select: { userId: true, fullName: true } },
    },
  });

  // Öğretmen-bazlı dedup: aynı sessionGroupId'de öğretmene tek push.
  const teacherPushed = new Set<string>(); // key = teacherUserId|sessionKey
  let pushed = 0;
  let teacherDeduped = 0;

  for (const l of lessons) {
    const userIds: string[] = [];
    if (l.student.userId) userIds.push(l.student.userId);

    if (l.teacher.userId) {
      const sessionKey = l.sessionGroupId ?? `solo:${l.id}`;
      const tkey = `${l.teacher.userId}|${sessionKey}`;
      if (!teacherPushed.has(tkey)) {
        teacherPushed.add(tkey);
        userIds.push(l.teacher.userId);
      } else {
        teacherDeduped += 1;
      }
    }

    if (userIds.length === 0) continue;

    const minutesLeft = Math.round((l.scheduledAt.getTime() - now.getTime()) / 60000);
    await sendPush({
      userIds,
      title: "Ders yaklaşıyor",
      body: `${l.title ?? l.subject ?? "Ders"} ${minutesLeft} dk sonra başlayacak.`,
      data: {
        lessonId: l.id,
        meetLink: l.meetingJoinUrl ?? l.googleMeetLink,
        meetingJoinUrl: l.meetingJoinUrl,
        type: "LESSON",
      },
      category: "LESSON",
      priority: "high",
    });
    pushed += 1;
  }

  return NextResponse.json({ ok: true, count: lessons.length, pushed, teacherDeduped });
}
