import Link from "next/link";
import { requireParent } from "@/lib/panel-parent";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, FormActions } from "@/components/panel/ui/form";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { ToastForm } from "@/components/ui/toast-form";
import { updateParentProfileAction } from "../../_actions";

export const dynamic = "force-dynamic";

export default async function EditParentProfile() {
  const { parent } = await requireParent();
  if (!parent) return <Card><EmptyState icon="user" title="Veli profili yok" /></Card>;
  return (
    <>
      <PageHeader
        title="Profili düzenle"
        right={<Link href="/panel/veli/profilim" className="od-btn od-btn-ghost od-btn-sm">← Geri</Link>}
      />
      <Card>
        <CardBody>
          <ToastForm
            action={updateParentProfileAction}
            className="od-grid g-2"
            style={{ gap: 12 }}
            successMessage="Profil güncellendi"
          >
            <Field label="Ad Soyad"><Input name="fullName" defaultValue={parent.fullName} required /></Field>
            <Field label="E-posta"><Input name="email" type="email" defaultValue={parent.email ?? ""} /></Field>
            <Field label="Telefon"><Input name="phone" defaultValue={parent.phone ?? ""} /></Field>
            <FormActions>
              <button type="submit" className="od-btn od-btn-primary">Kaydet</button>
            </FormActions>
          </ToastForm>
        </CardBody>
      </Card>
    </>
  );
}
