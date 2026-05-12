import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/panel-teacher";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Textarea, FormActions } from "@/components/panel/ui/form";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import {
  gradeMySubmissionAction,
  toggleAssignmentStatusAction,
  deleteTeacherAssignmentAction,
} from "../../_actions";

export const dynamic = "force-dynamic";

export default async function TeacherAssignmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { teacher } = await requireTeacher();
  if (!teacher) return <Card><EmptyState icon="user" title="Öğretmen profili yok" /></Card>;
  const { id } = await params;
  const a = await prisma.assignment.findFirst({
    where: { id, teacherId: teacher.id },
    include: {
      classroom: { select: { id: true, name: true } },
      student: { select: { id: true, fullName: true } },
      submissions: {
        include: { student: { select: { id: true, fullName: true, classLevel: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!a) notFound();

  // Compute expected students if classroom-wide
  let expected: { id: string; fullName: string }[] = [];
  if (a.classroomId) {
    const cs = await prisma.classroomStudent.findMany({
      where: { classroomId: a.classroomId, leftAt: null },
      include: { student: { select: { id: true, fullName: true } } },
    });
    expected = cs.map((x) => x.student);
  } else if (a.studentId) {
    expected = a.student ? [{ id: a.student.id, fullName: a.student.fullName }] : [];
  }
  const submittedIds = new Set(a.submissions.map((s) => s.studentId));
  const missing = expected.filter((s) => !submittedIds.has(s.id));

  const nextStatus = a.status === "PUBLISHED" ? "CLOSED" : a.status === "CLOSED" ? "PUBLISHED" : "PUBLISHED";

  return (
    <>
      <PageHeader
        title={a.title}
        subtitle={`${a.subject ?? "Genel"} · ${a.classroom?.name ?? a.student?.fullName ?? "Bireysel"}`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/panel/ogretmen/odevler" className="od-btn od-btn-ghost od-btn-sm">← Liste</Link>
            <form action={toggleAssignmentStatusAction.bind(null, a.id, nextStatus)} style={{ display: "inline" }}>
              <button type="submit" className="od-btn od-btn-ghost od-btn-sm">
                {a.status === "PUBLISHED" ? "Kapat" : a.status === "DRAFT" ? "Yayınla" : "Yeniden aç"}
              </button>
            </form>
          </div>
        }
      />

      <Card>
        <CardHeader title="Detaylar" />
        <CardBody>
          <div className="od-grid g-3" style={{ fontSize: 13 }}>
            <div><span className="od-muted">Durum: </span><Badge tone={a.status === "PUBLISHED" ? "ok" : a.status === "CLOSED" ? "neutral" : "warn"}>{a.status}</Badge></div>
            <div><span className="od-muted">Son teslim: </span>{a.dueAt ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(a.dueAt) : "—"}</div>
            <div><span className="od-muted">Gönderim: </span><strong>{a.submissions.length}</strong>{expected.length ? ` / ${expected.length}` : ""}</div>
          </div>
          {a.description ? (
            <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{a.description}</div>
          ) : null}
        </CardBody>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <CardHeader title="Gönderimler & Puanlama" subtitle={`${a.submissions.length} gönderim`} />
        <CardBody>
          {a.submissions.length === 0 ? (
            <EmptyState icon="clipboard" title="Henüz gönderim yok" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {a.submissions.map((s) => (
                <div key={s.id} style={{ border: "1px solid var(--pd-line)", borderRadius: 8, padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <div>
                      <strong>{s.student.fullName}</strong>
                      {s.student.classLevel ? <span className="od-muted" style={{ marginLeft: 6 }}>· {s.student.classLevel}</span> : null}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {s.submittedAt ? <span className="od-muted od-mono" style={{ fontSize: 12 }}>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(s.submittedAt)}</span> : null}
                      <Badge tone={s.status === "GRADED" ? "ok" : s.status === "SUBMITTED" ? "accent" : "warn"}>{s.status}</Badge>
                    </div>
                  </div>
                  {s.content ? (
                    <div style={{ marginTop: 8, fontSize: 13, padding: 8, background: "var(--pd-bg-subtle)", borderRadius: 6, whiteSpace: "pre-wrap" }}>{s.content}</div>
                  ) : null}
                  {s.attachmentUrl ? (
                    <div style={{ marginTop: 8 }}>
                      <a href={s.attachmentUrl} target="_blank" rel="noopener" className="od-btn od-btn-ghost od-btn-sm">📎 Eki aç</a>
                    </div>
                  ) : null}
                  <form action={gradeMySubmissionAction.bind(null, s.id)} className="od-grid g-3" style={{ gap: 8, alignItems: "end", marginTop: 12 }}>
                    <Field label="Puan (0-100)"><Input name="score" type="number" min={0} max={100} defaultValue={s.score ?? ""} /></Field>
                    <div style={{ gridColumn: "span 2" }}>
                      <Field label="Geri bildirim"><Input name="feedback" defaultValue={s.feedback ?? ""} placeholder="Kısa not…" /></Field>
                    </div>
                    <FormActions><button className="od-btn od-btn-primary od-btn-sm" type="submit">Kaydet</button></FormActions>
                  </form>
                </div>
              ))}
            </div>
          )}

          {missing.length > 0 ? (
            <>
              <hr style={{ margin: "16px 0", border: 0, borderTop: "1px solid var(--pd-line)" }} />
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Henüz göndermeyenler ({missing.length})</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {missing.map((s) => (
                  <span key={s.id} className="od-chip">{s.fullName}</span>
                ))}
              </div>
            </>
          ) : null}
        </CardBody>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <CardBody>
          <form action={deleteTeacherAssignmentAction.bind(null, a.id)}>
            <button type="submit" className="od-btn od-btn-ghost od-btn-sm" style={{ color: "var(--pd-bad)" }}>🗑 Ödevi sil</button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
