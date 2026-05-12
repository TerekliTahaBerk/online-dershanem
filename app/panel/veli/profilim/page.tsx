import Link from "next/link";
import { requireParent } from "@/lib/panel-parent";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";

export const dynamic = "force-dynamic";

export default async function ParentProfile() {
  const { parent, ctx } = await requireParent();
  if (!parent) return null;
  return (
    <>
      <PageHeader
        title="Profilim"
        right={<Link href="/panel/veli/profilim/duzenle" className="od-btn od-btn-primary od-btn-sm">Düzenle</Link>}
      />
      <Card>
        <CardHeader title={parent.fullName} subtitle={ctx.email ?? "—"} />
        <CardBody>
          <div className="od-grid g-2" style={{ gap: 12, fontSize: 13 }}>
            <div><span className="od-muted">Ad Soyad: </span>{parent.fullName}</div>
            <div><span className="od-muted">E-posta: </span>{parent.email ?? "—"}</div>
            <div><span className="od-muted">Telefon: </span><span className="od-mono">{parent.phone ?? "—"}</span></div>
            <div><span className="od-muted">Bağlı çocuk: </span>{parent.students.length}</div>
          </div>
        </CardBody>
      </Card>

      <CardHeader title="Çocuklar" />
      <Card>
        <table className="od-table">
          <thead><tr><th>Çocuk</th><th>Yakınlık</th><th>Birincil</th></tr></thead>
          <tbody>
            {parent.students.map((s) => (
              <tr key={s.studentId}>
                <td>{s.student.fullName}</td>
                <td>{s.relationship ?? "—"}</td>
                <td>{s.isPrimary ? "✓" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
