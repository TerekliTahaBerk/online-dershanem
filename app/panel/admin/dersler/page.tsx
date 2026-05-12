import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminLessons() {
  await requirePanelRole("admin");
  const lessons = await prisma.lesson.findMany({
    orderBy: { scheduledAt: "desc" }, take: 100,
    include: { teacher: { select: { fullName: true } }, student: { select: { fullName: true } } },
  });
  return (
    <>
      <PageHeader title="Dersler" subtitle={`Son 100 ders`} />
      <Card>
        <table className="od-table">
          <thead><tr><th>Konu</th><th>Öğretmen</th><th>Öğrenci</th><th>Tarih</th><th>Durum</th></tr></thead>
          <tbody>
            {lessons.map((l) => (
              <tr key={l.id}>
                <td>{l.title ?? l.subject ?? "—"}</td>
                <td>{l.teacher?.fullName ?? "—"}</td>
                <td>{l.student?.fullName ?? "—"}</td>
                <td className="od-mono od-muted">{new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(l.scheduledAt)}</td>
                <td><Badge tone={l.status === "COMPLETED" ? "ok" : l.status === "CANCELLED" ? "bad" : "teal"}>{l.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
