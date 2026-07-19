import "server-only";

import type { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import { panelEventSchema, type PanelEventInput } from "@/lib/panel-events";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";

/** Validation and persistence are non-throwing so telemetry never breaks a workflow. */
export async function recordPanelProductEvent(event: PanelEventInput, role: UserRole): Promise<void> {
  if (!getPanelFeatureFlags().baselineMetrics) return;
  const parsed = panelEventSchema.safeParse(event);
  if (!parsed.success) {
    log.warn("product.event_rejected_by_server", { eventName: event.name, role });
    return;
  }
  try {
    await prisma.productEvent.create({
      data: {
        name: parsed.data.name,
        role,
        properties: parsed.data.properties as Prisma.InputJsonValue,
      },
    });
    log.info(`product.${parsed.data.name}`, { role, ...parsed.data.properties });
  } catch (error) {
    log.warn("product.event_persist_failed", { eventName: parsed.data.name, role }, error);
  }
}
