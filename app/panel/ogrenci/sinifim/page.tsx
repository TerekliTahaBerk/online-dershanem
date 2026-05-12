import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/panel-student";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function StudentClassroom() {
  const { student } = await requireStudent();
  if (!student) return <Card><EmptyState icon="user" title="Öğrenci profili yok" /></Card>;
  const links = await prisma.classroomStudent.findMany({
    where: { studentId: student.id, leftAt: null },
    include: {
      classroom: {
        include: {
          teachers: { include: { teacher: { select: { fullName: true, subjects: true } } } },
          _count: { select: { students: true } },
        },
      },
    },
  });
  if (links.length === 0) return <><PageHeader title="Sınıfım" /><Card><EmptyState icon="school" title="Henüz bir sınıfa atanmadın" /></Card></>;
  return (
    <>
      <PageHeader title="Sınıfım" subtitle={`${links.length} aktif sınıf`} />
      <div className="od-grid g-2">
        {links.map((l) => (
          <Card key={l.classroomId}>
            <CardHeader title={l.classroom.name} subtitle={l.classroom.branch ?? undefined} />
            <CardBody>
              <div className="od-muted" style={{ marginBottom: 8 }}>{l.classroom._count.students} öğrenci</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Öğretmenler</div>
              <ul style={{ paddingLeft: 18, fontSize: 13 }}>
                {l.classroom.teachers.map((t) => (
                  <li key={t.teacherId}>{t.teacher.fullName} <span className="od-muted">— {t.teacher.subjects}</span></li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
