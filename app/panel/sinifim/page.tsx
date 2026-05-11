import Link from "next/link";
import { School, Users, GraduationCap, CalendarDays } from "lucide-react";
import { requireStudent } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SinifimPage() {
  const { studentId } = await requireStudent();
  if (!studentId) {
    return (
      <div className="pd-page">
        <div className="pd-card" style={{ padding: 24 }}>Öğrenci profili bulunamadı.</div>
      </div>
    );
  }

  const memberships = await prisma.classroomStudent.findMany({
    where: { studentId, leftAt: null },
    include: {
      classroom: {
        include: {
          teachers: { include: { teacher: { include: { user: { select: { name: true } } } } } },
          students: { where: { leftAt: null }, select: { studentId: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <h1 className="pd-page-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <School size={20} /> Sınıfım
          </h1>
          <p className="pd-page-subtitle">Atandığın sınıflar, öğretmenlerin ve sınıf arkadaşların.</p>
        </div>
      </div>

      {memberships.length === 0 ? (
        <div className="pd-card" style={{ padding: 32, textAlign: "center", color: "var(--pd-muted-2)" }}>
          Henüz bir sınıfa atanmadın.
        </div>
      ) : (
        memberships.map((m: any) => {
          const c = m.classroom;
          return (
            <div key={c.id} className="pd-card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <strong style={{ fontSize: 16 }}>{c.name}</strong>
                  {c.branch && <span className="pd-chip" style={{ marginLeft: 8, fontSize: 11 }}>{c.branch}</span>}
                  <span className="pd-chip" style={{ marginLeft: 8, fontSize: 11 }}>{c.level}</span>
                </div>
                <span style={{ fontSize: 12, color: "var(--pd-muted-2)" }}>
                  <Users size={12} /> {c.students.length} öğrenci
                </span>
              </div>

              {c.description && (
                <p style={{ fontSize: 13, color: "var(--pd-ink-3)", marginBottom: 12 }}>{c.description}</p>
              )}

              <div>
                <div style={{ fontSize: 13, color: "var(--pd-muted-2)", marginBottom: 6 }}>
                  <GraduationCap size={13} /> Öğretmenler
                </div>
                {c.teachers.length === 0 ? (
                  <div style={{ fontSize: 13, color: "var(--pd-muted-2)" }}>—</div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {c.teachers.map((ct: any) => (
                      <span key={ct.teacherId} className="pd-chip" style={{ fontSize: 12 }}>
                        {ct.teacher.user.name ?? "Öğretmen"}
                        {ct.subject && ` · ${ct.subject}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
