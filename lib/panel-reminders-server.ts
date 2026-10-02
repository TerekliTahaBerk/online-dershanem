import "server-only";
import { prisma } from "@/lib/prisma";
export const OVERDUE_GIVE_UP_DAYS = 14;
export const OVERDUE_COOLDOWN_DAYS = 3;
export async function listRecentOverdueAssignments(now: Date) {
  let cursor: string | undefined;
  const rows = [];
  for (;;) {
    const page = await prisma.assignmentProgress.findMany({
      where: { status: { not: "DONE" }, student: { user: { status: "ACTIVE" } }, assignment: { isActive: true, dueAt: { lt: now, gte: new Date(now.getTime() - OVERDUE_GIVE_UP_DAYS * 86_400_000) } } },
      take: 250, orderBy: { id: "asc" }, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { assignment: { select: { title: true, dueAt: true } }, student: { select: { userId: true } } },
    });
    rows.push(...page);
    if (page.length < 250) return rows;
    cursor = page[page.length - 1].id;
  }
}
