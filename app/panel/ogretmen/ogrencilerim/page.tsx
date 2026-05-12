import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/panel-teacher";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import Link from "next/link";

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
          <thead><tr><th>Ad</th><th>Sınıf</th><th>Sınav</th><th>Telefon</th><th>Durum</th><th></th></tr></thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td><Link href={`/panel/ogretmen/ogrencilerim/${s.id}`} className="od-link">{s.fullName}</Link></td>
                <td>{s.classLevel ?? "—"}</td>
                <td>{s.examType ?? "—"}</td>
                <td className="od-mono">{s.phone}</td>
                <td><Badge tone={s.status === "ACTIVE" ? "ok" : "neutral"}>{s.status}</Badge></td>
                <td><Link href={`/panel/ogretmen/ogrencilerim/${s.id}`} className="od-btn od-btn-ghost od-btn-sm">Aç</Link></td>
              </tr>
            ))}
            {students.length === 0 ? <tr><td colSpan={6} style={{ padding: 24, textAlign: "center" }} className="od-muted">Öğrenci yok.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </>
  );
}
