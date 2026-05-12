import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/panel-teacher";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function TeacherAssignments() {
  const { teacher } = await requireTeacher();
  if (!teacher) return <Card><EmptyState icon="user" title="Öğretmen profili yok" /></Card>;
  const list = await prisma.assignment.findMany({
    where: { teacherId: teacher.id },
    orderBy: { createdAt: "desc" }, take: 100,
    include: {
      classroom: { select: { name: true } },
      _count: { select: { submissions: true } },
    },
  });
  return (
    <>
      <PageHeader title="Ödevler" subtitle={`${list.length} ödev`} />
      <Card>
        <table className="od-table">
          <thead><tr><th>Başlık</th><th>Sınıf</th><th>Ders</th><th>Son teslim</th><th>Gönderim</th><th>Durum</th></tr></thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td>{a.title}</td>
                <td>{a.classroom?.name ?? "Bireysel"}</td>
                <td>{a.subject ?? "—"}</td>
                <td className="od-mono od-muted">{a.dueAt ? new Intl.DateTimeFormat("tr-TR").format(a.dueAt) : "—"}</td>
                <td className="od-mono">{a._count.submissions}</td>
                <td><Badge tone={a.status === "PUBLISHED" ? "ok" : a.status === "CLOSED" ? "neutral" : "warn"}>{a.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
