import { NextResponse } from "next/server";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { parseAnalyticsFilters } from "@/lib/analytics/filters";
import { analyticsExportCsv } from "@/lib/analytics/export";
import { loadManagementAnalyticsSnapshot } from "@/lib/analytics/server";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireApiOdRole("ADMIN");
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const filters = parseAnalyticsFilters({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    examType: url.searchParams.get("examType") ?? undefined,
    classLevel: url.searchParams.get("classLevel") ?? undefined,
    product: url.searchParams.get("product") ?? undefined,
    groupId: url.searchParams.get("groupId") ?? undefined,
    teacherId: url.searchParams.get("teacherId") ?? undefined,
  });

  const snapshot = await loadManagementAnalyticsSnapshot(filters);
  const csv = analyticsExportCsv(snapshot, filters);

  void logAudit({
    actorUserId: auth.session.userId,
    entityType: "ManagementAnalytics",
    entityId: "export",
    action: "MANAGEMENT_ANALYTICS_CSV_EXPORTED",
    payload: {
      product: filters.product,
      examType: filters.examType,
      hasGroupFilter: Boolean(filters.groupId),
      hasTeacherFilter: Boolean(filters.teacherId),
      // PII yok: kimlik alanları audit'e yazılmaz
    },
  });

  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="yonetim-analitik-${date}.csv"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
