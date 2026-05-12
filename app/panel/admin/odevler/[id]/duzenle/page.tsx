import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import { updateAssignmentAction, deleteAssignmentAction } from "../../_actions";

export const dynamic = "force-dynamic";

function toLocalDateTime(d: Date | null) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditAssignment({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelRole("admin");
  const { id } = await params;
  const a = await prisma.assignment.findUnique({ where: { id } });
  if (!a) notFound();
  const update = updateAssignmentAction.bind(null, id);
  const del = deleteAssignmentAction.bind(null, id);
  return (
    <>
      <PageHeader
        title={`Düzenle: ${a.title}`}
        right={<Link href="/panel/admin/odevler" className="od-btn od-btn-ghost od-btn-sm">← Liste</Link>}
      />
      <Card>
        <CardBody>
          <form action={update} className="od-grid g-2" style={{ gap: 12 }}>
            <Field label="Başlık *"><Input name="title" defaultValue={a.title} required /></Field>
            <Field label="Ders"><Input name="subject" defaultValue={a.subject ?? ""} /></Field>
            <Field label="Sınıf ID"><Input name="classroomId" defaultValue={a.classroomId ?? ""} /></Field>
            <Field label="Öğrenci ID (bireysel)"><Input name="studentId" defaultValue={a.studentId ?? ""} /></Field>
            <Field label="Son Teslim"><Input name="dueAt" type="datetime-local" defaultValue={toLocalDateTime(a.dueAt)} /></Field>
            <Field label="Durum">
              <Select name="status" defaultValue={a.status}>
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="CLOSED">CLOSED</option>
              </Select>
            </Field>
            <div style={{ gridColumn: "1 / -1" }}><Field label="Açıklama"><Textarea name="description" defaultValue={a.description ?? ""} /></Field></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormActions><button className="od-btn od-btn-primary" type="submit">Kaydet</button></FormActions>
            </div>
          </form>
          <hr style={{ margin: "20px 0", border: 0, borderTop: "1px solid var(--pd-line)" }} />
          <form action={del}>
            <button type="submit" className="od-btn od-btn-ghost od-btn-sm" style={{ color: "var(--pd-bad)" }}>🗑 Ödevi sil</button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
