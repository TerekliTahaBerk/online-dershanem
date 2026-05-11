import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { User, Mail, Phone, Target, School, MapPin, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { getParentWithChildren } from "@/lib/parent-context";
import { PageHeader } from "@/components/od/page-header";
import { KpiCard } from "@/components/od/charts/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";

export const dynamic = "force-dynamic";

export default async function ParentChildDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");
  const ctx = await getParentWithChildren(session.user.id);
  if (!ctx || !ctx.childIds.includes(id)) return notFound();

  const [child, lessons, attendances, lastExam, openAssignments] = await Promise.all([
    prisma.student.findUnique({ where: { id } }),
    prisma.lesson.count({ where: { studentId: id } }),
    prisma.attendance.findMany({
      where: { studentId: id, sessionDate: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
      select: { status: true },
    }),
    prisma.studentExamResult.findFirst({
      where: { studentId: id },
      orderBy: { takenAt: "desc" },
    }),
    prisma.assignment.count({
      where: {
        OR: [
          { studentId: id },
          { classroom: { students: { some: { studentId: id } } } },
        ],
        status: "PUBLISHED",
        submissions: { none: { studentId: id } },
      },
    }),
  ]);
  if (!child) return notFound();

  const present = attendances.filter((a) => a.status === "PRESENT").length;
  const rate = attendances.length ? Math.round((present / attendances.length) * 100) : null;

  return (
    <div className="space-y-od-5">
      <PageHeader title={child.fullName} description="Çocuk profili ve özet" />

      <div className="grid gap-od-3 md:grid-cols-4">
        <KpiCard tone="sky" label="Toplam Ders" value={lessons} />
        <KpiCard tone="mint" label="3 Aylık Katılım" value={rate != null ? `%${rate}` : "—"} />
        <KpiCard tone="yellow" label="Bekleyen Ödev" value={openAssignments} />
        <KpiCard tone="lavender" label="Son Net" value={lastExam?.net ? Number(lastExam.net).toFixed(2) : "—"} />
      </div>

      <div className="grid gap-od-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-od-2">
              <User className="h-4 w-4 text-pastel-sky-ink" /> Bilgiler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-od-2">
            <div className="flex items-center gap-od-2 text-od-mute">
              <Phone className="h-4 w-4" /> {child.phone}
            </div>
            {child.email && (
              <div className="flex items-center gap-od-2 text-od-mute">
                <Mail className="h-4 w-4" /> {child.email}
              </div>
            )}
            {(child.city || child.district) && (
              <div className="flex items-center gap-od-2 text-od-mute">
                <MapPin className="h-4 w-4" /> {[child.district, child.city].filter(Boolean).join(", ")}
              </div>
            )}
            {child.schoolName && (
              <div className="flex items-center gap-od-2 text-od-mute">
                <School className="h-4 w-4" /> {child.schoolName}
              </div>
            )}
            <div className="flex flex-wrap gap-od-2 pt-od-2">
              {child.classLevel && <Badge tone="sky" size="sm">{child.classLevel}</Badge>}
              {child.examType && <Badge tone="lavender" size="sm">{child.examType}</Badge>}
              <Badge tone={child.status === "ACTIVE" ? "mint" : "neutral"}>{child.status}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-od-2">
              <Target className="h-4 w-4 text-pastel-lavender-ink" /> Hedefler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-od-2 text-od-small">
            <Field label="Hedef" value={child.targetGoal} />
            <Field label="Hedef Üniversite" value={child.targetSchool} />
            <Field label="Hedef Sıralama" value={child.targetRanking} />
            <Field label="Mevcut Net" value={child.currentNet} />
            <Field label="Güçlü Dersler" value={child.strongLessons} />
            <Field label="Zayıf Dersler" value={child.weakLessons} />
            <Field label="Çalışma Saati" value={child.weeklyStudyHours} />
          </CardContent>
        </Card>
      </div>

      {lastExam && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-od-2">
              <TrendingUp className="h-4 w-4 text-pastel-mint-ink" /> Son Deneme
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="font-medium text-od-body">{lastExam.title}</div>
              <div className="text-od-tiny text-od-mute">
                {format(lastExam.takenAt, "dd MMM yyyy", { locale: tr })}
              </div>
            </div>
            <div className="text-right">
              <div className="text-od-h3 font-bold text-pastel-mint-ink">
                {Number(lastExam.net ?? 0).toFixed(2)}
              </div>
              <div className="text-od-tiny text-od-mute">
                D:{lastExam.correctCount} Y:{lastExam.wrongCount}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-od-2">
      <span className="text-od-mute">{label}</span>
      <span className="text-right font-medium text-od-ink">{value || "—"}</span>
    </div>
  );
}
