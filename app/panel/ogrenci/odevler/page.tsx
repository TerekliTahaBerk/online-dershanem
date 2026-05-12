import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/panel-student";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function StudentAssignments() {
  const { student } = await requireStudent();
  if (!student) return <Card><EmptyState icon="user" title="Öğrenci profili yok" /></Card>;
  const assignments = await prisma.assignment.findMany({
    where: {
      OR: [
        { studentId: student.id },
        { classroom: { students: { some: { studentId: student.id, leftAt: null } } } },
      ],
    },
    orderBy: { dueAt: "asc" }, take: 100,
    include: { submissions: { where: { studentId: student.id }, take: 1 } },
  });
  const now = Date.now();
  return (
    <>
      <PageHeader title="Ödevlerim" subtitle={`${assignments.length} ödev`} />
      <Card>
        <table className="od-table">
          <thead><tr><th>Başlık</th><th>Ders</th><th>Son teslim</th><th>Gönderim</th><th>Puan</th></tr></thead>
          <tbody>
            {assignments.map((a) => {
              const sub = a.submissions[0];
              const overdue = a.dueAt && a.dueAt.getTime() < now && (!sub || !sub.submittedAt);
              return (
                <tr key={a.id}>
                  <td>{a.title}</td>
                  <td>{a.subject ?? "—"}</td>
                  <td className="od-mono od-muted">{a.dueAt ? new Intl.DateTimeFormat("tr-TR").format(a.dueAt) : "—"}</td>
                  <td>{sub?.submittedAt ? <Badge tone="ok">Gönderildi</Badge> : overdue ? <Badge tone="bad">Geçmiş</Badge> : <Badge tone="warn">Bekliyor</Badge>}</td>
                  <td className="od-mono">{sub?.score ?? "—"}</td>
                </tr>
              );
            })}
            {assignments.length === 0 ? <tr><td colSpan={5} style={{ padding: 24, textAlign: "center" }} className="od-muted">Ödev yok.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </>
  );
}
