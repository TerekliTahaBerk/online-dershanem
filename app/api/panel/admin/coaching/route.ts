import { adminJson, requireAdminApi } from "@/lib/panel/admin-api";
import { adminCoachingProjection } from "@/lib/panel/admin-coaching-projection";
export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  return adminJson(await adminCoachingProjection());
}
