import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Users,
  CalendarDays,
  ClipboardList,
  Wallet,
  ArrowRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { getParentWithChildren } from "@/lib/parent-context";
import { PageHeader } from "@/components/od/page-header";
import { KpiCard } from "@/components/od/charts/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { EmptyState } from "@/components/od/feedback/empty-state";

export const dynamic = "force-dynamic";

export default async function ParentDashboardPage() {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");

  const ctx = await getParentWithChildren(session.user.id);
  if (!ctx) {
    return (
      <div className="space-y-od-5">
        <PageHeader title="Hoş geldin" description="Hesabın bir veli profiliyle eşleşmemiş." />
        <EmptyState tone="blush" icon={Users} title="Profil bulunamadı" description="Yöneticinle iletişime geç." />
      </div>
    );
  }
  const { parent, childIds } = ctx;
  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
  const next7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [weekLessons, openAssignments, monthAttendances, recentLessons] = await Promise.all([
    prisma.lesson.count({
      where: { studentId: { in: childIds }, scheduledAt: { gte: startOfDay, lte: next7 } },
    }),
    prisma.assignment.count({
      where: {
        OR: [
          { studentId: { in: childIds } },
          { classroom: { students: { some: { studentId: { in: childIds } } } } },
        ],
        status: "PUBLISHED",
      },
    }),
    prisma.attendance.findMany({
      where: {
        studentId: { in: childIds },
        sessionDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { status: true },
    }),
    prisma.lesson.findMany({
      where: { studentId: { in: childIds }, scheduledAt: { gte: startOfDay, lte: next7 } },
      orderBy: { scheduledAt: "asc" },
      take: 8,
      include: {
        student: { select: { fullName: true } },
        teacher: { select: { fullName: true } },
      },
    }),
  ]);

  const present = monthAttendances.filter((a) => a.status === "PRESENT").length;
  const rate =
    monthAttendances.length > 0
      ? Math.round((present / monthAttendances.length) * 100)
      : null;

  return (
    <div className="space-y-od-5">
      <PageHeader
        title={`Merhaba, ${parent.fullName.split(" ")[0]} 👋`}
        description={`${parent.students.length} çocuk takipte`}
      />

      <div className="grid gap-od-3 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard tone="lavender" label="Çocuklarım" value={parent.students.length} />
        <KpiCard tone="sky" label="Bu Hafta Ders" value={weekLessons} />
        <KpiCard tone="yellow" label="Aktif Ödev" value={openAssignments} />
        <KpiCard tone="mint" label="Aylık Katılım" value={rate != null ? `%${rate}` : "—"} />
      </div>

      <div className="grid gap-od-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-od-2">
              <CalendarDays className="h-4 w-4 text-pastel-sky-ink" /> Yaklaşan Dersler
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-od-border p-0">
            {recentLessons.length === 0 ? (
              <p className="p-od-3 text-od-tiny text-od-mute">Bu hafta planlı ders yok.</p>
            ) : (
              recentLessons.map((l) => (
                <div key={l.id} className="flex items-center justify-between p-od-3">
                  <div>
                    <div className="font-medium text-od-body">{l.title ?? l.subject ?? "—"}</div>
                    <div className="text-od-tiny text-od-mute">
                      {l.student.fullName} · {l.teacher.fullName}
                    </div>
                  </div>
                  <span className="text-od-tiny text-od-mute">
                    {format(l.scheduledAt, "dd MMM HH:mm", { locale: tr })}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-od-2">
              <Users className="h-4 w-4 text-pastel-lavender-ink" /> Çocuklarım
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-od-2">
            {parent.students.map((ps) => (
              <Link
                key={ps.studentId}
                href={`/v2/veli/cocuklarim/${ps.studentId}`}
                className="block rounded-od border border-od-border bg-od-subtle p-od-2 hover:bg-od-surface"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-od-body">{ps.student.fullName}</span>
                  <ArrowRight className="h-4 w-4 text-od-mute" />
                </div>
                <div className="mt-1 flex flex-wrap gap-1 text-od-tiny">
                  {ps.student.classLevel && <Badge tone="sky" size="sm">{ps.student.classLevel}</Badge>}
                  {ps.student.examType && <Badge tone="lavender" size="sm">{ps.student.examType}</Badge>}
                  {ps.relationship && <Badge tone="neutral" size="sm">{ps.relationship}</Badge>}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-od-3 md:grid-cols-3">
        <QuickLink href="/v2/veli/odevler" icon={ClipboardList} label="Ödevler" />
        <QuickLink href="/v2/veli/devamsizlik" icon={CalendarDays} label="Devamsızlık" />
        <QuickLink href="/v2/veli/odemeler" icon={Wallet} label="Ödemeler" />
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
