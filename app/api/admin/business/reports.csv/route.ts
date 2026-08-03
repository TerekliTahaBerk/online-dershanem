import { authorizeBusinessRequest } from "@/lib/business/permissions";
import { escapeCsvCell } from "@/lib/business/normalization";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
export async function GET() {
  const access = await authorizeBusinessRequest("finance:read");
  if (!access) return new Response("Yetkisiz", { status: 401 });
  const rows = await prisma.financialTransaction.findMany({ where: { businessUnitId: { in: access.units.map((unit) => unit.id) } }, orderBy: { transactionAt: "desc" }, take: 10_000 });
  const csv = ["Tarih,Açıklama,Kaynak,Kategori,Brüt,İndirim,Net,KDV,Komisyon,Durum", ...rows.map((row) => [row.transactionAt.toISOString(), row.description, row.source, row.category, row.grossCents, row.discountCents, row.netCents, row.vatCents, row.commissionCents, row.status].map(escapeCsvCell).join(","))].join("\r\n");
  void logAudit({ actorUserId: access.session.userId, entityType: "FinancialTransaction", entityId: "export", action: "FINANCE_CSV_EXPORTED", payload: { rowCount: rows.length } });
  return new Response(`\uFEFF${csv}`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="finans-${new Date().toISOString().slice(0,10)}.csv"`, "cache-control": "no-store" } });
}

