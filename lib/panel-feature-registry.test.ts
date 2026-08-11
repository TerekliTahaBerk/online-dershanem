import assert from "node:assert/strict";
import test from "node:test";
import { getPanelFeatureSnapshot, panelFeatureRegistry } from "./panel-feature-registry";

test("her panel özelliğinin rollout ve işletme metadatası vardır", () => {
  assert.equal(panelFeatureRegistry.length, 15);
  for (const feature of panelFeatureRegistry) {
    assert.ok(feature.owner);
    assert.ok(feature.roles.length);
    assert.ok(feature.dataDependency);
    assert.ok(feature.e2eCoverage);
    assert.ok(feature.rollback);
    assert.ok(["experimental", "pilot", "production-ready", "deprecated"].includes(feature.status));
  }
});

test("snapshot varsayılanı, env kaynağını ve eski public drift'ini açıklar", () => {
  const snapshot = getPanelFeatureSnapshot({
    PANEL_FEATURE_MOCK_EXAM_ANALYSIS: "true",
    NEXT_PUBLIC_PANEL_FEATURE_MOCK_EXAM_ANALYSIS: "false",
  });
  const mockExam = snapshot.find((feature) => feature.key === "mockExamAnalysis");
  const baseline = snapshot.find((feature) => feature.key === "baselineMetrics");
  assert.equal(mockExam?.enabled, true);
  assert.equal(mockExam?.source, "environment");
  assert.equal(mockExam?.legacyPublicDrift, true);
  assert.equal(baseline?.enabled, true);
  assert.equal(baseline?.source, "default");
});
