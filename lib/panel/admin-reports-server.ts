import "server-only";

import { prisma } from "@/lib/prisma";
import { calculatePanelSloReport } from "@/lib/panel-slo";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { ADMIN_REPORT_RANGE_DAYS, buildAdminReports, type AdminReports } from "@/lib/panel/admin-reports";

/** Yönetim · Raporlar verisi (web sayfası ve mobil yönetim ucu aynı yükleyiciyi kullanır). */
export async function loadAdminReports(now: Date = new Date()): Promise<AdminReports> {
  const since = new Date(now.getTime() - ADMIN_REPORT_RANGE_DAYS * 86_400_000);
  const flags = getPanelFeatureFlags();
  const [lessons, groups, attendance, overdueAssignments, pendingPayments, productEvents, reviewItems, aiDrafts] = await Promise.all([
    prisma.lesson.findMany({
      where: { startsAt: { gte: since }, status: { not: "CANCELLED" } },
      select: { teacherId: true, status: true, teacher: { select: { id: true, fullName: true, email: true } } },
    }),
    prisma.group.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        enrollments: { where: { endedAt: null }, select: { id: true } },
        assignments: { where: { isActive: true }, select: { progress: { select: { status: true } } } },
      },
    }),
    prisma.attendance.findMany({ where: { createdAt: { gte: since } }, select: { status: true } }),
    prisma.assignment.count({ where: { isActive: true, dueAt: { lt: now }, progress: { some: { status: { not: "DONE" } } } } }),
    prisma.odOrder.count({ where: { status: "PENDING" } }),
    prisma.productEvent.findMany({ where: { occurredAt: { gte: since } }, select: { name: true, properties: true, occurredAt: true } }),
    flags.reviewQueue
      ? prisma.reviewItem.findMany({
          where: { createdAt: { gte: since } },
          select: { createdAt: true, attempts: { select: { reviewedAt: true, response: true, stageBefore: true } } },
        })
      : Promise.resolve([]),
    flags.teacherAiDrafts
      ? prisma.teacherAiDraft.findMany({ where: { createdAt: { gte: since } }, select: { status: true, provider: true, estimatedCostMicrousd: true } })
      : Promise.resolve([]),
  ]);
  return buildAdminReports({
    now,
    flags: { reviewQueue: flags.reviewQueue, adaptivePlan: flags.adaptivePlan, teacherAiDrafts: flags.teacherAiDrafts },
    lessons,
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      enrollmentCount: group.enrollments.length,
      activeAssignmentCount: group.assignments.length,
      progressStatuses: group.assignments.flatMap((assignment) => assignment.progress.map((row) => row.status)),
    })),
    attendanceStatuses: attendance.map((row) => row.status),
    overdueAssignments,
    pendingPayments,
    productEvents,
    sloMetrics: calculatePanelSloReport(productEvents),
    reviewItems,
    aiDrafts,
  });
}
