import type { NotificationType } from "@prisma/client";

/**
 * Notification kanalları:
 * - inbox: DB'ye yaz (notification listesinde görünsün)
 * - toast: SSE/realtime üzerinden anlık toast bildirimi
 * - email: Bildirim anında e-posta gönder
 * - digest: Günlük özet e-posta (cron ile, sabah 08:00)
 */
export type NotificationChannel = "inbox" | "toast" | "email" | "digest";

export const ALL_CHANNELS: NotificationChannel[] = ["inbox", "toast", "email", "digest"];

export const CHANNEL_LABEL: Record<NotificationChannel, string> = {
  inbox: "Bildirim merkezi",
  toast: "Anlık (toast)",
  email: "E-posta",
  digest: "Günlük özet (e-posta)",
};

export const TYPE_LABEL: Record<NotificationType, string> = {
  SYSTEM: "Sistem",
  LESSON: "Ders",
  CONTENT: "İçerik",
  PAYMENT: "Ödeme",
  PERFORMANCE: "Performans",
  ANNOUNCEMENT: "Duyuru",
};

export const ALL_TYPES: NotificationType[] = [
  "SYSTEM",
  "LESSON",
  "CONTENT",
  "PAYMENT",
  "PERFORMANCE",
  "ANNOUNCEMENT",
];

/** type → channel → enabled? */
export type NotificationPrefs = Partial<
  Record<NotificationType, Partial<Record<NotificationChannel, boolean>>>
>;

/** Varsayılan: inbox + toast açık, email/digest kapalı, tüm tipler aktif */
export function defaultPrefs(): NotificationPrefs {
  const out: NotificationPrefs = {};
  for (const t of ALL_TYPES) {
    out[t] = { inbox: true, toast: true, email: false, digest: false };
  }
  return out;
}

/**
 * Verilen prefs için tek kanal sorgusu.
 * Kayıt yoksa varsayılana düşer (inbox/toast=true, email/digest=false).
 * URGENT priority hiçbir tercihten etkilenmez — caller bypass etmeli.
 */
export function isChannelEnabled(
  prefs: NotificationPrefs | null | undefined,
  type: NotificationType,
  channel: NotificationChannel,
): boolean {
  const explicit = prefs?.[type]?.[channel];
  if (typeof explicit === "boolean") return explicit;
  // varsayılan
  if (channel === "email" || channel === "digest") return false;
  return true;
}
