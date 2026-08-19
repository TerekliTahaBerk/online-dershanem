import assert from "node:assert/strict";
import test from "node:test";

import { coachingOverdue } from "./coaching";

const now = new Date("2026-10-19T12:00:00.000Z");
const days = (n: number) => new Date(now.getTime() - n * 86_400_000);
const inDays = (n: number) => new Date(now.getTime() + n * 86_400_000);

test("tarihi geçmiş planlı görüşme sıklık bilinmese de gecikmiştir", () => {
  const r = coachingOverdue(null, days(9), null, now);
  assert.equal(r.overdue, true);
  assert.equal(r.overdueDays, 9);
});

test("ileri tarihli planlı görüşme gecikme sayılmaz", () => {
  assert.deepEqual(coachingOverdue(days(30), inDays(2), 7, now), {
    overdue: false,
    overdueDays: null,
  });
});

test("plan yoksa son görüşme sıklığı aştıysa gecikmiştir", () => {
  const r = coachingOverdue(days(20), null, 7, now);
  assert.equal(r.overdue, true);
  assert.equal(r.overdueDays, 13);
});

test("plan yoksa ve sıklık aşılmadıysa gecikme yoktur", () => {
  assert.deepEqual(coachingOverdue(days(3), null, 7, now), {
    overdue: false,
    overdueDays: null,
  });
});

test("sıklık belirlenmemişse gecikme İDDİA EDİLMEZ", () => {
  // Ön görüşmede sıklık kararlaştırılmamış olabilir; varsayılan uydurulmaz.
  assert.deepEqual(coachingOverdue(days(400), null, null, now), {
    overdue: false,
    overdueDays: null,
  });
});

test("hiç görüşme yapılmamış ve plan da yoksa gecikme hesaplanmaz", () => {
  assert.deepEqual(coachingOverdue(null, null, 7, now), {
    overdue: false,
    overdueDays: null,
  });
});

test("sıfır veya negatif sıklık gecikme üretmez", () => {
  assert.deepEqual(coachingOverdue(days(90), null, 0, now), {
    overdue: false,
    overdueDays: null,
  });
});
