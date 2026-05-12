import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import { createPackageAction } from "../_actions";

export const dynamic = "force-dynamic";

export default async function NewPackage() {
  await requirePanelRole("admin");
  return (
    <>
      <PageHeader title="Yeni paket" />
      <Card>
        <CardBody>
          <form action={createPackageAction} className="od-grid g-2" style={{ gap: 12 }}>
            <Field label="Ad *"><Input name="name" required /></Field>
            <Field label="Tür">
              <Select name="type" defaultValue="COURSE">
                <option value="COURSE">COURSE</option>
                <option value="CAMP">CAMP</option>
                <option value="PRIVATE">PRIVATE</option>
                <option value="OTHER">OTHER</option>
              </Select>
            </Field>
            <Field label="Fiyat (kuruş) *" hint="₺ × 100"><Input name="price" type="number" required defaultValue={0} /></Field>
            <Field label="Ders sayısı *"><Input name="lessonCount" type="number" required defaultValue={1} /></Field>
            <Field label="Branş listesi *"><Input name="subjects" required placeholder="Mat, Fizik" /></Field>
            <Field label="PayTR linki"><Input name="paytrLink" /></Field>
            <Field label="Aktif">
              <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 0" }}>
                <input type="checkbox" name="isActive" defaultChecked /> <span>Yayında</span>
              </label>
            </Field>
            <div style={{ gridColumn: "1 / -1" }}><Field label="Açıklama"><Textarea name="description" /></Field></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormActions><button className="od-btn od-btn-primary" type="submit">Kaydet</button></FormActions>
            </div>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
