import assert from "node:assert/strict";
import test from "node:test";
import { createExamSchema, createSeriesSchema, updateQuestionsSchema } from "./admin-schemas";

test("ODK yalnız LGS, TYT ve AYT matematik serisi kabul eder", () => {
  const base = { title: "Haftalık Matematik", slug: "haftalik-matematik", academicYear: 2026, classLevel: "8" };
  assert.equal(createSeriesSchema.safeParse({ ...base, family: "LGS" }).success, true);
  assert.equal(createSeriesSchema.safeParse({ ...base, family: "KPSS" }).success, false);
});

test("deneme taslağı güvenli slug kabul eder; questionCount verilirse MATH_ONLY varsayılır", () => {
  const base = { title: "LGS Matematik 1", slug: "lgs-matematik-1", family: "LGS", seriesId: null, durationMinutes: 40, questionCount: 20 };
  const parsed = createExamSchema.safeParse(base);
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.structureMode, "MATH_ONLY");
  assert.equal(createExamSchema.safeParse({ ...base, slug: "Türkçe Boşluk", questionCount: 0 }).success, false);
  const full = createExamSchema.safeParse({ title: "TYT 1", slug: "tyt-1", family: "TYT", structureMode: "FULL_TEMPLATE" });
  assert.equal(full.success, true);
  if (full.success) assert.equal(full.data.structureMode, "FULL_TEMPLATE");
});

test("ana kazanım bağlı kazanımlar içinde değilse soru kaydı reddedilir", () => {
  const question = { id: "question-1", correctOption: "A", difficulty: "MEDIUM", bookletPage: 1, outcomeIds: ["outcome-1"], primaryOutcomeId: "outcome-2" };
  assert.equal(updateQuestionsSchema.safeParse({ questions: [question] }).success, false);
  assert.equal(updateQuestionsSchema.safeParse({ questions: [{ ...question, primaryOutcomeId: "outcome-1" }] }).success, true);
});
