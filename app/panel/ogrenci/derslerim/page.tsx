import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/panel-student";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function StudentLessons() {
  const { student } = await requireStudent();
  if (!student) return <Card><EmptyState icon="user" title="Öğrenci profili yok" /></Card>;
  const lessons = await prisma.lesson.findMany({
    where: { studentId: student.id },
    orderBy: { scheduledAt: "desc" }, take: 100,
    include: { teacher: { select: { fullName: true } } },
  });
  return (
    <>
      <PageHeader title="Derslerim" subtitle={`${lessons.length} ders`} />
      <Card>
        <table className="od-table">
          <thead><tr><th>Tarih</th><th>Konu</th><th>Öğretmen</th><th>Süre</th><th>Durum</th></tr></thead>
          <tbody>
            {lessons.map((l) => (
              <tr key={l.id}>
                <td className="od-mono od-muted">{new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(l.scheduledAt)}</td>
                <td>{l.title ?? l.subject ?? "—"}</td>
                <td>{l.teacher.fullName}</td>
                <td className="od-mono">{l.duration} dk</td>
                <td><Badge tone={l.status === "COMPLETED" ? "ok" : l.status === "CANCELLED" ? "bad" : "teal"}>{l.status}</Badge></td>
              </tr>
            ))}
            {lessons.length === 0 ? <tr><td colSpan={5} style={{ padding: 24, textAlign: "center" }} className="od-muted">Ders kaydı yok.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </>
  );
}
