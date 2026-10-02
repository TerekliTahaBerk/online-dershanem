import { prisma } from "@/lib/prisma";
import { runJob } from "@/lib/jobs/runner";
import { filterNotificationRows, queuePanelNotificationEmails, type NotificationRow } from "@/lib/panel-notifications";
import { addIstanbulCalendarDays, formatIstanbulDateInput, istanbulDayStart, ISTANBUL_TIME_ZONE } from "@/lib/istanbul-time";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { listRecentOverdueAssignments, OVERDUE_COOLDOWN_DAYS, OVERDUE_GIVE_UP_DAYS } from "@/lib/panel-reminders-server";
import { isOpenTaskStatus } from "@/lib/kocum";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DATE = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeZone: ISTANBUL_TIME_ZONE,
});

/** Gecikmiş plan görevi hatırlatmasının başlığı — soğuma süresi buna bakar. */
const PLAN_OVERDUE_TITLE = "Geciken plan görevi";

/**
 * Bu kadar gün geciken görev için bildirim üretilmez. Süresi geçmiş bir
 * görevi her gün hatırlatmak öğrenciyi bildirime karşı körleştirir; bu
 * noktadan sonrası koçun yeniden planlama işidir.
 */
const PLAN_OVERDUE_GIVE_UP_DAYS = OVERDUE_GIVE_UP_DAYS;
const ASSIGNMENT_OVERDUE_TITLE = "Geciken çalışma hatırlatması";

export async function GET(request: Request) {
  return runJob("panel-reminders", request, async () => {
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    /*
     * PLAN GÖREVİ HATIRLATMASI İÇİN AYRI SOĞUMA SÜRESİ (§20).
     *
     * Tekilleştirme (userId + başlık + gövde) 24 saatlikti ve gövde sabit
     * kaldığı için gecikmiş bir plan görevi HER GÜN yeni bildirim üretiyordu:
     * iki hafta açık kalan tek bir görev öğrenciye 14 bildirim gönderiyordu.
     * Gecikmiş görev hatırlatması 3 günde bir tekrarlar ve
     * `PLAN_OVERDUE_GIVE_UP_DAYS` sonrasında tamamen susar — o noktada
     * yapılacak iş bildirim değil, koçun görevi yeniden planlamasıdır.
     */
    const planOverdueSince = new Date(now.getTime() - OVERDUE_COOLDOWN_DAYS * 86_400_000);
    const overdue = await listRecentOverdueAssignments(now);
    // Veli gecikmeleri yalnız mevcut, onaylanıp yayımlanan haftalık özette görür.
    const rawRows: NotificationRow[] = overdue.map((item) => ({
      userId: item.student.userId, type: "ASSIGNMENT", title: ASSIGNMENT_OVERDUE_TITLE,
      body: `${item.assignment.title} · son tarih ${DATE.format(item.assignment.dueAt)}. Uygun bir küçük adımla devam edebilirsin.`,
      href: "/panel/ogrenci/odevler",
    }));

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
          const overdueDays = Math.floor(
            (todayStart.getTime() - istanbulDayStart(task.scheduledFor).getTime()) / 86400000,
          );
          if (overdueDays > PLAN_OVERDUE_GIVE_UP_DAYS) continue;
          planOverdueCount += 1;
          const body = `${task.title} · planlanan ${DATE.format(task.scheduledFor)}`;
          rawRows.push({
            userId: student.userId,
            type: "SYSTEM",
            title: PLAN_OVERDUE_TITLE,
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
    // En uzun soğuma süresi kadar geriye bakılır; her satır kendi penceresine
    // göre ayrıca süzülür.
    const cooldownFor = (row: { title: string }) =>
      (row.title === PLAN_OVERDUE_TITLE || row.title === ASSIGNMENT_OVERDUE_TITLE) ? planOverdueSince : since;
    const lookbackFrom = planOverdueSince < since ? planOverdueSince : since;
    const recent = deduped.length
      ? await prisma.notification.findMany({
          where: {
            createdAt: { gte: lookbackFrom },
            OR: deduped.map((row) => ({ userId: row.userId, title: row.title, body: row.body })),
          },
          select: { userId: true, title: true, body: true, createdAt: true },
        })
      : [];
    const freshRows = deduped.filter((row) => {
      const cutoff = cooldownFor(row);
      return !recent.some(
        (seen) =>
          seen.userId === row.userId &&
          seen.title === row.title &&
          seen.body === row.body &&
          seen.createdAt >= cutoff,
      );
    });

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
