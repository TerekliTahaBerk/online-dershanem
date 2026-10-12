import { adminJson, requireAdminApi } from "@/lib/panel/admin-api";
import { loadAdminFeatures } from "@/lib/panel/admin-system-server";
export async function GET() {
  const auth = await requireAdminApi(); if (!auth.ok) return auth.response;
  return adminJson(await loadAdminFeatures());
}
