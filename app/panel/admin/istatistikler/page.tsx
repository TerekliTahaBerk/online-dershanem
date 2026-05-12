import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import { Card, CardHeader } from "@/components/panel/ui/card";
import { Sparkline } from "@/components/panel/charts/sparkline";

export const dynamic = "force-dynamic";

export default async function AdminStats() {
  await requirePanelRole("admin");
  const now = new Date();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now); d.setDate(now.getDate() - (13 - i)); d.setHours(0, 0, 0, 0); return d;
  });

  const [byStatus, totalLessons, totalSubmissions, signups] = await Promise.all([
    prisma.student.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.lesson.count({ where: { scheduledAt: { gte: days[0] } } }),
    prisma.assignmentSubmission.count({ where: { createdAt: { gte: days[0] } } }),
    Promise.all(days.map((d) => {
      const next = new Date(d.getTime() + 86400000);
      return prisma.student.count({ where: { createdAt: { gte: d, lt: next } } });
    })),
  ]);

  return (
    <>
      <PageHeader title="İstatistikler" subtitle="Son 14 gün" />
      <div className="od-grid g-3" style={{ marginBottom: 16 }}>
        <KpiCard label="14 gün ders" value={totalLessons} meta="Tüm dersler" spark={<Sparkline data={signups} />} />
        <KpiCard label="14 gün gönderim" value={totalSubmissions} meta="Ödev gönderim" />
        <KpiCard label="Toplam aktif" value={byStatus.find((s) => s.status === "ACTIVE")?._count._all ?? 0} meta="ACTIVE öğrenci" />
      </div>
      <Card>
        <CardHeader title="Öğrenci durumları" subtitle="StudentStatus dağılımı" />
        <table className="od-table">
          <thead><tr><th>Durum</th><th>Adet</th></tr></thead>
          <tbody>
            {byStatus.map((s) => (
              <tr key={s.status}><td>{s.status}</td><td className="od-mono">{s._count._all}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
