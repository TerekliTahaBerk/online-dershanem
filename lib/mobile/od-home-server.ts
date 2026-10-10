import "server-only";

import type { UserRole } from "@prisma/client";

import { istanbulWeekStart } from "@/lib/istanbul-time";
import type { MobileOdHome, MobileOdWeek } from "@/lib/mobile-contracts/student";
import { buildOdHome } from "@/lib/mobile/od-home";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { buildStudentHomeActionPlan } from "@/lib/panel/student-home-actions";
import { getStudentHomeData } from "@/lib/panel/student-home-server";
import { prisma } from "@/lib/prisma";
import { loadStudentProgressInsight } from "@/lib/progress-insights/server";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * "Bu hafta" — yalnız OD verisi, uydurma sayı yok. Hafta İstanbul takvimiyle
 * pazartesi başlar (`istanbulWeekStart`). Kapsam web Çalışmalar / Dersler
 * sayfalarıyla aynı: AKTİF kayıtlı grupların aktif ödevleri ve iptal
 * edilmemiş dersleri.
 */
export async function loadOdWeekSummary(input: { studentProfileId: string; now: Date; lessonsRemainingToday: number }): Promise<MobileOdWeek> {
  const flags = getPanelFeatureFlags();
  const weekStart = istanbulWeekStart(input.now);
  const weekEnd = new Date(weekStart.getTime() + WEEK_MS);
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: input.studentProfileId, endedAt: null },
    select: { groupId: true },
  });
  const groupIds = enrollments.map((row) => row.groupId);

  const [lessonsPlanned, assignments, dueReviews] = await Promise.all([
    groupIds.length
      ? prisma.lesson.count({ where: { groupId: { in: groupIds }, status: { not: "CANCELLED" }, startsAt: { gte: weekStart, lt: weekEnd } } })
      : Promise.resolve(0),
    groupIds.length
      ? prisma.assignment.findMany({
          where: { isActive: true, groupId: { in: groupIds } },
          select: { dueAt: true, progress: { where: { studentId: input.studentProfileId }, select: { status: true }, take: 1 } },
        })
      : Promise.resolve([]),
    flags.reviewQueue
      ? prisma.reviewItem.count({ where: { studentId: input.studentProfileId, status: "ACTIVE", dueAt: { lte: input.now } } })
      : Promise.resolve(null),
  ]);

  const done = (row: (typeof assignments)[number]) => row.progress[0]?.status === "DONE";
  const dueThisWeek = assignments.filter((row) => row.dueAt >= weekStart && row.dueAt < weekEnd);
  const pending = assignments.filter((row) => !done(row));
  return {
    weekStart: weekStart.toISOString(),
    lessonsPlanned,
    lessonsRemainingToday: input.lessonsRemainingToday,
    assignmentsDue: dueThisWeek.length,
    assignmentsCompleted: dueThisWeek.filter(done).length,
    pendingAssignments: pending.length,
    overdueAssignments: pending.filter((row) => row.dueAt < input.now).length,
    dueReviews,
  };
}

/**
 * `GET /api/panel/student/home?scope=OD`. Çağıran OD erişimini
 * (`requireApiOdRole("STUDENT")`) ÖNCEDEN doğrulamış olmalıdır.
 */
export async function loadOdHome(input: { userId: string; role: UserRole; fullName: string | null; now?: Date }): Promise<MobileOdHome> {
  const now = input.now ?? new Date();
  const flags = getPanelFeatureFlags();
  const data = await getStudentHomeData({ userId: input.userId, role: input.role, now, scope: "OD" });
  if (!data.profile || !data.products.includes("OD")) {
    return buildOdHome({ now, fullName: input.fullName, hasProfile: false, nowAction: null, actions: [], feed: [], week: null, insight: null });
  }

  const plan = buildStudentHomeActionPlan({ now, productData: data.productData, products: ["OD"] });
  const lessonsRemainingToday = (data.productData.OD?.todayLessons ?? []).filter((lesson) => lesson.startsAt > now).length;

  const [week, bundle] = await Promise.all([
    loadOdWeekSummary({ studentProfileId: data.profile.id, now, lessonsRemainingToday }),
    flags.progressInsights
      ? loadStudentProgressInsight({ studentProfileId: data.profile.id, audience: "student", includeExams: true, now })
      : Promise.resolve(null),
  ]);
  const sentence = bundle?.narrative.find((line) => line.trim().length > 0) ?? null;

  return buildOdHome({
    now,
    fullName: input.fullName,
    hasProfile: true,
    nowAction: plan.nowAction,
    actions: plan.allActions,
    feed: data.unifiedToday?.items ?? [],
    week,
    insight: bundle && sentence ? { sentence, isEmpty: bundle.isEmpty } : null,
  });
}
