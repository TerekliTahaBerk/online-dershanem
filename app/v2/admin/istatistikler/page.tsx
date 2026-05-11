import { prisma } from "@/lib/prisma";
import { format, subDays, startOfDay } from "date-fns";
import { tr } from "date-fns/locale";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { KpiCard } from "@/components/od/charts/kpi-card";
import { AreaChart, DonutChart } from "@/components/od/charts/charts";
import { requirePagePermission } from "@/lib/rbac/define-action";

export default async function StatisticsPage() {
  await requirePagePermission("statistics.dashboard.read");

  const now = new Date();
  const since30 = startOfDay(subDays(now, 30));

  // Daily revenue (30 days)
  const incomes = await prisma.accountingEntry.findMany({
    where: { type: "INCOME", occurredAt: { gte: since30 } },
    select: { amount: true, occurredAt: true },
  });

  const dailyMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = format(subDays(now, i), "yyyy-MM-dd");
    dailyMap.set(d, 0);
  }
  for (const e of incomes) {
    const k = format(new Date(e.occurredAt), "yyyy-MM-dd");
    dailyMap.set(k, (dailyMap.get(k) ?? 0) + e.amount / 100);
  }
  const revenueSeries = Array.from(dailyMap.entries()).map(([d, v]) => ({
    name: format(new Date(d), "dd MMM", { locale: tr }),
    Gelir: Math.round(v),
  }));

  // Student status distribution
  const statusGroups = await prisma.student.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const statusData = statusGroups.map((g) => ({
    name: g.status,
    value: g._count._all,
  }));

  // Examen type distribution
  const examGroups = await prisma.student.groupBy({
    by: ["examType"],
    _count: { _all: true },
    where: { examType: { not: null } },
  });
  const examData = examGroups
    .filter((g) => !!g.examType)
    .map((g) => ({ name: g.examType ?? "—", value: g._count._all }));

  // Counters
  const [students, teachers, classrooms, packages, lessons30, payments30] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count({ where: { status: "ACTIVE" } }),
    prisma.classroom.count({ where: { isActive: true } }),
    prisma.package.count({ where: { isActive: true } }),
    prisma.lesson.count({ where: { scheduledAt: { gte: since30 } } }),
    prisma.accountingEntry.count({ where: { type: "INCOME", occurredAt: { gte: since30 } } }),
  ]);

  return (
    <div className="space-y-od-5">
      <PageHeader title="İstatistikler" description="Son 30 günün özeti" />

      <div className="grid gap-od-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard tone="mint" label="Toplam Öğrenci" value={students} />
        <KpiCard tone="sky" label="Aktif Öğretmen" value={teachers} />
        <KpiCard tone="lavender" label="Aktif Sınıf" value={classrooms} />
        <KpiCard tone="yellow" label="Aktif Paket" value={packages} />
        <KpiCard tone="blush" label="30g Ders" value={lessons30} />
        <KpiCard tone="mint" label="30g İşlem" value={payments30} />
      </div>

      <div className="grid gap-od-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Günlük Gelir (30 gün)</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChart data={revenueSeries} xKey="name" series={[{ key: "Gelir", label: "Gelir (₺)" }]} height={300} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Öğrenci Durumu</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={statusData} height={300} />
          </CardContent>
        </Card>
      </div>

      {examData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sınav Türü Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={examData} height={260} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
