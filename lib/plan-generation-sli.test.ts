import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePlanGenerationSli } from "./plan-generation-sli";

const row = (outcome: "success" | "validation" | "rejected" | "system_error", eligible = true) => ({
  name: "plan_generation_finished",
  properties: { durationMs: 120, outcome, eligible },
});

test("plan generation SLI uygun isteklerde başarı ve hata oranını hesaplar", () => {
  const snapshot = evaluatePlanGenerationSli([
    ...Array.from({ length: 97 }, () => row("success")),
    ...Array.from({ length: 3 }, () => row("system_error")),
    row("validation", false),
  ]);

  assert.equal(snapshot.status, "healthy");
  assert.equal(snapshot.eligibleRequests, 100);
  assert.equal(snapshot.generatedPlans, 97);
  assert.equal(snapshot.generationRate, 97);
  assert.equal(snapshot.errorRate, 3);
});

test("yüzde 3 üzerindeki 15 dakikalık plan generation hata oranı alarm ihlalidir", () => {
  const snapshot = evaluatePlanGenerationSli([
    ...Array.from({ length: 84 }, () => row("success")),
    ...Array.from({ length: 16 }, () => row("system_error")),
  ]);

  assert.equal(snapshot.status, "breached");
  assert.equal(snapshot.errorRate, 16);
  assert.equal(snapshot.windowMinutes, 15);
});

test("uygun istek yokken yeşil başarı yerine no_data döner", () => {
  const snapshot = evaluatePlanGenerationSli([row("validation", false), { name: "unknown", properties: {} }]);
  assert.equal(snapshot.status, "no_data");
  assert.equal(snapshot.generationRate, null);
});
