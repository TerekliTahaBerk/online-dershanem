import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { TrendingUp, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { PageHeader } from "@/components/od/page-header";
import { KpiCard } from "@/components/od/charts/kpi-card";
import { Card, CardContent } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { EmptyState } from "@/components/od/feedback/empty-state";

export const dynamic = "force-dynamic";

export default async function StudentExamsPage() {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!student) return notFound();

  const exams = await prisma.studentExamResult.findMany({
    where: { studentId: student.id },
    orderBy: { takenAt: "desc" },
    take: 50,
    include: { subjectStats: true },
  });

  const last = exams[0];
  const avgNet =
    exams.length > 0
      ? (
          exams.reduce((acc, e) => acc + Number(e.net ?? 0), 0) / exams.length
        ).toFixed(2)
      : "—";
  const bestNet =
    exams.length > 0
      ? Math.max(...exams.map((e) => Number(e.net ?? 0))).toFixed(2)
      : "—";

  return (
    <div className="space-y-od-5">
      <PageHeader title="Denemelerim" description={`${exams.length} sonuç`} />

      <div className="grid gap-od-3 md:grid-cols-3">
        <KpiCard tone="lavender" label="Son Net" value={last?.net ? Number(last.net).toFixed(2) : "—"} />
        <KpiCard tone="sky" label="Ortalama Net" value={avgNet} />
        <KpiCard tone="mint" label="En Yüksek" value={bestNet} />
      </div>

      {exams.length === 0 ? (
        <EmptyState tone="lavender" icon={Trophy} title="Henüz deneme sonucu yok" />
      ) : (
        <div className="space-y-od-3">
          {exams.map((e) => (
            <Card key={e.id}>
              <CardContent className="space-y-od-2 p-od-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-od-body">{e.title}</div>
                    <div className="text-od-tiny text-od-mute">
                      {format(e.takenAt, "dd MMM yyyy", { locale: tr })} ·{" "}
                      <Badge tone="sky" size="sm">{e.assessmentType}</Badge>
                      {e.examType && <span className="ml-1 text-od-mute">· {e.examType}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-od-h3 font-bold text-pastel-mint-ink">
                      {Number(e.net ?? 0).toFixed(2)}
                    </div>
                    <div className="text-od-tiny text-od-mute">
                      D:{e.correctCount} Y:{e.wrongCount} B:{e.blankCount}
                    </div>
                  </div>
                </div>
                {e.subjectStats.length > 0 && (
                  <div className="flex flex-wrap gap-od-2 border-t border-od-border pt-od-2">
                    {e.subjectStats.map((s) => (
                      <Badge key={s.id} tone="neutral" size="sm">
                        {s.subject}: <span className="ml-1 font-bold">{Number(s.net ?? 0).toFixed(2)}</span>
                      </Badge>
                    ))}
                  </div>
                )}
                {e.ranking && (
                  <div className="inline-flex items-center gap-1 text-od-tiny text-pastel-peach-ink">
                    <TrendingUp className="h-3.5 w-3.5" /> Sıralama: {e.ranking.toLocaleString("tr-TR")}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
