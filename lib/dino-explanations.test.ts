import assert from "node:assert/strict";
import test from "node:test";
import type { WeakOutcomeSignal } from "@/lib/odk/reporting";
import { buildHomeDeterministicReason, buildOutcomeDeterministicReason } from "@/lib/panel/dino-explanations";

test("home deterministic reason AI olmadan üretilir", () => {
  const now = new Date("2026-08-30T11:00:00.000Z");
  assert.match(
    buildHomeDeterministicReason({ kind: "LESSON", startsAt: new Date("2026-08-30T11:00:00.000Z") }, now),
    /Bugün saat/i,
  );
  assert.equal(
    buildHomeDeterministicReason({ kind: "RECOVERY", dueAt: new Date("2026-08-30T16:00:00.000Z") }, now),
    "Son tarihi bugün olduğu için.",
  );
  assert.equal(
    buildHomeDeterministicReason({ kind: "RECOVERY", dueAt: new Date("2026-09-02T16:00:00.000Z") }, now),
    "Kaçırdığın dersin telafi süresi devam ettiği için.",
  );
});

test("odk deterministic reason sinyalden üretilir", () => {
  const signal: WeakOutcomeSignal = {
    outcomeId: "o1",
    code: "M.1",
    title: "Fonksiyonlar",
    unitName: "Cebir",
    latestAccuracy: 42,
    previousAccuracy: 65,
    delta: -23,
    evidenceCount: 2,
    questionCount: 8,
    latestQuestionCount: 4,
    confidence: "MEDIUM",
    confidenceScore: 0.64,
    priority: 61,
    needsReview: true,
  };
  assert.equal(
    buildOutcomeDeterministicReason(signal),
    "Son ölçümde doğruluk 23 puan düştüğü için.",
  );
});

