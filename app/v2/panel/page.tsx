import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  CalendarDays,
  ClipboardList,
  Target,
  TrendingUp,
  ArrowRight,
  BookOpen,
  Video,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { PageHeader } from "@/components/od/page-header";
import { KpiCard } from "@/components/od/charts/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { EmptyState } from "@/components/od/feedback/empty-state";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: { id: true, fullName: true, examType: true, classLevel: true, targetGoal: true },
  });
  if (!student) {
    return (
      <div className="space-y-od-5">
        <PageHeader title="Hoş geldin" description="Hesabın bir öğrenci profiliyle eşleşmemiş." />
        <EmptyState tone="blush" icon={Target} title="Profil bulunamadı" description="Yöneticinle iletişime geç." />
      </div>
    );
  }

  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
  const next7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [upcomingLessons, openAssignments, lastExam, weekLessonCount, pendingSubs] = await Promise.all([
    prisma.lesson.findMany({
      where: { studentId: student.id, scheduledAt: { gte: startOfDay, lte: next7 } },
      orderBy: { scheduledAt: "asc" },
      take: 6,
      include: { teacher: { select: { fullName: true } } },
    }),
    prisma.assignment.findMany({
      where: {
        OR: [
          { studentId: student.id },
          { classroom: { students: { some: { studentId: student.id } } } },
        ],
        status: "PUBLISHED",
        submissions: { none: { studentId: student.id } },
      },
      orderBy: { dueAt: "asc" },
      take: 5,
      include: { teacher: { select: { fullName: true } } },
    }),
    prisma.studentExamResult.findFirst({
      where: { studentId: student.id },
      orderBy: { takenAt: "desc" },
    }),
    prisma.lesson.count({
      where: { studentId: student.id, scheduledAt: { gte: startOfDay, lte: next7 } },
    }),
    prisma.assignmentSubmission.count({
      where: { studentId: student.id, status: "PENDING" },
    }),
  ]);

  return (
    <div className="space-y-od-5">
      <PageHeader
        title={`Hoş geldin, ${student.fullName.split(" ")[0]} 👋`}
        description={[student.classLevel, student.examType].filter(Boolean).join(" · ") || "Öğrenci paneli"}
      />

      <div className="grid gap-od-3 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard tone="sky" label="Bu Hafta Ders" value={weekLessonCount} />
        <KpiCard tone="yellow" label="Bekleyen Ödev" value={openAssignments.length} />
        <KpiCard tone="mint" label="Tamamlanan" value={pendingSubs} />
        <KpiCard
          tone="lavender"
          label="Son Deneme Net"
          value={lastExam?.net ? Number(lastExam.net).toFixed(2) : "—"}
        />
      </div>

      <div className="grid gap-od-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-od-2">
              <CalendarDays className="h-4 w-4 text-pastel-sky-ink" /> Yaklaşan Dersler
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-od-border p-0">
            {upcomingLessons.length === 0 ? (
              <p className="p-od-3 text-od-tiny text-od-mute">Bu hafta planlı ders yok.</p>
            ) : (
              upcomingLessons.map((l) => (
                <div key={l.id} className="flex items-center justify-between p-od-3">
                  <div>
                    <div className="font-medium text-od-body">{l.title ?? l.subject ?? "—"}</div>
                    <div className="text-od-tiny text-od-mute">
                      {l.teacher.fullName} · {format(l.scheduledAt, "dd MMM HH:mm", { locale: tr })}
                    </div>
                  </div>
                  {l.googleMeetLink && (
                    <a
                      href={l.googleMeetLink}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-1 text-od-tiny text-pastel-sky-ink hover:underline"
                    >
                      <Video className="h-3.5 w-3.5" /> Katıl
                    </a>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-od-2">
              <Target className="h-4 w-4 text-pastel-lavender-ink" /> Hedefim
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-od-2">
            <p className="text-od-body font-medium">{student.targetGoal ?? "Henüz belirlenmemiş"}</p>
            {lastExam && (
              <div className="rounded-od border border-od-border bg-od-subtle p-od-2 text-od-tiny">
                <div className="flex items-center gap-1 text-od-mute">
                  <TrendingUp className="h-3.5 w-3.5" /> Son sonuç: {lastExam.title}
                </div>
                <div className="mt-1 font-medium text-od-ink">
                  Net: {Number(lastExam.net ?? 0).toFixed(2)} · D:{lastExam.correctCount} Y:{lastExam.wrongCount}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-od-2">
            <ClipboardList className="h-4 w-4 text-pastel-peach-ink" /> Bekleyen Ödevler
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-od-border p-0">
          {openAssignments.length === 0 ? (
            <p className="p-od-3 text-od-tiny text-od-mute">Bekleyen ödev yok 🎉</p>
          ) : (
            openAssignments.map((a) => (
              <Link
                key={a.id}
                href={`/v2/panel/odevler/${a.id}`}
                className="flex items-center justify-between p-od-3 hover:bg-od-subtle"
              >
                <div>
                  <div className="font-medium text-od-body">{a.title}</div>
                  <div className="text-od-tiny text-od-mute">{a.teacher.fullName}</div>
                </div>
                <div className="flex items-center gap-od-2">
                  {a.dueAt && (
                    <Badge tone="blush" size="sm">
                      Son: {format(a.dueAt, "dd MMM", { locale: tr })}
                    </Badge>
                  )}
                  <ArrowRight className="h-4 w-4 text-od-mute" />
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
