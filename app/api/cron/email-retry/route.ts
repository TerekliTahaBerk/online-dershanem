/**
 * Round 7 — Email retry cron.
 *
 * EmailOutbox'taki PENDING + FAILED (nextRetryAt <= now) satırlarını yeniden gönderir.
 * Resend tarafında transient failure veya cold-start crash sonrası kurtarma.
 *
 * Schedule: her 15 dakikada bir (cron expr vercel.json'da kayıtlı).
 * Cadence x MAX_OUTBOX_ATTEMPTS (10) ≈ 2.5 saat retry penceresi.
 */
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { runJob } from "@/lib/jobs/runner";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FROM = process.env.MAIL_FROM || "Online Dershanem <noreply@onlinedershanem.com>";
const MAX_ATTEMPTS = 10;
const BATCH_SIZE = 25;

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY || "re_missing");
  return _resend;
}

export async function GET(req: Request) {
  return runJob("email-retry", req, async () => {
    if (!process.env.RESEND_API_KEY) {
      return { ok: true, skipped: true, reason: "no_resend_key" };
    }
    const now = new Date();
    const candidates = await prisma.emailOutbox.findMany({
      where: {
        status: { in: ["PENDING", "FAILED"] },
        attempts: { lt: MAX_ATTEMPTS },
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      },
      orderBy: { createdAt: "asc" },
      take: BATCH_SIZE,
    });

    let sent = 0;
    let failed = 0;
    let abandoned = 0;

    for (const e of candidates) {
      let recipients: string[];
      try {
        const parsed = JSON.parse(e.recipients) as unknown;
        recipients = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
      } catch {
        recipients = [e.recipients];
      }
      try {
        await getResend().emails.send({ from: FROM, to: recipients, subject: e.subject, html: e.html });
        await prisma.emailOutbox.update({
          where: { id: e.id },
          data: { status: "SENT", sentAt: new Date(), attempts: e.attempts + 1, lastError: null, nextRetryAt: null },
        });
        sent++;
      } catch (err) {
        const nextAttempts = e.attempts + 1;
        const willAbandon = nextAttempts >= MAX_ATTEMPTS;
        const nextRetryAt = willAbandon
          ? null
          : new Date(Date.now() + Math.min(60_000 * Math.pow(2, nextAttempts), 3_600_000));
        await prisma.emailOutbox
          .update({
            where: { id: e.id },
            data: {
              status: willAbandon ? "ABANDONED" : "FAILED",
              attempts: nextAttempts,
              lastError: String(err).slice(0, 500),
              nextRetryAt,
            },
          })
          .catch((dbErr) => log.warn("email-retry.update_failed", { id: e.id }, dbErr));
        if (willAbandon) abandoned++;
        else failed++;
      }
    }

    return { candidates: candidates.length, sent, failed, abandoned };
  });
}
