import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 24 saat içinde teslim tarihi gelen ödevler için PENDING öğrencilere push.
 * Çalıştırma: Vercel Cron (günlük 09:00) → header `Authorization: Bearer ${CRON_SECRET}`.
 * De-dup: aynı gün içinde tekrar göndermemek için `app_activity_logs.action='assignment_reminder_sent'`.
 */
function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

  const submissions = await prisma.assignmentSubmission.findMany({
    where: {
      status: "PENDING",
      assignment: { dueAt: { gte: now, lt: in24h } },
    },
    include: {
      assignment: { select: { id: true, title: true, dueAt: true } },
      student: { select: { userId: true } },
    },
    take: 1000,
  });

  let pushed = 0;
  for (const s of submissions) {
    if (!s.student.userId) continue;

    // De-dup: bugün zaten gönderildi mi?
    const sent = await prisma.appActivityLog.findFirst({
      where: {
        userId: s.student.userId,
        action: "assignment_reminder_sent",
        createdAt: { gte: todayStart },
      },
      select: { id: true },
    });
    if (sent) continue;

    await sendPush({
      userIds: [s.student.userId],
      title: "Ödev teslim tarihi yaklaşıyor",
      body: `"${s.assignment.title}" 24 saat içinde teslim edilmeli.`,
      data: { assignmentId: s.assignment.id, type: "ASSIGNMENT" },
      category: "ASSIGNMENT",
      priority: "high",
    });
    await prisma.appActivityLog.create({
      data: {
        userId: s.student.userId,
        action: "assignment_reminder_sent",
        payload: { assignmentId: s.assignment.id },
      },
    }).catch(() => undefined);
    pushed += 1;
  }

  return NextResponse.json({ ok: true, candidates: submissions.length, pushed });
}
