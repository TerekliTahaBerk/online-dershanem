import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { AreaChartCard } from "@/components/panel/charts/recharts";
import { buildEmptyDays } from "@/lib/dashboard-stats";
import { StatCard, BarList, InsightList } from "@/components/panel/analytics";
import { attendanceInsights, assignmentInsights, sortInsights } from "@/lib/analytics/insights";
import { clampPct } from "@/lib/analytics/core";

export const dynamic = "force-dynamic";

export default async function TeacherDashboard() {
  const ctx = await requirePanelRole("ogretmen");
  const teacher = await prisma.teacher.findFirst({ where: { userId: ctx.userId } });

  if (!teacher) {
    return (
      <>
        <PageHeader title="Öğretmen Paneli" />
        <Card>
          <EmptyState
            icon="user"
            title="Öğretmen profili bulunamadı"
            description="Hesabın bir öğretmen kaydına bağlanmamış. Yöneticinden bağlama yapmasını isteyebilirsin."
          />
        </Card>
      </>
    );
  }

  const [classroomCount, lessonsThisWeek, submissionsPending, submissions30, classroomAttendance, classroomList, gradedCount] = await Promise.all([
    prisma.classroomTeacher.count({ where: { teacherId: teacher.id } }),
    prisma.lesson.count({
      where: {
        teacherId: teacher.id,
        scheduledAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 86400000),
        },
      },
    }),
    prisma.assignmentSubmission.count({
      where: {
        assignment: { teacherId: teacher.id },
        gradedAt: null,
      },
    }),
    prisma.assignmentSubmission.findMany({
      where: {
        assignment: { teacherId: teacher.id },
        createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
      },
      select: { createdAt: true, status: true },
    }),
    // Sınıf bazlı yoklama (last 30 gün, öğretmenin sınıfları)
    prisma.attendance.findMany({
      where: {
        sessionDate: { gte: new Date(Date.now() - 30 * 86400000) },
        student: { classrooms: { some: { classroom: { teachers: { some: { teacherId: teacher.id } } }, leftAt: null } } },
      },
      select: { status: true, studentId: true, student: { select: { classrooms: { select: { classroomId: true }, take: 1 } } } },
      take: 2000,
    }),
    prisma.classroomTeacher.findMany({
      where: { teacherId: teacher.id },
      select: { classroom: { select: { id: true, name: true, _count: { select: { students: { where: { leftAt: null } } } } } } },
    }),
    prisma.assignmentSubmission.count({
      where: { assignment: { teacherId: teacher.id }, gradedAt: { not: null }, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
    }),
  ]);

  const buckets = buildEmptyDays(30);
  for (const s of submissions30) {
    const k = s.createdAt.toISOString().slice(0, 10);
    const b = buckets.find((x) => x.iso === k);
    if (b) b.y++;
  }
  const subSeries = buckets.map(({ x, y }) => ({ x, y }));

  // Sınıf bazlı katılım oranı
  const classroomAttRate = new Map<string, { total: number; present: number; name: string }>();
  const classroomNameMap = new Map(classroomList.map((c) => [c.classroom.id, c.classroom.name]));
  for (const a of classroomAttendance) {
    const cid = a.student.classrooms[0]?.classroomId;
    if (!cid) continue;
    const cur = classroomAttRate.get(cid) ?? { total: 0, present: 0, name: classroomNameMap.get(cid) ?? "—" };
    cur.total++;
    if (a.status === "PRESENT") cur.present++;
    classroomAttRate.set(cid, cur);
  }
  const classroomPerformance = Array.from(classroomAttRate.entries())
    .map(([id, v]) => ({ id, name: v.name, total: v.total, ratePct: clampPct((v.present / Math.max(1, v.total)) * 100) }))
    .sort((a, b) => a.ratePct - b.ratePct);

  // Insights
  const totalAtt = classroomAttendance.length;
  const presentAtt = classroomAttendance.filter((a) => a.status === "PRESENT").length;
  const absentAtt = classroomAttendance.filter((a) => a.status === "ABSENT").length;
  const lateAtt = classroomAttendance.filter((a) => a.status === "LATE").length;
  const teacherInsights = sortInsights([
    ...attendanceInsights({ total: totalAtt, present: presentAtt, absent: absentAtt, late: lateAtt }),
    ...assignmentInsights({ totalAssigned: submissions30.length, submitted: submissions30.filter((s) => s.status !== "PENDING").length, graded: gradedCount, overdue: submissionsPending }),
  ]);

  return (
    <>
      <PageHeader title={`Hoş geldin, ${teacher.fullName}`} subtitle={teacher.subjects} />
      <div className="od-grid g-4" style={{ marginBottom: 16 }}>
        <KpiCard label="Aktif sınıf" value={classroomCount} meta="Atandığın sınıflar" />
        <KpiCard label="Bu hafta ders" value={lessonsThisWeek} meta="Önümüzdeki 7 gün" />
        <KpiCard label="Değerlendirme bekleyen" value={submissionsPending} meta="Henüz puanlanmamış" />
        <KpiCard label="Son 30 gün gönderim" value={submissions30.length} meta="Toplam ödev gönderimi" />
      </div>

      <Card>
        <CardHeader title="Ödev gönderimleri" subtitle="Son 30 gün" />
        <CardBody>
          {submissions30.length > 0 ? <AreaChartCard data={subSeries} /> : <EmptyState icon="chart" title="Veri yok" description="Henüz ödev gönderimi yok." />}
        </CardBody>
      </Card>

      {/* FAZ 8 — Teacher Analytics */}
      <h3 style={{ margin: "20px 0 10px", fontSize: 14, color: "var(--pd-muted)", textTransform: "uppercase", letterSpacing: 0.6 }}>Sınıf performansı</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 12 }}>
        <StatCard label="Sınıf yoklamaları (30g)" value={totalAtt} tone="accent" hint={`${presentAtt} devam · ${absentAtt} devamsız`} />
        <StatCard label="Devam oranı" value={totalAtt > 0 ? `%${Math.round((presentAtt / totalAtt) * 100)}` : "—"} tone="ok" />
        <StatCard label="Puanlanan ödev (30g)" value={gradedCount} tone="accent" hint={`${submissionsPending} bekliyor`} />
        <StatCard label="Aktif sınıf" value={classroomCount} tone="neutral" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <Card>
          <CardHeader title="Sınıf bazlı katılım" subtitle="Son 30 gün PRESENT oranı" />
          <CardBody>
            <BarList
              rows={classroomPerformance.map((c) => ({
                label: c.name,
                value: c.ratePct,
                meta: `${c.total} kayıt ·`,
                tone: c.ratePct < 60 ? "bad" : c.ratePct < 80 ? "warn" : "ok",
              }))}
              format="pct"
              maxOverride={100}
              emptyText="Sınıflarına ait yoklama kaydı yok"
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Akıllı öneriler" subtitle="Sistem yorumları" />
          <CardBody>
            <InsightList insights={teacherInsights} emptyText="Performans şu an dengeli — yorum yok." />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
