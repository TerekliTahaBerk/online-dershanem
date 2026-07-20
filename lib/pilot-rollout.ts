import type { PanelSloMetric } from "@/lib/panel-slo";

export type PilotRole = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
export type PilotRolloutMode = "GENERAL" | "PILOT";
export type PilotReadinessCheck = { key: string; label: string; status: "PASS" | "BLOCK" | "WAIT"; detail: string };

const FEATURE_PAIRS = [
  ["PANEL_FEATURE_MOCK_EXAM_ANALYSIS", "NEXT_PUBLIC_PANEL_FEATURE_MOCK_EXAM_ANALYSIS"],
  ["PANEL_FEATURE_REVIEW_QUEUE", "NEXT_PUBLIC_PANEL_FEATURE_REVIEW_QUEUE"],
  ["PANEL_FEATURE_QUICK_LESSON_CLOSE", "NEXT_PUBLIC_PANEL_FEATURE_QUICK_LESSON_CLOSE"],
  ["PANEL_FEATURE_ADAPTIVE_PLAN", "NEXT_PUBLIC_PANEL_FEATURE_ADAPTIVE_PLAN"],
  ["PANEL_FEATURE_PARENT_WEEKLY_DIGEST", "NEXT_PUBLIC_PANEL_FEATURE_PARENT_WEEKLY_DIGEST"],
  ["PANEL_FEATURE_INTERVENTION_INBOX", "NEXT_PUBLIC_PANEL_FEATURE_INTERVENTION_INBOX"],
  ["PANEL_FEATURE_RECOVERY_PACKAGE", "NEXT_PUBLIC_PANEL_FEATURE_RECOVERY_PACKAGE"],
  ["PANEL_FEATURE_ASSIGNMENT_EVIDENCE", "NEXT_PUBLIC_PANEL_FEATURE_ASSIGNMENT_EVIDENCE"],
  ["PANEL_FEATURE_STUDENT_CHECK_IN", "NEXT_PUBLIC_PANEL_FEATURE_STUDENT_CHECK_IN"],
  ["PANEL_FEATURE_ACCESSIBILITY_PROFILE", "NEXT_PUBLIC_PANEL_FEATURE_ACCESSIBILITY_PROFILE"],
  ["PANEL_FEATURE_OFFLINE_MODE", "NEXT_PUBLIC_PANEL_FEATURE_OFFLINE_MODE"],
  ["PANEL_FEATURE_COHORT_QUALITY", "NEXT_PUBLIC_PANEL_FEATURE_COHORT_QUALITY"],
  ["PANEL_FEATURE_TEACHER_AI_DRAFTS", "NEXT_PUBLIC_PANEL_FEATURE_TEACHER_AI_DRAFTS"],
] as const;

const CORE_SLO_KEYS = new Set<PanelSloMetric["key"]>([
  "teacher_close_time",
  "teacher_save_reliability",
  "student_progress_reliability",
  "admin_setup_reliability",
  "parent_dashboard_speed",
]);

export function pilotRolloutMode(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): PilotRolloutMode {
  return env.PANEL_ROLLOUT_MODE?.trim().toLowerCase() === "pilot" ? "PILOT" : "GENERAL";
}

export function pilotAccessDecision(input: { role: PilotRole; activeMembership: boolean; env?: NodeJS.ProcessEnv | Record<string, string | undefined> }) {
  const env = input.env || process.env;
  if (input.role === "ADMIN") return { allowed: true, reason: "ADMIN_BYPASS" as const };
  if (env.PANEL_PILOT_KILL_SWITCH === "true") return { allowed: false, reason: "KILL_SWITCH" as const };
  if (pilotRolloutMode(env) === "GENERAL") return { allowed: true, reason: "GENERAL" as const };
  return input.activeMembership ? { allowed: true, reason: "ACTIVE_COHORT" as const } : { allowed: false, reason: "NOT_IN_ACTIVE_COHORT" as const };
}

export function roleCoverage(roles: PilotRole[]) {
  const counts = { ADMIN: 0, TEACHER: 0, STUDENT: 0, PARENT: 0 };
  for (const role of roles) counts[role] += 1;
  return counts;
}

export function calculatePilotReadiness(input: { env?: NodeJS.ProcessEnv | Record<string, string | undefined>; roles: PilotRole[]; sloMetrics: PanelSloMetric[]; now?: Date }) {
  const env = input.env || process.env;
  const now = input.now || new Date();
  const coverage = roleCoverage(input.roles);
  const mismatches = FEATURE_PAIRS.filter(([server, client]) => (env[server] === "true") !== (env[client] === "true"));
  const enabledFeatureCount = FEATURE_PAIRS.filter(([server]) => env[server] === "true").length + (env.PANEL_FEATURE_LEARNING_OUTCOMES === "true" ? 1 : 0);
  const restoreAt = env.PANEL_LAST_RESTORE_DRILL_AT ? new Date(env.PANEL_LAST_RESTORE_DRILL_AT) : null;
  const restoreFresh = Boolean(restoreAt && Number.isFinite(restoreAt.getTime()) && restoreAt <= now && now.getTime() - restoreAt.getTime() <= 90 * 86400000);
  const core = input.sloMetrics.filter((metric) => CORE_SLO_KEYS.has(metric.key));
  const breached = core.filter((metric) => metric.status === "breached");
  const waiting = core.filter((metric) => metric.status === "insufficient_data");
  const checks: PilotReadinessCheck[] = [
    { key: "mode", label: "Sunucu pilot modunda", status: pilotRolloutMode(env) === "PILOT" ? "PASS" : "BLOCK", detail: "PANEL_ROLLOUT_MODE=pilot olmalı." },
    { key: "kill", label: "Acil durdurma kapalı", status: env.PANEL_PILOT_KILL_SWITCH === "true" ? "BLOCK" : "PASS", detail: "Kill switch açıkken admin dışındaki tüm pilot erişimi kesilir." },
    { key: "roles", label: "Dört rol temsil ediliyor", status: Object.values(coverage).every((count) => count > 0) ? "PASS" : "BLOCK", detail: `Admin ${coverage.ADMIN} · Öğretmen ${coverage.TEACHER} · Öğrenci ${coverage.STUDENT} · Veli ${coverage.PARENT}` },
    { key: "flags", label: "Sunucu ve istemci bayrakları eş", status: mismatches.length ? "BLOCK" : enabledFeatureCount ? "PASS" : "BLOCK", detail: mismatches.length ? `${mismatches.length} özellikte görünürlük uyuşmazlığı var.` : `${enabledFeatureCount} yeni özellik pilot kapsamına açık.` },
    { key: "acceptance", label: "Dört rol kabulü onaylı", status: env.PANEL_PILOT_ACCEPTANCE_APPROVED === "true" ? "PASS" : "BLOCK", detail: "E2E, mobil ve erişilebilirlik kabul sonucu manuel olarak onaylanır." },
    { key: "security", label: "Güvenlik ve çocuk verisi incelemesi onaylı", status: env.PANEL_PILOT_SECURITY_REVIEW_APPROVED === "true" ? "PASS" : "BLOCK", detail: "Yetki matrisi, KVKK aktarımı ve çocuk güvenliği kontrolü tamamlanmalıdır." },
    { key: "restore", label: "Restore tatbikatı güncel", status: restoreFresh ? "PASS" : "BLOCK", detail: "Son başarılı restore tatbikatı en fazla 90 günlük olmalıdır." },
    { key: "slo", label: "Çekirdek guardrail ihlali yok", status: breached.length ? "BLOCK" : waiting.length ? "WAIT" : "PASS", detail: breached.length ? `${breached.length} çekirdek SLO hedef dışında.` : waiting.length ? `${waiting.length} çekirdek SLO için pilot örneklemi bekleniyor.` : "Çekirdek rol yolculukları hedefte." },
  ];
  return { checks, coverage, enabledFeatureCount, canActivate: !checks.some((check) => check.status === "BLOCK"), canExpand: checks.every((check) => check.status === "PASS") };
}

export function pilotTransitionAllowed(status: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ROLLED_BACK", action: "ACTIVATE" | "PAUSE" | "RESUME" | "COMPLETE" | "ROLLBACK") {
  return (status === "DRAFT" && action === "ACTIVATE") || (status === "ACTIVE" && ["PAUSE", "COMPLETE", "ROLLBACK"].includes(action)) || (status === "PAUSED" && ["RESUME", "ROLLBACK"].includes(action));
}
