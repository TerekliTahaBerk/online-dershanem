import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CheckSquare } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { PageHeader } from "@/components/od/page-header";
import { KpiCard } from "@/components/od/charts/kpi-card";
import { Card, CardContent } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { EmptyState } from "@/components/od/feedback/empty-state";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "mint" | "blush" | "yellow" | "neutral"> = {
  PRESENT: "mint",
  ABSENT: "blush",
  LATE: "yellow",
  EXCUSED: "neutral",
};

export default async function StudentAttendancePage() {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!student) return notFound();

  const records = await prisma.attendance.findMany({
    where: { studentId: student.id },
    orderBy: { sessionDate: "desc" },
    take: 100,
    include: {
      lesson: { select: { title: true, subject: true } },
      classroom: { select: { name: true } },
    },
  });

  const present = records.filter((r) => r.status === "PRESENT").length;
  const absent = records.filter((r) => r.status === "ABSENT").length;
  const late = records.filter((r) => r.status === "LATE").length;
  const total = records.length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div className="space-y-od-5">
      <PageHeader title="Devamsızlık" description="Son 100 ders kaydı" />

      <div className="grid gap-od-3 md:grid-cols-4">
        <KpiCard tone="mint" label="Katılım" value={`%${rate}`} />
        <KpiCard tone="sky" label="Var" value={present} />
        <KpiCard tone="yellow" label="Geç" value={late} />
        <KpiCard tone="blush" label="Yok" value={absent} />
      </div>

      {records.length === 0 ? (
        <EmptyState tone="mint" icon={CheckSquare} title="Henüz kayıt yok" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-od-small">
              <thead className="border-b border-od-border bg-od-subtle text-left text-od-tiny uppercase text-od-mute">
                <tr>
                  <th className="px-od-4 py-od-2">Tarih</th>
                  <th className="px-od-4 py-od-2">Ders / Sınıf</th>
                  <th className="px-od-4 py-od-2">Durum</th>
                  <th className="px-od-4 py-od-2">Not</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-od-border/60">
                    <td className="px-od-4 py-od-2 text-od-tiny text-od-mute">
                      {format(r.sessionDate, "dd MMM yyyy", { locale: tr })}
                    </td>
                    <td className="px-od-4 py-od-2 text-od-ink">
                      {r.lesson?.title ?? r.lesson?.subject ?? r.classroom?.name ?? "—"}
                    </td>
                    <td className="px-od-4 py-od-2">
                      <Badge tone={STATUS_TONE[r.status] ?? "neutral"} size="sm">{r.status}</Badge>
                      {r.minutesLate ? <span className="ml-od-2 text-od-tiny text-od-mute">+{r.minutesLate}dk</span> : null}
                    </td>
                    <td className="px-od-4 py-od-2 text-od-tiny text-od-mute">{r.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
