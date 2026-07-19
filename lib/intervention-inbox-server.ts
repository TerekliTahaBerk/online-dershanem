import "server-only";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

function countBand(count: number): "0" | "1-5" | "6-20" | "21+" {
  return count === 0 ? "0" : count <= 5 ? "1-5" : count <= 20 ? "6-20" : "21+";
}

export async function getInterventionInbox(input: { role: Extract<UserRole, "ADMIN" | "TEACHER">; userId: string }) {
  const now = new Date();
  const cases = await prisma.interventionCase.findMany({
    where: input.role === "TEACHER" ? { student: { enrollments: { some: { endedAt: null, group: { isActive: true, teacherId: input.userId } } } } } : {},
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      student: { include: { user: { select: { fullName: true, email: true } } } },
      owner: { select: { id: true, fullName: true, email: true, role: true } },
      activities: { orderBy: { createdAt: "desc" }, take: 5, include: { actor: { select: { fullName: true, email: true } } } },
    },
  });
  const active = cases.filter((row) => !["RESOLVED", "FALSE_POSITIVE"].includes(row.status));
  const overdue = active.filter((row) => row.status !== "SNOOZED" && row.dueAt < now);
  await recordPanelProductEvent({ name: "case_opened", properties: { actorRole: input.role, openCountBand: countBand(active.length), overdueCountBand: countBand(overdue.length) } }, input.role);
  return cases.map((row) => ({
    id: row.id,
    studentName: row.student.user.fullName || row.student.user.email,
    reasonCode: row.reasonCode,
    explanation: row.explanation,
    suggestedAction: row.suggestedAction,
    evidenceCount: row.evidenceCount,
    dueAt: row.dueAt.toISOString(),
    status: row.status,
    ownerName: row.owner ? row.owner.fullName || row.owner.email : null,
    canAct: input.role === "ADMIN" || !row.ownerId || row.ownerId === input.userId,
    firstActionAt: row.firstActionAt?.toISOString() || null,
    snoozedUntil: row.snoozedUntil?.toISOString() || null,
    outcomeCode: row.outcomeCode,
    version: row.version,
    activities: row.activities.map((activity) => ({ id: activity.id, type: activity.type, note: activity.note, outcomeCode: activity.outcomeCode, falsePositiveReason: activity.falsePositiveReason, actorName: activity.actor ? activity.actor.fullName || activity.actor.email : "Sistem", createdAt: activity.createdAt.toISOString() })),
  }));
}
