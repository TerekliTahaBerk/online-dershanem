import { prisma } from "@/lib/prisma";
import { runJob } from "@/lib/jobs/runner";
import { filterNotificationRows, queuePanelNotificationEmails, type NotificationRow } from "@/lib/panel-notifications";
import { addIstanbulCalendarDays, formatIstanbulDateInput, istanbulDayStart, ISTANBUL_TIME_ZONE } from "@/lib/istanbul-time";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { isOpenTaskStatus } from "@/lib/kocum";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DATE = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeZone: ISTANBUL_TIME_ZONE,
});

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
      const body = `${item.assignment.title} · son tarih ${DATE.format(item.assignment.dueAt)}`;
      return [
        { userId: item.student.userId, type: "ASSIGNMENT", title: "Geciken çalışma hatırlatması", body, href: "/panel/ogrenci/odevler" },
        ...item.student.parents.map((link) => ({
          userId: link.parentId,
          type: "ASSIGNMENT" as const,
          title: "Ödev süresi geçti",
          body,
          href: `/panel/veli/takip?studentId=${item.student.id}`,
        })),
      ];
    });

    let planOverdueCount = 0;
    let upcomingCount = 0;
    if (getPanelFeatureFlags().adaptivePlan) {
      const todayStart = istanbulDayStart(now);
      const tomorrowEnd = addIstanbulCalendarDays(todayStart, 2);
      const todayKey = formatIstanbulDateInput(now);

      const planTasks = await prisma.weeklyPlanTask.findMany({
        where: {
          plan: { status: "APPROVED" },
          status: { in: ["PLANNED", "IN_PROGRESS"] },
          scheduledFor: { lt: tomorrowEnd },
        },
        take: 400,
        orderBy: { scheduledFor: "asc" },
        select: {
          id: true,
          title: true,
          status: true,
          scheduledFor: true,
          plan: {
            select: {
              student: {
                select: {
                  id: true,
                  userId: true,
                  parents: { select: { parentId: true } },
                },
              },
            },
          },
        },
      });

      for (const task of planTasks) {
        if (!isOpenTaskStatus(task.status)) continue;
        const key = formatIstanbulDateInput(task.scheduledFor);
        const student = task.plan.student;
        if (key < todayKey) {
          planOverdueCount += 1;
          const body = `${task.title} · planlanan ${DATE.format(task.scheduledFor)}`;
          rawRows.push({
            userId: student.userId,
            type: "SYSTEM",
            title: "Geciken plan görevi",
            body,
            href: "/panel/ogrenci/plan",
          });
        } else if (key === todayKey || key === formatIstanbulDateInput(addIstanbulCalendarDays(todayStart, 1))) {
          upcomingCount += 1;
          const body = `${task.title} · ${DATE.format(task.scheduledFor)}`;
          rawRows.push({
            userId: student.userId,
            type: "SYSTEM",
            title: "Yaklaşan plan görevi",
            body,
            href: "/panel/ogrenci/plan",
          });
        }
      }
    }

    const deduped = [...new Map(rawRows.map((row) => [`${row.userId}:${row.title}:${row.body}`, row])).values()];
    const recent = deduped.length
      ? await prisma.notification.findMany({
          where: {
            createdAt: { gte: since },
            OR: deduped.map((row) => ({ userId: row.userId, title: row.title, body: row.body })),
          },
          select: { userId: true, title: true, body: true },
        })
      : [];
    const recentKeys = new Set(recent.map((row) => `${row.userId}:${row.title}:${row.body}`));
    const freshRows = deduped.filter((row) => !recentKeys.has(`${row.userId}:${row.title}:${row.body}`));

    const assignmentRows = freshRows.filter((row) => row.type === "ASSIGNMENT");
    const planRows = freshRows.filter((row) => row.type === "SYSTEM");

    const inAppAssignment = await filterNotificationRows(assignmentRows, "assignment");
    // Plan görev hatırlatmaları haftalık özet tercihine saygı gösterir.
    const inAppPlan = await filterNotificationRows(planRows, "weeklyDigest");
    const inAppRows = [...inAppAssignment, ...inAppPlan];

    if (inAppRows.length) await prisma.notification.createMany({ data: inAppRows });
    await queuePanelNotificationEmails(assignmentRows, "assignment");
    await queuePanelNotificationEmails(planRows, "weeklyDigest");

    return {
      overdue: overdue.length,
      planOverdue: planOverdueCount,
      upcomingPlan: upcomingCount,
      notifications: inAppRows.length,
      emailCandidates: freshRows.length,
    };
  }, { metrics: (result) => ({ processedCount: result.overdue + result.planOverdue }) });
}
