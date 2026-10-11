import "server-only";

import { prisma } from "@/lib/prisma";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";

/** Web ve mobil eğitim yönetiminin ortak veri yükleyicisi. */
export async function loadEducationManagement(userId: string) {
  const featureFlags = getPanelFeatureFlags();
  const [
    teachersRaw,
    studentsRaw,
    parentsRaw,
    groupsRaw,
    lessons,
    assignments,
    materials,
    outcomes,
  ] = await Promise.all([
    prisma.user.findMany({
      where: { role: "TEACHER", status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, email: true },
    }),
    prisma.studentProfile.findMany({
      where: { user: { status: "ACTIVE" } },
      orderBy: { user: { fullName: "asc" } },
      include: { user: { select: { fullName: true, email: true } } },
    }),
    prisma.user.findMany({
      where: { role: "PARENT", status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, email: true },
    }),
    prisma.group.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
        enrollments: {
          where: { endedAt: null },
          include: {
            student: {
              include: { user: { select: { fullName: true, email: true } } },
            },
          },
        },
      },
    }),
    prisma.lesson.findMany({
      where: { startsAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      orderBy: { startsAt: "asc" },
      take: 24,
      include: {
        group: { select: { name: true } },
        teacher: { select: { fullName: true, email: true } },
      },
    }),
    prisma.assignment.findMany({
      orderBy: { dueAt: "desc" },
      take: 40,
      include: {
        group: { select: { name: true } },
        progress: true,
        outcomeLinks: { include: { outcome: { select: { code: true } } } },
      },
    }),
    prisma.learningMaterial.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      include: { group: { select: { name: true } } },
    }),
    featureFlags.learningOutcomes
      ? prisma.learningOutcome.findMany({
          where: {
            isActive: true,
            unit: { subject: { version: { status: "ACTIVE" } } },
          },
          orderBy: [
            { favorites: { _count: "desc" } },
            { assignments: { _count: "desc" } },
            { updatedAt: "desc" },
            { code: "asc" },
          ],
          take: 15,
          include: {
            unit: { include: { subject: true } },
            skills: { include: { skill: true } },
            favorites: { where: { userId: userId } },
            assignments: { where: { linkedById: userId }, take: 1 },
          },
        })
      : Promise.resolve([]),
  ]);

  return { featureFlags, teachersRaw, studentsRaw, parentsRaw, groupsRaw, lessons, assignments, materials, outcomes };
}
