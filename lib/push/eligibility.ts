/**
 * Push UYGUNLUK kararı — gönderim ANINDA güncel duruma göre. Saf modül:
 * çağıran güncel kullanıcı, cihaz, oturum, tercih ve kaynak durumunu verir.
 * Sessiz saat hesabı mevcut `afterQuietHours` (İstanbul yerel) ile yapılır;
 * ayrı bir saat dilimi hesabı YOKTUR.
 */
import { afterQuietHours } from "@/lib/notification-delivery";
import type { PushClass, PushPreferenceKey } from "./classification";

export type SkipReason =
  | "USER_INACTIVE"
  | "DEVICE_REVOKED"
  | "SESSION_INVALID"
  | "PUSH_DISABLED"
  | "CATEGORY_DISABLED"
  | "IN_APP_DISABLED"
  | "ALREADY_READ"
  | "NOT_VISIBLE"
  | "NOT_CLASSIFIED"
  | "SOURCE_INVALID"
  | "STALE"
  | "OWNER_MISMATCH";

export type EligibilityInput = {
  now: Date;
  notification: { userId: string; createdAt: Date; readAt: Date | null; inAppVisible: boolean };
  pushClass: PushClass | null;
  device: { userId: string; revokedAt: Date | null };
  session: { revokedAt: Date | null; expiresAt: Date } | null;
  user: { status: string } | null;
  preference: (Partial<Record<PushPreferenceKey, boolean>> & {
    pushEnabled: boolean;
    inAppEnabled: boolean;
    quietStartMinute: number | null;
    quietEndMinute: number | null;
  }) | null;
  sourceValid: boolean;
};

export type EligibilityDecision = { kind: "SEND" } | { kind: "DEFER"; until: Date } | { kind: "SKIP"; reason: SkipReason };

export function evaluatePushEligibility(input: EligibilityInput): EligibilityDecision {
  const { now, notification, pushClass, device, session, user, preference } = input;
  if (notification.userId !== device.userId) return { kind: "SKIP", reason: "OWNER_MISMATCH" };
  if (!user || user.status !== "ACTIVE") return { kind: "SKIP", reason: "USER_INACTIVE" };
  if (device.revokedAt) return { kind: "SKIP", reason: "DEVICE_REVOKED" };
  if (!session || session.revokedAt || session.expiresAt <= now) return { kind: "SKIP", reason: "SESSION_INVALID" };
  // Tercih satırı yoksa push KAPALI sayılır (varsayılan false).
  if (!preference || !preference.pushEnabled) return { kind: "SKIP", reason: "PUSH_DISABLED" };
  // İlk sürüm: push, uygulama içi bildirimin bir teslim kanalıdır; uygulama içi kapalıysa gönderilmez.
  if (!preference.inAppEnabled) return { kind: "SKIP", reason: "IN_APP_DISABLED" };
  if (!pushClass) return { kind: "SKIP", reason: "NOT_CLASSIFIED" };
  if (pushClass.preferenceKey && preference[pushClass.preferenceKey] === false) return { kind: "SKIP", reason: "CATEGORY_DISABLED" };
  if (!notification.inAppVisible) return { kind: "SKIP", reason: "NOT_VISIBLE" };
  if (notification.readAt) return { kind: "SKIP", reason: "ALREADY_READ" };
  if (!input.sourceValid) return { kind: "SKIP", reason: "SOURCE_INVALID" };
  const expiresAt = new Date(notification.createdAt.getTime() + pushClass.ttlMs);
  if (expiresAt <= now) return { kind: "SKIP", reason: "STALE" };
  const quietEnd = afterQuietHours(now, { quietStartMinute: preference.quietStartMinute, quietEndMinute: preference.quietEndMinute });
  if (quietEnd > now) {
    // Sessiz saat bitince hâlâ anlamlıysa ertele; değilse bayat say (sonsuz erteleme yok).
    return quietEnd < expiresAt ? { kind: "DEFER", until: quietEnd } : { kind: "SKIP", reason: "STALE" };
  }
  return { kind: "SEND" };
}
