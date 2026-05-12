import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import { createAssignmentAction } from "../_actions";

export const dynamic = "force-dynamic";

export default async function NewAssignment() {
  await requirePanelRole("admin");
  const [teachers, classrooms] = await Promise.all([
    prisma.teacher.findMany({ orderBy: { fullName: "asc" }, select: { id: true, fullName: true } }),
    prisma.classroom.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, branch: true } }),
  ]);
  return (
    <>
      <PageHeader title="Yeni ödev" />
      <Card>
        <CardBody>
          <form action={createAssignmentAction} className="od-grid g-2" style={{ gap: 12 }}>
            <Field label="Öğretmen *">
              <Select name="teacherId" required defaultValue="">
                <option value="" disabled>Seçin…</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
              </Select>
            </Field>
            <Field label="Sınıf (opsiyonel)">
              <Select name="classroomId" defaultValue="">
                <option value="">— Bireysel —</option>
                {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}{c.branch ? ` · ${c.branch}` : ""}</option>)}
              </Select>
            </Field>
            <Field label="Başlık *"><Input name="title" required /></Field>
            <Field label="Ders"><Input name="subject" /></Field>
            <Field label="Son teslim"><Input name="dueAt" type="datetime-local" /></Field>
            <Field label="Durum">
              <Select name="status" defaultValue="PUBLISHED">
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="CLOSED">CLOSED</option>
              </Select>
            </Field>
            <div style={{ gridColumn: "1 / -1" }}><Field label="Açıklama"><Textarea name="description" /></Field></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormActions><button className="od-btn od-btn-primary" type="submit">Yayınla</button></FormActions>
            </div>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
