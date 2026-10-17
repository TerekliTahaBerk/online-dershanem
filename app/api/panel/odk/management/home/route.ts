import { requireApiProductRole } from "@/lib/auth/api-guards";
import { loadOdkManagementHome } from "@/lib/odk/management-read-server";
import { loadStaffViewer } from "@/lib/odk/staff-management-data";
import { ODK_STAFF_MODULES, ODK_EXAM_LIST_PERMISSIONS } from "@/lib/products/staff-permission-matrix";
import { staffJson, PRIVATE_NO_STORE } from "@/lib/panel/staff-api";
import { NextResponse } from "next/server";
export async function GET() {
  const auth = await requireApiProductRole("ODK", "ADMIN", "TEACHER"); if (!auth.ok) return auth.response;
  const viewer = await loadStaffViewer(auth.session.userId);
  if (![...ODK_STAFF_MODULES.map((m) => m.permission), ...ODK_EXAM_LIST_PERMISSIONS].some((p) => viewer.permissions.has(p))) return NextResponse.json({ error: "Bu işlem için yetkiniz bulunmuyor." }, { status: 403, headers: PRIVATE_NO_STORE });
  return staffJson(await loadOdkManagementHome(auth.session.userId));
}
