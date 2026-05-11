import Link from "next/link";
import { Plus, Heart, Mail, Phone } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function VelilerPage() {
  await requireAdmin();
  const parents = await prisma.parent.findMany({
    orderBy: { fullName: "asc" },
    include: {
      user: { select: { id: true, email: true } },
      _count: { select: { students: true } },
    },
  });

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <h1 className="pd-page-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Heart size={20} /> Veliler
          </h1>
          <p className="pd-page-subtitle">Veliler ve bağlı oldukları öğrenciler.</p>
        </div>
        <Link href="/admin/veliler/yeni" className="pd-btn-accent" style={{ textDecoration: "none" }}>
          <Plus size={14} /> Yeni Veli
        </Link>
      </div>

      {parents.length === 0 ? (
        <div className="pd-card" style={{ padding: 32, textAlign: "center", color: "var(--pd-muted-2)" }}>
          Henüz veli kaydı yok.
        </div>
      ) : (
        <div className="pd-card" style={{ padding: 0 }}>
          {parents.map((p: any) => (
            <Link
              key={p.id}
              href={`/admin/veliler/${p.id}`}
              style={{
                display: "flex", padding: "12px 14px", gap: 12,
                borderBottom: "1px solid var(--pd-border)",
                textDecoration: "none", color: "inherit", alignItems: "center",
              }}
            >
              <div style={{ flex: 1 }}>
                <strong>{p.fullName}</strong>
                {p.user && (
                  <span className="pd-chip" style={{ marginLeft: 8, fontSize: 11, background: "#d1fae5", color: "#065f46" }}>
                    Panel hesabı var
                  </span>
                )}
                <div style={{ fontSize: 12, color: "var(--pd-muted-2)", marginTop: 2, display: "flex", gap: 12 }}>
                  {p.email && <span><Mail size={11} /> {p.email}</span>}
                  {p.phone && <span><Phone size={11} /> {p.phone}</span>}
                </div>
              </div>
              <span style={{ fontSize: 12, color: "var(--pd-muted-2)" }}>
                {p._count.students} çocuk
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
