import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import { Card, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";

export const dynamic = "force-dynamic";

const fmt = (k: number) => `₺${(k / 100).toLocaleString("tr-TR")}`;

export default async function AdminReports() {
  await requirePanelRole("admin");
  const since30 = new Date(Date.now() - 30 * 86400000);
  const [byPackage, byCategory, leadByStatus] = await Promise.all([
    prisma.purchaseIntent.groupBy({
      by: ["packageName"], _count: { _all: true },
      where: { status: "PAID", submittedAt: { gte: since30 } },
      orderBy: { _count: { packageName: "desc" } }, take: 10,
    }),
    prisma.accountingEntry.groupBy({
      by: ["category"], _sum: { amount: true },
      where: { occurredAt: { gte: since30 } },
    }),
    prisma.leadSubmission.groupBy({ by: ["intakeStatus"], _count: { _all: true } }),
  ]);

  const totalRevenue = byCategory.filter((c) => ["PACKAGE_SALE", "CAMP_SALE", "SERVICE_FEE", "OTHER_INCOME"].includes(c.category)).reduce((a, c) => a + (c._sum.amount ?? 0), 0);
  const totalCost = byCategory.filter((c) => ["TEACHER_PAYROLL", "MARKETING", "RENT", "TAX", "OPERATIONAL"].includes(c.category)).reduce((a, c) => a + (c._sum.amount ?? 0), 0);

  return (
    <>
      <PageHeader title="Raporlar" subtitle="Son 30 gün özet" />
      <div className="od-grid g-3" style={{ marginBottom: 16 }}>
        <KpiCard label="Gelir" value={fmt(totalRevenue)} />
        <KpiCard label="Gider" value={fmt(totalCost)} />
        <KpiCard label="Net" value={fmt(totalRevenue - totalCost)} />
      </div>
      <div className="od-grid g-2" style={{ marginBottom: 16 }}>
        <Card>
          <CardHeader title="En çok satan paketler" subtitle="PAID intent / 30 gün" />
          <table className="od-table">
            <thead><tr><th>Paket</th><th>Adet</th></tr></thead>
            <tbody>
              {byPackage.map((p) => (<tr key={p.packageName}><td>{p.packageName}</td><td className="od-mono">{p._count._all}</td></tr>))}
              {byPackage.length === 0 ? <tr><td colSpan={2} className="od-muted" style={{ padding: 16 }}>Veri yok.</td></tr> : null}
            </tbody>
          </table>
        </Card>
        <Card>
          <CardHeader title="Lead durum dağılımı" />
          <table className="od-table">
            <thead><tr><th>Durum</th><th>Adet</th></tr></thead>
            <tbody>
              {leadByStatus.map((l) => (<tr key={l.intakeStatus}><td><Badge tone="neutral">{l.intakeStatus}</Badge></td><td className="od-mono">{l._count._all}</td></tr>))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
