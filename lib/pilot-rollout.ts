import type { PanelSloMetric } from "@/lib/panel-slo";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";

export type PilotRole = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
export type PilotRolloutMode = "GENERAL" | "PILOT";
export type PilotReadinessCheck = { key: string; label: string; status: "PASS" | "BLOCK" | "WAIT"; detail: string };

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
  const { baselineMetrics: _baselineMetrics, ...pilotFeatures } = getPanelFeatureFlags(env);
  const enabledFeatureCount = Object.values(pilotFeatures).filter(Boolean).length;
  const restoreAt = env.PANEL_LAST_RESTORE_DRILL_AT ? new Date(env.PANEL_LAST_RESTORE_DRILL_AT) : null;
  const restoreFresh = Boolean(restoreAt && Number.isFinite(restoreAt.getTime()) && restoreAt <= now && now.getTime() - restoreAt.getTime() <= 90 * 86400000);
  const core = input.sloMetrics.filter((metric) => CORE_SLO_KEYS.has(metric.key));
  const breached = core.filter((metric) => metric.status === "breached");
  const waiting = core.filter((metric) => metric.status === "insufficient_data");
  const checks: PilotReadinessCheck[] = [
    { key: "mode", label: "Sunucu pilot modunda", status: pilotRolloutMode(env) === "PILOT" ? "PASS" : "BLOCK", detail: "PANEL_ROLLOUT_MODE=pilot olmalı." },
    { key: "kill", label: "Acil durdurma kapalı", status: env.PANEL_PILOT_KILL_SWITCH === "true" ? "BLOCK" : "PASS", detail: "Kill switch açıkken admin dışındaki tüm pilot erişimi kesilir." },
    { key: "roles", label: "Dört rol temsil ediliyor", status: Object.values(coverage).every((count) => count > 0) ? "PASS" : "BLOCK", detail: `Admin ${coverage.ADMIN} · Öğretmen ${coverage.TEACHER} · Öğrenci ${coverage.STUDENT} · Veli ${coverage.PARENT}` },
    { key: "flags", label: "Tek kaynaklı özellik snapshot'ı hazır", status: enabledFeatureCount ? "PASS" : "BLOCK", detail: enabledFeatureCount ? `${enabledFeatureCount} yeni özellik pilot kapsamına açık; menü ve sunucu aynı snapshot'ı kullanıyor.` : "Pilot kapsamına açık yeni özellik yok." },
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
