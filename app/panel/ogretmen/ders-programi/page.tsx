import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/panel-teacher";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { LessonLifecycleButtons } from "@/components/panel/lessons/lifecycle-buttons";
import { lessonStatusLabel, lessonStatusTone } from "@/lib/lessons/lifecycle";
import { resolveMeetingLink } from "@/lib/lessons/meeting-provider";

export const dynamic = "force-dynamic";

export default async function TeacherSchedule() {
  const { teacher } = await requireTeacher();
  if (!teacher) return <Card><EmptyState icon="user" title="Öğretmen profili yok" /></Card>;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const lessons = await prisma.lesson.findMany({
    where: { teacherId: teacher.id, scheduledAt: { gte: start, lte: new Date(start.getTime() + 30 * 86400000) } },
    orderBy: { scheduledAt: "asc" },
    include: {
      student: { select: { fullName: true } },
      classroom: { select: { name: true } },
      course: { select: { title: true } },
    },
  });

  // sessionGroupId paylaşan satırları öğretmen için tek satıra grupla
  const grouped = new Map<string, typeof lessons>();
  for (const l of lessons) {
    const key = l.sessionGroupId ?? `solo:${l.id}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(l);
  }
  const rows = Array.from(grouped.values()).map((arr) => ({ head: arr[0], count: arr.length }));

  return (
    <>
      <PageHeader title="Ders programım" subtitle={`Önümüzdeki 30 gün — ${rows.length} seans`} />
      <Card>
        <table className="od-table">
          <thead><tr><th>Tarih</th><th>Konu</th><th>Öğrenci/Sınıf</th><th>Lokasyon</th><th>Süre</th><th>Durum</th><th>Canlı</th></tr></thead>
          <tbody>
            {rows.map(({ head, count }) => {
              const meeting = resolveMeetingLink(head);
              return (
                <tr key={head.id}>
                  <td className="od-mono">{new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(head.scheduledAt)}</td>
                  <td>{head.course?.title ?? head.title ?? head.subject ?? "—"}</td>
                  <td>
                    {head.classroom?.name
                      ? <>{head.classroom.name} <Badge tone="teal">{count} öğr.</Badge></>
                      : head.student?.fullName ?? "—"}
                  </td>
                  <td>{head.location ?? <span className="od-muted">—</span>}</td>
                  <td className="od-mono">{head.duration} dk</td>
                  <td><Badge tone={lessonStatusTone(head.status)}>{lessonStatusLabel(head.status)}</Badge></td>
                  <td>
                    <LessonLifecycleButtons
                      lessonId={head.id}
                      status={head.status}
                      joinUrl={meeting.joinUrl}
                      hostUrl={meeting.hostUrl}
                      meetingHref={`/panel/ogretmen/canli-ders/${head.id}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
