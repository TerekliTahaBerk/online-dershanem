import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import { updateStudentAction, deleteStudentAction } from "../../_actions";

export const dynamic = "force-dynamic";

export default async function EditStudent({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelRole("admin");
  const { id } = await params;
  const s = await prisma.student.findUnique({ where: { id } });
  if (!s) notFound();
  const update = updateStudentAction.bind(null, id);
  const del = deleteStudentAction.bind(null, id);
  return (
    <>
      <PageHeader
        title={`Düzenle: ${s.fullName}`}
        right={<Link href={`/panel/admin/ogrenciler/${id}`} className="od-btn od-btn-ghost od-btn-sm">← Detay</Link>}
      />
      <Card>
        <CardBody>
          <form action={update} className="od-grid g-2" style={{ gap: 12 }}>
            <Field label="Ad Soyad *"><Input name="fullName" defaultValue={s.fullName} required /></Field>
            <Field label="Email"><Input name="email" type="email" defaultValue={s.email ?? ""} /></Field>
            <Field label="Sınıf"><Input name="classLevel" defaultValue={s.classLevel ?? ""} /></Field>
            <Field label="Sınav türü"><Input name="examType" defaultValue={s.examType ?? ""} /></Field>
            <Field label="Şehir"><Input name="city" defaultValue={s.city ?? ""} /></Field>
            <Field label="İlçe"><Input name="district" defaultValue={s.district ?? ""} /></Field>
            <Field label="Okul"><Input name="schoolName" defaultValue={s.schoolName ?? ""} /></Field>
            <Field label="Hedef"><Input name="targetGoal" defaultValue={s.targetGoal ?? ""} /></Field>
            <Field label="Durum">
              <Select name="status" defaultValue={s.status}>
                <option value="NEW">NEW</option>
                <option value="FOLLOW_UP">FOLLOW_UP</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="AT_RISK">AT_RISK</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="INACTIVE">INACTIVE</option>
              </Select>
            </Field>
            <div style={{ gridColumn: "1 / -1" }}><Field label="Notlar"><Textarea name="notes" defaultValue={s.notes ?? ""} /></Field></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormActions>
                <button className="od-btn od-btn-primary" type="submit">Kaydet</button>
              </FormActions>
            </div>
          </form>
          <hr style={{ margin: "20px 0", border: 0, borderTop: "1px solid var(--pd-line)" }} />
          <form action={del}>
            <button type="submit" className="od-btn od-btn-ghost od-btn-sm" style={{ color: "var(--pd-bad)" }}>
              🗑 Öğrenciyi sil
            </button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
