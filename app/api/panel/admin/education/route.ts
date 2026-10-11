import { toMobileEducation } from "@/lib/mobile/admin-education-views";
import { adminJson, requireAdminApi } from "@/lib/panel/admin-api";
import { loadEducationManagement } from "@/lib/panel/education-management-server";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  return adminJson(toMobileEducation(await loadEducationManagement(auth.session.userId)));
}
