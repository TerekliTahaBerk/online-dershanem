import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatIstanbulDateInput,
  addIstanbulCalendarDays,
  istanbulDayEnd,
  istanbulDayStart,
  istanbulIsoWeekday,
  istanbulMonthStart,
  istanbulNextDayStart,
  istanbulWeekStart,
  parseIstanbulDateInput,
  resolveIstanbulDateRange,
} from "./istanbul-time";

test("İstanbul gece yarısından hemen sonra UTC hâlâ dünde olsa da yerel gün doğrudur", () => {
  // 2026-03-15T00:30+03:00 === 2026-03-14T21:30Z
  const instant = new Date("2026-03-14T21:30:00.000Z");
  assert.equal(formatIstanbulDateInput(instant), "2026-03-15");
  // Kırılan eski davranış: toISOString().slice(0,10) → "2026-03-14"
  assert.notEqual(formatIstanbulDateInput(instant), instant.toISOString().slice(0, 10));
});

test("İstanbul gece yarısından hemen önce yerel gün değişmez", () => {
  const instant = new Date("2026-03-14T20:59:59.999Z"); // 23:59:59.999 +03:00
  assert.equal(formatIstanbulDateInput(instant), "2026-03-14");
});

test("23:30–03:30 sınırında bütün calendar-day helper'ları İstanbul gününü paylaşır", () => {
  const beforeMidnight = new Date("2026-07-18T20:30:00.000Z"); // 23:30 Cumartesi
  const afterMidnight = new Date("2026-07-18T21:30:00.000Z"); // 00:30 Pazar
  const earlyMorning = new Date("2026-07-19T00:30:00.000Z"); // 03:30 Pazar

  assert.equal(formatIstanbulDateInput(beforeMidnight), "2026-07-18");
  assert.equal(formatIstanbulDateInput(afterMidnight), "2026-07-19");
  assert.equal(formatIstanbulDateInput(earlyMorning), "2026-07-19");
  assert.equal(istanbulDayStart(afterMidnight).toISOString(), "2026-07-18T21:00:00.000Z");
  assert.equal(istanbulNextDayStart(afterMidnight).toISOString(), "2026-07-19T21:00:00.000Z");
  assert.equal(istanbulIsoWeekday(afterMidnight), 7);
  assert.equal(istanbulWeekStart(afterMidnight).toISOString(), "2026-07-12T21:00:00.000Z");
  assert.equal(addIstanbulCalendarDays(afterMidnight, 1).toISOString(), "2026-07-19T21:00:00.000Z");
});

test("gün başlangıcı ve sonu İstanbul sınırlarına oturur", () => {
  const instant = new Date("2026-03-15T12:00:00.000Z");
  assert.equal(istanbulDayStart(instant).toISOString(), "2026-03-14T21:00:00.000Z");
  assert.equal(istanbulDayEnd(instant).toISOString(), "2026-03-15T20:59:59.999Z");
});

test("ay sınırı doğru yorumlanır", () => {
  const instant = new Date("2026-01-31T21:30:00.000Z"); // 2026-02-01 00:30 +03:00
  assert.equal(formatIstanbulDateInput(instant), "2026-02-01");
});

test("yıl sınırı doğru yorumlanır", () => {
  const instant = new Date("2025-12-31T21:30:00.000Z"); // 2026-01-01 00:30 +03:00
  assert.equal(formatIstanbulDateInput(instant), "2026-01-01");
});

test("ay başlangıcı UTC ayına değil İstanbul takvim ayına göre hesaplanır", () => {
  const localFebruary = new Date("2026-01-31T21:30:00.000Z");
  assert.equal(istanbulMonthStart(localFebruary).toISOString(), "2026-01-31T21:00:00.000Z");
});

test("29 Şubat artık yılda kabul, artık olmayan yılda ret edilir", () => {
  assert.notEqual(parseIstanbulDateInput("2024-02-29"), null);
  assert.equal(parseIstanbulDateInput("2025-02-29"), null);
});

test("geçersiz tarih biçimleri reddedilir", () => {
  for (const value of ["", "2026-13-01", "2026-00-10", "2026-04-31", "abc", "2026/04/01", 20260401, null, undefined]) {
    assert.equal(parseIstanbulDateInput(value), null, String(value));
  }
});

test("parse edilen tarih İstanbul gün başlangıcını verir", () => {
  assert.equal(parseIstanbulDateInput("2026-04-01")?.toISOString(), "2026-03-31T21:00:00.000Z");
});

test("aynı gün aralığı tam 24 saati kapsar", () => {
  const range = resolveIstanbulDateRange({ from: "2026-04-01", to: "2026-04-01" });
  assert.equal(range.from.toISOString(), "2026-03-31T21:00:00.000Z");
  assert.equal(range.to.toISOString(), "2026-04-01T20:59:59.999Z");
  assert.equal(range.notice, null);
});

test("başlangıç bitişten sonraysa tarihler yer değiştirir ve bildirilir", () => {
  const range = resolveIstanbulDateRange({ from: "2026-04-10", to: "2026-04-01" });
  assert.equal(range.from.toISOString(), "2026-03-31T21:00:00.000Z");
  assert.equal(range.to.toISOString(), "2026-04-10T20:59:59.999Z");
  assert.match(range.notice ?? "", /yer değiştirdi/);
});

test("çok büyük aralık üst sınıra kırpılır", () => {
  const range = resolveIstanbulDateRange({ from: "2020-01-01", to: "2026-04-01", maxDays: 31 });
  const spanDays =
    Math.round((istanbulDayStart(range.to).getTime() - range.from.getTime()) / 86_400_000) + 1;
  assert.equal(spanDays, 31);
  assert.match(range.notice ?? "", /en fazla 31 gün/);
});

test("geçersiz girdi varsayılan aralığa düşer ve sessiz kalmaz", () => {
  const now = new Date("2026-04-10T12:00:00.000Z");
  const range = resolveIstanbulDateRange({ from: "bozuk", to: "2026-04-10", now });
  assert.equal(range.to.toISOString(), "2026-04-10T20:59:59.999Z");
  assert.match(range.notice ?? "", /Başlangıç tarihi geçersiz/);
});

test("varsayılan aralık istenen gün sayısını kapsar", () => {
  const now = new Date("2026-04-10T12:00:00.000Z");
  const range = resolveIstanbulDateRange({ defaultDays: 30, now });
  const spanDays =
    Math.round((istanbulDayStart(range.to).getTime() - range.from.getTime()) / 86_400_000) + 1;
  assert.equal(spanDays, 30);
});

test("filtre input'u kendi çözümlediği aralığa geri dönüştürülebilir", () => {
  const range = resolveIstanbulDateRange({ from: "2026-04-01", to: "2026-04-30" });
  assert.equal(formatIstanbulDateInput(range.from), "2026-04-01");
  assert.equal(formatIstanbulDateInput(range.to), "2026-04-30");
});
