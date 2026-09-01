export const CRITICAL_CRON_DEFINITIONS = [
  { name: "odk-exam-lifecycle", label: "ODK sınav yaşam döngüsü", cadenceMinutes: 5, staleAfterMinutes: 8, alertCooldownMinutes: 10 },
  { name: "business-jobs", label: "İşletme işleri", cadenceMinutes: 5, staleAfterMinutes: 10, alertCooldownMinutes: 30 },
  { name: "email-retry", label: "E-posta yeniden deneme", cadenceMinutes: 15, staleAfterMinutes: 30, alertCooldownMinutes: 60 },
  { name: "panel-reminders", label: "Panel hatırlatmaları", cadenceMinutes: 24 * 60, staleAfterMinutes: 2 * 24 * 60, alertCooldownMinutes: 12 * 60 },
  { name: "kocum-suggestions", label: "Koçum adaptif öneriler", cadenceMinutes: 7 * 24 * 60, staleAfterMinutes: 8 * 24 * 60, alertCooldownMinutes: 24 * 60 },
  { name: "teacher-home-refresh", label: "Öğretmen ana sayfası yenileme", cadenceMinutes: 10, staleAfterMinutes: 20, alertCooldownMinutes: 30 },
  { name: "panel-session-retention", label: "Panel oturum saklama", cadenceMinutes: 24 * 60, staleAfterMinutes: 2 * 24 * 60, alertCooldownMinutes: 12 * 60 },
  { name: "rate-limit-prune", label: "Rate limit temizliği", cadenceMinutes: 24 * 60, staleAfterMinutes: 2 * 24 * 60, alertCooldownMinutes: 12 * 60 },
] as const;

export type CriticalCronName = (typeof CRITICAL_CRON_DEFINITIONS)[number]["name"];
export type CronHeartbeatSnapshot = {
  name: string;
  lastStartedAt: Date | null;
  lastSucceededAt: Date | null;
  lastFailedAt: Date | null;
  lastDurationMs: number | null;
  processedCount: number;
  failedCount: number;
  lastErrorCode: string | null;
  lastAlertedAt?: Date | null;
};

export type CronHealthStatus = "healthy" | "missing" | "failed" | "stale";

export function evaluateCronHeartbeats(rows: CronHeartbeatSnapshot[], now = new Date()) {
  const byName = new Map(rows.map((row) => [row.name, row]));
  const jobs = CRITICAL_CRON_DEFINITIONS.map((definition) => {
    const heartbeat = byName.get(definition.name);
    const successAgeMs = heartbeat?.lastSucceededAt ? Math.max(0, now.getTime() - heartbeat.lastSucceededAt.getTime()) : null;
    const failedSinceSuccess = Boolean(
      heartbeat?.lastFailedAt && (!heartbeat.lastSucceededAt || heartbeat.lastFailedAt > heartbeat.lastSucceededAt),
    );
    const status: CronHealthStatus = !heartbeat?.lastSucceededAt
      ? failedSinceSuccess ? "failed" : "missing"
      : failedSinceSuccess
        ? "failed"
        : successAgeMs! > definition.staleAfterMinutes * 60_000 ? "stale" : "healthy";
    return {
      ...definition,
      status,
      successAgeMs,
      lastStartedAt: heartbeat?.lastStartedAt?.toISOString() ?? null,
      lastSucceededAt: heartbeat?.lastSucceededAt?.toISOString() ?? null,
      lastFailedAt: heartbeat?.lastFailedAt?.toISOString() ?? null,
      lastDurationMs: heartbeat?.lastDurationMs ?? null,
      processedCount: heartbeat?.processedCount ?? 0,
      failedCount: heartbeat?.failedCount ?? 0,
      errorCode: heartbeat?.lastErrorCode ?? null,
      lastAlertedAt: heartbeat?.lastAlertedAt ?? null,
    };
  });
  return { ok: jobs.every((job) => job.status === "healthy"), jobs };
}

export function safeErrorCode(error: unknown) {
  const raw = error instanceof Error ? error.name : "UNKNOWN";
  return raw.replace(/[^A-Z0-9_]/gi, "_").toUpperCase().slice(0, 80) || "UNKNOWN";
}
