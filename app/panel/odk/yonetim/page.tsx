import { requireAnyStaffPermission } from "@/lib/auth/guards";
import { OdkStaffHome } from "@/components/odk/odk-staff-home";
import { getOdkPilotReadiness } from "@/lib/odk/pilot-readiness-server";
import { prisma } from "@/lib/prisma";
import { ODK_EXAM_LIST_PERMISSIONS, ODK_STAFF_MODULES } from "@/lib/products/staff-permission-matrix";
import { loadStaffHome, loadStaffViewer } from "./staff-data";

export const dynamic = "force-dynamic";

/** Pilot hazırlık kartı yalnız ADMIN içindir (platform eylemi). */
async function pilotBlockedCount() {
  const pilotRun = await prisma.odkPilotRun.findFirst({
    where: { status: { in: ["ACTIVE", "DRAFT", "PAUSED"] } },
    orderBy: { updatedAt: "desc" },
    select: { startedAt: true, members: { select: { role: true, userId: true } } },
  });
  const readiness = await getOdkPilotReadiness(pilotRun?.members || [{ role: "ADMIN" }], pilotRun?.startedAt);
  return readiness.checks.filter((check) => check.status === "BLOCK").length;
}

/**
 * Deneme Ligi personel ana sayfası (§11.8): ADMIN ve personel aynı bileşeni
 * görür; bloklar izinle filtrelenir. URL "en az bir Deneme Ligi personel izni"
 * demektir, global rol tek başına yetmez.
 */
export default async function OdkAdminHomePage() {
  const session = await requireAnyStaffPermission([
    ...ODK_STAFF_MODULES.map((entry) => entry.permission),
    ...ODK_EXAM_LIST_PERMISSIONS,
  ]);
  const viewer = await loadStaffViewer(session.userId);
  const [data, pilotBlocked] = await Promise.all([
    loadStaffHome(viewer.permissions),
    viewer.isAdmin ? pilotBlockedCount() : Promise.resolve(null),
  ]);
  return <OdkStaffHome session={session} permissions={viewer.permissions} data={data} pilotBlocked={pilotBlocked} />;
}
