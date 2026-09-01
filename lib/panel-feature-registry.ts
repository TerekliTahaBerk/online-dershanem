import type { UserRole } from "@prisma/client";
import {
  getPanelFeatureFlags,
  panelFeatureDefaults,
  panelFeatureEnvironmentKeys,
  type PanelFeatureFlags,
} from "@/lib/panel-feature-flags";

export type PanelFeatureStatus = "experimental" | "pilot" | "production-ready" | "deprecated";
export type PanelFeatureKey = keyof PanelFeatureFlags;

export type PanelFeatureDefinition = {
  key: PanelFeatureKey;
  label: string;
  status: PanelFeatureStatus;
  owner: string;
  roles: UserRole[];
  dataDependency: string;
  e2eCoverage: string;
  rollback: string;
  legacyPublicEnvironmentKey: string | null;
};

export const panelFeatureRegistry: readonly PanelFeatureDefinition[] = [
  { key: "baselineMetrics", label: "Baseline ürün metrikleri", status: "production-ready", owner: "Platform Engineering", roles: ["ADMIN", "TEACHER"], dataDependency: "Panel event logları; migration gerektirmez", e2eCoverage: "panel-experience + panel-events unit", rollback: "PANEL_FEATURE_BASELINE_METRICS=false", legacyPublicEnvironmentKey: null },
  { key: "learningOutcomes", label: "Kazanım kanıtı", status: "pilot", owner: "Akademik Operasyon", roles: ["ADMIN", "TEACHER", "STUDENT", "PARENT"], dataDependency: "0045_curriculum_outcome_evidence", e2eCoverage: "panel-experience: ders kapanışı, gelişim ve veli görünümü", rollback: "PANEL_FEATURE_LEARNING_OUTCOMES=false; katalog ve kanıt verisini koru", legacyPublicEnvironmentKey: null },
  { key: "mockExamAnalysis", label: "Deneme analizi", status: "pilot", owner: "Akademik Operasyon", roles: ["ADMIN", "TEACHER", "STUDENT", "PARENT"], dataDependency: "0046_mock_exam_analysis", e2eCoverage: "panel-experience: öğrenci → öğretmen → veli deneme akışı", rollback: "PANEL_FEATURE_MOCK_EXAM_ANALYSIS=false", legacyPublicEnvironmentKey: "NEXT_PUBLIC_PANEL_FEATURE_MOCK_EXAM_ANALYSIS" },
  { key: "reviewQueue", label: "Aralıklı tekrar kuyruğu", status: "pilot", owner: "Öğrenme Deneyimi", roles: ["TEACHER", "STUDENT"], dataDependency: "0047_spaced_review_queue; deneme girdisi isteğe bağlı", e2eCoverage: "panel-experience + panel-access: tekrar ve yatay erişim", rollback: "PANEL_FEATURE_REVIEW_QUEUE=false; kuyruk kayıtlarını koru", legacyPublicEnvironmentKey: "NEXT_PUBLIC_PANEL_FEATURE_REVIEW_QUEUE" },
  { key: "quickLessonClose", label: "Hızlı ders kapanışı", status: "pilot", owner: "Öğretmen Deneyimi", roles: ["TEACHER", "STUDENT"], dataDependency: "0048_quick_lesson_close; Lesson ve Assignment", e2eCoverage: "panel-experience: dört öğrencili ders kapanışı", rollback: "PANEL_FEATURE_QUICK_LESSON_CLOSE=false; klasik kapanışa dön", legacyPublicEnvironmentKey: "NEXT_PUBLIC_PANEL_FEATURE_QUICK_LESSON_CLOSE" },
  { key: "adaptivePlan", label: "Uyarlanabilir haftalık plan", status: "pilot", owner: "Öğrenme Deneyimi", roles: ["TEACHER", "STUDENT"], dataDependency: "0049_adaptive_weekly_plan", e2eCoverage: "panel-experience + panel-access: üret/onayla/geri bildirim", rollback: "PANEL_FEATURE_ADAPTIVE_PLAN=false; plan geçmişini koru", legacyPublicEnvironmentKey: "NEXT_PUBLIC_PANEL_FEATURE_ADAPTIVE_PLAN" },
  { key: "parentWeeklyDigest", label: "Sakin haftalık özet", status: "pilot", owner: "Aile Deneyimi", roles: ["TEACHER", "STUDENT", "PARENT"], dataDependency: "0050_calm_weekly_digest", e2eCoverage: "panel-experience + panel-access: ortak yayın ve yetki", rollback: "PANEL_FEATURE_PARENT_WEEKLY_DIGEST=false; yayınları koru", legacyPublicEnvironmentKey: "NEXT_PUBLIC_PANEL_FEATURE_PARENT_WEEKLY_DIGEST" },
  { key: "interventionInbox", label: "Müdahale kutusu", status: "pilot", owner: "Öğrenci Başarı Operasyonu", roles: ["ADMIN", "TEACHER"], dataDependency: "0051_explainable_intervention_inbox", e2eCoverage: "panel-experience + panel-access: sahiplenme ve sonuç", rollback: "PANEL_FEATURE_INTERVENTION_INBOX=false; gerekirse kuralı ayrıca durdur", legacyPublicEnvironmentKey: "NEXT_PUBLIC_PANEL_FEATURE_INTERVENTION_INBOX" },
  { key: "recoveryPackage", label: "Telafi paketi", status: "pilot", owner: "Öğrenci Başarı Operasyonu", roles: ["TEACHER", "STUDENT"], dataDependency: "0052_missed_lesson_recovery", e2eCoverage: "panel-experience + panel-access: yayın/tamamlama/yetki", rollback: "PANEL_FEATURE_RECOVERY_PACKAGE=false; paket verisini koru", legacyPublicEnvironmentKey: "NEXT_PUBLIC_PANEL_FEATURE_RECOVERY_PACKAGE" },
  { key: "assignmentEvidence", label: "Kanıtlı ödev ve rubric", status: "pilot", owner: "Öğretmen Deneyimi", roles: ["TEACHER", "STUDENT"], dataDependency: "0053_assignment_evidence_rubric", e2eCoverage: "panel-experience + panel-access: iki deneme ve rubric", rollback: "PANEL_FEATURE_ASSIGNMENT_EVIDENCE=false; teslimleri koru", legacyPublicEnvironmentKey: "NEXT_PUBLIC_PANEL_FEATURE_ASSIGNMENT_EVIDENCE" },
  { key: "studentCheckIn", label: "Öğrenci check-in ve yardım", status: "pilot", owner: "Öğrenci Başarı ve Güvenlik", roles: ["TEACHER", "STUDENT"], dataDependency: "0054_student_check_in_help", e2eCoverage: "panel-experience + panel-access: yardım ve veli izolasyonu", rollback: "PANEL_FEATURE_STUDENT_CHECK_IN=false; açık yardım kayıtlarını operasyonel kapat", legacyPublicEnvironmentKey: "NEXT_PUBLIC_PANEL_FEATURE_STUDENT_CHECK_IN" },
  { key: "accessibilityProfile", label: "Erişilebilirlik profili", status: "pilot", owner: "Erişilebilirlik", roles: ["ADMIN", "TEACHER", "STUDENT", "PARENT"], dataDependency: "0055_accessibility_preferences", e2eCoverage: "panel-experience + panel-access: 320px, axe ve rol sınırı", rollback: "PANEL_FEATURE_ACCESSIBILITY_PROFILE=false; tercihleri koru", legacyPublicEnvironmentKey: "NEXT_PUBLIC_PANEL_FEATURE_ACCESSIBILITY_PROFILE" },
  { key: "offlineMode", label: "Düşük veri ve çevrimdışı mod", status: "experimental", owner: "Platform Engineering", roles: ["TEACHER", "STUDENT"], dataDependency: "0056_offline_low_data; browser storage + outbox", e2eCoverage: "panel-experience: offline sync, conflict ve private cache", rollback: "PANEL_FEATURE_OFFLINE_MODE=false; service worker/outbox yazımını kes", legacyPublicEnvironmentKey: "NEXT_PUBLIC_PANEL_FEATURE_OFFLINE_MODE" },
  { key: "cohortQuality", label: "Kohort öğrenme kalitesi", status: "experimental", owner: "Akademik Operasyon", roles: ["ADMIN"], dataDependency: "Kazanım + deneme veri kalitesi; yeni migration yok", e2eCoverage: "panel-experience: küçük kohort bastırma ve sıralamasız görünüm", rollback: "PANEL_FEATURE_COHORT_QUALITY=false", legacyPublicEnvironmentKey: "NEXT_PUBLIC_PANEL_FEATURE_COHORT_QUALITY" },
  { key: "teacherAiDrafts", label: "Öğretmen AI taslakları", status: "experimental", owner: "AI Güvenliği ve Öğretmen Deneyimi", roles: ["TEACHER"], dataDependency: "0057_safe_teacher_ai_drafts; provider/onay/maliyet kapıları", e2eCoverage: "panel-experience + teacher-ai unit/eval: insan onayı", rollback: "Önce AI_DRAFT_EXTERNAL_TRANSFER_APPROVED=false, sonra PANEL_FEATURE_TEACHER_AI_DRAFTS=false", legacyPublicEnvironmentKey: "NEXT_PUBLIC_PANEL_FEATURE_TEACHER_AI_DRAFTS" },
  { key: "dinoAi", label: "Dino AI özetleri", status: "experimental", owner: "AI Güvenliği ve Ürün", roles: ["STUDENT", "PARENT", "TEACHER"], dataDependency: "0085_dino_answers; Gemini sağlayıcı + dış aktarım onayı + maliyet oranları; dino-v2 context allowlist", e2eCoverage: "dino unit: izin listesi, atıf doğrulama, rol kapsamı, parent privacy, teacher horizontal", rollback: "Önce DINO_PROVIDER=fallback (dışarı istek durur), sonra PANEL_FEATURE_DINO_AI=false", legacyPublicEnvironmentKey: null },] as const;

export function getPanelFeatureSnapshot(env: Record<string, string | undefined> = process.env) {
  const flags = getPanelFeatureFlags(env);
  return panelFeatureRegistry.map((feature) => {
    const environmentKey = panelFeatureEnvironmentKeys[feature.key];
    const raw = env[environmentKey]?.trim().toLowerCase();
    const legacyRaw = feature.legacyPublicEnvironmentKey ? env[feature.legacyPublicEnvironmentKey]?.trim().toLowerCase() : undefined;
    return {
      ...feature,
      environmentKey,
      enabled: flags[feature.key],
      source: raw === "true" || raw === "false" ? "environment" as const : "default" as const,
      defaultEnabled: panelFeatureDefaults[feature.key],
      legacyPublicConfigured: legacyRaw !== undefined,
      legacyPublicDrift: legacyRaw !== undefined && (legacyRaw === "true") !== flags[feature.key],
    };
  });
}
