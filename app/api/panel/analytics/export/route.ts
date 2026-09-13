import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { parseAnalyticsFilters } from "@/lib/analytics/filters";
import { analyticsExportCsv } from "@/lib/analytics/export";
import { loadManagementAnalyticsSnapshot } from "@/lib/analytics/server";
import { queueAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  from: z.string().max(32).optional(),
  to: z.string().max(32).optional(),
  examType: z.enum(["LGS", "TYT", "AYT", "YDT", "ALL"]).optional(),
  classLevel: z.string().trim().max(40).optional(),
  product: z.enum(["OD", "OK", "ODK", "ALL"]).optional(),
  groupId: z.string().trim().max(191).optional(),
  teacherId: z.string().trim().max(191).optional(),
});

export async function GET(request: Request) {
  const auth = await requireApiOdRole("ADMIN");
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz analiz filtreleri." }, { status: 400 });
  const filters = parseAnalyticsFilters(parsed.data);

  const snapshot = await loadManagementAnalyticsSnapshot(filters);
  const csv = analyticsExportCsv(snapshot, filters);

  queueAudit({
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
