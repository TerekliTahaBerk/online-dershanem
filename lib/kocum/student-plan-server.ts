import "server-only";

import { prisma } from "@/lib/prisma";
import { getStudentCoaching } from "@/lib/panel/coaching";
import { addIstanbulCalendarDays } from "@/lib/istanbul-time";
import { getPlanProductByCode } from "@/lib/kocum/plan-product";

/**
 * Öğrenci haftalık planı (Planım) — okuma tarafı TEK yerde.
 * `app/panel/ogrenci/plan/page.tsx` ve `GET /api/panel/student/plan` aynı
 * fonksiyonu çağırır: aynı plan, aynı görevler, aynı tercih ve aynı onay
 * politikası (`getPlanProductByCode`).
 *
 * Deneme Ligi sınavları (`upcomingExams`) yalnız web görünümü için ve
 * yalnız istenirse okunur; Yön görev tamamlamasına hiçbir şekilde girmez.
 */
export async function loadStudentPlan(input: {
  userId: string;
  productCode: string;
  includeUpcomingOdkExams?: boolean;
  now?: Date;
}) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: input.userId },
    include: { planPreference: true },
  });
  if (!profile) return null;

  const now = input.now ?? new Date();
  const plan = await prisma.weeklyPlan.findFirst({
    where: { studentId: profile.id },
    orderBy: { weekStart: "desc" },
    include: {
      tasks: { orderBy: [{ scheduledFor: "asc" }, { position: "asc" }] },
      productRef: { select: { code: true } },
    },
  });

  const [coaching, coachSummary, upcomingExams, planProduct] = await Promise.all([
    getStudentCoaching(profile.id),
    prisma.weeklyCoachSummary.findFirst({
      where: { studentId: profile.id, status: "PUBLISHED" },
      orderBy: { weekStart: "desc" },
      select: {
        studentVisibleText: true,
        strengths: true,
        focusAreas: true,
        nextWeekFocus: true,
        weekStart: true,
      },
    }),
    input.includeUpcomingOdkExams
      ? prisma.odkExam.findMany({
          where: {
            status: { in: ["SCHEDULED", "LIVE"] },
            startsAt: { gte: now, lte: addIstanbulCalendarDays(now, 14) },
            assignments: { some: { studentUserId: input.userId, isActive: true, revokedAt: null } },
          },
          orderBy: { startsAt: "asc" },
          take: 3,
          select: { id: true, title: true, startsAt: true },
        })
      : Promise.resolve([] as Array<{ id: string; title: string; startsAt: Date | null }>),
    /*
     * Onay politikası PLANIN ürününden okunur; plan henüz yoksa sayfanın
     * girildiği ürün kodundan.
     */
    getPlanProductByCode(plan ? plan.productRef.code : input.productCode),
  ]);

  return { profile, plan, coaching, coachSummary, upcomingExams, planProduct };
}

export type StudentPlanData = NonNullable<Awaited<ReturnType<typeof loadStudentPlan>>>;
