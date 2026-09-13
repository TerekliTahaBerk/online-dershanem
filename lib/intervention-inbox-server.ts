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
  const grouped = new Map<string, typeof cases>();
  for (const row of cases) {
    const bucket = grouped.get(row.studentId) || [];
    bucket.push(row);
    grouped.set(row.studentId, bucket);
  }
  return Array.from(grouped.values()).map((rows) => {
    const head = rows[0];
    return {
      id: `${head.studentId}:${head.reasonCode}`,
      studentName: head.student.user.fullName || head.student.user.email,
      reasonCode: head.reasonCode,
      explanation: rows.map((row) => row.explanation).join(" · "),
      suggestedAction: rows.map((row) => row.suggestedAction).join(" · "),
      evidenceCount: rows.reduce((sum, row) => sum + row.evidenceCount, 0),
      dueAt: rows.reduce((latest, row) => (row.dueAt > latest ? row.dueAt : latest), rows[0].dueAt).toISOString(),
      status: rows[0].status,
      ownerName: head.owner ? head.owner.fullName || head.owner.email : null,
      canAct: input.role === "ADMIN" || !head.ownerId || head.ownerId === input.userId,
      firstActionAt: head.firstActionAt?.toISOString() || null,
      snoozedUntil: head.snoozedUntil?.toISOString() || null,
      outcomeCode: head.outcomeCode,
      version: Math.max(...rows.map((row) => row.version)),
      activities: rows.flatMap((row) => row.activities).map((activity) => ({ id: activity.id, type: activity.type, note: activity.note, outcomeCode: activity.outcomeCode, falsePositiveReason: activity.falsePositiveReason, actorName: activity.actor ? activity.actor.fullName || activity.actor.email : "Sistem", createdAt: activity.createdAt.toISOString() })),
    };
  });
}
