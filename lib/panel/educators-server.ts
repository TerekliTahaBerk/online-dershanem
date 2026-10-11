import "server-only";

import { prisma } from "@/lib/prisma";

/** Öğretmenler ve grup doluluğu (`/panel/yonetim/egitmenler`); web ve mobil aynı sorgu. */
export async function loadEducators() {
  return prisma.user.findMany({
    where: { role: "TEACHER" },
    orderBy: [{ status: "asc" }, { fullName: "asc" }],
    select: {
      id: true,
      fullName: true,
      email: true,
      status: true,
      teacherProfile: { select: { subjects: true } },
      taughtGroups: {
        where: { isActive: true },
        select: {
          level: true,
          capacity: true,
          _count: { select: { enrollments: true } },
        },
      },
    },
  });

}

export type Educator = Awaited<ReturnType<typeof loadEducators>>[number];
