import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/panel-teacher";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, FormActions } from "@/components/panel/ui/form";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { recordClassroomAttendanceAction } from "../../_actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewAttendance({
  searchParams,
}: {
  searchParams: Promise<{ classroomId?: string; date?: string }>;
}) {
  const { teacher } = await requireTeacher();
  if (!teacher) return <Card><EmptyState icon="user" title="Öğretmen profili yok" /></Card>;
  const sp = await searchParams;
  const classrooms = await prisma.classroom.findMany({
    where: { teachers: { some: { teacherId: teacher.id } } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, branch: true },
  });

  const selectedClassroomId = sp.classroomId || "";
  const today = new Date().toISOString().slice(0, 10);
  const selectedDate = sp.date || today;

  let students: { id: string; fullName: string; classLevel: string | null }[] = [];
  let existing: Record<string, string> = {};
  if (selectedClassroomId) {
    const cs = await prisma.classroomStudent.findMany({
      where: { classroomId: selectedClassroomId, leftAt: null },
      include: { student: { select: { id: true, fullName: true, classLevel: true } } },
      orderBy: { student: { fullName: "asc" } },
    });
    students = cs.map((x) => x.student);
    const date = new Date(selectedDate);
    const att = await prisma.attendance.findMany({
      where: { classroomId: selectedClassroomId, sessionDate: date, context: "CLASSROOM_SESSION" },
    });
    existing = Object.fromEntries(att.map((a) => [a.studentId, a.status]));
  }

  return (
    <>
      <PageHeader
        title="Yoklama al"
        right={<Link href="/panel/ogretmen/yoklama" className="od-btn od-btn-ghost od-btn-sm">← Liste</Link>}
      />
      {/* Class & date picker (GET) */}
      <Card>
        <CardBody>
          <form method="GET" className="od-grid g-3" style={{ gap: 12, alignItems: "end" }}>
            <Field label="Sınıf">
              <Select name="classroomId" defaultValue={selectedClassroomId}>
                <option value="">— Seçin —</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.branch ? ` · ${c.branch}` : ""}</option>
                ))}
              </Select>
            </Field>
            <Field label="Tarih">
              <Input type="date" name="date" defaultValue={selectedDate} />
            </Field>
            <FormActions><button className="od-btn od-btn-ghost od-btn-sm" type="submit">Yükle</button></FormActions>
          </form>
        </CardBody>
      </Card>

      {selectedClassroomId && students.length > 0 ? (
        <Card style={{ marginTop: 16 }}>
          <CardBody>
            <form action={recordClassroomAttendanceAction}>
              <input type="hidden" name="classroomId" value={selectedClassroomId} />
              <input type="hidden" name="sessionDate" value={selectedDate} />
              <table className="od-table">
                <thead><tr><th>Öğrenci</th><th>Sınıf</th><th>Durum</th></tr></thead>
                <tbody>
                  {students.map((s) => {
                    const cur = existing[s.id] ?? "PRESENT";
                    return (
                      <tr key={s.id}>
                        <td>{s.fullName}</td>
                        <td className="od-muted">{s.classLevel ?? "—"}</td>
                        <td>
                          <Select name={`status_${s.id}`} defaultValue={cur}>
                            <option value="PRESENT">Mevcut</option>
                            <option value="ABSENT">Yok</option>
                            <option value="LATE">Geç</option>
                            <option value="EXCUSED">İzinli</option>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ marginTop: 12 }}>
                <FormActions><button className="od-btn od-btn-primary" type="submit">Kaydet</button></FormActions>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : selectedClassroomId ? (
        <Card style={{ marginTop: 16 }}><EmptyState icon="users" title="Bu sınıfta öğrenci yok" /></Card>
      ) : null}
    </>
  );
}
