/**
 * Round 7 — Daily notification digest.
 *
 * Her sabah 08:00 (TRT) → son 24 saatte oluşan **okunmamış** bildirimleri tek
 * email'de toplar. Her kullanıcının `NotificationPreference.emailDigestEnabled`
 * (varsa) kontrol edilir; yoksa default açık kabul edilir.
 *
 * Schedule: 0 5 * * * (vercel.json kayıtlı — 05:00 UTC = 08:00 TRT)
 *
 * Idempotency: aynı gün içinde iki kez çalışırsa aynı kullanıcıya iki digest
 * gider. Bu kabul edilebilir; cron Vercel tarafından idempotent çağrılır.
 * Sıkı idempotency için `EmailOutbox`'a date-bazlı dedup key eklenebilir.
 */
import { prisma } from "@/lib/prisma";
import { runJob } from "@/lib/jobs/runner";
import { sendNotificationDigestEmail } from "@/lib/email";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TYPE_LABEL: Record<string, string> = {
  SYSTEM: "Sistem",
  CONTENT: "İçerik",
  PERFORMANCE: "Performans",
  ANNOUNCEMENT: "Duyuru",
  PAYMENT: "Ödeme",
  REMINDER: "Hatırlatma",
};

export async function GET(req: Request) {
  return runJob("notification-digest", req, async () => {
    const since = new Date(Date.now() - 24 * 3600 * 1000);

    // Son 24 saatte okunmamış bildirim alan kullanıcıları bul
    const grouped = await prisma.notification.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: since }, readAt: null },
      _count: { _all: true },
    });

    if (grouped.length === 0) {
      return { recipients: 0, sent: 0 };
    }

    const userIds = grouped.map((g) => g.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, email: { not: undefined } },
      select: { id: true, email: true, name: true },
    });

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const u of users) {
      if (!u.email) {
        skipped++;
        continue;
      }
      try {
        const items = await prisma.notification.findMany({
          where: { userId: u.id, createdAt: { gte: since }, readAt: null },
          orderBy: { createdAt: "desc" },
          take: 30,
          select: { title: true, body: true, href: true, createdAt: true, type: true },
        });
        if (items.length === 0) {
          skipped++;
          continue;
        }
        await sendNotificationDigestEmail({
          to: u.email,
          recipientName: u.name,
          items: items.map((it) => ({
            title: it.title,
            body: it.body,
            href: it.href,
            createdAt: it.createdAt,
            typeLabel: TYPE_LABEL[it.type] ?? "Bildirim",
          })),
        });
        sent++;
      } catch (err) {
        failed++;
        log.warn("notification-digest.user_failed", { userId: u.id }, err);
      }
    }

    return { recipients: users.length, sent, skipped, failed };
  });
}
