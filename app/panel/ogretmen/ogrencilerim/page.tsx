import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/panel-teacher";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function TeacherStudents() {
  const { teacher } = await requireTeacher();
  if (!teacher) return <Card><EmptyState icon="user" title="Öğretmen profili yok" /></Card>;
  const students = await prisma.student.findMany({
    where: {
      OR: [
        { lessons: { some: { teacherId: teacher.id } } },
        { classrooms: { some: { classroom: { teachers: { some: { teacherId: teacher.id } } } } } },
      ],
    },
    take: 200,
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, classLevel: true, examType: true, status: true, phone: true },
  });
  return (
    <>
      <PageHeader title="Öğrencilerim" subtitle={`${students.length} öğrenci`} />
      <Card>
        <table className="od-table">
          <thead><tr><th>Ad</th><th>Sınıf</th><th>Sınav</th><th>Telefon</th><th>Durum</th></tr></thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>{s.fullName}</td>
                <td>{s.classLevel ?? "—"}</td>
                <td>{s.examType ?? "—"}</td>
                <td className="od-mono">{s.phone}</td>
                <td><Badge tone={s.status === "ACTIVE" ? "ok" : "neutral"}>{s.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
