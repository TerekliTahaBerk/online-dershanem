import { prisma } from "@/lib/prisma";
import { runJob } from "@/lib/jobs/runner";
import { filterNotificationRows, queuePanelNotificationEmails, type NotificationRow } from "@/lib/panel-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  return runJob("panel-reminders", request, async () => {
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const overdue = await prisma.assignmentProgress.findMany({
      where: { status: { not: "DONE" }, assignment: { isActive: true, dueAt: { lt: now } } },
      take: 250,
      orderBy: { assignment: { dueAt: "asc" } },
      include: {
        assignment: { select: { title: true, dueAt: true } },
        student: { select: { id: true, userId: true, parents: { select: { parentId: true } } } },
      },
    });

    const rawRows: NotificationRow[] = overdue.flatMap((item) => {
      const body = `${item.assignment.title} · son tarih ${new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "Europe/Istanbul" }).format(item.assignment.dueAt)}`;
      return [
        { userId: item.student.userId, type: "ASSIGNMENT", title: "Geciken çalışma hatırlatması", body, href: "/panel/ogrenci/odevler" },
        ...item.student.parents.map((link) => ({ userId: link.parentId, type: "ASSIGNMENT" as const, title: "Ödev süresi geçti", body, href: `/panel/veli/takip?studentId=${item.student.id}` })),
      ];
    });
    const deduped = [...new Map(rawRows.map((row) => [`${row.userId}:${row.title}:${row.body}`, row])).values()];
    const recent = deduped.length ? await prisma.notification.findMany({
      where: {
        createdAt: { gte: since },
        OR: deduped.map((row) => ({ userId: row.userId, title: row.title, body: row.body })),
      },
      select: { userId: true, title: true, body: true },
    }) : [];
    const recentKeys = new Set(recent.map((row) => `${row.userId}:${row.title}:${row.body}`));
    const freshRows = deduped.filter((row) => !recentKeys.has(`${row.userId}:${row.title}:${row.body}`));
    const inAppRows = await filterNotificationRows(freshRows, "assignment");
    if (inAppRows.length) await prisma.notification.createMany({ data: inAppRows });
    await queuePanelNotificationEmails(freshRows, "assignment");

    return { overdue: overdue.length, notifications: inAppRows.length, emailCandidates: freshRows.length };
  }, { metrics: (result) => ({ processedCount: result.overdue }) });
}
