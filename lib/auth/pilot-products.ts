import "server-only";

import type { ProductCode, UserRole } from "@prisma/client";
import { pilotProgramForProduct } from "@/lib/auth/product-pilot";
import { checkOdkPilotAccess } from "@/lib/odk/pilot-access";
import { odkRolloutDecision } from "@/lib/odk/pilot-rollout";
import { checkPilotAccess } from "@/lib/pilot-access";
import { pilotRolloutMode } from "@/lib/pilot-rollout";

/** Genel yayında pilot kapısı kimseyi elemez; DB'ye hiç gitmeden kısa devre. */
export function anyPilotGateActive(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.PANEL_PILOT_KILL_SWITCH === "true"
    || pilotRolloutMode(env) !== "GENERAL"
    || odkRolloutDecision(env).mode !== "general";
}

/**
 * Ürün bağımsız yüzeyler (birleşik ana sayfa) ürün verisini toplarken pilotu
 * kapalı ürünleri de göstermemeli: duraklatılan pilotun üyesi o ürünün
 * verisine ana sayfadan da ulaşamaz.
 */
export async function filterPilotAllowedProducts(
  userId: string,
  role: UserRole,
  products: readonly ProductCode[],
): Promise<ProductCode[]> {
  if (role === "ADMIN" || !anyPilotGateActive()) return [...products];
  const decisions = await Promise.all(products.map(async (product) => {
    const program = pilotProgramForProduct(product);
    const decision = program === "odk" ? await checkOdkPilotAccess(userId, role) : await checkPilotAccess(userId, role);
    return decision.allowed;
  }));
  return products.filter((_, index) => decisions[index]);
}
