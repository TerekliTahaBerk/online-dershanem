import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/panel-student";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Textarea, FormActions } from "@/components/panel/ui/form";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { ToastForm } from "@/components/ui/toast-form";
import { submitAssignmentExtendedAction } from "../../_actions";
import { getMaterialsForAssignment } from "@/lib/panel/material-attachments";
import { canStudentAccessMaterial } from "@/lib/panel/materials";
import { AssignmentMaterialsSection } from "@/components/panel/materials/assignment-materials-section";

export const dynamic = "force-dynamic";

export default async function StudentAssignmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { student } = await requireStudent();
  if (!student) return <Card><EmptyState icon="user" title="Öğrenci profili yok" /></Card>;
  const { id } = await params;
  const a = await prisma.assignment.findFirst({
    where: {
      id,
      OR: [
        { studentId: student.id },
        { classroom: { students: { some: { studentId: student.id, leftAt: null } } } },
      ],
    },
    include: {
      teacher: { select: { fullName: true } },
      submissions: { where: { studentId: student.id }, take: 1 },
    },
  });
  if (!a) notFound();
  const sub = a.submissions[0];
  const closed = a.status === "CLOSED";
  const submit = submitAssignmentExtendedAction.bind(null, a.id);

  // ── Phase 2 / Session 9 — Attached materials filtered by student access.
  const attachedAll = await getMaterialsForAssignment(a.id);
  const visibilityChecks = await Promise.all(
    attachedAll.map((m) => canStudentAccessMaterial(student.id, m.id)),
  );
  const attached = attachedAll.filter((_, i) => visibilityChecks[i]);

  return (
    <>
      <PageHeader
        title={a.title}
        subtitle={`${a.teacher.fullName} · ${a.subject ?? "Genel"}`}
        breadcrumbs={[
          { label: "Öğrenci", href: "/panel/ogrenci" },
          { label: "Ödevlerim", href: "/panel/ogrenci/odevler" },
          { label: a.title },
        ]}
        right={<Link href="/panel/ogrenci/odevler" className="od-btn ghost sm">← Liste</Link>}
      />
      <Card>
        <CardHeader title="Detay" />
        <CardBody>
          <div className="od-grid g-3" style={{ fontSize: 13 }}>
            <div><span className="od-muted">Durum: </span><Badge tone={a.status === "PUBLISHED" ? "ok" : "neutral"}>{a.status}</Badge></div>
            <div><span className="od-muted">Son teslim: </span>{a.dueAt ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(a.dueAt) : "—"}</div>
            <div><span className="od-muted">Gönderim: </span>{sub?.submittedAt ? <Badge tone="ok">Gönderildi</Badge> : <Badge tone="warn">Bekliyor</Badge>}</div>
          </div>
          {a.description ? <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{a.description}</div> : null}
        </CardBody>
      </Card>

      <div style={{ marginTop: 16 }}>
        <AssignmentMaterialsSection assignmentId={a.id} attached={attached} />
      </div>

      {sub && sub.status === "GRADED" ? (
        <Card style={{ marginTop: 16, borderColor: "var(--pd-good)" }}>
          <CardHeader title="✓ Değerlendirildi" subtitle={sub.gradedAt ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(sub.gradedAt) : ""} />
          <CardBody>
            <div style={{ fontSize: 14 }}>
              <div><span className="od-muted">Puanın: </span><strong style={{ fontSize: 18 }}>{sub.score ?? "—"}</strong></div>
              {sub.feedback ? (
                <div style={{ marginTop: 8 }}><span className="od-muted">Geri bildirim: </span><span style={{ whiteSpace: "pre-wrap" }}>{sub.feedback}</span></div>
              ) : null}
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card style={{ marginTop: 16 }}>
        <CardHeader title={sub?.submittedAt ? "Gönderimi güncelle" : "Ödevi gönder"} />
        <CardBody>
          {closed ? (
            <EmptyState icon="lock" title="Bu ödev kapalı" description="Artık gönderim yapılamaz." />
          ) : (
            <ToastForm
              action={submit}
              className="od-grid g-2"
              style={{ gap: 12 }}
              successMessage={sub?.submittedAt ? "Gönderim güncellendi" : "Ödev gönderildi"}
            >
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Cevap / Açıklama"><Textarea name="content" rows={6} defaultValue={sub?.content ?? ""} placeholder="Cevabını veya notlarını yaz…" /></Field>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Dosya bağlantısı (opsiyonel)"><Input name="attachmentUrl" type="url" defaultValue={sub?.attachmentUrl ?? ""} placeholder="https://drive.google.com/..." /></Field>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <FormActions>
                  <button type="submit" className="od-btn od-btn-primary">{sub?.submittedAt ? "Güncelle" : "Gönder"}</button>
                </FormActions>
              </div>
            </ToastForm>
          )}
        </CardBody>
      </Card>
    </>
  );
}
