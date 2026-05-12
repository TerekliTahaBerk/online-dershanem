/**
 * Sunucu tarafı push notification dispatcher (Expo Push API).
 *
 * Kullanım:
 *   await sendPush({
 *     userIds: [user.id],
 *     title: "Yeni ödevin var",
 *     body: "Matematik · Türev — son 17 Mayıs",
 *     data: { href: "/(student)/tasks" },
 *     category: "ASSIGNMENT",
 *   });
 *
 * - `NotificationPreference` ile kullanıcı kategori/kanal kapatmışsa atlar.
 * - Aktif `MobileDevice` (revokedAt:null) tokenlarını alır, 100'lü chunk
 *   halinde Expo Push API'ye POST eder.
 * - DeviceNotRegistered hatasında ilgili token'ı `revokedAt` ile kapatır.
 */
import type { NotificationCategoryKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PushPayload = {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  category: NotificationCategoryKey;
  /** iOS sound: "default" | null; Android channel default. */
  sound?: "default" | null;
  /** Badge count delta (iOS). */
  badge?: number;
  priority?: "default" | "high";
};

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

const EXPO_URL = "https://exp.host/--/api/v2/push/send";
const CHUNK_SIZE = 100;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function sendPush(payload: PushPayload): Promise<{
  sent: number;
  skipped: number;
  failed: number;
}> {
  if (payload.userIds.length === 0) return { sent: 0, skipped: 0, failed: 0 };

  // 1) Kategori için PUSH kanalı kapalı olan kullanıcıları çıkar.
  const prefs = await prisma.notificationPreference.findMany({
    where: {
      userId: { in: payload.userIds },
      category: payload.category,
      channel: "PUSH",
    },
    select: { userId: true, enabled: true },
  });
  const optedOut = new Set(prefs.filter((p) => !p.enabled).map((p) => p.userId));
  const eligibleUserIds = payload.userIds.filter((id) => !optedOut.has(id));

  if (eligibleUserIds.length === 0) {
    return { sent: 0, skipped: payload.userIds.length, failed: 0 };
  }

  // 2) Aktif cihazları çek.
  const devices = await prisma.mobileDevice.findMany({
    where: { userId: { in: eligibleUserIds }, revokedAt: null },
    select: { id: true, expoPushToken: true },
  });
  if (devices.length === 0) return { sent: 0, skipped: payload.userIds.length, failed: 0 };

  const messages = devices.map((d) => ({
    to: d.expoPushToken,
    sound: payload.sound ?? "default",
    title: payload.title,
    body: payload.body,
    data: { ...payload.data, category: payload.category },
    priority: payload.priority ?? "high",
    badge: payload.badge,
    channelId: "default",
  }));

  let sent = 0;
  let failed = 0;
  const invalidTokens: string[] = [];

  for (const batch of chunk(messages, CHUNK_SIZE)) {
    try {
      const res = await fetch(EXPO_URL, {
        method: "POST",
        headers: {
          accept: "application/json",
          "accept-encoding": "gzip, deflate",
          "content-type": "application/json",
          ...(process.env.EXPO_ACCESS_TOKEN
            ? { authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
            : {}),
        },
        body: JSON.stringify(batch),
      });
      if (!res.ok) {
        failed += batch.length;
        continue;
      }
      const json = (await res.json()) as { data?: ExpoPushTicket[] };
      const tickets = json.data ?? [];
      tickets.forEach((t, i) => {
        if (t.status === "ok") {
          sent += 1;
        } else {
          failed += 1;
          if (t.details?.error === "DeviceNotRegistered") {
            const token = batch[i]?.to;
            if (token) invalidTokens.push(token);
          }
        }
      });
    } catch {
      failed += batch.length;
    }
  }

  // 3) Geçersiz token'ları revoke et.
  if (invalidTokens.length > 0) {
    await prisma.mobileDevice
      .updateMany({
        where: { expoPushToken: { in: invalidTokens } },
        data: { revokedAt: new Date() },
      })
      .catch(() => undefined);
  }

  return { sent, skipped: 0, failed };
}
