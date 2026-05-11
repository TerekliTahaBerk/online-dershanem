import {
  Users,
  Wallet,
  GraduationCap,
  CalendarDays,
  PackageOpen,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Activity,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow, startOfDay, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/od/page-header";
import { KpiCard } from "@/components/od/charts/kpi-card";
import { AreaChart, DonutChart } from "@/components/od/charts/charts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { Button } from "@/components/od/ui/button";
import { EmptyState } from "@/components/od/feedback/empty-state";

export const dynamic = "force-dynamic";

function fmtTL(kurus: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
  }).format(kurus / 100);
}

async function getMetrics() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const since30 = subDays(todayStart, 30);
  const since60 = subDays(todayStart, 60);
  const since14 = subDays(todayStart, 13); // 14 days inclusive

  const [
    activeStudents,
    newStudents30d,
    newStudents30to60d,
    pendingPayments,
    todayLessons,
    activeTeachers,
    totalPackages,
    income30,
    income30to60,
    accountingRows14d,
    enrollment30d,
    roleCounts,
    teacherWorkload,
    riskStudents,
    recentAudit,
  ] = await Promise.all([
    prisma.student.count({ where: { status: { in: ["ACTIVE", "AT_RISK", "FOLLOW_UP"] } } }),
    prisma.student.count({ where: { createdAt: { gte: since30 } } }),
    prisma.student.count({ where: { createdAt: { gte: since60, lt: since30 } } }),
    prisma.purchaseIntent.count({ where: { status: "PENDING" } }),
    prisma.lesson.count({ where: { scheduledAt: { gte: todayStart, lt: tomorrow } } }),
    prisma.teacher.count({ where: { status: "ACTIVE" } }),
    prisma.package.count({ where: { isActive: true } }),
    prisma.accountingEntry.aggregate({
      where: { type: "INCOME", occurredAt: { gte: since30 } },
      _sum: { amount: true },
    }),
    prisma.accountingEntry.aggregate({
      where: { type: "INCOME", occurredAt: { gte: since60, lt: since30 } },
      _sum: { amount: true },
    }),
    prisma.accountingEntry.findMany({
      where: { occurredAt: { gte: since14 } },
      select: { type: true, amount: true, occurredAt: true },
    }),
    prisma.student.findMany({
      where: { createdAt: { gte: since30 } },
      select: { createdAt: true },
    }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        fullName: true,
        subjects: true,
        _count: { select: { lessons: { where: { scheduledAt: { gte: since30 } } } } },
      },
      orderBy: { lessons: { _count: "desc" } },
      take: 5,
    }),
    prisma.student.findMany({
      where: { status: "AT_RISK" },
      select: {
        id: true,
        fullName: true,
        classLevel: true,
        examType: true,
        city: true,
        _count: { select: { lessons: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        action: true,
        entityType: true,
        summary: true,
        createdAt: true,
        actor: { select: { name: true, email: true } },
      },
    }),
  ]);

  // Build 14-day series
  const dayMap = new Map<string, { income: number; expense: number }>();
  for (let i = 0; i < 14; i++) {
    const d = subDays(todayStart, 13 - i);
    const key = format(d, "yyyy-MM-dd");
    dayMap.set(key, { income: 0, expense: 0 });
  }
  for (const r of accountingRows14d) {
    const key = format(r.occurredAt, "yyyy-MM-dd");
    const slot = dayMap.get(key);
    if (!slot) continue;
    if (r.type === "INCOME") slot.income += r.amount;
    else slot.expense += r.amount;
  }
  const revenueTrend = Array.from(dayMap.entries()).map(([key, v]) => ({
    day: format(new Date(key), "dd MMM", { locale: tr }),
    Gelir: Math.round(v.income / 100),
    Gider: Math.round(v.expense / 100),
  }));

  // Enrollment 30-day series (count per day)
  const enrollMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = subDays(todayStart, 29 - i);
    enrollMap.set(format(d, "yyyy-MM-dd"), 0);
  }
  for (const s of enrollment30d) {
    const key = format(s.createdAt, "yyyy-MM-dd");
    enrollMap.set(key, (enrollMap.get(key) ?? 0) + 1);
  }
  const enrollmentTrend = Array.from(enrollMap.entries()).map(([key, v]) => ({
    day: format(new Date(key), "dd MMM", { locale: tr }),
    Kayıt: v,
  }));

  const userDistribution = roleCounts.map((r) => ({
    name:
      r.role === "ADMIN" ? "Admin"
      : r.role === "TEACHER" ? "Öğretmen"
      : r.role === "STUDENT" ? "Öğrenci"
      : r.role === "PARENT" ? "Veli"
      : r.role,
    value: r._count._all,
  }));

  const incomeNow = income30._sum.amount ?? 0;
  const incomePrev = income30to60._sum.amount ?? 0;
  const incomeDelta = incomePrev > 0
    ? Math.round(((incomeNow - incomePrev) / incomePrev) * 100)
    : null;

  const enrollDelta = newStudents30to60d > 0
    ? Math.round(((newStudents30d - newStudents30to60d) / newStudents30to60d) * 100)
    : null;

  return {
    activeStudents,
    newStudents30d,
    pendingPayments,
    todayLessons,
    activeTeachers,
    totalPackages,
    incomeNow,
    incomeDelta,
    enrollDelta,
    revenueTrend,
    enrollmentTrend,
    userDistribution,
    teacherWorkload,
    riskStudents,
    recentAudit,
  };
}

const ACTION_LABEL: Record<string, string> = {
  create: "oluşturdu",
  update: "güncelledi",
  delete: "sildi",
  submit: "teslim etti",
  grade: "notlandırdı",
  record: "kaydetti",
};

export default async function AdminV2Dashboard() {
  const m = await getMetrics();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Komuta Merkezi"
        description="OnlineDershanem operasyonel özet · canlı veri"
        actions={
          <>
            <Badge tone="lavender" size="lg">
              <Sparkles className="h-3 w-3" /> v2
            </Badge>
            <Link href="/v2/admin/ogrenciler/yeni">
              <Button variant="accent" size="md">Yeni Öğrenci</Button>
            </Link>
          </>
        }
      />

      {/* KPI grid */}
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Aktif Öğrenci"
          value={m.activeStudents}
          icon={Users}
          tone="mint"
        />
        <KpiCard
          label="30g Yeni Kayıt"
          value={m.newStudents30d}
          icon={Sparkles}
          tone="lavender"
          delta={m.enrollDelta !== null ? { value: m.enrollDelta, label: "öncekine göre" } : undefined}
        />
        <KpiCard
          label="30g Gelir"
          value={fmtTL(m.incomeNow)}
          icon={Wallet}
          tone="mint"
          delta={m.incomeDelta !== null ? { value: m.incomeDelta, label: "öncekine göre" } : undefined}
        />
        <KpiCard
          label="Bekleyen Ödeme"
          value={m.pendingPayments}
          icon={AlertTriangle}
          tone={m.pendingPayments > 0 ? "blush" : "neutral"}
        />
        <KpiCard
          label="Bugünkü Ders"
          value={m.todayLessons}
          icon={CalendarDays}
          tone="sky"
        />
        <KpiCard
          label="Aktif Öğretmen"
          value={m.activeTeachers}
          icon={GraduationCap}
          tone="yellow"
        />
      </section>

      {/* Charts row 1 */}
      <section className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Gelir / Gider · Son 14 Gün</CardTitle>
            <CardDescription>Günlük tahsilat ve harcama (TL)</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaChart
              data={m.revenueTrend}
              xKey="day"
              series={[
                { key: "Gelir", label: "Gelir (₺)", color: "#3A4A2C" },
                { key: "Gider", label: "Gider (₺)", color: "#D9716E" },
              ]}
              height={260}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kullanıcı Dağılımı</CardTitle>
            <CardDescription>Tüm sistem · rol bazlı</CardDescription>
          </CardHeader>
          <CardContent>
            {m.userDistribution.length === 0 ? (
              <EmptyState tone="neutral" icon={Users} title="Veri yok" />
            ) : (
              <DonutChart data={m.userDistribution} height={260} />
            )}
          </CardContent>
        </Card>
      </section>

      {/* Charts row 2 */}
      <section className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Yeni Öğrenci Kayıtları · Son 30 Gün</CardTitle>
            <CardDescription>Günlük kayıt sayısı</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaChart
              data={m.enrollmentTrend}
              xKey="day"
              series={[
                { key: "Kayıt", label: "Yeni kayıt", color: "#A8C8D8" },
              ]}
              height={240}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Öğretmen Yoğunluğu</CardTitle>
            <CardDescription>Son 30 günde en çok ders veren · Top 5</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {m.teacherWorkload.length === 0 ? (
              <EmptyState tone="neutral" icon={GraduationCap} title="Veri yok" />
            ) : (
              <ul className="divide-y divide-od-border/60">
                {m.teacherWorkload.map((t, i) => (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pastel-yellow-soft text-[11px] font-bold text-pastel-yellow-ink">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-od-small font-medium text-od-ink truncate">
                        {t.fullName}
                      </p>
                      <p className="text-od-tiny text-od-mute truncate">
                        {t.subjects}
                      </p>
                    </div>
                    <Badge tone="sky" size="sm">{t._count.lessons} ders</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Bottom row: risk + activity */}
      <section className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Risk Skoru Yüksek Öğrenciler</CardTitle>
                <CardDescription>AT_RISK statüsündekiler</CardDescription>
              </div>
              <Link href="/v2/admin/ogrenciler?status=AT_RISK">
                <Button variant="ghost" size="sm">
                  Tümü <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {m.riskStudents.length === 0 ? (
              <EmptyState
                tone="mint"
                icon={Users}
                title="Risk altında öğrenci yok"
                description="Tüm öğrenciler aktif veya takip durumunda."
              />
            ) : (
              <ul className="divide-y divide-od-border/60">
                {m.riskStudents.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/v2/admin/ogrenciler/${s.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-od-subtle/60"
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0 text-pastel-blush-ink" />
                      <div className="min-w-0 flex-1">
                        <p className="text-od-small font-medium text-od-ink truncate">
                          {s.fullName}
                        </p>
                        <p className="text-od-tiny text-od-mute truncate">
                          {[s.classLevel, s.examType, s.city]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </p>
                      </div>
                      <Badge tone="neutral" size="sm">{s._count.lessons} ders</Badge>
                      <ChevronRight className="h-3.5 w-3.5 text-od-mute-2" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Son Sistem Aktivitesi</CardTitle>
            <CardDescription>Audit log · son 10 işlem</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {m.recentAudit.length === 0 ? (
              <EmptyState tone="sky" icon={Activity} title="Henüz aktivite yok" />
            ) : (
              <ul className="divide-y divide-od-border/60">
                {m.recentAudit.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 px-4 py-2.5">
                    <Activity className="mt-0.5 h-4 w-4 shrink-0 text-od-mute" />
                    <div className="min-w-0 flex-1">
                      <p className="text-od-small text-od-ink">
                        <span className="font-medium">
                          {a.actor?.name ?? a.actor?.email ?? "Sistem"}
                        </span>{" "}
                        <span className="text-od-mute">
                          bir {a.entityType} {ACTION_LABEL[a.action] ?? a.action}
                        </span>
                      </p>
                      {a.summary && (
                        <p className="text-od-tiny text-od-mute-2 truncate">
                          {a.summary}
                        </p>
                      )}
                      <p className="text-[10px] text-od-mute-2">
                        {formatDistanceToNow(a.createdAt, {
                          addSuffix: true,
                          locale: tr,
                        })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
