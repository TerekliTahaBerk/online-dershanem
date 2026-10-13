import "server-only";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOdkPilotReadiness } from "./pilot-readiness-server";
import { operationDigest } from "@/lib/panel/group-mutation-core";
export async function loadOdkPilotWorkspace(db: PrismaClient = prisma) {
  const now = new Date();
  const [candidates, runs] = await Promise.all([
    db.user.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { role: { in: ["ADMIN", "TEACHER"] } },
          {
            productMemberships: {
              some: {
                product: "ODK",
                startsAt: { lte: now },
                revokedAt: null,
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
              },
            },
          },
        ],
      },
      select: { id: true, role: true, fullName: true, email: true },
      orderBy: [{ role: "asc" }, { fullName: "asc" }, { email: "asc" }],
    }),
    db.odkPilotRun.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 20,
      include: { members: { orderBy: { userId: "asc" }, select: { role: true, userId: true } } },
    }),
  ]);
  const readinessRun = runs.find((run) => run.status === "ACTIVE") || runs[0];
  const readiness = await getOdkPilotReadiness(
    readinessRun?.members || [{ role: "ADMIN" as const }],
    readinessRun?.startedAt, db,
  );
  return { candidates, runs, readiness, revision: operationDigest({ candidates, runs }) };
}
