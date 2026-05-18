import { requireStudent } from "@/lib/panel-student";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { Badge } from "@/components/panel/ui/badge";
import { PrivacyRightsCard } from "@/components/panel/privacy/privacy-rights-card";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StudentProfile() {
  const { student } = await requireStudent();
  if (!student) return <Card><EmptyState icon="user" title="Öğrenci profili yok" /></Card>;
  return (
    <>
      <PageHeader
        title="Profilim"
        subtitle={student.fullName}
        right={<Link href="/panel/ogrenci/profilim/duzenle" className="od-btn od-btn-primary od-btn-sm">Düzenle</Link>}
      />
      <div className="od-grid g-2">
        <Card>
          <CardHeader title="Kişisel" />
          <CardBody>
            <div className="od-grid" style={{ gridTemplateColumns: "1fr", gap: 8, fontSize: 13 }}>
              <div><span className="od-muted">Ad: </span>{student.fullName}</div>
              <div><span className="od-muted">Telefon: </span><span className="od-mono">{student.phone}</span></div>
              <div><span className="od-muted">Email: </span>{student.email ?? "—"}</div>
              <div><span className="od-muted">Şehir: </span>{[student.city, student.district].filter(Boolean).join(" / ") || "—"}</div>
              <div><span className="od-muted">Okul: </span>{student.schoolName ?? "—"}</div>
              <div><span className="od-muted">Sınıf: </span>{student.classLevel ?? "—"}</div>
              <div><span className="od-muted">Sınav: </span>{student.examType ?? "—"}</div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Hedef ve durum" />
          <CardBody>
            <div className="od-grid" style={{ gridTemplateColumns: "1fr", gap: 8, fontSize: 13 }}>
              <div><span className="od-muted">Hedef: </span>{student.targetGoal ?? "—"}</div>
              <div><span className="od-muted">Hedef okul: </span>{student.targetSchool ?? "—"}</div>
              <div><span className="od-muted">Hedef sıralama: </span>{student.targetRanking ?? "—"}</div>
              <div><span className="od-muted">Mevcut net: </span>{student.currentNet ?? "—"}</div>
              <div><span className="od-muted">Güçlü dersler: </span>{student.strongLessons ?? "—"}</div>
              <div><span className="od-muted">Zayıf dersler: </span>{student.weakLessons ?? "—"}</div>
              <div><span className="od-muted">Durum: </span><Badge tone="accent">{student.status}</Badge></div>
            </div>
          </CardBody>
        </Card>
      </div>
      <div style={{ marginTop: 16 }}>
        <PrivacyRightsCard />
      </div>
    </>
  );
}
