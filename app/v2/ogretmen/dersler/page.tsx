import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarDays, Video } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { EmptyState } from "@/components/od/feedback/empty-state";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "sky" | "mint" | "blush" | "neutral"> = {
  SCHEDULED: "sky",
  COMPLETED: "mint",
  CANCELLED: "blush",
};

export default async function TeacherLessonsPage() {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!teacher) return notFound();

  const lessons = await prisma.lesson.findMany({
    where: { teacherId: teacher.id },
    orderBy: { scheduledAt: "desc" },
    take: 100,
    include: {
      student: { select: { id: true, fullName: true } },
      classroom: { select: { id: true, name: true } },
    },
  });

  return (
    <div className="space-y-od-5">
      <PageHeader title="Derslerim" description={`Son ${lessons.length} ders`} />
      {lessons.length === 0 ? (
        <EmptyState tone="sky" icon={CalendarDays} title="Henüz ders yok" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-od-small">
              <thead className="border-b border-od-border bg-od-subtle text-left text-od-tiny uppercase text-od-mute">
                <tr>
                  <th className="px-od-4 py-od-2">Tarih</th>
                  <th className="px-od-4 py-od-2">Başlık</th>
                  <th className="px-od-4 py-od-2">Öğrenci / Sınıf</th>
                  <th className="px-od-4 py-od-2">Süre</th>
                  <th className="px-od-4 py-od-2">Durum</th>
                  <th className="px-od-4 py-od-2"></th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((l) => (
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
                    <td className="px-od-4 py-od-2 text-od-mute">{l.duration} dk</td>
                    <td className="px-od-4 py-od-2">
                      <Badge tone={STATUS_TONE[l.status] ?? "neutral"} size="sm">
                        {l.status}
                      </Badge>
                    </td>
                    <td className="px-od-4 py-od-2">
                      {l.googleMeetLink && (
                        <a
                          href={l.googleMeetLink}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex items-center gap-1 text-od-tiny text-pastel-sky-ink"
                        >
                          <Video className="h-3.5 w-3.5" /> Meet
                        </a>
                      )}
                    </td>
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
