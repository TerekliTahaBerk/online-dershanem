import "server-only";
import { prisma } from "@/lib/prisma";
import { emitAutomationEvent } from "@/lib/automation/engine";
import { buildEventId } from "@/lib/automation/safety";
import { formatIstanbulDateInput } from "@/lib/istanbul-time";

async function unitsWithTrigger(trigger: string) {
  const rows = await prisma.automationRule.findMany({
    where: { triggerType: trigger, isActive: true },
    select: { businessUnitId: true, businessUnit: { select: { product: true } } },
    distinct: ["businessUnitId"],
  });
  return rows.map((row) => ({ id: row.businessUnitId, product: row.businessUnit.product }));
}

/**
 * Zaman tabanlı tetikleyiciler. Yalnız ilgili trigger için aktif kuralı olan
 * birimlere yayınlanır; eventId gün+entity ile idempotent.
 */
export async function runAutomationScans(now = new Date()) {
  const day = formatIstanbulDateInput(now);
  let emitted = 0;

  const inviteUnits = await unitsWithTrigger("student_invite_pending");
  if (inviteUnits.length) {
    const pendingInvites = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        role: "STUDENT",
        inviteAcceptedAt: null,
        inviteSentAt: { not: null },
      },
      select: { id: true },
      take: 100,
    });
    for (const user of pendingInvites) {
      for (const unit of inviteUnits) {
        await emitAutomationEvent("student_invite_pending", {
          businessUnitId: unit.id,
          entityType: "user",
          entityId: user.id,
          product: unit.product,
          severity: "medium",
          href: "/panel/yonetim/operasyon",
          eventId: buildEventId({
            trigger: "student_invite_pending",
            entityType: "user",
            entityId: `${user.id}:${unit.id}`,
            bucket: day,
          }),
        });
        emitted++;
      }
    }
  }

  const overdueUnits = await unitsWithTrigger("intervention_overdue");
  if (overdueUnits.length) {
    const overdueCases = await prisma.interventionCase.findMany({
      where: {
        status: { in: ["OPEN", "IN_PROGRESS"] },
        dueAt: { lt: now },
      },
      select: { id: true, studentId: true, ownerId: true },
      take: 100,
    });
    for (const row of overdueCases) {
      for (const unit of overdueUnits) {
        await emitAutomationEvent("intervention_overdue", {
          businessUnitId: unit.id,
          entityType: "intervention",
          entityId: row.id,
          studentId: row.studentId,
          ownerId: row.ownerId,
          product: unit.product,
          severity: "high",
          href: "/panel/yonetim/mudahale",
          eventId: buildEventId({
            trigger: "intervention_overdue",
            entityType: "intervention",
            entityId: `${row.id}:${unit.id}`,
            bucket: day,
          }),
        });
        emitted++;
      }
    }
  }

  const assignmentUnits = await unitsWithTrigger("assignment_overdue");
  if (assignmentUnits.length) {
    const overdueAssignments = await prisma.assignmentProgress.findMany({
      where: {
        status: { not: "DONE" },
        assignment: { isActive: true, dueAt: { lt: now } },
      },
      select: { id: true, studentId: true },
      take: 100,
    });
    for (const row of overdueAssignments) {
      for (const unit of assignmentUnits) {
        await emitAutomationEvent("assignment_overdue", {
          businessUnitId: unit.id,
          entityType: "assignment",
          entityId: row.id,
          studentId: row.studentId,
          product: unit.product,
          severity: "medium",
          href: "/panel/yonetim/mudahale",
          eventId: buildEventId({
            trigger: "assignment_overdue",
            entityType: "assignment",
            entityId: `${row.id}:${unit.id}`,
            bucket: day,
          }),
        });
        emitted++;
      }
    }
  }

  return { emitted };
}
