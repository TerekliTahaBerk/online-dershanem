import { requireTeacher } from "@/lib/panel-teacher";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { Badge } from "@/components/panel/ui/badge";

export const dynamic = "force-dynamic";

export default async function TeacherProfile() {
  const { teacher } = await requireTeacher();
  if (!teacher) return <Card><EmptyState icon="user" title="Öğretmen profili yok" /></Card>;
  return (
    <>
      <PageHeader title="Profilim" subtitle={teacher.fullName} />
      <Card>
        <CardHeader title="Bilgiler" />
        <CardBody>
          <div className="od-grid" style={{ gridTemplateColumns: "1fr", gap: 8, fontSize: 13 }}>
            <div><span className="od-muted">Ad: </span>{teacher.fullName}</div>
            <div><span className="od-muted">Email: </span>{teacher.email ?? "—"}</div>
            <div><span className="od-muted">Telefon: </span><span className="od-mono">{teacher.phone ?? "—"}</span></div>
            <div><span className="od-muted">Branş: </span>{teacher.subjects}</div>
            <div><span className="od-muted">Bio: </span>{teacher.bio ?? "—"}</div>
            <div><span className="od-muted">Durum: </span><Badge tone={teacher.status === "ACTIVE" ? "ok" : "neutral"}>{teacher.status}</Badge></div>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
