import "server-only";

import type { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import { panelEventSchema, type PanelEventInput } from "@/lib/panel-events";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { getSession } from "@/lib/auth/session";
import { getResolvedAdminPreview } from "@/lib/auth/admin-preview";

/** Validation and persistence are non-throwing so telemetry never breaks a workflow. */
export async function recordPanelProductEvent(event: PanelEventInput, role: UserRole): Promise<void> {
  if (!getPanelFeatureFlags().baselineMetrics) return;

  // Admin preview gerçek kullanıcı metriklerine karışmamalı.
  if (event.name !== "admin_preview_page_viewed") {
    const actor = await getSession().catch(() => null);
    if (actor?.role === "ADMIN") {
      const preview = await getResolvedAdminPreview(actor).catch(() => null);
      if (preview) {
        const remapped: PanelEventInput = {
          name: "admin_preview_page_viewed",
          properties: {
            previewRole: preview.context.previewRole,
            pathBand: `REMAPPED:${event.name}`.slice(0, 40),
          },
        };
        return recordPanelProductEvent(remapped, "ADMIN");
      }
    }
  }

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
