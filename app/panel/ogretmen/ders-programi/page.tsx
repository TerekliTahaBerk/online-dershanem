import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/panel-teacher";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function TeacherSchedule() {
  const { teacher } = await requireTeacher();
  if (!teacher) return <Card><EmptyState icon="user" title="Öğretmen profili yok" /></Card>;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const lessons = await prisma.lesson.findMany({
    where: { teacherId: teacher.id, scheduledAt: { gte: start, lte: new Date(start.getTime() + 30 * 86400000) } },
    orderBy: { scheduledAt: "asc" },
    include: { student: { select: { fullName: true } }, classroom: { select: { name: true } } },
  });
  return (
    <>
      <PageHeader title="Ders programım" subtitle={`Önümüzdeki 30 gün — ${lessons.length} ders`} />
      <Card>
        <table className="od-table">
          <thead><tr><th>Tarih</th><th>Konu</th><th>Öğrenci/Sınıf</th><th>Süre</th><th>Durum</th><th>Link</th></tr></thead>
          <tbody>
            {lessons.map((l) => (
              <tr key={l.id}>
                <td className="od-mono">{new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(l.scheduledAt)}</td>
                <td>{l.title ?? l.subject ?? "—"}</td>
                <td>{l.classroom?.name ?? l.student?.fullName ?? "—"}</td>
                <td className="od-mono">{l.duration} dk</td>
                <td><Badge tone={l.status === "COMPLETED" ? "ok" : l.status === "CANCELLED" ? "bad" : "teal"}>{l.status}</Badge></td>
                <td>{l.googleMeetLink ? <a className="od-mono" href={l.googleMeetLink} target="_blank" rel="noreferrer">Bağlan</a> : <span className="od-muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
