import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { AreaChartCard } from "@/components/panel/charts/recharts";
import { buildEmptyDays } from "@/lib/dashboard-stats";

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

  const [classroomCount, lessonsThisWeek, submissionsPending, submissions30] = await Promise.all([
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
      select: { createdAt: true },
    }),
  ]);

  const buckets = buildEmptyDays(30);
  for (const s of submissions30) {
    const k = s.createdAt.toISOString().slice(0, 10);
    const b = buckets.find((x) => x.iso === k);
    if (b) b.y++;
  }
  const subSeries = buckets.map(({ x, y }) => ({ x, y }));

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
    </>
  );
}
