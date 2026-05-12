import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/panel-teacher";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { createTeacherAssignmentAction } from "../../_actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewTeacherAssignment() {
  const { teacher } = await requireTeacher();
  if (!teacher) return <Card><EmptyState icon="user" title="Öğretmen profili yok" /></Card>;
  // Teacher's classrooms + students
  const [classrooms, students] = await Promise.all([
    prisma.classroom.findMany({
      where: { teachers: { some: { teacherId: teacher.id } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, branch: true },
    }),
    prisma.student.findMany({
      where: {
        OR: [
          { lessons: { some: { teacherId: teacher.id } } },
          { classrooms: { some: { classroom: { teachers: { some: { teacherId: teacher.id } } } } } },
        ],
      },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, classLevel: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Yeni ödev"
        right={<Link href="/panel/ogretmen/odevler" className="od-btn od-btn-ghost od-btn-sm">← Liste</Link>}
      />
      <Card>
        <CardBody>
          <form action={createTeacherAssignmentAction} className="od-grid g-2" style={{ gap: 12 }}>
            <Field label="Başlık *"><Input name="title" required /></Field>
            <Field label="Ders / Konu"><Input name="subject" placeholder="Matematik" /></Field>
            <Field label="Sınıf">
              <Select name="classroomId" defaultValue="">
                <option value="">— Bireysel ödev —</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.branch ? ` · ${c.branch}` : ""}</option>
                ))}
              </Select>
            </Field>
            <Field label="Bireysel öğrenci (opsiyonel)">
              <Select name="studentId" defaultValue="">
                <option value="">— Yok —</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName}{s.classLevel ? ` · ${s.classLevel}` : ""}</option>
                ))}
              </Select>
            </Field>
            <Field label="Son teslim"><Input name="dueAt" type="datetime-local" /></Field>
            <Field label="Durum">
              <Select name="status" defaultValue="PUBLISHED">
                <option value="DRAFT">Taslak</option>
                <option value="PUBLISHED">Yayınla</option>
              </Select>
            </Field>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Açıklama"><Textarea name="description" rows={4} /></Field>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormActions>
                <button className="od-btn od-btn-primary" type="submit">Kaydet</button>
              </FormActions>
            </div>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
