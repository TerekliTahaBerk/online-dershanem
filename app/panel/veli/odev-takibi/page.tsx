import { prisma } from "@/lib/prisma";
import { requireParent, getChildIds } from "@/lib/panel-parent";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { NoChildEmpty } from "@/components/panel/parent/no-child-empty";

export const dynamic = "force-dynamic";

export default async function ParentAssignments() {
  const { parent } = await requireParent();
  if (!parent) return <Card><EmptyState icon="users" title="Veli profili yok" /></Card>;
  const childIds = await getChildIds(parent.id);
  if (childIds.length === 0) return <NoChildEmpty pageTitle="Ödev takibi" />;
  const subs = await prisma.assignmentSubmission.findMany({
    where: { studentId: { in: childIds } },
    orderBy: { createdAt: "desc" }, take: 200,
    include: { student: { select: { fullName: true } }, assignment: { select: { title: true, subject: true, dueAt: true } } },
  });
  return (
    <>
      <PageHeader title="Ödev takibi" subtitle={`${subs.length} kayıt`} />
      <Card>
        <table className="od-table">
          <thead><tr><th>Çocuk</th><th>Ödev</th><th>Ders</th><th>Son teslim</th><th>Durum</th><th>Puan</th></tr></thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.id}>
                <td>{s.student.fullName}</td>
                <td>{s.assignment.title}</td>
                <td>{s.assignment.subject ?? "—"}</td>
                <td className="od-mono od-muted">{s.assignment.dueAt ? new Intl.DateTimeFormat("tr-TR").format(s.assignment.dueAt) : "—"}</td>
                <td><Badge tone={s.status === "GRADED" ? "ok" : s.status === "SUBMITTED" ? "teal" : s.status === "LATE" ? "bad" : "warn"}>{s.status}</Badge></td>
                <td className="od-mono">{s.score ?? "—"}</td>
              </tr>
            ))}
            {subs.length === 0 ? <tr><td colSpan={6} style={{ padding: 24, textAlign: "center" }} className="od-muted">Gönderim yok.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </>
  );
}
