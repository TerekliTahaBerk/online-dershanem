import "server-only";
import { prisma } from "@/lib/prisma";
import { loadStaffHome, loadStaffViewer } from "./staff-management-data";
import { getOdkPilotReadiness } from "./pilot-readiness-server";
import { parseOdkPackagePolicy } from "./product-contract";
import { ODK_STAFF_MODULES } from "@/lib/products/staff-permission-matrix";

export async function loadOdkPilotBlockedCount() {
  const run = await prisma.odkPilotRun.findFirst({ where: { status: { in: ["ACTIVE", "DRAFT", "PAUSED"] } }, orderBy: { updatedAt: "desc" }, select: { startedAt: true, members: { select: { role: true, userId: true } } } });
  const readiness = await getOdkPilotReadiness(run?.members || [{ role: "ADMIN" }], run?.startedAt);
  return readiness.checks.filter((c) => c.status === "BLOCK").length;
}
export async function loadOdkManagementHome(userId: string) {
  const viewer = await loadStaffViewer(userId);
  const [data, pilotBlocked] = await Promise.all([loadStaffHome(viewer.permissions), viewer.isAdmin ? loadOdkPilotBlockedCount() : Promise.resolve(null)]);
  return { contractVersion: 1 as const, ...data, awaitingReleaseCount: viewer.permissions.has("odk:result:score") || viewer.permissions.has("odk:result:release") ? data.awaitingReleaseCount : null, pilotBlocked, modules: ODK_STAFF_MODULES.filter((m) => viewer.permissions.has(m.permission)).map((m) => ({ id: m.id, title: m.label, href: m.href })) };
}
/** Explicit selects: no live meeting links, answers, storage URLs or order/customer details. */
export async function loadOdkManagementPackages() {
  const packages = await prisma.odkPackage.findMany({ orderBy: [{ isActive: "desc" }, { title: "asc" }, { id: "asc" }], select: {
    id: true, title: true, slug: true, description: true, priceCents: true, isActive: true, contractVersion: true, contractPolicy: true,
    _count: { select: { orders: true, entitlements: true } },
    examLinks: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { exam: { select: {
      id: true, title: true, series: { select: { title: true } }, startsAt: true, endsAt: true, lateEntryMinutes: true, attemptLimit: true, resultsReleasedAt: true, answerKeyReleasedAt: true, meetRequired: true,
    } } } },
  } });
  return packages.map((pkg) => ({ pkg, parsed: parseOdkPackagePolicy(pkg.contractPolicy) }));
}
