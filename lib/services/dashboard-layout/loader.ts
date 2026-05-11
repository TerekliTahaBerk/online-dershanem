import "server-only";
import type { DashboardPanelKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  reconcileLayout,
  defaultLayout,
  type DashboardLayoutData,
} from "./types";

/**
 * Kullanıcının belirli panel için layout'unu yükler.
 * Kayıt yoksa varsayılanı döner. Katalog ile reconcile edilmiştir.
 */
export async function loadDashboardLayout(
  panel: DashboardPanelKey,
  userId: string | undefined,
): Promise<DashboardLayoutData> {
  if (!userId) return defaultLayout(panel);
  const row = await prisma.dashboardLayout.findUnique({
    where: { userId_panel: { userId, panel } },
    select: { layout: true },
  });
  return reconcileLayout(panel, (row?.layout as DashboardLayoutData) ?? null);
}
