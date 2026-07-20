import type { UserRole } from "@prisma/client";
import { pilotTransitionAllowed, roleCoverage, type PilotReadinessCheck } from "@/lib/pilot-rollout";

type Env = NodeJS.ProcessEnv | Record<string, string | undefined>;

export type OdkPilotSnapshot = {
  readyExamCount: number;
  staleAttemptCount: number;
  unscoredEndedExamCount: number;
  lifecycleCronConfigured: boolean;
  privateStorageConfigured: boolean;
};

export function odkPilotMode(env: Env = process.env) {
  return env.ODK_ROLLOUT_MODE?.trim().toLowerCase() === "pilot" ? "PILOT" as const : "GENERAL" as const;
}

export function odkPilotAccessDecision(input: { role: UserRole; activeMembership: boolean; env?: Env }) {
  const env = input.env || process.env;
  if (input.role === "ADMIN") return { allowed: true, reason: "ADMIN_BYPASS" as const };
  if (env.ODK_PILOT_KILL_SWITCH === "true") return { allowed: false, reason: "KILL_SWITCH" as const };
  if (odkPilotMode(env) === "GENERAL") return { allowed: true, reason: "GENERAL" as const };
  return input.activeMembership ? { allowed: true, reason: "ACTIVE_RUN" as const } : { allowed: false, reason: "NOT_IN_ACTIVE_RUN" as const };
}

export function calculateOdkPilotReadiness(input: { env?: Env; roles: UserRole[]; snapshot: OdkPilotSnapshot; now?: Date }) {
  const env = input.env || process.env;
  const now = input.now || new Date();
  const coverage = roleCoverage(input.roles);
  const restoreAt = env.ODK_LAST_RESTORE_DRILL_AT ? new Date(env.ODK_LAST_RESTORE_DRILL_AT) : null;
  const restoreFresh = Boolean(restoreAt && Number.isFinite(restoreAt.getTime()) && restoreAt <= now && now.getTime() - restoreAt.getTime() <= 90 * 86400000);
  const checks: PilotReadinessCheck[] = [
    { key: "mode", label: "ODK pilot modunda", status: odkPilotMode(env) === "PILOT" ? "PASS" : "BLOCK", detail: "ODK_ROLLOUT_MODE=pilot olmalı." },
    { key: "kill", label: "Acil durdurma kapalı", status: env.ODK_PILOT_KILL_SWITCH === "true" ? "BLOCK" : "PASS", detail: "Kill switch admin dışındaki ODK erişimini anında keser." },
    { key: "roles", label: "Dört rol temsil ediliyor", status: Object.values(coverage).every((count) => count > 0) ? "PASS" : "BLOCK", detail: `Admin ${coverage.ADMIN} · Öğretmen ${coverage.TEACHER} · Öğrenci ${coverage.STUDENT} · Veli ${coverage.PARENT}` },
    { key: "acceptance", label: "Canlı kabul tamamlandı", status: env.ODK_PILOT_ACCEPTANCE_APPROVED === "true" ? "PASS" : "BLOCK", detail: "Öğrenci sınavı, veli/öğretmen raporu, mobil ve erişilebilirlik kabulü gerekir." },
    { key: "security", label: "Çocuk verisi ve güvenlik onaylı", status: env.ODK_PILOT_SECURITY_REVIEW_APPROVED === "true" ? "PASS" : "BLOCK", detail: "Yetki matrisi, PDF erişimi, Meet protokolü ve KVKK incelemesi gerekir." },
    { key: "operations", label: "Sınav günü operasyonu onaylı", status: env.ODK_PILOT_OPERATIONS_APPROVED === "true" ? "PASS" : "BLOCK", detail: "Görevli, iletişim, olay kaydı ve manuel sonuç açıklama sorumluları atanmalıdır." },
    { key: "restore", label: "Restore tatbikatı güncel", status: restoreFresh ? "PASS" : "BLOCK", detail: "ODK son başarılı restore tatbikatı en fazla 90 günlük olmalıdır." },
    { key: "cron", label: "Yaşam döngüsü görevi hazır", status: input.snapshot.lifecycleCronConfigured ? "PASS" : "BLOCK", detail: "CRON_SECRET ve ODK sınav yaşam döngüsü görevi yapılandırılmalıdır." },
    { key: "storage", label: "PDF deposu özel", status: input.snapshot.privateStorageConfigured ? "PASS" : "BLOCK", detail: "Soru kitapçığı herkese açık URL ile yayınlanamaz; özel Blob erişimi gerekir." },
    { key: "exam", label: "Pilot denemesi yayına hazır", status: input.snapshot.readyExamCount > 0 ? "PASS" : "BLOCK", detail: `${input.snapshot.readyExamCount} planlanabilir veya planlanmış deneme bulundu.` },
    { key: "stale", label: "Sahipsiz aktif oturum yok", status: input.snapshot.staleAttemptCount > 0 ? "BLOCK" : "PASS", detail: input.snapshot.staleAttemptCount ? `${input.snapshot.staleAttemptCount} oturumun heartbeat'i eski.` : "Aktif oturum guardrail'i temiz." },
    { key: "scoring", label: "Birikmiş puanlama işi yok", status: input.snapshot.unscoredEndedExamCount > 0 ? "WAIT" : "PASS", detail: input.snapshot.unscoredEndedExamCount ? `${input.snapshot.unscoredEndedExamCount} bitmiş denemenin puanlaması bekliyor.` : "Birikmiş puanlama işi yok." },
  ];
  return { checks, coverage, canActivate: !checks.some((check) => check.status === "BLOCK"), canExpand: checks.every((check) => check.status === "PASS") };
}

export { pilotTransitionAllowed as odkPilotTransitionAllowed };
