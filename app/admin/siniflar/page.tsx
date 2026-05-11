import Link from "next/link";
import { Plus, School, Users, GraduationCap } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSiniflarPage() {
  await requireAdmin();

  const classrooms = await prisma.classroom.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { students: true, teachers: true, lessons: true } },
    },
  });

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <h1 className="pd-page-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <School size={20} /> Sınıflar
          </h1>
          <p className="pd-page-subtitle">Şube/sınıf yönetimi, öğretmen ve öğrenci atamaları.</p>
        </div>
        <Link href="/admin/siniflar/yeni" className="pd-btn-accent" style={{ textDecoration: "none" }}>
          <Plus size={14} /> Yeni Sınıf
        </Link>
      </div>

      {classrooms.length === 0 ? (
        <div className="pd-card" style={{ padding: 32, textAlign: "center", color: "var(--pd-muted-2)" }}>
          <School size={32} style={{ opacity: 0.5, margin: "0 auto 8px" }} />
          <div>Henüz sınıf oluşturulmamış.</div>
          <Link href="/admin/siniflar/yeni" className="pd-btn-accent" style={{ marginTop: 12, display: "inline-flex" }}>
            İlk sınıfı oluştur
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {classrooms.map((c) => (
            <Link
              key={c.id}
              href={`/admin/siniflar/${c.id}`}
              className="pd-card"
              style={{
                padding: 16,
                textDecoration: "none",
                color: "inherit",
                opacity: c.isActive ? 1 : 0.6,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <strong style={{ fontSize: 15 }}>{c.name}</strong>
                <span className="pd-chip" style={{ fontSize: 11 }}>{c.level}</span>
              </div>
              {c.branch && (
                <div style={{ fontSize: 12, color: "var(--pd-muted-2)" }}>Şube: {c.branch}</div>
              )}
              {!c.isActive && (
                <div style={{ fontSize: 11, color: "#ef4444" }}>Pasif</div>
              )}
              <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 12, color: "var(--pd-muted-2)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Users size={12} /> {c._count.students} / {c.capacity}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <GraduationCap size={12} /> {c._count.teachers}
                </span>
                <span style={{ marginLeft: "auto" }}>{c._count.lessons} ders</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
