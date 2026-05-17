/**
 * Round 5 — Parent weekly digest cron.
 *
 * Vercel Cron: Pazartesi 08:00 (Europe/Istanbul tahmini — Vercel UTC kullanır,
 * `0 5 * * 1` ≈ 05:00 UTC = 08:00 TRT).
 *
 * Tüm veliler için `getParentChildSummaries` çağırır; en az 1 çocuğu olan ve
 * email'i olan velilere `sendParentWeeklyDigestEmail` gönderir.
 *
 * Idempotent değil — aynı saatte iki kez çalışırsa iki email gider.
 * (Vercel Cron'da bu nadir; gerekirse `EmailOutbox` üzerinde dedup eklenebilir.)
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getParentChildSummaries, summaryHasCriticalAlert } from "@/lib/parent-summary";
import { sendParentWeeklyDigestEmail } from "@/lib/email";
import { log } from "@/lib/logger";
import { notifyUser } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 dk — N parent için yeterli

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
  const t0 = Date.now();

  const parents = await prisma.parent.findMany({
    where: {
      email: { not: null },
      students: { some: {} },
      user: { isNot: null },
    },
    select: { id: true, fullName: true, email: true, userId: true },
  });

  let sent = 0;
  let skipped = 0;
  let critical = 0;
  let failed = 0;

  for (const p of parents) {
    try {
      if (!p.email) {
        skipped++;
        continue;
      }
      const children = await getParentChildSummaries(p.id);
      if (children.length === 0) {
        skipped++;
        continue;
      }
      const hasCritical = children.some(summaryHasCriticalAlert);
      if (hasCritical) critical++;

      await sendParentWeeklyDigestEmail({
        to: p.email,
        parentName: p.fullName,
        children,
      });
      sent++;

      // Kritik uyarı varsa ayrıca in-app + push notification
      if (hasCritical && p.userId) {
        const criticalChildren = children
          .filter(summaryHasCriticalAlert)
          .map((c) => c.fullName)
          .join(", ");
        await notifyUser({
          userId: p.userId,
          title: "Çocuğunuzla ilgili acil dikkat",
          body: `Haftalık özetinizde acil uyarılar var: ${criticalChildren}`,
          href: "/panel/veli",
          type: "PERFORMANCE",
        }).catch(() => null);
      }
    } catch (err) {
      failed++;
      log.warn("cron.parent_weekly.failed", { parentId: p.id }, err);
    }
  }

  const result = {
    ok: true,
    parents: parents.length,
    sent,
    skipped,
    critical,
    failed,
    durationMs: Date.now() - t0,
  };
  log.info("cron.parent_weekly.done", result);
  return NextResponse.json(result);
}
