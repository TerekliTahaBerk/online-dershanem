import assert from "node:assert/strict";
import { test } from "node:test";
import { ACCESS_SOURCE_LABEL, accessEditableHere, accessState, sortAccessObjects } from "./access-objects";

const now = new Date("2026-10-10T10:00:00.000Z");
const day = (n: number) => new Date(now.getTime() + n * 86_400_000);
const base = { source: "MANUAL" as const, startsAt: day(-10), expiresAt: null, revokedAt: null };

test("erişim durumu kaynaktan bağımsız tarihlerden okunur", () => {
  assert.deepEqual(accessState(base, now), { label: "Aktif", tone: "success" });
  assert.equal(accessState({ ...base, expiresAt: day(-1) }, now).label, "Süresi doldu");
  assert.equal(accessState({ ...base, revokedAt: day(-2) }, now).label, "Sonlandırıldı");
  assert.equal(accessState({ ...base, startsAt: day(2) }, now).label, "Başlamadı");
  assert.equal(ACCESS_SOURCE_LABEL.PURCHASE, "Satın alındı");
});

test("satın alınmış erişim bu ekrandan değiştirilmez", () => {
  assert.equal(accessEditableHere({ source: "PURCHASE" }), false);
  assert.equal(accessEditableHere({ source: "MANUAL" }), true);
});

test("etkin erişimler önce sıralanır", () => {
  const rows = [
    { ...base, id: "old", revokedAt: day(-1) },
    { ...base, id: "new", startsAt: day(-1) },
    { ...base, id: "older-active", startsAt: day(-30) },
  ];
  assert.deepEqual(sortAccessObjects(rows, now).map((row) => row.id), ["new", "older-active", "old"]);
});
