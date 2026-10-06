import { requireAnyStaffPermission } from "@/lib/auth/guards";
import { OdkHome } from "@/components/odk/odk-home";
import { OdkStaffHome } from "@/components/odk/odk-staff-home";
import { effectiveStaffPermissions } from "@/lib/products/staff-permissions";
import { ODK_EXAM_LIST_PERMISSIONS, ODK_STAFF_MODULES } from "@/lib/products/staff-permission-matrix";

export const dynamic = "force-dynamic";

/**
 * Deneme Ligi personel ana sayfası. ADMIN tam yönetim özetini görür; diğer
 * personel yalnız izinli modüllerin kutucuklarını. URL eskisiyle aynı ama artık
 * "UserRole ADMIN" değil "en az bir Deneme Ligi personel izni" demektir.
 */
export default async function OdkAdminHomePage() {
  const session = await requireAnyStaffPermission([
    ...ODK_STAFF_MODULES.map((entry) => entry.permission),
    ...ODK_EXAM_LIST_PERMISSIONS,
  ]);
  if (session.role === "ADMIN") return <OdkHome session={session} />;
  const { permissions } = await effectiveStaffPermissions(session.userId);
  return <OdkStaffHome session={session} permissions={permissions} />;
}
