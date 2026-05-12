import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/panel-student";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function StudentTeachers() {
  const { student } = await requireStudent();
  if (!student) return <Card><EmptyState icon="user" title="Öğrenci profili yok" /></Card>;
  const teachers = await prisma.teacher.findMany({
    where: {
      OR: [
        { lessons: { some: { studentId: student.id } } },
        { classrooms: { some: { classroom: { students: { some: { studentId: student.id, leftAt: null } } } } } },
      ],
    },
    select: { id: true, fullName: true, email: true, subjects: true, phone: true },
  });
  return (
    <>
      <PageHeader title="Öğretmenlerim" subtitle={`${teachers.length} öğretmen`} />
      <Card>
        <table className="od-table">
          <thead><tr><th>Ad</th><th>Branş</th><th>Email</th><th>Telefon</th></tr></thead>
          <tbody>
            {teachers.map((t) => (
              <tr key={t.id}><td>{t.fullName}</td><td>{t.subjects}</td><td className="od-muted">{t.email ?? "—"}</td><td className="od-mono">{t.phone ?? "—"}</td></tr>
            ))}
            {teachers.length === 0 ? <tr><td colSpan={4} style={{ padding: 24, textAlign: "center" }} className="od-muted">Öğretmen yok.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </>
  );
}
