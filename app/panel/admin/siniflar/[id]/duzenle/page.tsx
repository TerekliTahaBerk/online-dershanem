import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import {
  updateClassroomAction,
  deleteClassroomAction,
  addStudentToClassroomAction,
  removeStudentFromClassroomAction,
  addTeacherToClassroomAction,
  removeTeacherFromClassroomAction,
} from "../../_actions";

export const dynamic = "force-dynamic";

export default async function EditClassroom({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelRole("admin");
  const { id } = await params;
  const [c, allStudents, allTeachers] = await Promise.all([
    prisma.classroom.findUnique({
      where: { id },
      include: {
        students: { include: { student: { select: { id: true, fullName: true, classLevel: true } } } },
        teachers: { include: { teacher: { select: { id: true, fullName: true, subjects: true } } } },
      },
    }),
    prisma.student.findMany({ orderBy: { fullName: "asc" }, select: { id: true, fullName: true, classLevel: true } }),
    prisma.teacher.findMany({ orderBy: { fullName: "asc" }, select: { id: true, fullName: true, subjects: true } }),
  ]);
  if (!c) notFound();

  const linkedStu = new Set(c.students.map((x) => x.student.id));
  const linkedTea = new Set(c.teachers.map((x) => x.teacher.id));
  const availStudents = allStudents.filter((s) => !linkedStu.has(s.id));
  const availTeachers = allTeachers.filter((t) => !linkedTea.has(t.id));

  const update = updateClassroomAction.bind(null, id);
  const del = deleteClassroomAction.bind(null, id);
  const addStudent = addStudentToClassroomAction.bind(null, id);
  const addTeacher = addTeacherToClassroomAction.bind(null, id);

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

          <hr style={{ margin: "24px 0 16px", border: 0, borderTop: "1px solid var(--pd-line)" }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Öğretmenler</h3>
          {c.teachers.length === 0 ? (
            <div className="od-muted" style={{ fontSize: 13 }}>Henüz öğretmen atanmamış.</div>
          ) : (
            <table className="od-table">
              <thead><tr><th>Öğretmen</th><th>Branş</th><th>Ders</th><th>Lider</th><th></th></tr></thead>
              <tbody>
                {c.teachers.map((ct) => (
                  <tr key={ct.teacher.id}>
                    <td>{ct.teacher.fullName}</td>
                    <td className="od-muted">{ct.teacher.subjects}</td>
                    <td className="od-muted">{ct.subject ?? "—"}</td>
                    <td>{ct.isLead ? "✓" : "—"}</td>
                    <td>
                      <form action={removeTeacherFromClassroomAction.bind(null, id, ct.teacher.id)} style={{ display: "inline" }}>
                        <button type="submit" className="od-btn od-btn-ghost od-btn-sm" style={{ color: "var(--pd-bad)" }}>Kaldır</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {availTeachers.length > 0 && (
            <form action={addTeacher} className="od-grid g-3" style={{ gap: 12, alignItems: "end", marginTop: 12 }}>
              <Field label="Öğretmen ekle">
                <Select name="teacherId" required defaultValue="">
                  <option value="" disabled>Seçin…</option>
                  {availTeachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.fullName} · {t.subjects}</option>
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
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Öğrenciler</h3>
          {c.students.length === 0 ? (
            <div className="od-muted" style={{ fontSize: 13 }}>Henüz öğrenci atanmamış.</div>
          ) : (
            <table className="od-table">
              <thead><tr><th>Öğrenci</th><th>Sınıf</th><th>Katıldı</th><th></th></tr></thead>
              <tbody>
                {c.students.map((cs) => (
                  <tr key={cs.student.id}>
                    <td>{cs.student.fullName}</td>
                    <td className="od-muted">{cs.student.classLevel ?? "—"}</td>
                    <td className="od-muted">{cs.joinedAt.toLocaleDateString("tr-TR")}</td>
                    <td>
                      <form action={removeStudentFromClassroomAction.bind(null, id, cs.student.id)} style={{ display: "inline" }}>
                        <button type="submit" className="od-btn od-btn-ghost od-btn-sm" style={{ color: "var(--pd-bad)" }}>Kaldır</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {availStudents.length > 0 && (
            <form action={addStudent} className="od-grid g-2" style={{ gap: 12, alignItems: "end", marginTop: 12 }}>
              <Field label="Öğrenci ekle">
                <Select name="studentId" required defaultValue="">
                  <option value="" disabled>Seçin…</option>
                  {availStudents.map((s) => (
                    <option key={s.id} value={s.id}>{s.fullName}{s.classLevel ? ` · ${s.classLevel}` : ""}</option>
                  ))}
                </Select>
              </Field>
              <FormActions><button className="od-btn od-btn-primary od-btn-sm" type="submit">Ata</button></FormActions>
            </form>
          )}

          <hr style={{ margin: "24px 0 16px", border: 0, borderTop: "1px solid var(--pd-line)" }} />
          <form action={del}>
            <button type="submit" className="od-btn od-btn-ghost od-btn-sm" style={{ color: "var(--pd-bad)" }}>🗑 Sınıfı sil</button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
