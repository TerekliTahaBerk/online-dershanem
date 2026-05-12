import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/panel-teacher";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Textarea, FormActions } from "@/components/panel/ui/form";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { addCommentAction, deleteTeacherCommentAction } from "../../_actions";

export const dynamic = "force-dynamic";

export default async function TeacherStudentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { teacher } = await requireTeacher();
  if (!teacher) return <Card><EmptyState icon="user" title="Öğretmen profili yok" /></Card>;
  const { id } = await params;
  // Verify access
  const student = await prisma.student.findFirst({
    where: {
      id,
      OR: [
        { lessons: { some: { teacherId: teacher.id } } },
        { classrooms: { some: { classroom: { teachers: { some: { teacherId: teacher.id } } } } } },
      ],
    },
    include: {
      classrooms: { include: { classroom: { select: { name: true } } } },
      examResults: { orderBy: { takenAt: "desc" }, take: 10 },
      submissions: {
        where: { assignment: { teacherId: teacher.id } },
        orderBy: { createdAt: "desc" }, take: 20,
        include: { assignment: { select: { title: true, id: true } } },
      },
      attendances: {
        where: {
          OR: [
            { lesson: { teacherId: teacher.id } },
            { classroom: { teachers: { some: { teacherId: teacher.id } } } },
          ],
        },
        orderBy: { sessionDate: "desc" }, take: 30,
      },
      comments: {
        where: { teacherId: teacher.id },
        orderBy: { createdAt: "desc" }, take: 20,
      },
    },
  });
  if (!student) notFound();

  return (
    <>
      <PageHeader
        title={student.fullName}
        subtitle={`${student.classLevel ?? "—"} · ${student.examType ?? "—"}`}
        right={<Link href="/panel/ogretmen/ogrencilerim" className="od-btn od-btn-ghost od-btn-sm">← Liste</Link>}
      />

      <div className="od-grid g-2" style={{ marginBottom: 16 }}>
        <Card>
          <CardHeader title="Bilgiler" />
          <CardBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
              <div><span className="od-muted">Telefon: </span><span className="od-mono">{student.phone}</span></div>
              <div><span className="od-muted">Email: </span>{student.email ?? "—"}</div>
              <div><span className="od-muted">Sınıflar: </span>{student.classrooms.map((c) => c.classroom.name).join(", ") || "—"}</div>
              <div><span className="od-muted">Hedef: </span>{student.targetGoal ?? "—"} · {student.targetSchool ?? "—"}</div>
              <div><Badge tone={student.status === "ACTIVE" ? "ok" : "neutral"}>{student.status}</Badge></div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Son denemeler" subtitle={`${student.examResults.length} kayıt`} />
          <CardBody>
            {student.examResults.length === 0 ? <span className="od-muted" style={{ fontSize: 13 }}>Deneme yok.</span> : (
              <table className="od-table" style={{ fontSize: 12 }}>
                <thead><tr><th>Tarih</th><th>Başlık</th><th>Net</th></tr></thead>
                <tbody>
                  {student.examResults.map((r) => (
                    <tr key={r.id}>
                      <td className="od-mono od-muted">{new Intl.DateTimeFormat("tr-TR").format(r.takenAt)}</td>
                      <td>{r.title}</td>
                      <td className="od-mono">{r.net?.toString() ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Ödev gönderimleri (sizden)" />
        <CardBody>
          {student.submissions.length === 0 ? <span className="od-muted" style={{ fontSize: 13 }}>Gönderim yok.</span> : (
            <table className="od-table">
              <thead><tr><th>Tarih</th><th>Ödev</th><th>Durum</th><th>Puan</th></tr></thead>
              <tbody>
                {student.submissions.map((s) => (
                  <tr key={s.id}>
                    <td className="od-mono od-muted">{s.submittedAt ? new Intl.DateTimeFormat("tr-TR").format(s.submittedAt) : "—"}</td>
                    <td><Link href={`/panel/ogretmen/odevler/${s.assignment.id}`} className="od-link">{s.assignment.title}</Link></td>
                    <td><Badge tone={s.status === "GRADED" ? "ok" : s.status === "SUBMITTED" ? "accent" : "warn"}>{s.status}</Badge></td>
                    <td className="od-mono">{s.score ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Yorumlarım" subtitle={`${student.comments.length} yorum`} />
        <CardBody>
          {student.comments.length === 0 ? null : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {student.comments.map((c) => (
                <div key={c.id} style={{ border: "1px solid var(--pd-line)", borderRadius: 6, padding: 8, fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span className="od-muted od-mono" style={{ fontSize: 11 }}>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(c.createdAt)}</span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {c.rating != null ? <Badge tone="accent">⭐ {c.rating}</Badge> : null}
                      {c.visibleToParent ? <Badge tone="ok">Veliyle</Badge> : <Badge tone="neutral">Özel</Badge>}
                      <form action={deleteTeacherCommentAction.bind(null, c.id)} style={{ display: "inline" }}>
                        <button type="submit" className="od-btn od-btn-ghost od-btn-sm" style={{ color: "var(--pd-bad)", fontSize: 11 }}>Sil</button>
                      </form>
                    </div>
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{c.content}</div>
                </div>
              ))}
            </div>
          )}
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Yeni yorum</h4>
          <form action={addCommentAction} className="od-grid g-3" style={{ gap: 8, alignItems: "end" }}>
            <input type="hidden" name="studentId" value={student.id} />
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="İçerik *"><Textarea name="content" rows={3} required /></Field>
            </div>
            <Field label="Puan (1-5)"><Input name="rating" type="number" min={1} max={5} /></Field>
            <Field label="Veliyle paylaş">
              <label style={{ fontSize: 13 }}><input type="checkbox" name="visibleToParent" defaultChecked /> Veli görsün</label>
            </Field>
            <FormActions><button className="od-btn od-btn-primary od-btn-sm" type="submit">Ekle</button></FormActions>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Son devam kayıtları" />
        <CardBody>
          {student.attendances.length === 0 ? <span className="od-muted" style={{ fontSize: 13 }}>Kayıt yok.</span> : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {student.attendances.map((a) => (
                <Badge key={a.id} tone={a.status === "PRESENT" ? "ok" : a.status === "ABSENT" ? "bad" : "warn"}>
                  {new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit" }).format(a.sessionDate)} · {a.status}
                </Badge>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}
