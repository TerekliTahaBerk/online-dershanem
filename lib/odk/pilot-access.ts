import "server-only";

import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { odkPilotAccessDecision, odkRolloutDecision } from "@/lib/odk/pilot-rollout";

export async function checkOdkPilotAccess(userId: string, role: UserRole) {
  const rollout = odkRolloutDecision();
  if (role === "ADMIN" || rollout.mode !== "pilot") {
    return odkPilotAccessDecision({ role, activeMembership: false });
  }
  const activeMembership = await prisma.odkPilotMember.findFirst({ where: { userId, role, run: { status: "ACTIVE" } }, select: { userId: true } }).then(Boolean).catch(() => false);
  return odkPilotAccessDecision({ role, activeMembership });
}
