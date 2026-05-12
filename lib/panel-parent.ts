import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";

export async function requireParent() {
  const ctx = await requirePanelRole("veli");
  const parent = await prisma.parent.findFirst({
    where: { userId: ctx.userId },
    include: { students: { include: { student: true } } },
  });
  return { ctx, parent };
}

export async function getChildIds(parentId: string): Promise<string[]> {
  const links = await prisma.parentStudent.findMany({ where: { parentId }, select: { studentId: true } });
  return links.map((l) => l.studentId);
}
