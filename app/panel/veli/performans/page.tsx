import { prisma } from "@/lib/prisma";
import { requireParent, getChildIds } from "@/lib/panel-parent";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { NoChildEmpty } from "@/components/panel/parent/no-child-empty";

export const dynamic = "force-dynamic";

export default async function ParentPerformance() {
  const { parent } = await requireParent();
  if (!parent) return <Card><EmptyState icon="users" title="Veli profili yok" /></Card>;
  const childIds = await getChildIds(parent.id);
  if (childIds.length === 0) return <NoChildEmpty pageTitle="Performans" />;
  const results = await prisma.studentExamResult.findMany({
    where: { studentId: { in: childIds } },
    orderBy: { takenAt: "desc" }, take: 100,
    include: { student: { select: { fullName: true } } },
  });
  return (
    <>
      <PageHeader title="Performans" subtitle={`${results.length} deneme sonucu`} />
      <Card>
        <table className="od-table">
          <thead><tr><th>Çocuk</th><th>Başlık</th><th>Tür</th><th>Net</th><th>D/Y/B</th><th>Tarih</th></tr></thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id}>
                <td>{r.student.fullName}</td>
                <td>{r.title}</td>
                <td>{r.assessmentType}</td>
                <td className="od-mono">{r.net?.toString() ?? "—"}</td>
                <td className="od-mono">{r.correctCount}/{r.wrongCount}/{r.blankCount}</td>
                <td className="od-mono od-muted">{new Intl.DateTimeFormat("tr-TR").format(r.takenAt)}</td>
              </tr>
            ))}
            {results.length === 0 ? <tr><td colSpan={6} style={{ padding: 24, textAlign: "center" }} className="od-muted">Henüz deneme sonucu yok.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </>
  );
}
