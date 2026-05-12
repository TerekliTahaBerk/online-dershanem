import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/panel-teacher";
import { PageHeader } from "@/components/panel/ui/page-header";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const dynamic = "force-dynamic";

const fmt = (k: number) => `₺${(k / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;

export default async function TeacherEarnings() {
  const { teacher } = await requireTeacher();
  if (!teacher) return <Card><EmptyState icon="user" title="Öğretmen profili yok" /></Card>;
  const [payrolls, totalAgg, paidAgg] = await Promise.all([
    prisma.teacherPayroll.findMany({ where: { teacherId: teacher.id }, orderBy: { periodEnd: "desc" } }),
    prisma.teacherPayroll.aggregate({ where: { teacherId: teacher.id }, _sum: { amount: true } }),
    prisma.teacherPayroll.aggregate({ where: { teacherId: teacher.id, status: "PAID" }, _sum: { amount: true } }),
  ]);
  return (
    <>
      <PageHeader title="Kazançlarım" subtitle={`${payrolls.length} dönem`} />
      <div className="od-grid g-3" style={{ marginBottom: 16 }}>
        <KpiCard label="Toplam tahakkuk" value={fmt(totalAgg._sum.amount ?? 0)} />
        <KpiCard label="Toplam ödenen" value={fmt(paidAgg._sum.amount ?? 0)} />
        <KpiCard label="Bekleyen" value={fmt((totalAgg._sum.amount ?? 0) - (paidAgg._sum.amount ?? 0))} />
      </div>
      <Card>
        <table className="od-table">
          <thead><tr><th>Dönem</th><th>Tutar</th><th>Durum</th><th>Ödeme tarihi</th></tr></thead>
          <tbody>
            {payrolls.map((p) => (
              <tr key={p.id}>
                <td className="od-mono">{new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(p.periodStart)} – {new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(p.periodEnd)}</td>
                <td className="od-mono">{fmt(p.amount)}</td>
                <td><Badge tone={p.status === "PAID" ? "ok" : p.status === "DUE" ? "warn" : "neutral"}>{p.status}</Badge></td>
                <td className="od-mono od-muted">{p.paidAt ? new Intl.DateTimeFormat("tr-TR").format(p.paidAt) : "—"}</td>
              </tr>
            ))}
            {payrolls.length === 0 ? <tr><td colSpan={4} style={{ padding: 24, textAlign: "center" }} className="od-muted">Bordro kaydı yok.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </>
  );
}
