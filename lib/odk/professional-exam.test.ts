import assert from "node:assert/strict";
import test from "node:test";
import { previewAnswerKeyImport, summarizeAnswerKeyPreview } from "./answer-key-import";
import { previewOutcomeImport } from "./outcome-import";
import { assessIntegrity, isHighValueExamEvent } from "./integrity";
import { previewResultPublication, previewRescoreImpact } from "./result-publication";
import { aggregateQuestionTimings, visibleElapsedMs } from "./time-analysis";

test("cevap anahtarı JSON preview doğrular ve commit etmeden hata listeler", () => {
  const preview = previewAnswerKeyImport({
    schemaVersion: "1.0",
    examType: "TYT",
    sections: [{ code: "TURKCE", answers: { "1": "A", "2": "Z" } }],
  }, [{ sectionCode: "TURKCE", questionNumber: 1 }, { sectionCode: "TURKCE", questionNumber: 2 }], "TYT");
  assert.ok(preview.issues.some((issue) => issue.code === "INVALID_STRUCTURE" || issue.level === "error"));
});

test("geçerli cevap anahtarı summary üretir", () => {
  const preview = previewAnswerKeyImport({
    schemaVersion: "1.0",
    examType: "LGS",
    sections: [{ code: "MAT", answers: { "1": "A", "2": "C" } }],
  }, [{ sectionCode: "MAT", questionNumber: 1 }, { sectionCode: "MAT", questionNumber: 2 }], "LGS");
  const summary = summarizeAnswerKeyPreview(preview);
  assert.equal(summary.found, 2);
  assert.equal(summary.valid, 2);
  assert.equal(summary.errors, 0);
  assert.equal(summary.ready, true);
});

test("kazanım import kataloga bağlanır ve eksik soruyu uyarılar", () => {
  const preview = previewOutcomeImport({
    schemaVersion: "1.0",
    questions: [{ section: "MAT", question: 1, outcomes: [{ code: "TYT.MAT.01", name: "Problem çözer" }] }],
  }, [{ sectionCode: "MAT", questionNumber: 1 }, { sectionCode: "MAT", questionNumber: 2 }], [{ id: "o1", code: "TYT.MAT.01", title: "Problem çözer" }]);
  assert.equal(preview.catalogHits, 1);
  assert.ok(preview.issues.some((issue) => issue.code === "QUESTION_WITHOUT_OUTCOME"));
});

test("integrity sinyalleri otomatik CHEATER demez", () => {
  const result = assessIntegrity([
    { type: "TAB_HIDDEN", durationMs: 40_000 },
    { type: "TAB_HIDDEN", durationMs: 20_000 },
    { type: "FULLSCREEN_EXIT" },
    { type: "COPY_ATTEMPT" },
  ]);
  assert.equal(result.level, "REVIEW");
  assert.equal(result.label, "İncelenmeli");
  assert.ok(result.reasons.length >= 3);
  assert.equal(isHighValueExamEvent("MOUSE_MOVE"), false);
  assert.equal(isHighValueExamEvent("ANSWER_CHANGED"), true);
});

test("sonuç yayını scoring ile publication'ı ayırır", () => {
  const preview = previewResultPublication([
    { attemptId: "1", studentLabel: "A", hasScore: true, integrityLevel: "NORMAL" },
    { attemptId: "2", studentLabel: "B", hasScore: true, integrityLevel: "REVIEW", reviewRequired: true },
    { attemptId: "3", studentLabel: "C", hasScore: false, scoringError: true },
  ], { excludeReviewRequired: true });
  assert.equal(preview.publishable, 1);
  assert.equal(preview.reviewRequired, 1);
  assert.equal(preview.scoringErrors, 1);
  assert.equal(preview.canPublish, false);
});

test("rescore impact published sonuç değişimini uyarır", () => {
  const impact = previewRescoreImpact({ attemptCount: 318, changedQuestionCount: 2, hasPublishedResults: true });
  assert.equal(impact.attemptCount, 318);
  assert.equal(impact.publishedResultsWillChange, true);
});

test("zaman analizi visibilityAware süre kullanır", () => {
  assert.equal(visibleElapsedMs(0, 5000, false), 0);
  assert.equal(visibleElapsedMs(0, 5000, true), 5000);
  const summary = aggregateQuestionTimings([
    { questionId: "1", sectionCode: "MAT", sectionTitle: "Matematik", result: "CORRECT", activeDurationMs: 78_000 },
    { questionId: "2", sectionCode: "MAT", sectionTitle: "Matematik", result: "WRONG", activeDurationMs: 132_000 },
  ]);
  assert.equal(summary.sections[0].correctAvgMs, 78_000);
  assert.equal(summary.sections[0].wrongAvgMs, 132_000);
});
