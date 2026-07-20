import "server-only";

import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { odkPilotAccessDecision, odkPilotMode } from "@/lib/odk/pilot-rollout";

export async function checkOdkPilotAccess(userId: string, role: UserRole) {
  if (role === "ADMIN" || (process.env.ODK_PILOT_KILL_SWITCH !== "true" && odkPilotMode() === "GENERAL")) {
    return odkPilotAccessDecision({ role, activeMembership: false });
  }
  if (process.env.ODK_PILOT_KILL_SWITCH === "true") return odkPilotAccessDecision({ role, activeMembership: false });
  const activeMembership = await prisma.odkPilotMember.findFirst({ where: { userId, role, run: { status: "ACTIVE" } }, select: { userId: true } }).then(Boolean).catch(() => false);
  return odkPilotAccessDecision({ role, activeMembership });
}
