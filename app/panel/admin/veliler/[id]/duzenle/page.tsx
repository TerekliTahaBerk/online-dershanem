import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import { updateParentAction, deleteParentAction, linkChildAction, unlinkChildAction } from "../../_actions";

export const dynamic = "force-dynamic";

export default async function EditParent({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelRole("admin");
  const { id } = await params;
  const [p, allStudents] = await Promise.all([
    prisma.parent.findUnique({
      where: { id },
      include: { students: { include: { student: { select: { id: true, fullName: true } } } } },
    }),
    prisma.student.findMany({ orderBy: { fullName: "asc" }, select: { id: true, fullName: true, classLevel: true } }),
  ]);
  if (!p) notFound();
  const linkedIds = new Set(p.students.map((s) => s.student.id));
  const unlinked = allStudents.filter((s) => !linkedIds.has(s.id));
  const update = updateParentAction.bind(null, id);
  const del = deleteParentAction.bind(null, id);
  const linkChild = linkChildAction.bind(null, id);
  return (
    <>
      <PageHeader
        title={`Düzenle: ${p.fullName}`}
        right={<Link href="/panel/admin/veliler" className="od-btn od-btn-ghost od-btn-sm">← Liste</Link>}
      />
      <Card>
        <CardBody>
          <form action={update} className="od-grid g-2" style={{ gap: 12 }}>
            <Field label="Ad Soyad *"><Input name="fullName" defaultValue={p.fullName} required /></Field>
            <Field label="Telefon"><Input name="phone" defaultValue={p.phone ?? ""} /></Field>
            <Field label="Email"><Input name="email" type="email" defaultValue={p.email ?? ""} /></Field>
            <div style={{ gridColumn: "1 / -1" }}><Field label="Notlar"><Textarea name="notes" defaultValue={p.notes ?? ""} /></Field></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormActions><button className="od-btn od-btn-primary" type="submit">Kaydet</button></FormActions>
            </div>
          </form>

          <hr style={{ margin: "20px 0", border: 0, borderTop: "1px solid var(--pd-line)" }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Bağlı çocuklar</h3>
          {p.students.length === 0 ? <div className="od-muted" style={{ fontSize: 13 }}>Henüz bağlı çocuk yok.</div> : (
            <table className="od-table">
              <thead><tr><th>Öğrenci</th><th>İlişki</th><th>Birincil</th><th></th></tr></thead>
              <tbody>
                {p.students.map((c) => (
                  <tr key={c.student.id}>
                    <td>{c.student.fullName}</td>
                    <td className="od-muted">{c.relationship ?? "—"}</td>
                    <td>{c.isPrimary ? "✓" : "—"}</td>
                    <td>
                      <form action={unlinkChildAction.bind(null, id, c.student.id)} style={{ display: "inline" }}>
                        <button type="submit" className="od-btn od-btn-ghost od-btn-sm" style={{ color: "var(--pd-bad)" }}>Bağı Kaldır</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "20px 0 12px" }}>Çocuk ekle</h3>
          <form action={linkChild} className="od-grid g-3" style={{ gap: 12, alignItems: "end" }}>
            <Field label="Öğrenci *">
              <Select name="studentId" required defaultValue="">
                <option value="" disabled>Seçin…</option>
                {unlinked.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName}{s.classLevel ? ` · ${s.classLevel}` : ""}</option>
                ))}
              </Select>
            </Field>
            <Field label="İlişki"><Input name="relationship" placeholder="Anne / Baba / Vasi" /></Field>
            <Field label="Birincil"><label style={{ fontSize: 13 }}><input type="checkbox" name="isPrimary" /> Birincil iletişim</label></Field>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormActions><button className="od-btn od-btn-primary od-btn-sm" type="submit">Bağla</button></FormActions>
            </div>
          </form>

          <hr style={{ margin: "20px 0", border: 0, borderTop: "1px solid var(--pd-line)" }} />
          <form action={del}>
            <button type="submit" className="od-btn od-btn-ghost od-btn-sm" style={{ color: "var(--pd-bad)" }}>🗑 Veliyi sil</button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
