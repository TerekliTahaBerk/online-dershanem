import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";

export async function requireTeacher() {
  const ctx = await requirePanelRole("ogretmen");
  const teacher = await prisma.teacher.findFirst({ where: { userId: ctx.userId } });
  return { ctx, teacher };
}
