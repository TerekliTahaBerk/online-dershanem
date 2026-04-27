// POST /api/cron/email-retry
//
// Picks up FAILED EmailOutbox entries whose nextRetryAt has passed and
// attempts redelivery. Marks them SENT on success, or increments the
// attempt counter (ABANDONED after 10 total attempts).
//
// Intended to be called by Vercel Cron every 15 minutes.
// Register in vercel.json: { "path": "/api/cron/email-retry", "schedule": "* /15 * * * *" }
// (remove the space in "* /15" — written that way here to avoid comment terminator)
//
// Protected by the CRON_SECRET environment variable.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const MAX_OUTBOX_ATTEMPTS = 10;
const BATCH_SIZE = 20;
const FROM = "Online Dershanem <noreply@onlinedershanem.com>";

export async function POST(req: NextRequest) {
  // Verify cron secret
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: true, reason: "no RESEND_API_KEY" });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const now = new Date();

  // Pick up FAILED entries that are due for retry
  const pending = await prisma.emailOutbox.findMany({
    where: {
      status: "FAILED",
      attempts: { lt: MAX_OUTBOX_ATTEMPTS },
      nextRetryAt: { lte: now },
    },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
    select: { id: true, recipients: true, subject: true, html: true, attempts: true },
  });

  let sent = 0;
  let failed = 0;

  for (const entry of pending) {
    let recipients: string[];
    try {
      recipients = JSON.parse(entry.recipients) as string[];
    } catch {
      await prisma.emailOutbox.update({
        where: { id: entry.id },
        data: { status: "ABANDONED", lastError: "invalid recipients JSON" },
      });
      continue;
    }

    try {
      await resend.emails.send({
        from: FROM,
        to: recipients,
        subject: entry.subject,
        html: entry.html,
      });

      await prisma.emailOutbox.update({
        where: { id: entry.id },
        data: { status: "SENT", sentAt: now, attempts: entry.attempts + 1 },
      });
      sent++;
    } catch (err) {
      const newAttempts = entry.attempts + 1;
      const isAbandoned = newAttempts >= MAX_OUTBOX_ATTEMPTS;
      // Backoff: 2^n minutes, capped at 1 hour
      const nextRetryAt = isAbandoned
        ? null
        : new Date(Date.now() + Math.min(60_000 * Math.pow(2, newAttempts), 3_600_000));

      await prisma.emailOutbox.update({
        where: { id: entry.id },
        data: {
          status: isAbandoned ? "ABANDONED" : "FAILED",
          attempts: newAttempts,
          lastError: String(err).slice(0, 500),
          nextRetryAt,
        },
      });
      failed++;
    }
  }

  return NextResponse.json({ processed: pending.length, sent, failed });
}
