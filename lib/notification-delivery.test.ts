import assert from "node:assert/strict";
import test from "node:test";
import { afterQuietHours, notificationDeliveryAt, notificationTimingSchema } from "./notification-delivery";
const quiet = { quietStartMinute: 22 * 60, quietEndMinute: 8 * 60 };
test("İstanbul sessiz saatleri gece yarısını ve tam sınırı kapsar", () => {
  assert.equal(afterQuietHours(new Date("2026-10-02T20:00:00Z"), quiet).toISOString(), "2026-10-03T05:00:00.000Z");
  assert.equal(afterQuietHours(new Date("2026-10-03T04:59:00Z"), quiet).toISOString(), "2026-10-03T05:00:00.000Z");
  assert.equal(afterQuietHours(new Date("2026-10-03T05:00:00Z"), quiet).toISOString(), "2026-10-03T05:00:00.000Z");
});
test("günlük özet kullanıcı saatine uyar; günün özeti sonrasında sonraki güne gider", () => {
  const timing = { ...quiet, dailyDigest: true, dailyDigestMinute: 18 * 60 };
  assert.equal(notificationDeliveryAt(new Date("2026-10-02T14:00:00Z"), timing).toISOString(), "2026-10-02T15:00:00.000Z");
  assert.equal(notificationDeliveryAt(new Date("2026-10-02T16:00:00Z"), timing).toISOString(), "2026-10-03T15:00:00.000Z");
  assert.equal(notificationTimingSchema.safeParse({ ...quiet, dailyDigest: true }).success, false);
  assert.equal(notificationTimingSchema.safeParse({ quietStartMinute: 600 }).success, false);
});
