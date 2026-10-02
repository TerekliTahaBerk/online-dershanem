import { z } from "zod";
import { istanbulDayStart, istanbulNextDayStart } from "./istanbul-time";
export const notificationTimingSchema = z.object({
  quietStartMinute: z.number().int().min(0).max(1439).nullable().default(null),
  quietEndMinute: z.number().int().min(0).max(1439).nullable().default(null),
  dailyDigest: z.boolean().default(false),
  dailyDigestMinute: z.number().int().min(0).max(1439).nullable().default(null),
}).superRefine((value, ctx) => {
  if ((value.quietStartMinute === null) !== (value.quietEndMinute === null) || (value.quietStartMinute !== null && value.quietStartMinute === value.quietEndMinute)) ctx.addIssue({ code: "custom", message: "Sessiz saat başlangıç ve bitişini kontrol edin." });
  if (value.dailyDigest && value.dailyDigestMinute === null) ctx.addIssue({ code: "custom", message: "Günlük özet saatini seçin." });
});
export type NotificationTiming = z.infer<typeof notificationTimingSchema>;
export function afterQuietHours(now: Date, timing: Pick<NotificationTiming, "quietStartMinute" | "quietEndMinute">): Date {
  const { quietStartMinute: start, quietEndMinute: end } = timing;
  if (start === null || end === null || start === end) return now;
  const day = istanbulDayStart(now);
  const minute = (now.getTime() - day.getTime()) / 60_000;
  const quiet = start < end ? minute >= start && minute < end : minute >= start || minute < end;
  if (!quiet) return now;
  const endDay = start > end && minute >= start ? istanbulNextDayStart(now) : day;
  return new Date(endDay.getTime() + end * 60_000);
}
export function notificationDeliveryAt(now: Date, timing: NotificationTiming): Date {
  let at = now;
  if (timing.dailyDigest && timing.dailyDigestMinute !== null) {
    at = new Date(istanbulDayStart(now).getTime() + timing.dailyDigestMinute * 60_000);
    if (at <= now) at = new Date(istanbulNextDayStart(now).getTime() + timing.dailyDigestMinute * 60_000);
  }
  return afterQuietHours(at, timing);
}
export function notificationKey(userId: string, sourceType: string, sourceId: string, category: string) {
  return `${userId}:${sourceType}:${sourceId}:${category}`;
}
