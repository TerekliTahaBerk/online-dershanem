import assert from "node:assert/strict";
import test from "node:test";
import { buildResultNextStepRecommendations } from "./result-next-step";

const weakSignal = {
  outcomeId: "o1",
  code: "M.1",
  title: "Fonksiyonlar",
  unitName: "Cebir",
  latestAccuracy: 35,
  previousAccuracy: 62,
  delta: -27,
  evidenceCount: 2,
  questionCount: 7,
  latestQuestionCount: 4,
  confidence: "MEDIUM" as const,
  confidenceScore: 0.64,
  priority: 61,
  needsReview: true,
};

test("ODK-only akışında plan veya OD bağlantısı sızdırılmaz", () => {
  const recommendations = buildResultNextStepRecommendations({
    weakOutcomeSignals: [weakSignal],
    hasOK: false,
    hasOD: false,
    hasPlan: false,
    answerKeyAvailable: true,
    answerKeyHref: "/api/odk/student/exams/e1/answer-key",
    reviewHref: "/panel/ogrenci/tekrar",
    recoveryHref: "/panel/ogrenci/telafi?lessonId=l1",
  });
  assert.equal(recommendations[0]?.actionLabel, "Cevap anahtarını aç");
  assert.equal(recommendations.some((item) => item.actionLabel === "Planıma ekle" || item.actionLabel === "Planımı güncelle"), false);
  assert.equal(recommendations.some((item) => item.href === "/panel/ogrenci/tekrar"), false);
});

test("ODK+OK akışında plan güncelleme/ekleme birincil öneridir", () => {
  const recommendations = buildResultNextStepRecommendations({
    weakOutcomeSignals: [weakSignal],
    hasOK: true,
    hasOD: false,
    hasPlan: true,
    answerKeyAvailable: true,
    answerKeyHref: "/api/odk/student/exams/e1/answer-key",
  });
  assert.equal(recommendations[0]?.tone, "primary");
  assert.equal(recommendations[0]?.actionLabel, "Planımı güncelle");
  assert.equal(recommendations[0]?.href, "/panel/ogrenci/plan");
});

test("ODK+OD akışında yalnız mevcut çapraz bağlantılar önerilir", () => {
  const recommendations = buildResultNextStepRecommendations({
    weakOutcomeSignals: [weakSignal],
    hasOK: false,
    hasOD: true,
    hasPlan: false,
    answerKeyAvailable: false,
    answerKeyHref: "/api/odk/student/exams/e1/answer-key",
    reviewHref: "/panel/ogrenci/tekrar",
  });
  assert.equal(recommendations.some((item) => item.href === "/panel/ogrenci/tekrar"), true);
  assert.equal(recommendations.some((item) => item.actionLabel === "Telafiyi aç"), false);
});

test("öneri listesi 1 primary + 2 secondary sınırını aşmaz", () => {
  const recommendations = buildResultNextStepRecommendations({
    weakOutcomeSignals: [weakSignal],
    hasOK: true,
    hasOD: true,
    hasPlan: false,
    answerKeyAvailable: true,
    answerKeyHref: "/api/odk/student/exams/e1/answer-key",
    reviewHref: "/panel/ogrenci/tekrar",
    recoveryHref: "/panel/ogrenci/telafi?lessonId=l1",
  });
  assert.equal(recommendations.length, 3);
  assert.equal(recommendations.filter((item) => item.tone === "primary").length, 1);
});
