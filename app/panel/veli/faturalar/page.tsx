import { prisma } from "@/lib/prisma";
import { requireParent, getChildIds } from "@/lib/panel-parent";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { NoChildEmpty } from "@/components/panel/parent/no-child-empty";

export const dynamic = "force-dynamic";

const fmt = (k: number) => `₺${(k / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;

export default async function ParentInvoices() {
  const { parent } = await requireParent();
  if (!parent) return <Card><EmptyState icon="users" title="Veli profili yok" /></Card>;
  const childIds = await getChildIds(parent.id);
  if (childIds.length === 0) return <NoChildEmpty pageTitle="Faturalar" />;
  const entries = await prisma.accountingEntry.findMany({
    where: { studentId: { in: childIds }, type: "INCOME" },
    orderBy: { occurredAt: "desc" }, take: 50,
    include: { student: { select: { fullName: true } } },
  });
  return (
    <>
      <PageHeader title="Faturalar" subtitle={`${entries.length} kayıt`} />
      <Card>
        <table className="od-table">
          <thead><tr><th>Tarih</th><th>Çocuk</th><th>Açıklama</th><th>Kategori</th><th>Tutar</th></tr></thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="od-mono od-muted">{new Intl.DateTimeFormat("tr-TR").format(e.occurredAt)}</td>
                <td>{e.student?.fullName ?? "—"}</td>
                <td>{e.description ?? "—"}</td>
                <td><Badge tone="neutral">{e.category}</Badge></td>
                <td className="od-mono">{fmt(e.amount)}</td>
              </tr>
            ))}
            {entries.length === 0 ? <tr><td colSpan={5} style={{ padding: 24, textAlign: "center" }} className="od-muted">Fatura kaydı yok.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </>
  );
}
