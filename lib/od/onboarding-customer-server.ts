import "server-only";
import { prisma } from "@/lib/prisma";
import { buildOdCustomerStart } from "./onboarding-customer";

/** Her okuma öğrenci hesabı veya velinin aktif akademik ilişkisiyle sınırlıdır. */
export async function getCustomerOdStart(input: { userId: string; role: "STUDENT" | "PARENT"; studentId?: string; now?: Date }) {
  if (input.role === "PARENT" && !input.studentId) return null;
  const onboarding = await prisma.odOnboarding.findFirst({
    where: { order: input.role === "STUDENT" ? { userId: input.userId }
      : { user: { studentProfile: { id: input.studentId, parents: { some: { parentId: input.userId, active: true, endedAt: null, canViewAcademic: true } } } } } },
    orderBy: { createdAt: "desc" },
    select: { state: true, order: { select: {
      buyerInfo: true,
      payments: { where: { status: "SUCCEEDED" }, orderBy: { paidAt: "asc" }, take: 1, select: { paidAt: true } },
      user: { select: { studentProfile: { select: { enrollments: {
        where: { endedAt: null, group: { isActive: true } },
        select: { group: { select: { lessons: { where: { status: "PLANNED", startsAt: { gte: input.now ?? new Date() } }, orderBy: { startsAt: "asc" }, take: 1, select: { startsAt: true } } } } },
      } } } } },
    } } },
  });
  if (!onboarding) return null;
  const firstLessonAt = onboarding.order.user?.studentProfile?.enrollments
    .flatMap((enrollment) => enrollment.group.lessons.map((lesson) => lesson.startsAt))
    .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  return buildOdCustomerStart({ state: onboarding.state, role: input.role, paidAt: onboarding.order.payments[0]?.paidAt ?? null, firstLessonAt, buyerInfo: onboarding.order.buyerInfo, now: input.now });
}
