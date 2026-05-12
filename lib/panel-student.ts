import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";

export async function requireStudent() {
  const ctx = await requirePanelRole("ogrenci");
  const student = await prisma.student.findFirst({ where: { userId: ctx.userId } });
  return { ctx, student };
}
