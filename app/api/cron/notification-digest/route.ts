// POST /api/cron/notification-digest
//
// Her sabah son 24 saatte oluşan okunmamış bildirimleri tek bir e-postada toplar.
// Yalnızca `digest` kanalı açık olan tip+kullanıcı kombinasyonları için.
//
// Vercel cron: günde 1 (sabah 08:00 UTC = 11:00 TR)
//   { "path": "/api/cron/notification-digest", "schedule": "0 8 * * *" }
//
// CRON_SECRET ile korunur.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNotificationDigestEmail } from "@/lib/email";
import { loadPrefsMap } from "@/lib/services/notification-prefs/loader";
import { isChannelEnabled, TYPE_LABEL } from "@/lib/services/notification-prefs/types";

const LOOKBACK_HOURS = 24;

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const since = new Date(Date.now() - LOOKBACK_HOURS * 3600 * 1000);

  // Son 24 saatteki tüm okunmamış bildirimler
  const notes = await prisma.notification.findMany({
    where: {
      createdAt: { gte: since },
      readAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      userId: true,
      type: true,
      title: true,
      body: true,
      href: true,
      createdAt: true,
    },
    take: 5000,
  });

  if (notes.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: "no notifications" });
  }

  // Kullanıcılara grupla
  const byUser = new Map<string, typeof notes>();
  for (const n of notes) {
    const arr = byUser.get(n.userId) ?? [];
    arr.push(n);
    byUser.set(n.userId, arr);
  }

  const userIds = [...byUser.keys()];
  const prefsMap = await loadPrefsMap(userIds);

  // Kullanıcı email + name bilgileri
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [userId, items] of byUser) {
    const user = userById.get(userId);
    if (!user?.email) {
      skipped++;
      continue;
    }
    const prefs = prefsMap[userId];
    // Sadece digest kanalı açık olan bildirimleri filtrele
    const filtered = items.filter((n) => isChannelEnabled(prefs, n.type, "digest"));
    if (filtered.length === 0) {
      skipped++;
      continue;
    }
    try {
      await sendNotificationDigestEmail({
        to: user.email,
        recipientName: user.name,
        items: filtered.map((n) => ({
          title: n.title,
          body: n.body,
          href: n.href,
          createdAt: n.createdAt,
          typeLabel: TYPE_LABEL[n.type] ?? n.type,
        })),
      });
      sent++;
    } catch (err) {
      errors.push(`${userId}: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  return NextResponse.json({
    ok: true,
    totalUsers: byUser.size,
    sent,
    skipped,
    errors: errors.slice(0, 10),
  });
}
