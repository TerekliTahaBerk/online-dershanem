import Link from "next/link";
import { School, Users, CalendarDays } from "lucide-react";
import { requireTeacher } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SiniflarimPage() {
  const { teacherId, isAdmin } = await requireTeacher();

  const classrooms = await prisma.classroom.findMany({
    where: isAdmin ? {} : { teachers: { some: { teacherId: teacherId! } } },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { students: { where: { leftAt: null } as any }, lessons: true } },
    },
  });

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <h1 className="pd-page-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <School size={20} /> Sınıflarım
          </h1>
          <p className="pd-page-subtitle">Atandığınız sınıflar ve öğrenci özetleri.</p>
        </div>
      </div>

      {classrooms.length === 0 ? (
        <div className="pd-card" style={{ padding: 32, textAlign: "center", color: "var(--pd-muted-2)" }}>
          Henüz bir sınıfa atanmadınız.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {classrooms.map((c: any) => (
            <Link
              key={c.id}
              href={`/ogretmen/siniflarim/${c.id}`}
              className="pd-card"
              style={{ padding: 16, textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: 8 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <strong style={{ fontSize: 15 }}>{c.name}</strong>
                <span className="pd-chip" style={{ fontSize: 11 }}>{c.level}</span>
              </div>
              {c.branch && <div style={{ fontSize: 12, color: "var(--pd-muted-2)" }}>{c.branch}</div>}
              <div style={{ display: "flex", gap: 14, marginTop: 4, fontSize: 12, color: "var(--pd-muted-2)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Users size={12} /> {c._count.students}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><CalendarDays size={12} /> {c._count.lessons}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
