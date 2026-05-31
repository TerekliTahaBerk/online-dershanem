import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/panel-student";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { Badge } from "@/components/panel/ui/badge";
import { StudentJoinButton } from "@/components/panel/lessons/lifecycle-buttons";
import { lessonStatusLabel, lessonStatusTone } from "@/lib/lessons/lifecycle";
import { resolveMeetingLink } from "@/lib/lessons/meeting-provider";
import {
  WeeklyScheduleGrid,
  startOfIsoWeek,
  weekRangeLabel,
} from "@/components/panel/lessons/weekly-schedule-grid";

export const dynamic = "force-dynamic";

export default async function StudentSchedule() {
  const { student } = await requireStudent();
  if (!student) return <Card><EmptyState icon="user" title="Öğrenci profili yok" /></Card>;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const lessons = await prisma.lesson.findMany({
    where: { studentId: student.id, scheduledAt: { gte: start, lte: new Date(start.getTime() + 14 * 86400000) } },
    orderBy: { scheduledAt: "asc" },
    include: { teacher: { select: { fullName: true } }, course: { select: { title: true } } },
  });

  const weekStart = startOfIsoWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekLessons = lessons.filter((l) => l.scheduledAt >= weekStart && l.scheduledAt < weekEnd);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Öğrenci", href: "/panel/ogrenci" },
          { label: "Ders Programı" },
        ]}
        title={weekRangeLabel(weekStart)}
        subtitle={`Önümüzdeki 14 gün — ${lessons.length} ders`}
      />

      <WeeklyScheduleGrid
        lessons={weekLessons.map((l) => ({
          id: l.id,
          scheduledAt: l.scheduledAt,
          duration: l.duration,
          title: l.title,
          subject: l.subject,
          status: l.status,
          course: l.course,
          teacher: l.teacher,
          location: l.location,
        }))}
        weekStart={weekStart}
      />

      <details className="od-week-list-disclosure">
        <summary>Detaylı liste — {lessons.length} ders</summary>
        <table className="od-table">
          <thead><tr><th>Tarih/Saat</th><th>Konu</th><th>Öğretmen</th><th>Lokasyon</th><th>Süre</th><th>Durum</th><th>Canlı</th></tr></thead>
          <tbody>
            {lessons.map((l) => {
              const meeting = resolveMeetingLink(l);
              return (
                <tr key={l.id}>
                  <td className="od-mono">{new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(l.scheduledAt)}</td>
                  <td>{l.course?.title ?? l.title ?? l.subject ?? "—"}</td>
                  <td>{l.teacher.fullName}</td>
                  <td>{l.location ?? <span className="od-muted">—</span>}</td>
                  <td className="od-mono">{l.duration} dk</td>
                  <td><Badge tone={lessonStatusTone(l.status)}>{lessonStatusLabel(l.status)}</Badge></td>
                  <td>
                    <StudentJoinButton
                      lessonId={l.id}
                      status={l.status}
                      hasMeetingLink={!!meeting.joinUrl}
                      scheduledAt={l.scheduledAt}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    </>
  );
}
