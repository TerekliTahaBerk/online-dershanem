import {
  Users,
  Wallet,
  GraduationCap,
  Inbox,
  CalendarDays,
  PackageOpen,
  Sparkles
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/od/page-header";
import { KpiCard } from "@/components/od/charts/kpi-card";
import { AreaChart, DonutChart } from "@/components/od/charts/charts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { Button } from "@/components/od/ui/button";
import { EmptyState } from "@/components/od/feedback/empty-state";

export const dynamic = "force-dynamic";

async function getMetrics() {
  const [
    activeStudents,
    newStudents30d,
    pendingPayments,
    todayLessons,
    activeTeachers,
    totalPackages
  ] = await Promise.all([
    prisma.student.count({ where: { status: { in: ["ACTIVE", "AT_RISK", "FOLLOW_UP"] } } }),
    prisma.student.count({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
    }),
    prisma.purchaseIntent.count({ where: { status: "PENDING" } }),
    prisma.lesson.count({
      where: {
        scheduledAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(24, 0, 0, 0))
        }
      }
    }).catch(() => 0),
    prisma.teacher.count({ where: { status: "ACTIVE" } }),
    prisma.package.count({ where: { isActive: true } })
  ]);

  return { activeStudents, newStudents30d, pendingPayments, todayLessons, activeTeachers, totalPackages };
}

// Mock trend data — Faz 1'de gerçek aggregate query'lerle değiştirilecek
const revenueTrend = Array.from({ length: 14 }, (_, i) => ({
  day: `${i + 1}`,
  Gelir: Math.round(8000 + Math.random() * 6000),
  Hedef: 12000
}));

const userDistribution = [
  { name: "Öğrenci", value: 64 },
  { name: "Veli", value: 22 },
  { name: "Öğretmen", value: 9 },
  { name: "Admin", value: 5 }
];

export default async function AdminV2Dashboard() {
  const m = await getMetrics();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Komuta Merkezi"
        description="OnlineDershanem'in tüm operasyonel verisi tek ekranda. Bu yeni panel v2 — Faz 0 (rebuild)."
        actions={
          <>
            <Badge tone="lavender" size="lg">
              <Sparkles className="h-3 w-3" /> v2 Beta
            </Badge>
            <Button variant="accent" size="md">Hızlı Eylem</Button>
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
          delta={{ value: 12, label: "geçen aya göre" }}
        />
        <KpiCard
          label="30g Yeni Kayıt"
          value={m.newStudents30d}
          icon={Sparkles}
          tone="lavender"
          delta={{ value: 8, label: "trend" }}
        />
        <KpiCard
          label="Bekleyen Ödeme"
          value={m.pendingPayments}
          icon={Wallet}
          tone="blush"
          delta={{ value: -3, label: "iyileşme" }}
        />
        <KpiCard
          label="Bugünkü Ders"
          value={m.todayLessons}
          icon={CalendarDays}
          tone="sky"
          hint="Programlanmış"
        />
        <KpiCard
          label="Aktif Öğretmen"
          value={m.activeTeachers}
          icon={GraduationCap}
          tone="yellow"
        />
        <KpiCard
          label="Aktif Paket"
          value={m.totalPackages}
          icon={PackageOpen}
          tone="neutral"
        />
      </section>

      {/* Charts */}
      <section className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Gelir Trendi · Son 14 Gün</CardTitle>
            <CardDescription>Günlük tahsilat ve hedef karşılaştırması (örnek veri).</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaChart
              data={revenueTrend}
              xKey="day"
              series={[
                { key: "Gelir", label: "Gelir (₺)", color: "#3A4A2C" },
                { key: "Hedef", label: "Hedef (₺)", color: "#FCEDB4" }
              ]}
              height={260}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kullanıcı Dağılımı</CardTitle>
            <CardDescription>Aktif rol bazlı.</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart data={userDistribution} height={260} />
          </CardContent>
        </Card>
      </section>

      {/* Activity / Inbox feed placeholder */}
      <section className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Realtime Aktivite</CardTitle>
            <CardDescription>Tüm sistemde olan biten — Faz 4'te Pusher ile canlı.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Inbox}
              tone="sky"
              title="Henüz aktivite yok"
              description="Sistem olayları (ödeme, kayıt, ders, ödev) burada akacak. Realtime layer Faz 4'te entegre edilecek."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Skoru Yüksek Öğrenciler</CardTitle>
            <CardDescription>Devamsızlık + düşük net + ödeme gecikmesi.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Users}
              tone="blush"
              title="Risk modeli henüz aktif değil"
              description="Faz 3'te tag + metric snapshot kombinasyonuyla otomatik hesaplanacak."
              action={{ label: "CRM'e git", href: "/v2/admin/ogrenciler" }}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
