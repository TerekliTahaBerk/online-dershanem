import "server-only";

import { prisma } from "@/lib/prisma";
import {
  addIstanbulCalendarDays,
  formatIstanbulDateInput,
  istanbulWeekStart,
} from "@/lib/istanbul-time";
import {
  applyTemplateToWeek,
  buildAdaptiveSuggestionDrafts,
  buildRevisionChangeSummary,
  buildWeeklyKocumMetrics,
  parseTemplateTaskDefs,
  type AdaptiveSignal,
} from "@/lib/kocum";
import {
  lowCompletion,
  rankManagementSignals,
  type ManagementKocumSignal,
} from "@/lib/kocum/visibility";

export async function recordPlanRevision(input: {
  planId: string;
  version: number;
  changedById: string | null;
  changeSummary: string;
}) {
  const plan = await prisma.weeklyPlan.findUnique({
    where: { id: input.planId },
    include: {
      tasks: {
        orderBy: [{ scheduledFor: "asc" }, { position: "asc" }],
        select: {
          id: true,
          title: true,
          scheduledFor: true,
          status: true,
          durationMinutes: true,
        },
      },
    },
  });
  if (!plan) return null;

  return prisma.weeklyPlanRevision.create({
    data: {
      planId: plan.id,
      version: input.version,
      changedById: input.changedById,
      changeSummary: input.changeSummary,
      snapshot: {
        status: plan.status,
        capacityMinutes: plan.capacityMinutes,
        tasks: plan.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          scheduledFor: task.scheduledFor.toISOString(),
          status: task.status,
          durationMinutes: task.durationMinutes,
        })),
      },
    },
  });
}

export async function appendTimelineEvent(input: {
  studentId: string;
  kind:
    | "PLAN_PUBLISHED"
    | "PLAN_REVISED"
    | "PLAN_COMPLETION"
    | "TASK_OVERDUE"
    | "MOCK_EXAM_RESULT"
    | "GOAL_UPDATED"
    | "COACH_SUMMARY"
    | "CHECK_IN"
    | "OTHER";
  title: string;
  summary?: string;
  visibility?: "INTERNAL" | "STAFF" | "STUDENT" | "PARENT";
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
}) {
  return prisma.studentTimelineEvent.create({
    data: {
      studentId: input.studentId,
      kind: input.kind,
      title: input.title,
      summary: input.summary,
      visibility: input.visibility ?? "STAFF",
      metadata: (input.metadata as object | undefined) ?? undefined,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });
}

export async function applyTemplateToStudentWeek(input: {
  templateId: string;
  studentId: string;
  weekStart: Date;
  actorUserId: string;
  replaceExistingDraft?: boolean;
}) {
  const template = await prisma.weeklyPlanTemplate.findUnique({ where: { id: input.templateId } });
  if (!template) return { ok: false as const, error: "Şablon bulunamadı." };

  const weekStart = istanbulWeekStart(input.weekStart);
  const defs = parseTemplateTaskDefs(template.taskDefs);
  if (!defs.length) return { ok: false as const, error: "Şablon görev tanımı boş." };

  const applied = applyTemplateToWeek({
    weekStart,
    taskDefs: defs,
    addDays: addIstanbulCalendarDays,
  });

  const existing = await prisma.weeklyPlan.findUnique({
    where: { studentId_weekStart: { studentId: input.studentId, weekStart } },
  });

  if (existing && existing.status === "APPROVED" && !input.replaceExistingDraft) {
    return { ok: false as const, error: "Yayınlanmış plan üzerine şablon uygulanamaz. Önce taslak oluşturun." };
  }

  const plan = await prisma.$transaction(async (tx) => {
    const upserted = existing
      ? await tx.weeklyPlan.update({
          where: { id: existing.id },
          data: {
            status: "DRAFT",
            version: existing.version + 1,
            capacityMinutes: applied.reduce((sum, t) => sum + t.durationMinutes, 0),
            createdById: input.actorUserId,
            changeRequestCategory: null,
          },
        })
      : await tx.weeklyPlan.create({
          data: {
            studentId: input.studentId,
            weekStart,
            status: "DRAFT",
            capacityMinutes: applied.reduce((sum, t) => sum + t.durationMinutes, 0),
            createdById: input.actorUserId,
            ruleVersion: "kocum-template-v1",
          },
        });

    await tx.weeklyPlanTask.deleteMany({ where: { planId: upserted.id } });
    await tx.weeklyPlanTask.createMany({
      data: applied.map((task) => ({
        planId: upserted.id,
        scheduledFor: task.scheduledFor,
        position: task.position,
        title: task.title,
        description: task.description,
        subject: task.subject,
        topic: task.topic,
        taskKind: task.taskKind,
        scheduleMode: task.scheduleMode,
        durationMinutes: task.durationMinutes,
        targetType: task.targetType,
        targetValue: task.targetValue,
        priority: task.priority,
        sourceType: "TEMPLATE",
        reasonCode: "CAPACITY_BALANCE",
        status: "PLANNED",
      })),
    });

    return upserted;
  });

  await recordPlanRevision({
    planId: plan.id,
    version: plan.version,
    changedById: input.actorUserId,
    changeSummary: buildRevisionChangeSummary({
      previousVersion: Math.max(1, plan.version - 1),
      nextVersion: plan.version,
      actorLabel: `Şablon: ${template.title}`,
    }),
  });

  return { ok: true as const, planId: plan.id, version: plan.version };
}

export async function createAdaptiveSuggestionsForStudent(input: {
  studentId: string;
  weekStart: Date;
  signal: AdaptiveSignal;
}) {
  const drafts = buildAdaptiveSuggestionDrafts(input.signal);
  if (!drafts.length) return [];

  const created = [];
  for (const draft of drafts) {
    const row = await prisma.weeklyPlanSuggestion.create({
      data: {
        studentId: input.studentId,
        weekStart: input.weekStart,
        kind: draft.kind,
        title: draft.title,
        rationale: draft.rationale,
        payload: draft.payload as object,
        status: "PENDING",
        createdBySystem: true,
      },
    });
    created.push(row);
  }
  return created;
}

export async function getManagementKocumSignals(now = new Date()): Promise<ManagementKocumSignal[]> {
  const weekStart = istanbulWeekStart(now);
  const staleBefore = addIstanbulCalendarDays(now, -21);

  const okMembers = await prisma.productMembership.findMany({
    where: {
      product: "OK",
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      user: { role: "STUDENT", status: "ACTIVE" },
    },
    select: {
      user: {
        select: {
          fullName: true,
          email: true,
          studentProfile: {
            select: {
              id: true,
              coachAssignments: {
                where: { endedAt: null },
                select: {
                  id: true,
                  sessions: {
                    orderBy: { scheduledAt: "desc" },
                    take: 1,
                    select: { scheduledAt: true, completedAt: true, status: true },
                  },
                },
              },
              weeklyPlans: {
                where: { weekStart },
                take: 1,
                select: {
                  status: true,
                  tasks: {
                    select: {
                      status: true,
                      durationMinutes: true,
                      actualMinutes: true,
                      scheduledFor: true,
                      targetType: true,
                      targetValue: true,
                      actualQuestions: true,
                      subject: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    take: 500,
  });

  const signals: ManagementKocumSignal[] = [];
  for (const membership of okMembers) {
    const profile = membership.user.studentProfile;
    if (!profile) continue;
    const name = membership.user.fullName || membership.user.email;
    const coach = profile.coachAssignments[0];
    if (!coach) {
      signals.push({
        code: "NO_COACH",
        studentId: profile.id,
        studentName: name,
        detail: "Aktif koç ataması yok.",
      });
    } else {
      const last = coach.sessions[0];
      const lastAt = last?.completedAt || last?.scheduledAt || null;
      if (!lastAt || lastAt < staleBefore) {
        signals.push({
          code: "STALE_COACH_ACTIVITY",
          studentId: profile.id,
          studentName: name,
          detail: "Son 21 günde koçluk aktivitesi görünmüyor.",
        });
      }
    }

    const plan = profile.weeklyPlans[0];
    if (!plan) {
      signals.push({
        code: "NO_PLAN",
        studentId: profile.id,
        studentName: name,
        detail: "Bu hafta için plan kaydı yok.",
      });
    } else if (plan.status !== "APPROVED") {
      signals.push({
        code: "PLAN_UNPUBLISHED",
        studentId: profile.id,
        studentName: name,
        detail: `Plan durumu: ${plan.status}`,
      });
    } else {
      const metrics = buildWeeklyKocumMetrics(
        plan.tasks.map((t) => ({
          id: "x",
          status: t.status,
          scheduledFor: t.scheduledFor,
          durationMinutes: t.durationMinutes,
          actualMinutes: t.actualMinutes,
          targetType: t.targetType,
          targetValue: t.targetValue,
          actualQuestions: t.actualQuestions,
          subject: t.subject,
        })),
        formatIstanbulDateInput(now),
        formatIstanbulDateInput,
      );
      if (lowCompletion(metrics.planCompletionPct, 50)) {
        signals.push({
          code: "LOW_COMPLETION",
          studentId: profile.id,
          studentName: name,
          detail: `Plan uyumu %${metrics.planCompletionPct}`,
        });
      }
    }
  }

  return rankManagementSignals(signals);
}

/**
 * Hafta sonu / periyodik sinyal taraması.
 * Öneriler PENDING olarak yazılır; koç onayı olmadan göreve dönüşmez.
 */
export async function generateAdaptiveSuggestionsForActiveStudents(now = new Date()) {
  const weekStart = istanbulWeekStart(now);
  const nextWeekStart = addIstanbulCalendarDays(weekStart, 7);
  const todayKey = formatIstanbulDateInput(now);
  const lookback = addIstanbulCalendarDays(now, -14);

  const plans = await prisma.weeklyPlan.findMany({
    where: {
      weekStart,
      status: { in: ["APPROVED", "CHANGE_REQUESTED"] },
      student: {
        user: {
          status: "ACTIVE",
          productMemberships: {
            some: {
              product: "OK",
              revokedAt: null,
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
          },
        },
      },
    },
    select: {
      studentId: true,
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
    take: 200,
  });

  let created = 0;
  for (const plan of plans) {
    const pendingExists = await prisma.weeklyPlanSuggestion.findFirst({
      where: {
        studentId: plan.studentId,
        weekStart: nextWeekStart,
        status: "PENDING",
        createdBySystem: true,
      },
      select: { id: true },
    });
    if (pendingExists) continue;

    const metrics = buildWeeklyKocumMetrics(
      plan.tasks.map((t) => ({
        id: t.id,
        status: t.status,
        scheduledFor: t.scheduledFor,
        durationMinutes: t.durationMinutes,
        actualMinutes: t.actualMinutes,
        targetType: t.targetType,
        targetValue: t.targetValue,
        actualQuestions: t.actualQuestions,
        subject: t.subject,
      })),
      todayKey,
      formatIstanbulDateInput,
    );

    const [openReviewCount, openAssignmentCount, recentMock] = await Promise.all([
      prisma.reviewItem.count({
        where: { studentId: plan.studentId, status: "ACTIVE" },
      }),
      prisma.assignmentProgress.count({
        where: {
          studentId: plan.studentId,
          status: { not: "DONE" },
          assignment: { isActive: true },
        },
      }),
      prisma.mockExam.findMany({
        where: { studentId: plan.studentId, takenAt: { gte: lookback } },
        orderBy: { takenAt: "desc" },
        take: 2,
        select: {
          title: true,
          exam: true,
          sections: {
            where: { incorrectCount: { gt: 0 } },
            select: { subjectName: true, incorrectCount: true },
            take: 3,
          },
        },
      }),
    ]);

    const mockExamFollowups = recentMock.flatMap((exam) =>
      exam.sections.map((section) => ({
        title: `${exam.title || exam.exam} ${section.subjectName} yanlışlarını incele`,
        subject: section.subjectName,
      })),
    );

    const rows = await createAdaptiveSuggestionsForStudent({
      studentId: plan.studentId,
      weekStart: nextWeekStart,
      signal: {
        completionPct: metrics.planCompletionPct,
        overdueCount: metrics.taskOverdue,
        plannedMinutes: metrics.plannedMinutes,
        actualMinutes: metrics.completedMinutes,
        openReviewCount,
        openAssignmentCount,
        mockExamFollowups,
      },
    });
    created += rows.length;
  }

  return { scanned: plans.length, created };
}
