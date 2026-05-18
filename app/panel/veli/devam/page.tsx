import { prisma } from "@/lib/prisma";
import { requireParent, getChildIds } from "@/lib/panel-parent";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { NoChildEmpty } from "@/components/panel/parent/no-child-empty";

export const dynamic = "force-dynamic";

export default async function ParentAttendance() {
  const { parent } = await requireParent();
  if (!parent) return <Card><EmptyState icon="users" title="Veli profili yok" /></Card>;
  const childIds = await getChildIds(parent.id);
  if (childIds.length === 0) return <NoChildEmpty pageTitle="Devam durumu" />;
  const records = await prisma.attendance.findMany({
    where: { studentId: { in: childIds } },
    orderBy: { sessionDate: "desc" }, take: 200,
    include: { student: { select: { fullName: true } }, lesson: { select: { title: true, subject: true } } },
  });
  return (
    <>
      <PageHeader title="Devam durumu" subtitle={`Son ${records.length} kayıt`} />
      <Card>
        <table className="od-table">
          <thead><tr><th>Tarih</th><th>Çocuk</th><th>Ders</th><th>Durum</th><th>Geç (dk)</th></tr></thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td className="od-mono od-muted">{new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(r.sessionDate)}</td>
                <td>{r.student.fullName}</td>
                <td>{r.lesson?.title ?? r.lesson?.subject ?? "—"}</td>
                <td><Badge tone={r.status === "PRESENT" ? "ok" : r.status === "ABSENT" ? "bad" : "warn"}>{r.status}</Badge></td>
                <td className="od-mono">{r.minutesLate ?? "—"}</td>
              </tr>
            ))}
            {records.length === 0 ? <tr><td colSpan={5} style={{ padding: 24, textAlign: "center" }} className="od-muted">Yoklama kaydı yok.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </>
  );
}
