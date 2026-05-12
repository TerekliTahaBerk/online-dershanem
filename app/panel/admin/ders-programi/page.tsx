import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminSchedule() {
  await requirePanelRole("admin");
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 14 * 86400000);
  const lessons = await prisma.lesson.findMany({
    where: { scheduledAt: { gte: start, lte: end } },
    orderBy: { scheduledAt: "asc" },
    include: {
      teacher: { select: { fullName: true } },
      student: { select: { fullName: true } },
      classroom: { select: { name: true } },
    },
  });
  return (
    <>
      <PageHeader title="Ders programı" subtitle={`Önümüzdeki 14 gün — ${lessons.length} ders`} />
      <Card>
        <table className="od-table">
          <thead><tr><th>Tarih/Saat</th><th>Konu</th><th>Öğretmen</th><th>Öğrenci/Sınıf</th><th>Süre</th><th>Durum</th></tr></thead>
          <tbody>
            {lessons.map((l) => (
              <tr key={l.id}>
                <td className="od-mono">{new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(l.scheduledAt)}</td>
                <td>{l.title ?? l.subject ?? "—"}</td>
                <td>{l.teacher?.fullName ?? "—"}</td>
                <td>{l.classroom?.name ?? l.student?.fullName ?? "—"}</td>
                <td className="od-mono">{l.duration} dk</td>
                <td><Badge tone={l.status === "COMPLETED" ? "ok" : l.status === "CANCELLED" ? "bad" : "teal"}>{l.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
