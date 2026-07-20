import "server-only";

import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pilotAccessDecision } from "@/lib/pilot-rollout";

export async function checkPilotAccess(userId: string, role: UserRole) {
  if (role === "ADMIN" || (process.env.PANEL_PILOT_KILL_SWITCH !== "true" && process.env.PANEL_ROLLOUT_MODE?.trim().toLowerCase() !== "pilot")) {
    return pilotAccessDecision({ role, activeMembership: false });
  }
  if (process.env.PANEL_PILOT_KILL_SWITCH === "true") return pilotAccessDecision({ role, activeMembership: false });
  const activeMembership = await prisma.pilotCohortMember.findFirst({ where: { userId, role, cohort: { status: "ACTIVE" } }, select: { userId: true } }).then(Boolean).catch(() => false);
  return pilotAccessDecision({ role, activeMembership });
}
