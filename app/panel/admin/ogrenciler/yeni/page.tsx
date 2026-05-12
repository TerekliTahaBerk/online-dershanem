import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, FormActions } from "@/components/panel/ui/form";
import { createStudentAction } from "../_actions";

export const dynamic = "force-dynamic";

export default async function NewStudent() {
  await requirePanelRole("admin");
  return (
    <>
      <PageHeader title="Yeni öğrenci" subtitle="Hızlı kayıt formu" />
      <Card>
        <CardBody>
          <form action={createStudentAction} className="od-grid g-2" style={{ gap: 12 }}>
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
            <div style={{ gridColumn: "1 / -1" }}>
              <FormActions>
                <button className="od-btn od-btn-primary" type="submit">Kaydet</button>
              </FormActions>
            </div>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
