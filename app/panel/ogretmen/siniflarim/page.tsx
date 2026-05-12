import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/panel-teacher";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function TeacherClasses() {
  const { teacher } = await requireTeacher();
  if (!teacher) return <Card><EmptyState icon="user" title="Öğretmen profili yok" /></Card>;
  const links = await prisma.classroomTeacher.findMany({
    where: { teacherId: teacher.id },
    include: { classroom: { include: { _count: { select: { students: true, lessons: true } } } } },
  });
  return (
    <>
      <PageHeader title="Sınıflarım" subtitle={`${links.length} sınıf`} />
      <Card>
        <table className="od-table">
          <thead><tr><th>Sınıf</th><th>Şube</th><th>Branş</th><th>Öğrenci</th><th>Ders</th></tr></thead>
          <tbody>
            {links.map((l) => (
              <tr key={l.classroomId}>
                <td>{l.classroom.name}</td>
                <td className="od-muted">{l.classroom.branch ?? "—"}</td>
                <td>{l.subject ?? "—"}</td>
                <td className="od-mono">{l.classroom._count.students}</td>
                <td className="od-mono">{l.classroom._count.lessons}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
