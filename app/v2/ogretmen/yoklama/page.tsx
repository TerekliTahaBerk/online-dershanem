import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CheckSquare, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { PageHeader } from "@/components/od/page-header";
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

export default async function TeacherAttendancePage() {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!teacher) return notFound();

  // Last 30 days lessons that need attendance (today + yesterday primary)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const lessons = await prisma.lesson.findMany({
    where: { teacherId: teacher.id, scheduledAt: { gte: since } },
    orderBy: { scheduledAt: "desc" },
    take: 100,
    include: {
      student: { select: { id: true, fullName: true } },
      classroom: { select: { id: true, name: true } },
      attendances: { select: { status: true } },
    },
  });

  return (
    <div className="space-y-od-5">
      <PageHeader title="Yoklama" description="Son 30 günün dersleri" />
      {lessons.length === 0 ? (
        <EmptyState tone="mint" icon={CheckSquare} title="Yoklamaya açık ders yok" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-od-small">
              <thead className="border-b border-od-border bg-od-subtle text-left text-od-tiny uppercase text-od-mute">
                <tr>
                  <th className="px-od-4 py-od-2">Tarih</th>
                  <th className="px-od-4 py-od-2">Ders</th>
                  <th className="px-od-4 py-od-2">Öğrenci / Sınıf</th>
                  <th className="px-od-4 py-od-2">Yoklama</th>
                  <th className="px-od-4 py-od-2"></th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((l) => {
                  const att = l.attendances[0];
                  return (
                    <tr key={l.id} className="border-b border-od-border/60 hover:bg-od-subtle">
                      <td className="px-od-4 py-od-2 text-od-tiny text-od-mute">
                        {format(l.scheduledAt, "dd MMM yyyy HH:mm", { locale: tr })}
                      </td>
                      <td className="px-od-4 py-od-2 font-medium text-od-ink">
                        {l.title ?? l.subject ?? "—"}
                      </td>
                      <td className="px-od-4 py-od-2 text-od-mute">
                        {l.student.fullName}
                        {l.classroom && ` · ${l.classroom.name}`}
                      </td>
                      <td className="px-od-4 py-od-2">
                        {att ? (
                          <Badge tone={STATUS_TONE[att.status] ?? "neutral"} size="sm">{att.status}</Badge>
                        ) : (
                          <Badge tone="neutral" size="sm">—</Badge>
                        )}
                      </td>
                      <td className="px-od-4 py-od-2">
                        <Link
                          href={`/v2/ogretmen/dersler/${l.id}`}
                          className="inline-flex items-center gap-1 text-od-tiny text-pastel-sky-ink"
                        >
                          Yoklama Al <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
