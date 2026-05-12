import { requireParent } from "@/lib/panel-parent";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { Badge } from "@/components/panel/ui/badge";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ParentChildren() {
  const { parent } = await requireParent();
  if (!parent || parent.students.length === 0) return <Card><EmptyState icon="users" title="Bağlı çocuk yok" /></Card>;
  return (
    <>
      <PageHeader title="Çocuklarım" subtitle={`${parent.students.length} çocuk`} />
      <div className="od-grid g-2">
        {parent.students.map(({ student, relationship, isPrimary }) => (
          <Card key={student.id}>
            <CardHeader title={student.fullName} subtitle={`${student.classLevel ?? "—"} · ${student.examType ?? "—"}`} />
            <CardBody>
              <div className="od-grid" style={{ gridTemplateColumns: "1fr", gap: 6, fontSize: 13 }}>
                <div><span className="od-muted">Telefon: </span><span className="od-mono">{student.phone}</span></div>
                <div><span className="od-muted">Okul: </span>{student.schoolName ?? "—"}</div>
                <div><span className="od-muted">Yakınlık: </span>{relationship ?? "—"} {isPrimary ? <Badge tone="accent">Birincil</Badge> : null}</div>
                <div><span className="od-muted">Hedef: </span>{student.targetGoal ?? "—"}</div>
                <div><Badge tone="accent">{student.status}</Badge></div>
              </div>
              <div style={{ marginTop: 12 }}>
                <Link href={`/panel/veli/cocuklarim/${student.id}`} className="od-btn od-btn-ghost od-btn-sm">Detayları gör →</Link>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
