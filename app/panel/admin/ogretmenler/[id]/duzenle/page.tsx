import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import {
  updateTeacherAction,
  deleteTeacherAction,
  assignClassroomToTeacherAction,
  removeClassroomFromTeacherAction,
} from "../../_actions";

export const dynamic = "force-dynamic";

export default async function EditTeacher({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelRole("admin");
  const { id } = await params;
  const [t, allClassrooms] = await Promise.all([
    prisma.teacher.findUnique({
      where: { id },
      include: {
        classrooms: { include: { classroom: { select: { id: true, name: true, branch: true, level: true } } } },
      },
    }),
    prisma.classroom.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, branch: true } }),
  ]);
  if (!t) notFound();

  const linkedIds = new Set(t.classrooms.map((x) => x.classroom.id));
  const avail = allClassrooms.filter((c) => !linkedIds.has(c.id));

  const update = updateTeacherAction.bind(null, id);
  const del = deleteTeacherAction.bind(null, id);
  const addClassroom = assignClassroomToTeacherAction.bind(null, id);

  return (
    <>
      <PageHeader
        title={`Düzenle: ${t.fullName}`}
        right={<Link href="/panel/admin/ogretmenler" className="od-btn od-btn-ghost od-btn-sm">← Liste</Link>}
      />
      <Card>
        <CardBody>
          <form action={update} className="od-grid g-2" style={{ gap: 12 }}>
            <Field label="Ad Soyad *"><Input name="fullName" defaultValue={t.fullName} required /></Field>
            <Field label="Branş *"><Input name="subjects" defaultValue={t.subjects} required /></Field>
            <Field label="Email"><Input name="email" type="email" defaultValue={t.email ?? ""} /></Field>
            <Field label="Telefon"><Input name="phone" defaultValue={t.phone ?? ""} /></Field>
            <Field label="Durum">
              <Select name="status" defaultValue={t.status}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </Select>
            </Field>
            <div style={{ gridColumn: "1 / -1" }}><Field label="Bio"><Textarea name="bio" defaultValue={t.bio ?? ""} /></Field></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormActions><button className="od-btn od-btn-primary" type="submit">Kaydet</button></FormActions>
            </div>
          </form>

          <hr style={{ margin: "24px 0 16px", border: 0, borderTop: "1px solid var(--pd-line)" }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Sınıflar</h3>
          {t.classrooms.length === 0 ? (
            <div className="od-muted" style={{ fontSize: 13 }}>Henüz sınıf atanmamış.</div>
          ) : (
            <table className="od-table">
              <thead><tr><th>Sınıf</th><th>Şube</th><th>Seviye</th><th>Ders</th><th>Lider</th><th></th></tr></thead>
              <tbody>
                {t.classrooms.map((ct) => (
                  <tr key={ct.classroom.id}>
                    <td>{ct.classroom.name}</td>
                    <td className="od-muted">{ct.classroom.branch ?? "—"}</td>
                    <td className="od-muted">{ct.classroom.level}</td>
                    <td className="od-muted">{ct.subject ?? "—"}</td>
                    <td>{ct.isLead ? "✓" : "—"}</td>
                    <td>
                      <form action={removeClassroomFromTeacherAction.bind(null, id, ct.classroom.id)} style={{ display: "inline" }}>
                        <button type="submit" className="od-btn od-btn-ghost od-btn-sm" style={{ color: "var(--pd-bad)" }}>Kaldır</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {avail.length > 0 && (
            <form action={addClassroom} className="od-grid g-3" style={{ gap: 12, alignItems: "end", marginTop: 12 }}>
              <Field label="Sınıf ekle">
                <Select name="classroomId" required defaultValue="">
                  <option value="" disabled>Seçin…</option>
                  {avail.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.branch ? ` · ${c.branch}` : ""}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Ders"><Input name="subject" placeholder="Matematik" /></Field>
              <Field label="Lider"><label style={{ fontSize: 13 }}><input type="checkbox" name="isLead" /> Sınıf öğretmeni</label></Field>
              <div style={{ gridColumn: "1 / -1" }}>
                <FormActions><button className="od-btn od-btn-primary od-btn-sm" type="submit">Ata</button></FormActions>
              </div>
            </form>
          )}

          <hr style={{ margin: "24px 0 16px", border: 0, borderTop: "1px solid var(--pd-line)" }} />
          <form action={del}>
            <button type="submit" className="od-btn od-btn-ghost od-btn-sm" style={{ color: "var(--pd-bad)" }}>🗑 Öğretmeni sil</button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
