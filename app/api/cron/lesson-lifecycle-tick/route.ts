/**
 * Sprint 6 — FAZ 2 — Lesson lifecycle tick.
 *
 * Her 5 dakikada bir çalışır:
 *  1. LIVE + zamanı geçen dersleri otomatik ENDED'a alır (auto-end).
 *  2. SCHEDULED + grace içinde hiç JOIN olmamış dersleri MISSED işaretler.
 *  3. ENDED olan derslerin auto-attendance'ını hesaplar (son 2 saat penceresi).
 *
 * Her adım idempotent ve fan-out korunuyor (sessionGroupId paylaşan satırlar
 * bağımsız değerlendirilir; her satır kendi state'inde).
 *
 * Schedule: vercel.json — `* /5 * * * *` (cron yorum karakteri için tek satırda).
 */
import { prisma } from "@/lib/prisma";
import { runJob } from "@/lib/jobs/runner";
import { logAudit } from "@/lib/audit";
import { shouldAutoEnd, shouldAutoMissed, AUTO_END_GRACE_MS, AUTO_MISSED_GRACE_MS } from "@/lib/lessons/lifecycle";
import { computeAutoAttendanceForLesson } from "@/lib/lessons/auto-attendance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  return runJob("lesson-lifecycle-tick", req, async () => {
    const now = new Date();

    // ── 1. Auto-end: LIVE + (scheduledAt + duration + 30dk geçti) ──────────
    // Optimistik: bütün LIVE satırları çek (kapsamı sınırlı), filter et.
    const liveLessons = await prisma.lesson.findMany({
      where: { status: "LIVE" },
      select: { id: true, scheduledAt: true, duration: true, sessionGroupId: true },
      take: 500,
    });
    const toEndIds = liveLessons
      .filter((l) =>
        shouldAutoEnd({
          status: "LIVE",
          scheduledAt: l.scheduledAt,
          duration: l.duration,
          now,
        }),
      )
      .map((l) => l.id);

    let endedCount = 0;
    if (toEndIds.length > 0) {
      const res = await prisma.lesson.updateMany({
        where: { id: { in: toEndIds }, status: "LIVE" },
        data: { status: "ENDED", endedAt: now },
      });
      endedCount = res.count;
    }

    // ── 2. Auto-missed: SCHEDULED + scheduledAt + 30dk geçti + hiç JOIN yok ─
    const cutoffMissed = new Date(now.getTime() - AUTO_MISSED_GRACE_MS);
    const candMissed = await prisma.lesson.findMany({
      where: { status: "SCHEDULED", scheduledAt: { lt: cutoffMissed } },
      select: { id: true, scheduledAt: true, duration: true, sessionGroupId: true },
      take: 500,
    });
    const missedIds: string[] = [];
    for (const l of candMissed) {
      if (!shouldAutoMissed({ status: "SCHEDULED", scheduledAt: l.scheduledAt, duration: l.duration, now })) continue;
      const hasJoin = await prisma.lessonJoinEvent.findFirst({
        where: { lessonId: l.id, kind: "JOIN" },
        select: { id: true },
      });
      if (!hasJoin) missedIds.push(l.id);
    }
    let missedCount = 0;
    if (missedIds.length > 0) {
      const res = await prisma.lesson.updateMany({
        where: { id: { in: missedIds }, status: "SCHEDULED" },
        data: { status: "MISSED" },
      });
      missedCount = res.count;
      // Audit toplu (her satır için ayrı entry açmaktansa özet bırak).
      await logAudit({
        actorUserId: null,
        actorType: "SYSTEM",
        entityType: "Lesson",
        entityId: "BULK",
        action: "LESSON_AUTO_MISSED",
        summary: `${missedCount} ders otomatik MISSED işaretlendi`,
        payload: { ids: missedIds },
      });
    }

    // ── 3. Auto-attendance recompute: son 2 saatte ENDED olan dersler ──────
    const since = new Date(now.getTime() - 2 * 60 * 60_000);
    const recentlyEnded = await prisma.lesson.findMany({
      where: { status: "ENDED", endedAt: { gte: since } },
      select: { id: true },
      take: 500,
    });
    let attendanceCreated = 0;
    let attendanceSkippedManual = 0;
    for (const l of recentlyEnded) {
      try {
        const r = await computeAutoAttendanceForLesson(prisma, { lessonId: l.id });
        attendanceCreated += r.created;
        attendanceSkippedManual += r.skippedManual;
      } catch (e) {
        console.error("[lesson-lifecycle-tick] auto-attendance fail", l.id, e);
      }
    }

    return {
      ok: true,
      now: now.toISOString(),
      scanned: {
        live: liveLessons.length,
        candidateMissed: candMissed.length,
        recentlyEnded: recentlyEnded.length,
      },
      autoEnded: endedCount,
      autoMissed: missedCount,
      attendanceCreated,
      attendanceSkippedManual,
      autoEndGraceMs: AUTO_END_GRACE_MS,
      autoMissedGraceMs: AUTO_MISSED_GRACE_MS,
    };
  });
}
