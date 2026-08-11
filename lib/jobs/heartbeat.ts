import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { reportOperationalAlert } from "@/lib/error-capture";
import { log } from "@/lib/logger";
import { CRITICAL_CRON_DEFINITIONS, safeErrorCode, type CriticalCronName } from "./health";

export type CronRunMetrics = { processedCount?: number; failedCount?: number };

export async function startCronRun(name: CriticalCronName) {
  const runId = randomUUID();
  const startedAt = new Date();
  await prisma.cronHeartbeat.upsert({
    where: { name },
    create: { name, lastRunId: runId, lastStartedAt: startedAt },
    update: { lastRunId: runId, lastStartedAt: startedAt },
  });
  return { runId, startedAt };
}

export async function succeedCronRun(name: CriticalCronName, runId: string, startedAt: Date, metrics: CronRunMetrics) {
  const completedAt = new Date();
  await prisma.cronHeartbeat.updateMany({
    where: { name, lastRunId: runId },
    data: {
      lastSucceededAt: completedAt,
      lastDurationMs: Math.max(0, completedAt.getTime() - startedAt.getTime()),
      processedCount: Math.max(0, metrics.processedCount ?? 0),
      failedCount: Math.max(0, metrics.failedCount ?? 0),
      lastErrorCode: null,
    },
  });
}

export async function failCronRun(name: CriticalCronName, runId: string, startedAt: Date, error: unknown) {
  const failedAt = new Date();
  const errorCode = safeErrorCode(error);
  const updated = await prisma.cronHeartbeat.updateMany({
    where: { name, lastRunId: runId },
    data: {
      lastFailedAt: failedAt,
      lastDurationMs: Math.max(0, failedAt.getTime() - startedAt.getTime()),
      processedCount: 0,
      failedCount: 1,
      lastErrorCode: errorCode,
    },
  });
  if (updated.count) await notifyCronIncident(name, "failed", errorCode);
}

export async function notifyCronIncident(name: CriticalCronName, status: "failed" | "stale" | "missing", errorCode?: string | null) {
  const definition = CRITICAL_CRON_DEFINITIONS.find((item) => item.name === name)!;
  const alertBefore = new Date(Date.now() - definition.alertCooldownMinutes * 60_000);
  try {
    const claimed = await prisma.cronHeartbeat.updateMany({
      where: { name, OR: [{ lastAlertedAt: null }, { lastAlertedAt: { lt: alertBefore } }] },
      data: { lastAlertedAt: new Date() },
    });
    if (!claimed.count) return;

    const summary = `${definition.label}: ${status}`;
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", status: "ACTIVE" },
      select: { id: true },
      take: 100,
    });
    if (admins.length) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: "SYSTEM" as const,
          title: "Kritik cron alarmı",
          body: `${definition.label} işi ${status === "failed" ? "başarısız" : status === "stale" ? "gecikmiş" : "henüz başarı kanıtı üretmedi"}.`,
          href: "/panel/yonetim/isler#cron-durumu",
        })),
      });
    }
    await reportOperationalAlert({
      event: "cron.heartbeat.alert",
      severity: name === "odk-exam-lifecycle" ? "critical" : "warning",
      summary,
      context: { job: name, status, errorCode: errorCode ?? undefined },
    });
    log.warn("cron.heartbeat.alert", { job: name, status, errorCode: errorCode ?? undefined });
  } catch (error) {
    log.error("cron.heartbeat.alert_failed", error, { job: name, status });
  }
}
