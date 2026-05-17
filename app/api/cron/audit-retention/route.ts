/**
 * Round 7 — Audit log retention cron.
 *
 * AuditLog tablosunu kontrol altında tutmak için 365 günden eski **non-critical**
 * satırları siler. Kritik action'lar (LOGIN_LOCKOUT, PAYMENT_*, ACCESS_REVOKE,
 * BULK_GRANT_*) korunur (KVKK / regülatif denetim için 3-5 yıl tutulmalı —
 * Round 8'de archive-to-cold-storage eklenebilir).
 *
 * Schedule: 0 3 * * * (her gün 03:00 UTC, vercel.json kayıtlı)
 */
import { prisma } from "@/lib/prisma";
import { runJob } from "@/lib/jobs/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RETAIN_DAYS = 365;
const PROTECTED_ACTIONS = [
  "LOGIN_LOCKOUT",
  "PAYMENT_MARK_FAILED",
  "PAYMENT_MARK_REFUNDED",
  "ACCESS_REVOKE",
  "BULK_GRANT_APPLIED",
  "ODK_PACKAGE_DELETE",
  "COURSE_DELETE",
];

export async function GET(req: Request) {
  return runJob("audit-retention", req, async () => {
    const cutoff = new Date(Date.now() - RETAIN_DAYS * 86400000);
    const totalBefore = await prisma.auditLog.count();
    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoff },
        action: { notIn: PROTECTED_ACTIONS },
      },
    });
    const totalAfter = await prisma.auditLog.count();
    return {
      cutoff: cutoff.toISOString(),
      deleted: result.count,
      totalBefore,
      totalAfter,
      protectedActions: PROTECTED_ACTIONS.length,
    };
  });
}
