import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import { updateClassroomAction, deleteClassroomAction } from "../../_actions";

export const dynamic = "force-dynamic";

export default async function EditClassroom({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelRole("admin");
  const { id } = await params;
  const c = await prisma.classroom.findUnique({ where: { id } });
  if (!c) notFound();
  const update = updateClassroomAction.bind(null, id);
  const del = deleteClassroomAction.bind(null, id);
  return (
    <>
      <PageHeader
        title={`Düzenle: ${c.name}`}
        right={<Link href="/panel/admin/siniflar" className="od-btn od-btn-ghost od-btn-sm">← Liste</Link>}
      />
      <Card>
        <CardBody>
          <form action={update} className="od-grid g-2" style={{ gap: 12 }}>
            <Field label="Ad *"><Input name="name" defaultValue={c.name} required /></Field>
            <Field label="Şube"><Input name="branch" defaultValue={c.branch ?? ""} /></Field>
            <Field label="Seviye">
              <Select name="level" defaultValue={c.level}>
                <option value="MIXED">MIXED</option>
                <option value="LGS">LGS</option>
                <option value="TYT">TYT</option>
                <option value="AYT">AYT</option>
                <option value="YDT">YDT</option>
              </Select>
            </Field>
            <Field label="Kapasite"><Input name="capacity" type="number" defaultValue={c.capacity} /></Field>
            <Field label="Aktif"><label style={{ fontSize: 13 }}><input type="checkbox" name="isActive" defaultChecked={c.isActive} /> Aktif</label></Field>
            <div style={{ gridColumn: "1 / -1" }}><Field label="Açıklama"><Textarea name="description" defaultValue={c.description ?? ""} /></Field></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormActions><button className="od-btn od-btn-primary" type="submit">Kaydet</button></FormActions>
            </div>
          </form>
          <hr style={{ margin: "20px 0", border: 0, borderTop: "1px solid var(--pd-line)" }} />
          <form action={del}>
            <button type="submit" className="od-btn od-btn-ghost od-btn-sm" style={{ color: "var(--pd-bad)" }}>🗑 Sınıfı sil</button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
