import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

import {
  lessonSeriesRequestSchema,
  previewLessonSeries,
  resolveLessonSeriesInput,
} from "./lesson-series-schedule";

/**
 * §6 — önizleme ile oluşturma AYNI occurrence listesini üretmeli.
 *
 * İki uç noktanın gövde şemaları farklı alanlar ve farklı zod varsayılanları
 * taşıyordu. Burada aynı ham gövde her iki şemadan geçirilip aynı çözümleyiciye
 * veriliyor; çıktılar birebir eşit olmalı.
 */

const previewSchema = lessonSeriesRequestSchema.extend({
  targetType: z.enum(["GROUP", "STUDENT"]).default("GROUP"),
  startsAt: z.string().datetime().optional(),
});

const createSchema = lessonSeriesRequestSchema.extend({
  targetType: z.enum(["GROUP", "STUDENT"]).default("GROUP"),
  title: z.string().trim().min(2).max(120),
  startsAt: z.string().datetime(),
});

function occurrencesFor(schema: typeof previewSchema | typeof createSchema, body: unknown) {
  const parsed = schema.parse(body);
  return previewLessonSeries(resolveLessonSeriesInput(parsed)).occurrences.map((o) =>
    o.startsAt.toISOString(),
  );
}

const BODIES: Array<{ label: string; body: Record<string, unknown> }> = [
  {
    label: "yalnızca repeatWeeks",
    body: { title: "Ders", startsAt: "2026-09-07T07:00:00.000Z", mode: "SERIES", repeatWeeks: 4 },
  },
  {
    label: "haftanın günleri + toplam tekrar",
    body: {
      title: "Ders",
      startsAt: "2026-09-07T07:00:00.000Z",
      mode: "SERIES",
      weekdays: [1, 3],
      totalOccurrences: 6,
      startsAtTime: "10:00",
    },
  },
  {
    label: "bitiş tarihi tekrar sayısından önce dolar",
    body: {
      title: "Ders",
      startsAt: "2026-09-07T07:00:00.000Z",
      mode: "SERIES",
      weekdays: [1],
      totalOccurrences: 12,
      startsAtTime: "10:00",
      seriesEndsOn: "2026-09-28T00:00:00.000Z",
    },
  },
  {
    label: "tek ders",
    body: { title: "Ders", startsAt: "2026-09-07T07:00:00.000Z", mode: "SINGLE" },
  },
];

for (const { label, body } of BODIES) {
  test(`önizleme ve oluşturma aynı occurrence üretir — ${label}`, () => {
    assert.deepEqual(occurrencesFor(createSchema, body), occurrencesFor(previewSchema, body));
  });
}

test("bitiş tarihi toplam tekrar sayısını kısaltır", () => {
  const occurrences = occurrencesFor(createSchema, {
    title: "Ders",
    startsAt: "2026-09-07T07:00:00.000Z",
    mode: "SERIES",
    weekdays: [1],
    totalOccurrences: 12,
    startsAtTime: "10:00",
    seriesEndsOn: "2026-09-28T00:00:00.000Z",
  });
  // 7, 14, 21, 28 Eylül pazartesileri — bitiş tarihi dahil.
  assert.equal(occurrences.length, 4);
});

test("1/2/8/12 haftalık seriler tam sayıda oluşum üretir", () => {
  for (const weeks of [1, 2, 8, 12]) {
    const occurrences = occurrencesFor(createSchema, {
      title: "Ders",
      startsAt: "2026-09-07T07:00:00.000Z",
      mode: weeks > 1 ? "SERIES" : "SINGLE",
      repeatWeeks: weeks,
      startsAtTime: "10:00",
    });
    assert.equal(occurrences.length, weeks, `${weeks} hafta`);
  }
});

test("çoklu gün seçiminde oluşumlar kronolojik ve tekrarsızdır", () => {
  const occurrences = occurrencesFor(createSchema, {
    title: "Ders",
    startsAt: "2026-09-07T07:00:00.000Z",
    mode: "SERIES",
    weekdays: [1, 3, 5],
    totalOccurrences: 9,
    startsAtTime: "10:00",
  });
  assert.equal(occurrences.length, 9);
  assert.equal(new Set(occurrences).size, 9);
  assert.deepEqual(occurrences, [...occurrences].sort());
});
