import "server-only";

import { prisma } from "@/lib/prisma";
import { getStudentCoaching, type CoachingSnapshot } from "@/lib/panel/coaching";
import { getStudentGoals, type GoalView } from "@/lib/panel/goals";
import { addIstanbulCalendarDays, formatIstanbulDateInput, istanbulWeekStart } from "@/lib/istanbul-time";
import { buildParentKocumSummary, buildWeeklyKocumMetrics, type ParentKocumSummary } from "@/lib/kocum";
import { loadUpcomingCoachingSessions } from "@/lib/kocum/student-coaching-server";
import type { ParentChild } from "@/lib/panel/parent-product-policy";

/**
 * VELİ · YÖN KOÇLUK yükleyicisi — web `app/panel/veli/kocluk` ve mobil
 * `GET /api/panel/parent/coaching` aynı fonksiyonu kullanır.
 *
 * YALNIZ YAYINLANMIŞ / VELİYE AÇIK:
 *  - Plan: `status = APPROVED` VE Yön Koçluk (`productRef.code = "OK"`).
 *    M6 öncesi web sorgusunda ürün süzgeci yoktu; öğrencinin veli-free
 *    (KPSS) onaylı planı "Bu hafta" altında görünebilirdi. Ana sayfa
 *    (`loadParentCalmHome`) zaten OK süzgeci kullanıyordu; burada hizalandı.
 *  - Görev alanları daraltılmış: öğrenci notu, enerji / zorluk girdisi yok.
 *  - Koç özeti: yalnız `PUBLISHED`. Notlar: yalnız `PARENT_VISIBLE`
 *    (INTERNAL / STUDENT_VISIBLE sorguya girmez).
 *  - Koç oturumu: `privateNote` seçilmez (`getStudentCoaching`).
 */
export type ParentCoachingWeek = { start: Date; end: Date; summary: ParentKocumSummary };

export type ParentCoachingView = {
  coaching: CoachingSnapshot | null;
  week: ParentCoachingWeek | null;
  notes: Array<{ id: string; body: string; createdAt: Date }>;
  goals: GoalView[];
};

export async function loadParentCoaching(child: ParentChild, now = new Date()): Promise<ParentCoachingView> {
  const [plan, coaching, publishedSummary, goals, notes] = await Promise.all([
    prisma.weeklyPlan.findFirst({
      where: { studentId: child.id, status: "APPROVED", productRef: { code: "OK" } },
      orderBy: { weekStart: "desc" },
      select: {
        weekStart: true,
        tasks: {
          select: {
            id: true,
            status: true,
            scheduledFor: true,
            durationMinutes: true,
            actualMinutes: true,
            targetType: true,
            targetValue: true,
            actualQuestions: true,
            subject: true,
          },
        },
      },
    }),
    getStudentCoaching(child.id),
    prisma.weeklyCoachSummary.findFirst({
      where: { studentId: child.id, status: "PUBLISHED" },
      orderBy: { weekStart: "desc" },
      select: { planCompletionPct: true, strengths: true, focusAreas: true, nextWeekFocus: true, parentVisibleText: true },
    }),
    getStudentGoals(child.id),
    prisma.coachNote.findMany({
      where: { studentId: child.id, visibility: "PARENT_VISIBLE" },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, body: true, createdAt: true },
    }),
  ]);

  if (!plan) return { coaching, week: null, notes, goals };

  const start = istanbulWeekStart(plan.weekStart);
  const end = addIstanbulCalendarDays(start, 6);
  const metrics = buildWeeklyKocumMetrics(plan.tasks, formatIstanbulDateInput(now), formatIstanbulDateInput);
  const primaryGoal = goals.find((goal) => goal.percent != null) ?? goals[0] ?? null;
  const summary = buildParentKocumSummary({
    planCompletionPct: publishedSummary?.planCompletionPct ?? metrics.planCompletionPct,
    completedMinutes: metrics.completedMinutes,
    plannedMinutes: metrics.plannedMinutes,
    overdueCount: metrics.taskOverdue,
    previousOverdueCount: null,
    goalLabel: primaryGoal?.label ?? null,
    goalPercent: primaryGoal?.percent ?? null,
    publishedParentText: publishedSummary?.parentVisibleText ?? null,
    strengths: publishedSummary?.strengths ?? null,
    focusAreas: publishedSummary?.focusAreas ?? null,
    nextWeekFocus: publishedSummary?.nextWeekFocus ?? coaching?.focus ?? null,
  });
  return { coaching, week: { start, end, summary }, notes, goals };
}

/**
 * Yaklaşan görüşmeler — SALT OKUNUR projeksiyon. Mevcut kapsam
 * (`coachingAssignmentScope`, veli için aktif + `canViewAcademic` bağlantı)
 * aynen kullanılır. Katılım bağlantısı (`meetingUrl`) ve talep nedeni
 * döndürülmez; mobil görüşme mutasyonu sunmaz (web devam yolu).
 */
export async function loadParentCoachingSessions(parentUserId: string, child: ParentChild) {
  const sessions = await loadUpcomingCoachingSessions({ userId: parentUserId, role: "PARENT" }, child.id);
  return (sessions ?? []).map((session) => ({
    id: session.id,
    scheduledAt: session.scheduledAt,
    rescheduleRequested: Boolean(session.rescheduleRequestedAt),
    proposedAt: session.proposedAt,
  }));
}
