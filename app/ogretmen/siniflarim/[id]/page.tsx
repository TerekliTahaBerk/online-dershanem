import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, School, Users, CalendarDays, GraduationCap } from "lucide-react";
import { requireTeacher } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SinifDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { teacherId, isAdmin } = await requireTeacher();
  const { id } = await params;

  const classroom = await prisma.classroom.findFirst({
    where: {
      id,
      ...(isAdmin ? {} : { teachers: { some: { teacherId: teacherId! } } }),
    },
    include: {
      teachers: { include: { teacher: { include: { user: { select: { name: true } } } } } },
      students: {
        where: { leftAt: null },
        include: { student: { include: { user: { select: { name: true, email: true } } } } },
      },
      lessons: {
        orderBy: { scheduledAt: "desc" },
        take: 10,
        include: { teacher: { include: { user: { select: { name: true } } } } },
      },
    },
  });
  if (!classroom) notFound();

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <Link href="/ogretmen/siniflarim" className="pd-link" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}>
            <ArrowLeft size={14} /> Sınıflarım
          </Link>
          <h1 className="pd-page-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <School size={20} /> {classroom.name}
            {classroom.branch && <span className="pd-chip">{classroom.branch}</span>}
          </h1>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 16 }}>
        <div className="pd-kpi-card">
          <div style={{ fontSize: 12, color: "var(--pd-muted-2)" }}><Users size={14} /> Öğrenci</div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{classroom.students.length}</div>
        </div>
        <div className="pd-kpi-card">
          <div style={{ fontSize: 12, color: "var(--pd-muted-2)" }}><GraduationCap size={14} /> Öğretmen</div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{classroom.teachers.length}</div>
        </div>
        <div className="pd-kpi-card">
          <div style={{ fontSize: 12, color: "var(--pd-muted-2)" }}><CalendarDays size={14} /> Son ders</div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{classroom.lessons[0] ? new Date(classroom.lessons[0].scheduledAt).toLocaleDateString("tr-TR") : "—"}</div>
        </div>
      </div>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Öğrenciler</h2>
        <div className="pd-card" style={{ padding: 0 }}>
          {classroom.students.length === 0 ? (
            <div style={{ padding: 16, color: "var(--pd-muted-2)" }}>Sınıfta öğrenci yok.</div>
          ) : (
            classroom.students.map((cs: any) => (
              <div key={cs.studentId} style={{ padding: "10px 14px", borderBottom: "1px solid var(--pd-border)" }}>
                <Link href={`/ogretmen/ogrencilerim/${cs.studentId}`} className="pd-link" style={{ textDecoration: "none" }}>
                  <strong>{cs.student.user.name ?? cs.student.user.email}</strong>
                </Link>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Son dersler</h2>
        <div className="pd-card" style={{ padding: 0 }}>
          {classroom.lessons.length === 0 ? (
            <div style={{ padding: 16, color: "var(--pd-muted-2)" }}>Henüz ders kaydedilmemiş.</div>
          ) : (
            classroom.lessons.map((l: any) => (
              <div key={l.id} style={{ padding: "10px 14px", borderBottom: "1px solid var(--pd-border)", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <strong>{l.subject ?? "Ders"}</strong>
                  <span style={{ marginLeft: 8, fontSize: 12, color: "var(--pd-muted-2)" }}>
                    {l.teacher?.user?.name}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: "var(--pd-muted-2)" }}>
                  {new Date(l.scheduledAt).toLocaleString("tr-TR")}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
