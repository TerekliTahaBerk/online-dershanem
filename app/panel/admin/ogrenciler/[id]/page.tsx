import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";

export const dynamic = "force-dynamic";

export default async function StudentDetail({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelRole("admin");
  const { id } = await params;
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, role: true } },
      tags: { include: { tag: true } },
      attendances: { take: 10, orderBy: { sessionDate: "desc" } },
      submissions: { take: 10, orderBy: { submittedAt: "desc" }, include: { assignment: true } },
      examResults: { take: 10, orderBy: { takenAt: "desc" } },
    },
  });
  if (!student) notFound();

  return (
    <>
      <PageHeader
        title={student.fullName}
        subtitle={`${student.classLevel ?? "—"} · ${student.examType ?? "—"}`}
        right={<Link href={`/panel/admin/ogrenciler/${student.id}/duzenle`} className="od-btn od-btn-primary od-btn-sm">Düzenle</Link>}
      />
      <div className="od-grid g-2" style={{ gridTemplateColumns: "1fr 2fr" }}>
        <Card>
          <CardHeader title="Kişisel" />
          <CardBody>
            <div className="od-grid" style={{ gridTemplateColumns: "1fr", gap: 8, fontSize: 13 }}>
              <div><span className="od-muted">Telefon: </span><span className="od-mono">{student.phone}</span></div>
              <div><span className="od-muted">Email: </span>{student.email ?? "—"}</div>
              <div><span className="od-muted">Şehir/İlçe: </span>{[student.city, student.district].filter(Boolean).join(" / ") || "—"}</div>
              <div><span className="od-muted">Okul: </span>{student.schoolName ?? "—"}</div>
              <div><span className="od-muted">Hedef: </span>{student.targetGoal ?? "—"}</div>
              <div><span className="od-muted">Durum: </span><Badge tone="accent">{student.status}</Badge></div>
            </div>
          </CardBody>
        </Card>

        <div className="od-grid" style={{ gridTemplateColumns: "1fr", gap: 16 }}>
          <Card>
            <CardHeader title="Son denemeler" subtitle={`${student.examResults.length} kayıt`} />
            <table className="od-table">
              <thead><tr><th>Başlık</th><th>Tür</th><th>Net</th><th>Tarih</th></tr></thead>
              <tbody>
                {student.examResults.map((r) => (
                  <tr key={r.id}><td>{r.title}</td><td>{r.assessmentType}</td><td className="od-mono">{r.net?.toString() ?? "—"}</td><td className="od-mono od-muted">{new Intl.DateTimeFormat("tr-TR").format(r.takenAt)}</td></tr>
                ))}
                {student.examResults.length === 0 ? <tr><td colSpan={4}><CardBody>Kayıt yok.</CardBody></td></tr> : null}
              </tbody>
            </table>
          </Card>

          <Card>
            <CardHeader title="Son ödev gönderimleri" subtitle={`${student.submissions.length} kayıt`} />
            <table className="od-table">
              <thead><tr><th>Ödev</th><th>Puan</th><th>Gönderim</th></tr></thead>
              <tbody>
                {student.submissions.map((s) => (
                  <tr key={s.id}><td>{s.assignment.title}</td><td className="od-mono">{s.score ?? "—"}</td><td className="od-mono od-muted">{s.submittedAt ? new Intl.DateTimeFormat("tr-TR").format(s.submittedAt) : "—"}</td></tr>
                ))}
                {student.submissions.length === 0 ? <tr><td colSpan={3}><CardBody>Kayıt yok.</CardBody></td></tr> : null}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </>
  );
}
