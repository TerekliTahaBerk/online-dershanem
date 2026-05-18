import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Textarea, FormActions } from "@/components/panel/ui/form";
import { ToastForm } from "@/components/ui/toast-form";
import { createParentAction } from "../_actions";

export const dynamic = "force-dynamic";

export default async function NewParent() {
  await requirePanelRole("admin");
  return (
    <>
      <PageHeader title="Yeni veli" />
      <Card>
        <CardBody>
          <ToastForm action={createParentAction} className="od-grid g-2" style={{ gap: 12 }}>
            <Field label="Ad Soyad *"><Input name="fullName" required /></Field>
            <Field label="Telefon"><Input name="phone" /></Field>
            <Field label="Email"><Input name="email" type="email" /></Field>
            <div style={{ gridColumn: "1 / -1" }}><Field label="Notlar"><Textarea name="notes" /></Field></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormActions><button className="od-btn od-btn-primary" type="submit">Kaydet</button></FormActions>
            </div>
          </ToastForm>
        </CardBody>
      </Card>
    </>
  );
}
