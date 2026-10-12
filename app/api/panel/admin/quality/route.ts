import { adminJson, requireAdminApi } from "@/lib/panel/admin-api";
import { loadAdminQualityProjection } from "@/lib/panel/admin-system-server";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
export async function GET() {
  const auth = await requireAdminApi(); if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().cohortQuality) return adminJson({ error: "Bu bölüm şu anda açık değil." }, { status: 404 });
  return adminJson(await loadAdminQualityProjection());
}
