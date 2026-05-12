import Link from "next/link";
import { requireTeacher } from "@/lib/panel-teacher";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Textarea, FormActions } from "@/components/panel/ui/form";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { updateTeacherProfileAction } from "../../_actions";

export const dynamic = "force-dynamic";

export default async function EditTeacherProfile() {
  const { teacher } = await requireTeacher();
  if (!teacher) return <Card><EmptyState icon="user" title="Öğretmen profili yok" /></Card>;
  return (
    <>
      <PageHeader
        title="Profili düzenle"
        right={<Link href="/panel/ogretmen/profilim" className="od-btn od-btn-ghost od-btn-sm">← Geri</Link>}
      />
      <Card>
        <CardBody>
          <form action={updateTeacherProfileAction} className="od-grid g-2" style={{ gap: 12 }}>
            <Field label="Ad Soyad *"><Input name="fullName" defaultValue={teacher.fullName} required /></Field>
            <Field label="Email"><Input name="email" type="email" defaultValue={teacher.email ?? ""} /></Field>
            <Field label="Telefon"><Input name="phone" defaultValue={teacher.phone ?? ""} /></Field>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Bio"><Textarea name="bio" defaultValue={teacher.bio ?? ""} rows={4} /></Field>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormActions><button className="od-btn od-btn-primary" type="submit">Kaydet</button></FormActions>
            </div>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
