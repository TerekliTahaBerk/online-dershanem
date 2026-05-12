import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { SearchInput } from "@/components/panel/ui/search-input";
import { ExportButton } from "@/components/panel/ui/export-button";
import { deleteEntryAction } from "./_actions";

export const dynamic = "force-dynamic";

const fmt = (kurus: number) => `₺${(kurus / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;

export default async function AdminAccounting({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePanelRole("admin");
  const { q } = await searchParams;
  const since = new Date(Date.now() - 30 * 86400000);
  const entryWhere = q
    ? { description: { contains: q, mode: "insensitive" as const } }
    : {};
  const [income, expense, entries] = await Promise.all([
    prisma.accountingEntry.aggregate({ _sum: { amount: true }, where: { type: "INCOME", occurredAt: { gte: since } } }),
    prisma.accountingEntry.aggregate({ _sum: { amount: true }, where: { type: "EXPENSE", occurredAt: { gte: since } } }),
    prisma.accountingEntry.findMany({
      where: entryWhere,
      orderBy: { occurredAt: "desc" }, take: 100,
      include: { student: { select: { fullName: true } }, teacher: { select: { fullName: true } } },
    }),
  ]);
  const inc = income._sum.amount ?? 0;
  const exp = expense._sum.amount ?? 0;
  return (
    <>
      <PageHeader
        title="Muhasebe"
        subtitle="Son 30 gün"
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <SearchInput placeholder="Açıklama ara…" />
            <ExportButton entity="muhasebe" />
            <Link href="/panel/admin/muhasebe/yeni" className="od-btn od-btn-primary od-btn-sm">+ Yeni kayıt</Link>
          </div>
        }
      />
      <div className="od-grid g-3" style={{ marginBottom: 16 }}>
        <KpiCard label="Gelir (30 gün)" value={fmt(inc)} meta="INCOME" />
        <KpiCard label="Gider (30 gün)" value={fmt(exp)} meta="EXPENSE" />
        <KpiCard label="Net" value={fmt(inc - exp)} meta="Gelir − Gider" />
      </div>
      <Card>
        <table className="od-table">
          <thead><tr><th>Tarih</th><th>Tip</th><th>Kategori</th><th>Tutar</th><th>Açıklama</th><th>İlgili</th><th></th></tr></thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="od-mono od-muted">{new Intl.DateTimeFormat("tr-TR").format(e.occurredAt)}</td>
                <td><Badge tone={e.type === "INCOME" ? "ok" : "bad"}>{e.type}</Badge></td>
                <td className="od-muted">{e.category}</td>
                <td className="od-mono">{fmt(e.amount)}</td>
                <td>{e.description ?? "—"}</td>
                <td className="od-muted">{e.student?.fullName ?? e.teacher?.fullName ?? "—"}</td>
                <td>
                  <form action={deleteEntryAction.bind(null, e.id)} style={{ display: "inline" }}>
                    <button type="submit" className="od-btn od-btn-ghost od-btn-sm" style={{ color: "var(--pd-bad)" }}>Sil</button>
                  </form>
                </td>
              </tr>
            ))}
            {entries.length === 0 ? <tr><td colSpan={7} style={{ padding: 24, textAlign: "center" }} className="od-muted">Kayıt yok.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </>
  );
}
