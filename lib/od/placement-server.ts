import "server-only";
import { prisma } from "@/lib/prisma";
import { buildOdPlacementExpectation } from "@/lib/od/placement";

export async function getOdPlacementExpectation(category?: string | null) {
  const groups = await prisma.group.findMany({
    where: {
      isActive: true,
      subject: { contains: "Matematik", mode: "insensitive" },
    },
    select: {
      level: true,
      capacity: true,
      enrollments: { where: { endedAt: null }, select: { id: true } },
      lessons: { where: { status: "PLANNED", startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 1, select: { startsAt: true } },
    },
  });
  const normalizedCategory = category?.trim().toLocaleUpperCase("tr-TR");
  const matching = groups.filter((group) => {
    if (!normalizedCategory) return true;
    const level = (group.level || "").toLocaleUpperCase("tr-TR");
    if (normalizedCategory === "LGS") return level.includes("LGS") || /(^|\D)8(\D|$)/.test(level);
    if (["YKS", "TYT", "AYT"].includes(normalizedCategory)) return ["YKS", "TYT", "AYT", "MEZUN", "9", "10", "11", "12"].some((token) => level.includes(token));
    return false;
  });
  return buildOdPlacementExpectation(matching.map((group) => ({
    capacity: group.capacity,
    enrollmentCount: group.enrollments.length,
    nextLessonAt: group.lessons[0]?.startsAt ?? null,
  })));
}
