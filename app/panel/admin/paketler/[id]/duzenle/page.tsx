import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import { updatePackageAction, deletePackageAction } from "../../_actions";

export const dynamic = "force-dynamic";

export default async function EditPackage({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelRole("admin");
  const { id } = await params;
  const p = await prisma.package.findUnique({ where: { id } });
  if (!p) notFound();
  const update = updatePackageAction.bind(null, id);
  const del = deletePackageAction.bind(null, id);
  return (
    <>
      <PageHeader
        title={`Düzenle: ${p.name}`}
        right={<Link href="/panel/admin/paketler" className="od-btn od-btn-ghost od-btn-sm">← Liste</Link>}
      />
      <Card>
        <CardBody>
          <form action={update} className="od-grid g-2" style={{ gap: 12 }}>
            <Field label="Ad *"><Input name="name" defaultValue={p.name} required /></Field>
            <Field label="Tür">
              <Select name="type" defaultValue={p.type}>
                <option value="COURSE">COURSE</option>
                <option value="EXAM">EXAM</option>
              </Select>
            </Field>
            <Field label="Fiyat (kuruş) *" hint="Örn: 99900 = 999 TL"><Input name="price" type="number" defaultValue={p.price} required /></Field>
            <Field label="Ders sayısı"><Input name="lessonCount" type="number" defaultValue={p.lessonCount} /></Field>
            <Field label="PayTR Linki"><Input name="paytrLink" defaultValue={p.paytrLink ?? ""} /></Field>
            <Field label="Dersler"><Input name="subjects" defaultValue={p.subjects} placeholder="Mat, Fizik, Kimya" /></Field>
            <Field label="Aktif"><label style={{ fontSize: 13 }}><input type="checkbox" name="isActive" defaultChecked={p.isActive} /> Aktif</label></Field>
            <div style={{ gridColumn: "1 / -1" }}><Field label="Açıklama"><Textarea name="description" defaultValue={p.description ?? ""} /></Field></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormActions><button className="od-btn od-btn-primary" type="submit">Kaydet</button></FormActions>
            </div>
          </form>
          <hr style={{ margin: "20px 0", border: 0, borderTop: "1px solid var(--pd-line)" }} />
          <form action={del}>
            <button type="submit" className="od-btn od-btn-ghost od-btn-sm" style={{ color: "var(--pd-bad)" }}>🗑 Paketi sil</button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
