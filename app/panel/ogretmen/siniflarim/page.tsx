import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/panel-teacher";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function TeacherClasses() {
  const { teacher } = await requireTeacher();
  if (!teacher) {
    return (
      <>
        <PageHeader title="Sınıflarım" />
        <Card><EmptyState icon="user" title="Öğretmen profili yok" /></Card>
      </>
    );
  }
  const links = await prisma.classroomTeacher.findMany({
    where: { teacherId: teacher.id },
    include: {
      classroom: {
        include: { _count: { select: { students: true, lessons: true } } },
      },
    },
    orderBy: [{ isLead: "desc" }, { classroom: { name: "asc" } }],
  });
  return (
    <>
      <PageHeader title="Sınıflarım" subtitle={`${links.length} sınıf`} />
      <Card>
        {links.length === 0 ? (
          <EmptyState
            icon="classroom"
            title="Henüz sınıf atanmamış."
            description="Yöneticiden sınıf ataması rica edebilirsin."
          />
        ) : (
          <table className="od-table">
            <thead>
              <tr>
                <th>Sınıf</th>
                <th>Şube</th>
                <th>Branş</th>
                <th>Rol</th>
                <th>Öğrenci</th>
                <th>Ders</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.classroomId}>
                  <td>
                    <Link
                      href={`/panel/ogretmen/siniflarim/${l.classroomId}`}
                      style={{ color: "inherit", textDecoration: "none", fontWeight: 600 }}
                    >
                      {l.classroom.name}
                    </Link>
                  </td>
                  <td className="od-muted">{l.classroom.branch ?? "—"}</td>
                  <td>{l.subject ?? "—"}</td>
                  <td>
                    {l.isLead ? <Badge tone="purple">Lead</Badge> : <Badge tone="neutral">Branş</Badge>}
                  </td>
                  <td className="od-mono">{l.classroom._count.students}</td>
                  <td className="od-mono">{l.classroom._count.lessons}</td>
                  <td>
                    <Link
                      href={`/panel/ogretmen/siniflarim/${l.classroomId}`}
                      className="od-btn od-btn-ghost od-btn-sm"
                    >
                      Aç →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
