import "server-only";

import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculatePanelSloReport } from "@/lib/panel-slo";
import { calculatePilotReadiness } from "@/lib/pilot-rollout";

export async function getPilotReadiness(roles: UserRole[]) {
  const since = new Date(Date.now() - 30 * 86400000);
  const events = await prisma.productEvent.findMany({ where: { occurredAt: { gte: since } }, select: { name: true, properties: true, occurredAt: true } });
  return calculatePilotReadiness({ roles, sloMetrics: calculatePanelSloReport(events) });
}
