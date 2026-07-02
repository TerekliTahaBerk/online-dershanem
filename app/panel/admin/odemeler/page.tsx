import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { SearchInput } from "@/components/panel/ui/search-input";
import { ExportButton } from "@/components/panel/ui/export-button";
import { QuickFilters, DateRangeQuickFilter } from "@/components/panel/ui/quick-filters";
import { rangeToWhere } from "@/lib/panel/range-filter";
import { SmartTableShell, SortableTh } from "@/components/panel/ui/smart-table";
import { Pagination } from "@/components/panel/ui/pagination";
import { parsePagination } from "@/components/panel/ui/pagination-utils";
import { setPurchaseStatusAction } from "./_actions";

export const dynamic = "force-dynamic";

const SORTABLE: Record<string, "studentFullName" | "packageName" | "status" | "submittedAt"> = {
  student: "studentFullName",
  package: "packageName",
  status: "status",
  date: "submittedAt",
};

export default async function AdminPayments({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; range?: string; sort?: string; dir?: string; page?: string; pageSize?: string }>;
}) {
  await requirePanelRole("admin");
  const sp = await searchParams;
  const { q, status, range, sort, dir } = sp;
  const { page, pageSize, skip, take } = parsePagination(sp, { pageSize: 50, maxPageSize: 200 });

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { studentFullName: { contains: q, mode: "insensitive" as const } },
      { packageName: { contains: q, mode: "insensitive" as const } },
    ];
  }
  if (status && ["PENDING", "PAID", "FAILED"].includes(status)) {
    where.status = status;
  }
  const rng = rangeToWhere(range);
  if (rng.gte) where.submittedAt = { gte: rng.gte };

  const sortField = sort && SORTABLE[sort] ? SORTABLE[sort] : "submittedAt";
  const sortDir: "asc" | "desc" = dir === "asc" ? "asc" : "desc";

  const [total, intents] = await Promise.all([
    prisma.purchaseIntent.count({ where }),
    prisma.purchaseIntent.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip,
      take,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const metaParts = [`${total.toLocaleString("tr-TR")} kayıt`, `sayfa ${safePage}/${totalPages}`];
  if (q) metaParts.push(`"${q}"`);
  if (status) metaParts.push(`durum: ${status}`);
  if (range) metaParts.push(`aralık: ${range}`);

  return (
    <>
      <PageHeader
        title="Ödemeler"
        breadcrumbs={[{ label: "Yönetim", href: "/panel/admin" }, { label: "Ödemeler" }]}
        subtitle={metaParts.join(" · ")}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <SearchInput placeholder="Öğrenci, paket…" />
            <ExportButton entity="odemeler" />
          </div>
        }
      />
      <Card>
        <SmartTableShell
          tableId="admin.odemeler"
          columns={[
            { id: "student", label: "Öğrenci", hideable: false },
            { id: "package", label: "Paket" },
            { id: "status",  label: "Durum" },
            { id: "date",    label: "Tarih" },
            { id: "actions", label: "İşlemler", hideable: false },
          ]}
          toolbarLeft={
            <>
              <QuickFilters
                param="status"
                label="Durum"
                options={[
                  { value: "",        label: "Tümü" },
                  { value: "PENDING", label: "Beklemede", tone: "warn" },
                  { value: "PAID",    label: "Ödendi",    tone: "ok"   },
                  { value: "FAILED",  label: "İptal",     tone: "bad"  },
                ]}
              />
              <DateRangeQuickFilter />
            </>
          }
        >
          <table className="od-table">
            <thead>
              <tr>
                <SortableTh field="student" label="Öğrenci" />
                <SortableTh field="package" label="Paket" />
                <SortableTh field="status"  label="Durum" />
                <SortableTh field="date"    label="Tarih" defaultDir="desc" />
                <th data-col="actions"></th>
              </tr>
            </thead>
            <tbody>
              {intents.map((p) => (
                <tr key={p.id}>
                  <td data-col="student">{p.studentFullName}</td>
                  <td data-col="package">{p.packageName}</td>
                  <td data-col="status"><Badge tone={p.status === "PAID" ? "ok" : p.status === "FAILED" ? "bad" : "warn"}>{p.status}</Badge></td>
                  <td data-col="date" className="od-mono od-muted">{new Intl.DateTimeFormat("tr-TR").format(p.submittedAt)}</td>
                  <td data-col="actions" style={{ display: "flex", gap: 6 }}>
                    {p.status !== "PAID" && (
                      <form action={setPurchaseStatusAction.bind(null, p.id, "PAID")} style={{ display: "inline" }}>
                        <button type="submit" className="od-btn ghost sm" style={{ color: "var(--pd-ok)" }}>Ödendi</button>
                      </form>
                    )}
                    {p.status !== "FAILED" && (
                      <form action={setPurchaseStatusAction.bind(null, p.id, "FAILED")} style={{ display: "inline" }}>
                        <button type="submit" className="od-btn ghost sm" style={{ color: "var(--pd-bad)" }}>İptal</button>
                      </form>
                    )}
                    {p.status !== "PENDING" && (
                      <form action={setPurchaseStatusAction.bind(null, p.id, "PENDING")} style={{ display: "inline" }}>
                        <button type="submit" className="od-btn ghost sm">Beklemede</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SmartTableShell>
        <Pagination
          total={total}
          page={safePage}
          pageSize={pageSize}
          rowCount={intents.length}
        />
      </Card>
    </>
  );
}
