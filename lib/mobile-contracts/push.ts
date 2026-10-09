/**
 * MOBİL SÖZLEŞME — M5 push: tercihler, tek bildirim, cihaz kaydı.
 * Bağımlılıksız; yalnız bu dizinden göreli içe aktarma.
 */
import type { ContractResult } from "./bootstrap";
import { check, v, type Infer } from "./validate";

const minute = v.nullable(v.int(0));

const preferences = v.object({
  inAppEnabled: v.boolean(),
  emailEnabled: v.boolean(),
  whatsappEnabled: v.boolean(),
  lessonSummary: v.boolean(),
  weeklyDigest: v.boolean(),
  absence: v.boolean(),
  assignment: v.boolean(),
  payment: v.boolean(),
  pushEnabled: v.boolean(),
  examUpdates: v.optional(v.boolean(), true),
  quietStartMinute: minute,
  quietEndMinute: minute,
  dailyDigest: v.boolean(),
  dailyDigestMinute: minute,
});
export type MobileNotificationPreferences = Infer<typeof preferences>;

const preferencesEnvelope = v.object({ preferences });
export function parseNotificationPreferences(input: unknown): ContractResult<{ preferences: MobileNotificationPreferences }> {
  return check(preferencesEnvelope, input);
}

/** GET /api/panel/notifications/[id] — push dokunuşunda sahiplik kontrollü okuma. */
const singleNotification = v.object({
  id: v.nonEmpty(),
  type: v.string(),
  title: v.string(),
  body: v.string(),
  href: v.nullable(v.string()),
  read: v.boolean(),
  createdAt: v.iso(),
});
export type MobileSingleNotification = Infer<typeof singleNotification>;
export function parseSingleNotification(input: unknown): ContractResult<MobileSingleNotification> {
  return check(singleNotification, input);
}

const registerResult = v.object({ registered: v.literal(true), deviceId: v.nonEmpty() });
export function parseDeviceRegisterResult(input: unknown): ContractResult<{ registered: true; deviceId: string }> {
  return check(registerResult, input);
}

const unregisterResult = v.object({ revoked: v.int(0) });
export function parseDeviceUnregisterResult(input: unknown): ContractResult<{ revoked: number }> {
  return check(unregisterResult, input);
}
