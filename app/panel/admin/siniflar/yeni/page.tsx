import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import { ToastForm } from "@/components/ui/toast-form";
import { createClassroomAction } from "../_actions";

export const dynamic = "force-dynamic";

export default async function NewClassroom() {
  await requirePanelRole("admin");
  return (
    <>
      <PageHeader title="Yeni sınıf" />
      <Card>
        <CardBody>
          <ToastForm action={createClassroomAction} className="od-grid g-2" style={{ gap: 12 }}>
            <Field label="Ad *"><Input name="name" required /></Field>
            <Field label="Şube"><Input name="branch" /></Field>
            <Field label="Seviye">
              <Select name="level" defaultValue="MIXED">
                <option value="MIXED">MIXED</option>
                <option value="TYT">TYT</option>
                <option value="AYT">AYT</option>
                <option value="LGS">LGS</option>
              </Select>
            </Field>
            <Field label="Kapasite"><Input name="capacity" type="number" defaultValue={30} /></Field>
            <div style={{ gridColumn: "1 / -1" }}><Field label="Açıklama"><Textarea name="description" /></Field></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormActions><button className="od-btn od-btn-primary" type="submit">Kaydet</button></FormActions>
            </div>
          </ToastForm>
        </CardBody>
      </Card>
    </>
  );
}
