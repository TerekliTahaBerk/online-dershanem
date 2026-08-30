import "server-only";

import { prisma } from "@/lib/prisma";
import { buildActionableDinoInsight } from "@/lib/dino-actionable-insight";
import { istanbulDayStart, istanbulNextDayStart } from "@/lib/istanbul-time";

export type ActionableDinoInsight = {
  insight: string;
  basis: string;
  action: { label: string; href: string };
};

/** Çağıran, studentId kapsamını oturum veya parent-scope üzerinden çözmüş olmalıdır. */
export async function getActionableDinoInsight(input: {
  studentId: string;
  audience: "STUDENT" | "PARENT";
  now?: Date;
}): Promise<ActionableDinoInsight | null> {
  const now = input.now ?? new Date();
  const dayStart = istanbulDayStart(now);
  const dayEnd = istanbulNextDayStart(now);
  const evidenceCutoff = new Date(now.getTime() - 30 * 86_400_000);

  const [planTasks, reviews, evidence] = await Promise.all([
    prisma.weeklyPlanTask.findMany({
      where: {
        plan: { studentId: input.studentId, status: { in: ["DRAFT", "APPROVED", "CHANGE_REQUESTED"] } },
        status: "PLANNED",
        scheduledFor: { gte: dayStart, lt: dayEnd },
        sourceType: { in: ["REVIEW", "WEAK_OUTCOME"] },
      },
      orderBy: [{ score: "desc" }, { position: "asc" }],
      take: 10,
      select: { title: true, durationMinutes: true, sourceType: true, sourceReferenceId: true },
    }),
    prisma.reviewItem.findMany({
      where: { studentId: input.studentId, status: "ACTIVE" },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 20,
      select: {
        id: true, outcomeId: true, title: true, sourceType: true, dueAt: true,
        attempts: { orderBy: { reviewedAt: "desc" }, take: 1, select: { response: true } },
      },
    }),
    prisma.lessonOutcome.findMany({
      where: {
        evidenceType: "NEEDS_REVIEW",
        createdAt: { gte: evidenceCutoff },
        lesson: { status: "COMPLETED", group: { enrollments: { some: { studentId: input.studentId, endedAt: null } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { outcomeId: true, createdAt: true, outcome: { select: { title: true } } },
    }),
  ]);

  const draft = buildActionableDinoInsight({
    now,
    planTasks: planTasks.map((task) => ({ ...task, sourceType: task.sourceType as "REVIEW" | "WEAK_OUTCOME" })),
    reviews: reviews.map((review) => ({ ...review, latestResponse: review.attempts[0]?.response || null })),
    evidence: evidence.map((item) => ({ outcomeId: item.outcomeId, title: item.outcome.title, createdAt: item.createdAt })),
  });
  if (!draft) return null;

  const selected = encodeURIComponent(input.studentId);
  const href = input.audience === "STUDENT"
    ? draft.target === "PLAN" ? "/panel/ogrenci/plan" : "/panel/ogrenci/tekrar"
    : draft.target === "PLAN" ? `/panel/veli/kocluk?studentId=${selected}` : `/panel/veli/takip?studentId=${selected}`;
  return {
    insight: draft.insight,
    basis: draft.basis,
    action: {
      label: input.audience === "PARENT" ? "Takibi aç" : draft.target === "PLAN" ? "Görevi aç" : "Tekrarı aç",
      href,
    },
  };
}
