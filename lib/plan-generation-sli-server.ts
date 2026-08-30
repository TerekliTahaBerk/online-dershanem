import "server-only";

import { prisma } from "@/lib/prisma";
import { reportOperationalAlert } from "@/lib/error-capture";
import { log } from "@/lib/logger";
import { evaluatePlanGenerationSli, PLAN_GENERATION_SLI_WINDOW_MINUTES } from "@/lib/plan-generation-sli";

const JOB_NAME = "domain-sli";
const ALERT_COOLDOWN_MS = 30 * 60_000;

export async function getPlanGenerationSliSnapshot(now = new Date()) {
  const windowStart = new Date(now.getTime() - PLAN_GENERATION_SLI_WINDOW_MINUTES * 60_000);
  const rows = await prisma.productEvent.findMany({
    where: { name: "plan_generation_finished", occurredAt: { gte: windowStart, lte: now } },
    orderBy: { occurredAt: "asc" },
    select: { name: true, properties: true },
  });
  return evaluatePlanGenerationSli(rows);
}

export async function alertOnPlanGenerationSli(snapshot: Awaited<ReturnType<typeof getPlanGenerationSliSnapshot>>) {
  if (snapshot.status !== "breached") {
    await prisma.cronHeartbeat.updateMany({ where: { name: JOB_NAME }, data: { lastAlertedAt: null } });
    return false;
  }

  const claimed = await prisma.cronHeartbeat.updateMany({
    where: {
      name: JOB_NAME,
      OR: [{ lastAlertedAt: null }, { lastAlertedAt: { lt: new Date(Date.now() - ALERT_COOLDOWN_MS) } }],
    },
    data: { lastAlertedAt: new Date() },
  });
  if (!claimed.count) return false;

  const summary = `Haftalık plan üretim hata oranı son 15 dakikada %${snapshot.errorRate}`;
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true }, take: 100 });
  if (admins.length) {
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: "SYSTEM" as const,
        title: "Haftalık plan üretim alarmı",
        body: `${summary}. Eşik: >%${snapshot.errorRateThreshold}; ${snapshot.systemErrors}/${snapshot.eligibleRequests} uygun istek başarısız.`,
        href: "/panel/yonetim/raporlar",
      })),
    });
  }
  await reportOperationalAlert({
    event: "business_sli.plan_generation.breached",
    severity: "critical",
    summary,
    context: snapshot,
  });
  log.error("business_sli.plan_generation.breached", new Error("PLAN_GENERATION_ERROR_RATE_BREACHED"), { ...snapshot });
  return true;
}
