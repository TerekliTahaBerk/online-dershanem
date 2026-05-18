import { requirePanelRole } from "@/lib/panel-access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, FormActions } from "@/components/panel/ui/form";
import { ToastForm } from "@/components/ui/toast-form";
import { createStudentAction } from "../_actions";

export const dynamic = "force-dynamic";

export default async function NewStudent() {
  await requirePanelRole("admin");
  const [classrooms, parents] = await Promise.all([
    prisma.classroom.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, branch: true } }),
    prisma.parent.findMany({ orderBy: { fullName: "asc" }, select: { id: true, fullName: true, phone: true } }),
  ]);
  return (
    <>
      <PageHeader title="Yeni öğrenci" subtitle="Hızlı kayıt formu" />
      <Card>
        <CardBody>
          <ToastForm action={createStudentAction} className="od-grid g-2" style={{ gap: 12 }}>
            <Field label="Ad Soyad *"><Input name="fullName" required /></Field>
            <Field label="Telefon *"><Input name="phone" required placeholder="+90..." /></Field>
            <Field label="Email"><Input name="email" type="email" /></Field>
            <Field label="Sınıf"><Input name="classLevel" placeholder="11" /></Field>
            <Field label="Sınav türü"><Input name="examType" placeholder="TYT/AYT/LGS" /></Field>
            <Field label="Şehir"><Input name="city" /></Field>
            <Field label="İlçe"><Input name="district" /></Field>
            <Field label="Okul"><Input name="schoolName" /></Field>
            <Field label="Hedef"><Input name="targetGoal" /></Field>
            <Field label="Durum">
              <Select name="status" defaultValue="NEW">
                <option value="NEW">NEW</option>
                <option value="FOLLOW_UP">FOLLOW_UP</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="AT_RISK">AT_RISK</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="INACTIVE">INACTIVE</option>
              </Select>
            </Field>
            <Field label="Sınıf ata (opsiyonel)">
              <Select name="classroomId" defaultValue="">
                <option value="">— Şimdilik atama —</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.branch ? ` · ${c.branch}` : ""}</option>
                ))}
              </Select>
            </Field>
            <Field label="Veli bağla (opsiyonel)">
              <Select name="parentId" defaultValue="">
                <option value="">— Şimdilik bağlama —</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>{p.fullName}{p.phone ? ` · ${p.phone}` : ""}</option>
                ))}
              </Select>
            </Field>
            <Field label="Veli ilişkisi"><Input name="parentRelationship" placeholder="Anne / Baba / Vasi" /></Field>
            <Field label="Birincil veli">
              <label style={{ fontSize: 13 }}><input type="checkbox" name="parentIsPrimary" /> Birincil iletişim</label>
            </Field>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormActions>
                <button className="od-btn od-btn-primary" type="submit">Kaydet</button>
              </FormActions>
            </div>
          </ToastForm>
        </CardBody>
      </Card>
    </>
  );
}
