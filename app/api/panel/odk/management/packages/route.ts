import { requireApiStaffPermission } from "@/lib/auth/api-guards";
import { loadOdkManagementPackages } from "@/lib/odk/management-read-server";
import { staffJson } from "@/lib/panel/staff-api";
export async function GET() {
  const auth = await requireApiStaffPermission("odk:package:manage"); if (!auth.ok) return auth.response;
  const rows = await loadOdkManagementPackages();
  return staffJson({ contractVersion: 1, rows: rows.map(({ pkg, parsed }) => ({
    id: pkg.id, title: pkg.title, slug: pkg.slug, priceCents: pkg.priceCents, isActive: pkg.isActive, contractVersion: pkg.contractVersion,
    policy: parsed.success ? parsed.data : null, orderCount: pkg._count.orders, entitlementCount: pkg._count.entitlements,
    exams: pkg.examLinks.map(({ exam }) => ({ ...exam, seriesTitle: exam.series?.title || null, series: undefined })),
  })) });
}
