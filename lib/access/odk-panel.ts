import { requirePanelSession } from "@/lib/panel-access";
import type { PanelRole, EffectiveRole } from "@/lib/panel-access";
import { getUserAccessFlags } from "@/lib/access/odk";
import { redirect } from "next/navigation";

/**
 * ODK alt-panelleri için combined guard:
 *  - Panel session zorunlu (yoksa /giris)
 *  - Effective role beklenen segmentle uyuşmalı (ADMIN her zaman geçer)
 *  - ODK access tagı zorunlu (ADMIN için bypass)
 *
 * Dönen değer: `EffectiveRole & { hasOdkAccess: true }` — sayfa içinde tekrar
 * session/role çekme ihtiyacını ortadan kaldırır.
 */
export async function requireOdkPanel(
  segment: PanelRole,
): Promise<EffectiveRole & {
  userId: string;
  email: string;
  name: string | null;
  hasOD: boolean;
  hasODK: boolean;
}> {
  const ctx = await requirePanelSession();
  // Admin her zaman istediği segmente girebilir (view-as akışı).
  if (ctx.actualRole !== "ADMIN" && ctx.segment !== segment) {
    redirect(`/panel/${ctx.segment}`);
  }
  const flags = await getUserAccessFlags(ctx.userId, ctx.actualRole);
  if (!flags.hasODK && ctx.actualRole !== "ADMIN") {
    redirect(`/odk-paketleri?from=panel`);
  }
  return { ...ctx, hasOD: flags.hasOD, hasODK: flags.hasODK };
}
