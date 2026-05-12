import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import { updateTeacherAction, deleteTeacherAction } from "../../_actions";

export const dynamic = "force-dynamic";

export default async function EditTeacher({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelRole("admin");
  const { id } = await params;
  const t = await prisma.teacher.findUnique({ where: { id } });
  if (!t) notFound();
  const update = updateTeacherAction.bind(null, id);
  const del = deleteTeacherAction.bind(null, id);
  return (
    <>
      <PageHeader title={`Düzenle: ${t.fullName}`} />
      <Card>
        <CardBody>
          <form action={update} className="od-grid g-2" style={{ gap: 12 }}>
            <Field label="Ad Soyad *"><Input name="fullName" defaultValue={t.fullName} required /></Field>
            <Field label="Branş *"><Input name="subjects" defaultValue={t.subjects} required /></Field>
            <Field label="Email"><Input name="email" type="email" defaultValue={t.email ?? ""} /></Field>
            <Field label="Telefon"><Input name="phone" defaultValue={t.phone ?? ""} /></Field>
            <Field label="Durum">
              <Select name="status" defaultValue={t.status}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </Select>
            </Field>
            <div style={{ gridColumn: "1 / -1" }}><Field label="Bio"><Textarea name="bio" defaultValue={t.bio ?? ""} /></Field></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormActions><button className="od-btn od-btn-primary" type="submit">Kaydet</button></FormActions>
            </div>
          </form>
          <hr style={{ margin: "20px 0", border: 0, borderTop: "1px solid var(--pd-line)" }} />
          <form action={del}>
            <button type="submit" className="od-btn od-btn-ghost od-btn-sm" style={{ color: "var(--pd-bad)" }}>🗑 Öğretmeni sil</button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
