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
import { getOdAdminAnalytics } from "@/lib/analytics/od-admin";
import { getTopRiskyStudents } from "@/lib/analytics/risk";
import { StatCard, BarList, AnalyticsTable, RiskBadge } from "@/components/panel/analytics";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requirePanelRole("admin");
  const [
    studentCount, teacherCount, parentCount, classCount, packageCount,
    recentLeads, recentPurchases, recentStudents,
    regSeries, leadsPaidSeries, incExpSeries, statusPie, levelPie,
    odAnalytics, riskyStudents,
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
    getOdAdminAnalytics(),
    getTopRiskyStudents(8),
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

      {/* FAZ 8 — OD Intelligence */}
      <h3 style={{ margin: "16px 0 10px", fontSize: 14, color: "var(--pd-muted)", textTransform: "uppercase", letterSpacing: 0.6 }}>OD Intelligence</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 16 }}>
        <StatCard label="Yaklaşan ders (7g)" value={odAnalytics.upcomingCount7} tone="accent" hint="SCHEDULED · önümüzdeki hafta" />
        <StatCard
          label="Eksik ödev oranı"
          value={`%${odAnalytics.overdueRatePct}`}
          tone={odAnalytics.overdueRatePct > 30 ? "bad" : odAnalytics.overdueRatePct > 15 ? "warn" : "ok"}
          hint={`${odAnalytics.overdueAssignmentCount} geciken / ${odAnalytics.totalActiveAssignments} aktif`}
        />
        <StatCard
          label="Riskli öğrenci"
          value={riskyStudents.filter((r) => r.level !== "low").length}
          tone="bad"
          hint="Devamsızlık + ödev sinyali"
        />
        <StatCard
          label="Yoğun gün (önümüzdeki 14g)"
          value={odAnalytics.busyDays[0]?.lessons ?? 0}
          tone="warn"
          hint={odAnalytics.busyDays[0]?.iso ? new Date(odAnalytics.busyDays[0].iso).toLocaleDateString("tr-TR") : "—"}
        />
      </div>

      <div className="od-grid g-2" style={{ marginBottom: 16 }}>
        <Card>
          <CardHeader title="Yaklaşan dersler" subtitle="Önümüzdeki 14 gün · ilk 10" />
          <CardBody>
            <AnalyticsTable
              rows={odAnalytics.upcomingLessons}
              rowKey={(r) => r.id}
              emptyText="Planlanmış ders yok"
              columns={[
                { key: "when", header: "Zaman", render: (r) => <span className="od-mono od-muted">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(r.scheduledAt)}</span> },
                { key: "title", header: "Konu", render: (r) => r.title ?? r.subject ?? "—" },
                { key: "who", header: "Hedef", render: (r) => r.classroomName ?? r.studentName ?? "—" },
                { key: "teacher", header: "Öğretmen", render: (r) => r.teacherName },
              ]}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="En aktif öğretmenler" subtitle="Son 30 gün ders + ödev" />
          <CardBody>
            <BarList
              rows={odAnalytics.topTeachers.map((t) => ({
                label: <span>{t.fullName} <span className="od-muted" style={{ fontSize: 11 }}>· {t.classroomCount} sınıf</span></span>,
                value: t.lessonsLast30 + t.assignmentsLast30,
                meta: `${t.lessonsLast30}d + ${t.assignmentsLast30}ö ·`,
                tone: "accent",
              }))}
              emptyText="Aktivite yok"
            />
          </CardBody>
        </Card>
      </div>

      <div className="od-grid g-2" style={{ marginBottom: 16 }}>
        <Card>
          <CardHeader title="Düşük katılımlı sınıflar" subtitle="Son 30 günde az ders" />
          <CardBody>
            <BarList
              rows={odAnalytics.weakClassrooms.map((c) => ({
                label: <Link href={`/panel/admin/siniflar/${c.classroomId}`}>{c.classroomName}</Link>,
                value: c.lessonsLast30,
                meta: `${c.studentCount} öğr ·`,
                tone: c.lessonsLast30 < 3 ? "bad" : c.lessonsLast30 < 8 ? "warn" : "accent",
              }))}
              emptyText="Aktif sınıf yok"
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Riskli öğrenciler" subtitle="Top 8" right={<Link href="/panel/admin/ogrenciler" className="od-btn od-btn-ghost od-btn-sm">Tümü →</Link>} />
          <CardBody>
            {riskyStudents.length === 0 ? (
              <div style={{ padding: 12, color: "var(--pd-muted)", fontSize: 13 }}>Risk sinyali yok 🎉</div>
            ) : (
              <table className="od-table" style={{ fontSize: 12 }}>
                <thead><tr><th>Öğrenci</th><th>Sinyal</th><th>Risk</th></tr></thead>
                <tbody>
                  {riskyStudents.map((r) => (
                    <tr key={r.studentId}>
                      <td><Link href={`/panel/admin/ogrenciler/${r.studentId}`} style={{ fontWeight: 600 }}>{r.fullName}</Link></td>
                      <td className="od-muted" style={{ fontSize: 11 }}>{r.signals.slice(0, 2).map((s) => s.message).join(" · ") || "—"}</td>
                      <td><RiskBadge level={r.level} score={r.score} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
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
