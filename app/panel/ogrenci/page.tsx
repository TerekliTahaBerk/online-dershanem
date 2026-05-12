import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { Badge } from "@/components/panel/ui/badge";
import { LineChartCard, BarChartCard } from "@/components/panel/charts/recharts";

export const dynamic = "force-dynamic";

export default async function StudentDashboard() {
  const ctx = await requirePanelRole("ogrenci");
  const student = await prisma.student.findFirst({
    where: { userId: ctx.userId },
    include: {
      examResults: { orderBy: { takenAt: "desc" }, take: 10 },
      _count: { select: { submissions: true, attendances: true } },
    },
  });

  if (!student) {
    return (
      <>
        <PageHeader title="Öğrenci Paneli" />
        <Card>
          <EmptyState
            icon="user"
            title="Öğrenci profili bulunamadı"
            description="Hesabın bir öğrenci kaydına bağlanmamış. Yöneticinden bağlama yapmasını isteyebilirsin."
          />
        </Card>
      </>
    );
  }

  const [pendingAssignments, attendance30] = await Promise.all([
    prisma.assignment.count({
      where: {
        OR: [
          { studentId: student.id },
          { classroom: { students: { some: { studentId: student.id } } } },
        ],
        dueAt: { gte: new Date() },
        submissions: { none: { studentId: student.id, submittedAt: { not: null } } },
      },
    }),
    prisma.attendance.count({
      where: { studentId: student.id, sessionDate: { gte: new Date(Date.now() - 30 * 86400000) } },
    }),
  ]);
  const last = student.examResults[0];
  const netSeries = [...student.examResults]
    .reverse()
    .map((r) => ({ x: new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(r.takenAt), y: r.net ? Number(r.net) : 0 }));

  return (
    <>
      <PageHeader title={`Hoş geldin, ${student.fullName}`} subtitle={`${student.classLevel ?? "—"} · ${student.examType ?? "—"}`} />
      <div className="od-grid g-4" style={{ marginBottom: 16 }}>
        <KpiCard label="Bekleyen ödev" value={pendingAssignments} meta="Süresi geçmemiş" />
        <KpiCard label="Son 30 gün yoklama" value={attendance30} meta="Tüm dersler" />
        <KpiCard label="Toplam gönderim" value={student._count.submissions} meta="Ödev gönderimleri" />
        <KpiCard label="Son net" value={last ? (last.net?.toString() ?? "—") : "—"} meta={last?.title ?? "Henüz deneme yok"} />
      </div>

      <div className="od-grid g-2" style={{ marginBottom: 16 }}>
        <Card>
          <CardHeader title="Net trendi" subtitle={`Son ${netSeries.length} deneme`} />
          <CardBody>
            {netSeries.length > 0 ? <LineChartCard data={netSeries} /> : <EmptyState icon="chart" title="Henüz deneme yok" description="İlk denemen kaydedilince grafik burada görünecek." />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Doğru / Yanlış / Boş" subtitle="Son denemen" />
          <CardBody>
            {last ? (
              <BarChartCard data={[
                { x: "Doğru", y: last.correctCount },
                { x: "Yanlış", y: last.wrongCount },
                { x: "Boş", y: last.blankCount },
              ]} />
            ) : <EmptyState icon="chart" title="Veri yok" />}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Hedef ve durum" />
        <CardBody>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div><span className="od-muted">Hedef: </span>{student.targetGoal ?? "—"}</div>
            <div><span className="od-muted">Hedef okul: </span>{student.targetSchool ?? "—"}</div>
            <div><Badge tone="accent">{student.status}</Badge></div>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
