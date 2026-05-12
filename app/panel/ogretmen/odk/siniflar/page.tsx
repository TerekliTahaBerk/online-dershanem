import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTeacherWithScope } from "@/lib/odk/teacher";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const metadata: Metadata = {
  title: "Sınıf Analizi · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function TeacherOdkClassroomsPage() {
  const { teacherId, classroomIds } = await requireTeacherWithScope();
  if (!teacherId) {
    return (
      <>
        <PageHeader title="Sınıf Analizi" />
        <Card><CardBody><EmptyState title="Öğretmen kaydı bulunamadı" /></CardBody></Card>
      </>
    );
  }

  const classrooms = classroomIds.length === 0
    ? []
    : await prisma.classroom.findMany({
        where: { id: { in: classroomIds } },
        select: {
          id: true,
          name: true,
          branch: true,
          level: true,
          students: {
            where: { leftAt: null },
            select: { student: { select: { userId: true } } },
          },
        },
        orderBy: { name: "asc" },
      });

  const allUserIds = Array.from(new Set(classrooms.flatMap((c) => c.students.map((s) => s.student.userId).filter((u): u is string => Boolean(u)))));
  const attempts = allUserIds.length === 0
    ? []
    : await prisma.odkExamAttempt.findMany({
        where: { userId: { in: allUserIds }, status: "SUBMITTED" },
        select: { userId: true, score: true },
      });
  const netByUser = new Map<string, { sum: number; n: number }>();
  for (const a of attempts) {
    if (a.score === null) continue;
    const cur = netByUser.get(a.userId) ?? { sum: 0, n: 0 };
    cur.sum += Number(a.score);
    cur.n += 1;
    netByUser.set(a.userId, cur);
  }

  return (
    <>
      <PageHeader title="Sınıflarım" subtitle={`${classrooms.length} sınıf`} />
      <Card>
        <CardHeader title="Sınıf listesi" />
        <CardBody>
          {classrooms.length === 0 ? (
            <EmptyState title="Atanmış sınıfın yok" />
          ) : (
            <table className="od-table">
              <thead>
                <tr>
                  <th>Sınıf</th>
                  <th>Şube</th>
                  <th>Seviye</th>
                  <th>Öğrenci</th>
                  <th>Ortalama net</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {classrooms.map((c) => {
                  const userIds = c.students.map((s) => s.student.userId).filter((u): u is string => Boolean(u));
                  let sum = 0;
                  let n = 0;
                  for (const u of userIds) {
                    const stat = netByUser.get(u);
                    if (stat) { sum += stat.sum; n += stat.n; }
                  }
                  const avg = n > 0 ? sum / n : null;
                  return (
                    <tr key={c.id}>
                      <td><strong>{c.name}</strong></td>
                      <td>{c.branch ?? "—"}</td>
                      <td>{c.level}</td>
                      <td>{userIds.length}</td>
                      <td><strong>{avg === null ? "—" : avg.toFixed(2)}</strong></td>
                      <td><Link href={`/panel/ogretmen/odk/siniflar/${c.id}`}>Detay</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </>
  );
}
