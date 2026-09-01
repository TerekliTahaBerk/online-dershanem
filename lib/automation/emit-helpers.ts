import "server-only";
import { prisma } from "@/lib/prisma";
import { emitAutomationEvent, type AutomationEventContext } from "@/lib/automation/engine";
import type { AutomationTrigger } from "@/lib/automation/definitions";
import { buildEventId } from "@/lib/automation/safety";

/** Eğitim olayları için aktif kuralı olan birimlere güvenli yayın. */
export async function emitEducationAutomation(
  trigger: AutomationTrigger,
  context: Omit<AutomationEventContext, "businessUnitId"> & { product?: string | null },
) {
  const rules = await prisma.automationRule.findMany({
    where: { triggerType: trigger, isActive: true },
    select: { businessUnitId: true, businessUnit: { select: { product: true } } },
    distinct: ["businessUnitId"],
  });
  if (!rules.length) return;

  for (const rule of rules) {
    const product = context.product ?? rule.businessUnit.product;
    await emitAutomationEvent(trigger, {
      ...context,
      businessUnitId: rule.businessUnitId,
      product,
      eventId:
        context.eventId ||
        buildEventId({
          trigger,
          entityType: context.entityType,
          entityId: `${context.entityId}:${rule.businessUnitId}`,
        }),
    });
  }
}
