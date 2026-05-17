import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/panel-student";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { Badge } from "@/components/panel/ui/badge";

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
  return (
    <>
      <PageHeader title="Ders programım" subtitle={`Önümüzdeki 14 gün — ${lessons.length} ders`} />
      <Card>
        <table className="od-table">
          <thead><tr><th>Tarih/Saat</th><th>Konu</th><th>Öğretmen</th><th>Lokasyon</th><th>Süre</th><th>Link</th><th>Durum</th></tr></thead>
          <tbody>
            {lessons.map((l) => (
              <tr key={l.id}>
                <td className="od-mono">{new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(l.scheduledAt)}</td>
                <td>{l.course?.title ?? l.title ?? l.subject ?? "—"}</td>
                <td>{l.teacher.fullName}</td>
                <td>{l.location ?? <span className="od-muted">—</span>}</td>
                <td className="od-mono">{l.duration} dk</td>
                <td>{l.googleMeetLink ? <a href={l.googleMeetLink} target="_blank" rel="noreferrer">Bağlan</a> : <span className="od-muted">—</span>}</td>
                <td><Badge tone={l.status === "COMPLETED" ? "ok" : l.status === "CANCELLED" ? "bad" : "teal"}>{l.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
