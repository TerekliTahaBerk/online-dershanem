import assert from "node:assert/strict";
import test from "node:test";
import { getPanelFeatureFlags } from "./panel-feature-flags";

test("gelecek panel özellikleri güvenli biçimde kapalı başlar", () => {
  const flags = getPanelFeatureFlags({});
  assert.equal(flags.baselineMetrics, true);
  assert.equal(flags.learningOutcomes, false);
  assert.equal(flags.quickLessonClose, false);
  assert.equal(flags.recoveryPackage, false);
  assert.equal(flags.assignmentEvidence, false);
  assert.equal(flags.teacherAiDrafts, false);
});

test("yalnız açık true ve false değerlerini kabul eder", () => {
  const flags = getPanelFeatureFlags({
    PANEL_FEATURE_BASELINE_METRICS: "false",
    PANEL_FEATURE_LEARNING_OUTCOMES: " TRUE ",
    PANEL_FEATURE_MOCK_EXAM_ANALYSIS: "yes",
  });
  assert.equal(flags.baselineMetrics, false);
  assert.equal(flags.learningOutcomes, true);
  assert.equal(flags.mockExamAnalysis, false);
});
