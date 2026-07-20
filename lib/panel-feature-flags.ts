export type PanelFeatureFlags = {
  baselineMetrics: boolean;
  learningOutcomes: boolean;
  mockExamAnalysis: boolean;
  reviewQueue: boolean;
  quickLessonClose: boolean;
  adaptivePlan: boolean;
  parentWeeklyDigest: boolean;
  interventionInbox: boolean;
  recoveryPackage: boolean;
  assignmentEvidence: boolean;
  teacherAiDrafts: boolean;
};

const defaults: PanelFeatureFlags = {
  baselineMetrics: true,
  learningOutcomes: false,
  mockExamAnalysis: false,
  reviewQueue: false,
  quickLessonClose: false,
  adaptivePlan: false,
  parentWeeklyDigest: false,
  interventionInbox: false,
  recoveryPackage: false,
  assignmentEvidence: false,
  teacherAiDrafts: false,
};

const environmentKeys: Record<keyof PanelFeatureFlags, string> = {
  baselineMetrics: "PANEL_FEATURE_BASELINE_METRICS",
  learningOutcomes: "PANEL_FEATURE_LEARNING_OUTCOMES",
  mockExamAnalysis: "PANEL_FEATURE_MOCK_EXAM_ANALYSIS",
  reviewQueue: "PANEL_FEATURE_REVIEW_QUEUE",
  quickLessonClose: "PANEL_FEATURE_QUICK_LESSON_CLOSE",
  adaptivePlan: "PANEL_FEATURE_ADAPTIVE_PLAN",
  parentWeeklyDigest: "PANEL_FEATURE_PARENT_WEEKLY_DIGEST",
  interventionInbox: "PANEL_FEATURE_INTERVENTION_INBOX",
  recoveryPackage: "PANEL_FEATURE_RECOVERY_PACKAGE",
  assignmentEvidence: "PANEL_FEATURE_ASSIGNMENT_EVIDENCE",
  teacherAiDrafts: "PANEL_FEATURE_TEACHER_AI_DRAFTS",
};

/**
 * Panel özellikleri güvenli varsayılanlarla açılır.
 *
 * Yalnızca açıkça `true` / `false` yazılan değerler varsayılanı değiştirir.
 * Hatalı veya boş değer rollout davranışını sürpriz biçimde değiştirmez.
 */
export function getPanelFeatureFlags(
  env: Record<string, string | undefined> = process.env,
): PanelFeatureFlags {
  return Object.fromEntries(
    (Object.keys(defaults) as (keyof PanelFeatureFlags)[]).map((flag) => {
      const raw = env[environmentKeys[flag]]?.trim().toLowerCase();
      if (raw === "true") return [flag, true];
      if (raw === "false") return [flag, false];
      return [flag, defaults[flag]];
    }),
  ) as PanelFeatureFlags;
}
