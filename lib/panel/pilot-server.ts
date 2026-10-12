import "server-only";

import { prisma } from "@/lib/prisma";
import { getPilotReadiness } from "@/lib/pilot-readiness-server";

/**
 * KONTROLLÜ YAYIN (PİLOT) verisi (`/panel/yonetim/pilot`): aktif gruplar
 * (öğrenci / veli sayısıyla), son 20 kohort ve yayın hazırlık kapıları. Web
 * sayfası ve mobil yönetim ucu (`/api/panel/admin/pilot`) AYNI yükleyiciyi
 * kullanır (sayfadan taşındı).
 */
export async function loadPilotPage() {
  const [groups, cohorts] = await Promise.all([
    prisma.group.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        teacher: { select: { fullName: true, email: true } },
        enrollments: {
          where: { endedAt: null },
          select: {
            student: { select: { parents: { select: { parentId: true } } } },
          },
        },
      },
    }),
    prisma.pilotCohort.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { members: { select: { role: true } } },
    }),
  ]);
  const readinessRoles = cohorts
    .find((cohort) => cohort.status === "ACTIVE")
    ?.members.map((member) => member.role) ||
    cohorts[0]?.members.map((member) => member.role) || ["ADMIN" as const];
  const readiness = await getPilotReadiness(readinessRoles);
  return { groups, cohorts, readiness };
}

export type PilotPage = Awaited<ReturnType<typeof loadPilotPage>>;
