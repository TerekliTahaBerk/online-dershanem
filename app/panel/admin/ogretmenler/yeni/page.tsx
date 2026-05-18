import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import { ToastForm } from "@/components/ui/toast-form";
import { createTeacherAction } from "../_actions";

export const dynamic = "force-dynamic";

export default async function NewTeacher() {
  await requirePanelRole("admin");
  return (
    <>
      <PageHeader title="Yeni öğretmen" />
      <Card>
        <CardBody>
          <ToastForm action={createTeacherAction} className="od-grid g-2" style={{ gap: 12 }} successMessage="Öğretmen oluşturuldu">
            <Field label="Ad Soyad *"><Input name="fullName" required /></Field>
            <Field label="Branş *"><Input name="subjects" required placeholder="Matematik, Fizik" /></Field>
            <Field label="Email"><Input name="email" type="email" /></Field>
            <Field label="Telefon"><Input name="phone" /></Field>
            <Field label="Durum">
              <Select name="status" defaultValue="ACTIVE">
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </Select>
            </Field>
            <div style={{ gridColumn: "1 / -1" }}><Field label="Bio"><Textarea name="bio" /></Field></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormActions><button className="od-btn od-btn-primary" type="submit">Kaydet</button></FormActions>
            </div>
          </ToastForm>
        </CardBody>
      </Card>
    </>
  );
}
