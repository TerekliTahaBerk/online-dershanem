import { redirect } from "next/navigation";
import Link from "next/link";
import { Fragment } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  School,
  Users,
  CalendarDays,
  ClipboardList,
  CheckSquare,
  ArrowRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { PageHeader } from "@/components/od/page-header";
import { KpiCard } from "@/components/od/charts/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { EmptyState } from "@/components/od/feedback/empty-state";
import { loadDashboardLayout } from "@/lib/services/dashboard-layout/loader";
import { TEACHER_WIDGETS } from "@/lib/services/dashboard-layout/types";
import { WidgetManager } from "@/components/od/dashboard/widget-manager";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "sky" | "mint" | "blush" | "neutral"> = {
  SCHEDULED: "sky",
  COMPLETED: "mint",
  CANCELLED: "blush",
};

export default async function TeacherDashboardPage() {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    select: { id: true, fullName: true, subjects: true },
  });
  if (!teacher) {
    return (
      <div className="space-y-od-5">
        <PageHeader title="Hoş geldin" description="Hesabın bir öğretmen profiliyle eşleşmemiş." />
        <EmptyState tone="blush" icon={Users} title="Profil bulunamadı" description="Yöneticinle iletişime geç." />
      </div>
    );
  }

  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
  const endOfDay = new Date(new Date().setHours(24, 0, 0, 0));
  const next30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [todayCount, weekCount, classroomCount, studentCount, pendingAssignments, todayLessons] =
    await Promise.all([
      prisma.lesson.count({
        where: { teacherId: teacher.id, scheduledAt: { gte: startOfDay, lt: endOfDay } },
      }),
      prisma.lesson.count({
        where: {
          teacherId: teacher.id,
          scheduledAt: { gte: new Date(), lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.classroomTeacher.count({ where: { teacherId: teacher.id } }),
      prisma.lesson.findMany({
        where: { teacherId: teacher.id },
        select: { studentId: true },
        distinct: ["studentId"],
      }).then((rows) => rows.length),
      prisma.assignment.count({
        where: { teacherId: teacher.id, status: "PUBLISHED" },
      }),
      prisma.lesson.findMany({
        where: { teacherId: teacher.id, scheduledAt: { gte: startOfDay, lt: endOfDay } },
        orderBy: { scheduledAt: "asc" },
        include: {
          student: { select: { id: true, fullName: true } },
          classroom: { select: { id: true, name: true } },
        },
      }),
    ]);

  const layout = await loadDashboardLayout("TEACHER", session.user.id);
  const visible = layout.items.filter((it) => it.visible);
  const kpiOrder = visible.filter((it) => it.key.startsWith("kpi.")).map((it) => it.key);
  const blockOrder = visible.filter((it) => !it.key.startsWith("kpi.")).map((it) => it.key);

  const kpiWidgets: Record<string, React.ReactNode> = {
    "kpi.todayLessons": <KpiCard tone="sky" label="Bugün Ders" value={todayCount} />,
    "kpi.totalStudents": <KpiCard tone="yellow" label="Aktif Öğrenci" value={studentCount} />,
    "kpi.openAssignments": <KpiCard tone="lavender" label="Açık Ödev" value={pendingAssignments} />,
  };

  const blockWidgets: Record<string, React.ReactNode> = {
    "list.upcomingLessons": (
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-od-2">
            <CalendarDays className="h-4 w-4 text-pastel-sky-ink" /> Bugünün Dersleri
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-od-border p-0">
          {todayLessons.length === 0 ? (
            <p className="p-od-3 text-od-tiny text-od-mute">Bugün için ders planlanmamış.</p>
          ) : (
            todayLessons.map((l) => (
              <Link
                key={l.id}
                href={`/v2/ogretmen/dersler/${l.id}`}
                className="flex items-center justify-between p-od-3 hover:bg-od-subtle"
              >
                <div>
                  <div className="font-medium text-od-body">{l.title ?? l.subject ?? "—"}</div>
                  <div className="text-od-tiny text-od-mute">
                    {l.student.fullName}
                    {l.classroom && ` · ${l.classroom.name}`}
                  </div>
                </div>
                <div className="flex items-center gap-od-2">
                  <Badge tone={STATUS_TONE[l.status] ?? "neutral"} size="sm">{l.status}</Badge>
                  <span className="text-od-tiny text-od-mute">
                    {format(l.scheduledAt, "HH:mm", { locale: tr })}
                  </span>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    ),
    "list.pendingSubmissions": (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-od-2">
            <ClipboardList className="h-4 w-4 text-pastel-blush-ink" /> Aktif Ödevler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-od-2">
          <div className="text-od-h2 font-bold text-pastel-blush-ink">{pendingAssignments}</div>
          <p className="text-od-tiny text-od-mute">Yayında olan ödev sayısı.</p>
          <Link
            href="/v2/ogretmen/odevler"
            className="inline-flex items-center gap-1 text-od-tiny text-pastel-sky-ink hover:underline"
          >
            Ödevleri yönet <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardContent>
      </Card>
    ),
  };

  return (
    <div className="space-y-od-5">
      <PageHeader
        title={`Merhaba, ${teacher.fullName.split(" ")[0]} 👋`}
        description={teacher.subjects}
        actions={
          <WidgetManager
            panel="TEACHER"
            initialItems={layout.items}
            catalog={TEACHER_WIDGETS}
          />
        }
      />

      <div className="grid gap-od-3 md:grid-cols-2 lg:grid-cols-4">
        {kpiOrder.map((key) => (kpiWidgets[key] ? <Fragment key={key}>{kpiWidgets[key]}</Fragment> : null))}
      </div>

      <div className="grid gap-od-4 lg:grid-cols-3">
        {blockOrder.map((key) => (blockWidgets[key] ? <Fragment key={key}>{blockWidgets[key]}</Fragment> : null))}
      </div>

      <div className="grid gap-od-3 md:grid-cols-3">
        <QuickLink href="/v2/ogretmen/siniflarim" icon={School} label="Sınıflarım" />
        <QuickLink href="/v2/ogretmen/yoklama" icon={CheckSquare} label="Yoklama Al" />
        <QuickLink href="/v2/ogretmen/ogrencilerim" icon={Users} label="Öğrencilerim" />
      </div>
    </div>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-od border border-od-border bg-od-surface p-od-3 hover:bg-od-subtle"
    >
      <span className="flex items-center gap-od-2 text-od-body font-medium">
        <Icon className="h-4 w-4 text-pastel-sky-ink" />
        {label}
      </span>
      <ArrowRight className="h-4 w-4 text-od-mute" />
    </Link>
  );
}
