import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { Sparkline } from "@/components/panel/charts/sparkline";
import { AreaChartCard, MultiLineChartCard, PieChartCard } from "@/components/panel/charts/recharts";
import {
  studentRegistrationsLast30,
  leadsVsPaidLast30,
  incomeVsExpenseLast30,
  studentStatusBreakdown,
  classroomLevelBreakdown,
} from "@/lib/dashboard-stats";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requirePanelRole("admin");
  const [
    studentCount, teacherCount, parentCount, classCount, packageCount,
    recentLeads, recentPurchases, recentStudents,
    regSeries, leadsPaidSeries, incExpSeries, statusPie, levelPie,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.parent.count(),
    prisma.classroom.count(),
    prisma.package.count(),
    prisma.leadSubmission.count({ where: { submittedAt: { gte: new Date(Date.now() - 30 * 86400000) } } }),
    prisma.purchaseIntent.count({ where: { status: "PAID", submittedAt: { gte: new Date(Date.now() - 30 * 86400000) } } }),
    prisma.student.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, fullName: true, classLevel: true, status: true, createdAt: true, examType: true },
    }),
    studentRegistrationsLast30(),
    leadsVsPaidLast30(),
    incomeVsExpenseLast30(),
    studentStatusBreakdown(),
    classroomLevelBreakdown(),
  ]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Aktif öğrenci: ${studentCount} · Öğretmen: ${teacherCount} · Sınıf: ${classCount}`}
      />

      <div className="od-grid g-4" style={{ marginBottom: 16 }}>
        <KpiCard
          label="Toplam Öğrenci"
          value={studentCount}
          meta="Kayıtlı tüm öğrenciler"
          spark={<Sparkline data={regSeries.map((p) => p.y)} />}
        />
        <KpiCard label="Öğretmenler" value={teacherCount} meta="Aktif kadro" />
        <KpiCard label="Veliler" value={parentCount} meta="Bağlı veli hesabı" />
        <KpiCard label="Aktif sınıf" value={classCount} meta="Tüm dönemler" />
      </div>

      <div className="od-grid g-4" style={{ marginBottom: 16 }}>
        <KpiCard label="Son 30 gün lead" value={recentLeads} meta="LeadSubmission" />
        <KpiCard label="Son 30 gün ödeme" value={recentPurchases} meta="Onaylı ödeme" />
        <KpiCard label="Yeni öğrenci" value={recentStudents.length} meta="Son 8 kayıt" />
        <KpiCard label="Toplam paket" value={packageCount} meta="Tanımlı paketler" />
      </div>

      <div className="od-grid g-2" style={{ marginBottom: 16 }}>
        <Card>
          <CardHeader title="Yeni öğrenci kayıtları" subtitle="Son 30 gün" />
          <CardBody><AreaChartCard data={regSeries} /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Lead vs Ödeme" subtitle="Son 30 gün" />
          <CardBody><MultiLineChartCard series={leadsPaidSeries} /></CardBody>
        </Card>
      </div>

      <div className="od-grid g-2" style={{ marginBottom: 16 }}>
        <Card>
          <CardHeader title="Gelir / Gider" subtitle="Son 30 gün (TL)" />
          <CardBody><MultiLineChartCard series={incExpSeries} /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Öğrenci durumu" subtitle="Aktif / At Risk / vb." />
          <CardBody><PieChartCard data={statusPie} /></CardBody>
        </Card>
      </div>

      <div className="od-grid g-2" style={{ marginBottom: 16 }}>
        <Card>
          <CardHeader title="Sınıf seviye dağılımı" subtitle="Classroom.level" />
          <CardBody><PieChartCard data={levelPie} /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Son eklenen öğrenciler" subtitle="Yeni kayıtların hızlı özeti" />
          <table className="od-table">
            <thead>
              <tr><th>Öğrenci</th><th>Sınıf</th><th>Sınav</th><th>Durum</th><th>Eklendi</th></tr>
            </thead>
            <tbody>
              {recentStudents.map((s) => (
                <tr key={s.id}>
                  <td>{s.fullName}</td>
                  <td>{s.classLevel ?? "—"}</td>
                  <td>{s.examType ?? "—"}</td>
                  <td><Badge tone={s.status === "ACTIVE" ? "ok" : s.status === "AT_RISK" ? "bad" : "neutral"}>{s.status}</Badge></td>
                  <td className="od-mono od-muted">{new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(s.createdAt)}</td>
                </tr>
              ))}
              {recentStudents.length === 0 ? (
                <tr><td colSpan={5}><CardBody>Henüz öğrenci yok.</CardBody></td></tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
