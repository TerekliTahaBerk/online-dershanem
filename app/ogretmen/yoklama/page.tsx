import Link from "next/link";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OgretmenYoklamaPage() {
  const { teacherId, isAdmin } = await requireTeacher();
  if (!teacherId && !isAdmin) redirect("/giris");

  const classrooms = teacherId
    ? await prisma.classroom.findMany({
        where: isAdmin ? {} : { teachers: { some: { teacherId } } },
        include: { _count: { select: { students: true } } },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <h1 className="pd-page-title">Yoklama</h1>
          <p className="pd-page-subtitle">Sınıf seçerek yoklama alın.</p>
        </div>
      </div>

      {classrooms.length === 0 ? (
        <div className="pd-card" style={{ padding: 16, color: "var(--pd-muted-2)" }}>
          Henüz size atanmış bir sınıf yok.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
          {classrooms.map((c: any) => (
            <Link
              key={c.id}
              href={`/ogretmen/yoklama/${c.id}`}
              className="pd-card"
              style={{ padding: 16, textDecoration: "none", color: "inherit" }}
            >
              <strong style={{ fontSize: 15 }}>{c.name}</strong>
              <div style={{ fontSize: 12, color: "var(--pd-muted-2)", marginTop: 4 }}>
                {c.level} · {c._count.students} öğrenci
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
