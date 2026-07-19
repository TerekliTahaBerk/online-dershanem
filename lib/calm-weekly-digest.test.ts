import assert from "node:assert/strict";
import test from "node:test";
import { buildCalmWeeklyDigest, digestWeekStart } from "./calm-weekly-digest";

test("haftalık özet pazartesi başlangıcını kullanır", () => assert.equal(digestWeekStart(new Date("2026-07-19T12:00:00Z")).toISOString(), "2026-07-13T00:00:00.000Z"));

test("iyileşen katılımı karşılaştırma veya utandırma olmadan anlatır", () => {
  const digest = buildCalmWeeklyDigest({ currentAttendance: { attended: 4, total: 4 }, previousAttendance: { attended: 2, total: 4 }, completedTaskCount: 2, evidenceTitles: ["Köklü ifadeler"], reviewTitle: "Problem çözme", dataThrough: new Date() });
  assert.equal(digest.trendBand, "IMPROVING");
  assert.match(digest.goodThingOne, /güçlendi/);
  assert.doesNotMatch(Object.values(digest).join(" "), /başarısız|geride|sıralama|tembel/i);
});

test("veri azlığını kesin yargı yerine tazelik uyarısıyla gösterir", () => {
  const digest = buildCalmWeeklyDigest({ currentAttendance: { attended: 0, total: 0 }, previousAttendance: { attended: 0, total: 0 }, completedTaskCount: 0, evidenceTitles: [], dataThrough: new Date() });
  assert.equal(digest.trendBand, "LIMITED_DATA");
  assert.match(digest.goodThingOne, /verisi henüz sınırlı/);
});
