import "server-only";
import { prisma } from "@/lib/prisma";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { planningWeekStart } from "@/lib/adaptive-plan";
import { addIstanbulCalendarDays, formatIstanbulDateInput } from "@/lib/istanbul-time";
import { coachingOverdue } from "@/lib/coaching";
import { getManagementKocumSignals } from "@/lib/kocum/server";

/** Web ve mobil yönetim aynı koçluk kuyruklarını ve gecikme kurallarını okur. */
export async function loadAdminCoaching() {
  const adaptivePlanEnabled = getPanelFeatureFlags().adaptivePlan;
  const thisWeekStart = planningWeekStart();
  const thisWeekEnd = addIstanbulCalendarDays(thisWeekStart, 7);

  const [
    assignments,
    coaches,
    unassigned,
    recentSessions,
    studentsWithoutPlan,
    studentsWithoutGoals,
    kocumSignals,
  ] = await Promise.all([
    prisma.coachAssignment.findMany({
      where: { endedAt: null },
      select: {
        id: true,
        coachId: true,
        cadenceDays: true,
        student: {
          select: {
            id: true,
            user: { select: { fullName: true, email: true } },
          },
        },
        coach: {
          select: {
            id: true,
            coachCapacity: true,
            user: { select: { fullName: true, email: true } },
          },
        },
        sessions: {
          orderBy: { scheduledAt: "desc" },
          select: { id: true, status: true, scheduledAt: true, completedAt: true, focus: true },
        },
      },
    }),
    prisma.teacherProfile.findMany({
      where: { isCoach: true },
      select: {
        id: true,
        coachCapacity: true,
        user: { select: { fullName: true, email: true, status: true, role: true } },
        _count: { select: { coachAssignments: { where: { endedAt: null } } } },
      },
      orderBy: { user: { fullName: "asc" } },
    }),
    // Koçluk ürünü olan ama aktif koçu olmayan öğrenciler.
    prisma.studentProfile.findMany({
      where: {
        coachAssignments: { none: { endedAt: null } },
        user: {
          status: "ACTIVE",
          productMemberships: {
            some: {
              product: "OK",
              revokedAt: null,
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          },
        },
      },
      select: { id: true, user: { select: { fullName: true, email: true } } },
      orderBy: { user: { fullName: "asc" } },
    }),
    prisma.coachingSession.findMany({
      where: { status: "COMPLETED", assignment: { endedAt: null } },
      orderBy: { completedAt: "desc" },
      take: 8,
      select: {
        id: true,
        completedAt: true,
        focus: true,
        assignment: {
          select: {
            student: {
              select: {
                id: true,
                user: { select: { fullName: true, email: true } },
              },
            },
            coach: {
              select: { user: { select: { fullName: true, email: true } } },
            },
          },
        },
      },
    }),
    prisma.coachAssignment.findMany({
      where: {
        endedAt: null,
        student: {
          weeklyPlans: {
            none: {
              weekStart: { gte: thisWeekStart, lt: thisWeekEnd },
              status: { in: ["DRAFT", "APPROVED", "CHANGE_REQUESTED"] },
            },
          },
        },
      },
      orderBy: { student: { user: { fullName: "asc" } } },
      select: {
        id: true,
        student: {
          select: {
            id: true,
            user: { select: { fullName: true, email: true } },
          },
        },
        coach: {
          select: { user: { select: { fullName: true, email: true } } },
        },
      },
    }),
    prisma.coachAssignment.findMany({
      where: {
        endedAt: null,
        student: { goals: { none: { archivedAt: null } } },
      },
      orderBy: { student: { user: { fullName: "asc" } } },
      select: {
        id: true,
        student: {
          select: {
            id: true,
            user: { select: { fullName: true, email: true } },
          },
        },
        coach: {
          select: { user: { select: { fullName: true, email: true } } },
        },
      },
    }),
    getManagementKocumSignals(),
  ]);

  const rows = assignments.map((a) => {
    const lastCompleted =
      a.sessions.filter((s) => s.status === "COMPLETED")[0]?.completedAt ??
      null;
    const next =
      a.sessions
        .filter((s) => s.status === "PLANNED")
        .sort((x, y) => x.scheduledAt.getTime() - y.scheduledAt.getTime())[0]
        ?.scheduledAt ?? null;
    const { overdue, overdueDays } = coachingOverdue(
      lastCompleted,
      next,
      a.cadenceDays,
    );
    return {
      id: a.id,
      studentId: a.student.id,
      studentName: a.student.user.fullName || a.student.user.email,
      coachName: a.coach.user.fullName || a.coach.user.email,
      lastCompleted,
      next,
      overdue,
      overdueDays,
    };
  });

  const overCapacity = coaches.filter(
    (c) =>
      c.coachCapacity !== null && c._count.coachAssignments > c.coachCapacity,
  );
  const overdueRows = rows.filter((r) => r.overdue);

  /* Müdahale listesi: önce koçsuzlar, sonra gecikenler. */
  const interventions = [
    ...unassigned.map((s) => ({
      key: `u-${s.id}`,
      studentId: s.id,
      studentName: s.user.fullName || s.user.email,
      coachName: null as string | null,
      when: null as Date | null,
      issue: "Yön Koçluk üyesi · koç atanmadı",
      tone: "warn" as const,
    })),
    ...overdueRows.map((r) => ({
      key: `o-${r.id}`,
      studentId: r.studentId,
      studentName: r.studentName,
      coachName: r.coachName,
      when: r.next ?? r.lastCompleted,
      issue:
        r.overdueDays !== null
          ? `Görüşme ${r.overdueDays} gün gecikti`
          : "Görüşme gecikti",
      tone: "warn" as const,
    })),
  ];

  // Koç dizini: bugünkü ve geciken görüşme sayıları (aktif atamalardan).
  const todayKey = formatIstanbulDateInput(new Date());
  const coachStats = new Map<string, { today: number; overdue: number }>();
  for (const assignment of assignments) {
    const entry = coachStats.get(assignment.coach.id) ?? { today: 0, overdue: 0 };
    entry.today += assignment.sessions.filter(
      (item) => item.status === "PLANNED" && formatIstanbulDateInput(item.scheduledAt) === todayKey,
    ).length;
    coachStats.set(assignment.coach.id, entry);
  }
  for (const row of overdueRows) {
    const coachId = assignments.find((item) => item.id === row.id)?.coach.id;
    if (!coachId) continue;
    const entry = coachStats.get(coachId) ?? { today: 0, overdue: 0 };
    entry.overdue += 1;
    coachStats.set(coachId, entry);
  }

  return { adaptivePlanEnabled, assignments, coaches, unassigned, recentSessions, studentsWithoutPlan, studentsWithoutGoals, kocumSignals, rows, overCapacity, overdueRows, interventions, coachStats };
}
