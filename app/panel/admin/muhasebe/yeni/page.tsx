import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import { createEntryAction } from "../_actions";

export const dynamic = "force-dynamic";

export default async function NewEntry() {
  await requirePanelRole("admin");
  return (
    <>
      <PageHeader title="Yeni muhasebe kaydı" />
      <Card>
        <CardBody>
          <form action={createEntryAction} className="od-grid g-2" style={{ gap: 12 }}>
            <Field label="Tip *">
              <Select name="type" defaultValue="INCOME">
                <option value="INCOME">Gelir</option>
                <option value="EXPENSE">Gider</option>
              </Select>
            </Field>
            <Field label="Kategori *">
              <Select name="category" defaultValue="OTHER_INCOME">
                <option value="PACKAGE_SALE">Paket satışı</option>
                <option value="CAMP_SALE">Kamp satışı</option>
                <option value="SERVICE_FEE">Hizmet bedeli</option>
                <option value="OTHER_INCOME">Diğer gelir</option>
                <option value="TEACHER_PAYROLL">Maaş</option>
                <option value="MARKETING">Pazarlama</option>
                <option value="RENT">Kira</option>
                <option value="TAX">Vergi</option>
                <option value="OPERATIONAL">Operasyonel</option>
              </Select>
            </Field>
            <Field label="Tutar (₺) *" hint="Otomatik kuruşa çevrilir"><Input name="amount" type="number" step="0.01" required /></Field>
            <Field label="Tarih"><Input name="occurredAt" type="datetime-local" /></Field>
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
