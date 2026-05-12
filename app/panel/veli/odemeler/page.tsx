import { prisma } from "@/lib/prisma";
import { requireParent, getChildIds } from "@/lib/panel-parent";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function ParentPayments() {
  const { parent } = await requireParent();
  if (!parent) return <Card><EmptyState icon="users" title="Veli profili yok" /></Card>;
  const childIds = await getChildIds(parent.id);
  if (childIds.length === 0) return <><PageHeader title="Ödemeler" /><Card><EmptyState icon="users" title="Bağlı çocuk yok" /></Card></>;
  const intents = await prisma.purchaseIntent.findMany({
    where: { studentId: { in: childIds } },
    orderBy: { submittedAt: "desc" }, take: 50,
  });
  return (
    <>
      <PageHeader title="Ödemeler" subtitle={`${intents.length} kayıt`} />
      <Card>
        <table className="od-table">
          <thead><tr><th>Tarih</th><th>Öğrenci</th><th>Paket</th><th>Durum</th></tr></thead>
          <tbody>
            {intents.map((p) => (
              <tr key={p.id}>
                <td className="od-mono od-muted">{new Intl.DateTimeFormat("tr-TR").format(p.submittedAt)}</td>
                <td>{p.studentFullName}</td>
                <td>{p.packageName}</td>
                <td><Badge tone={p.status === "PAID" ? "ok" : p.status === "FAILED" ? "bad" : "warn"}>{p.status}</Badge></td>
              </tr>
            ))}
            {intents.length === 0 ? <tr><td colSpan={4} style={{ padding: 24, textAlign: "center" }} className="od-muted">Ödeme kaydı yok.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </>
  );
}
