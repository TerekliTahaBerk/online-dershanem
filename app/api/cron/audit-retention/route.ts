// POST /api/cron/audit-retention
//
// Eski AuditLog ve RateLimitEntry kayıtlarını siler.
// - AuditLog: 365 gün (bir yıl)
// - RateLimitEntry: 7 gün (rate-limit pencereleri zaten saatlik)
//
// Vercel cron: günde 1 (gece 03:00 UTC)
//   { "path": "/api/cron/audit-retention", "schedule": "0 3 * * *" }

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const AUDIT_DAYS = 365;
const RATE_LIMIT_DAYS = 7;
const EMAIL_OUTBOX_DAYS = 90; // SENT/ABANDONED için

const DAY = 24 * 3600 * 1000;

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const auditCutoff = new Date(Date.now() - AUDIT_DAYS * DAY);
  const rateLimitCutoff = new Date(Date.now() - RATE_LIMIT_DAYS * DAY);
  const emailCutoff = new Date(Date.now() - EMAIL_OUTBOX_DAYS * DAY);

  const [audit, rate, email] = await Promise.all([
    prisma.auditLog.deleteMany({
      where: { createdAt: { lt: auditCutoff } },
    }),
    prisma.rateLimitEntry.deleteMany({
      where: { createdAt: { lt: rateLimitCutoff } },
    }),
    prisma.emailOutbox.deleteMany({
      where: {
        createdAt: { lt: emailCutoff },
        status: { in: ["SENT", "ABANDONED"] },
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    auditDeleted: audit.count,
    rateLimitDeleted: rate.count,
    emailOutboxDeleted: email.count,
    cutoffs: {
      audit: auditCutoff.toISOString(),
      rateLimit: rateLimitCutoff.toISOString(),
      emailOutbox: emailCutoff.toISOString(),
    },
  });
}
