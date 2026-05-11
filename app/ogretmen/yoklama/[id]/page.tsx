import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { AttendanceForm } from "./_form";

export const dynamic = "force-dynamic";

export default async function OgretmenYoklamaSinifPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { teacherId, isAdmin } = await requireTeacher();
  if (!teacherId && !isAdmin) redirect("/giris");

  const classroom = await prisma.classroom.findUnique({
    where: { id },
    include: {
      students: {
        where: { leftAt: null },
        include: { student: { select: { id: true, fullName: true } } },
      },
      teachers: { select: { teacherId: true } },
    },
  });
  if (!classroom) notFound();

  if (!isAdmin && teacherId && !classroom.teachers.some((t: any) => t.teacherId === teacherId)) {
    redirect("/ogretmen/yoklama");
  }

  const students = classroom.students.map((cs: any) => ({
    id: cs.student.id,
    fullName: cs.student.fullName,
  }));

  const recent = await prisma.attendance.findMany({
    where: { classroomId: id },
    orderBy: { sessionDate: "desc" },
    take: 30,
    include: { student: { select: { fullName: true } } },
  });

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <Link href="/ogretmen/yoklama" className="pd-link" style={{ fontSize: 12 }}>
            ← Yoklama
          </Link>
          <h1 className="pd-page-title">{classroom.name}</h1>
          <p className="pd-page-subtitle">Bugünün yoklamasını alın.</p>
        </div>
      </div>

      <AttendanceForm classroomId={id} students={students} />

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Son Kayıtlar</h2>
        {recent.length === 0 ? (
          <div className="pd-card" style={{ padding: 16, color: "var(--pd-muted-2)" }}>
            Bu sınıf için henüz yoklama yok.
          </div>
        ) : (
          <div className="pd-card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--pd-bg-2)" }}>
                  <th style={{ padding: 10, textAlign: "left" }}>Tarih</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Öğrenci</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Durum</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Not</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r: any) => (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--pd-line)" }}>
                    <td style={{ padding: 10 }}>
                      {new Date(r.sessionDate).toLocaleDateString("tr-TR")}
                    </td>
                    <td style={{ padding: 10 }}>{r.student.fullName}</td>
                    <td style={{ padding: 10 }}>
                      <strong>{r.status}</strong>
                    </td>
                    <td style={{ padding: 10, color: "var(--pd-muted-2)" }}>{r.notes ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
