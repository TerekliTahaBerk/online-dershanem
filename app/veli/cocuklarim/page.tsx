import Link from "next/link";
import { redirect } from "next/navigation";
import { requireParent } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function VeliCocuklarimPage() {
  const { parentId, isAdmin } = await requireParent();
  if (!parentId && !isAdmin) redirect("/giris");

  const links = parentId
    ? await prisma.parentStudent.findMany({
        where: { parentId },
        include: {
          student: {
            include: {
              user: { select: { email: true } },
              packages: {
                where: { revokedAt: null },
                include: { package: { select: { name: true } } },
                take: 1,
              },
            },
          },
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      })
    : [];

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <h1 className="pd-page-title">Çocuklarım</h1>
          <p className="pd-page-subtitle">Hesabınıza bağlı öğrenciler.</p>
        </div>
      </div>

      {links.length === 0 ? (
        <div className="pd-card" style={{ padding: 24, color: "var(--pd-muted-2)" }}>
          Henüz bağlı öğrenci yok.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 12 }}>
          {links.map((l: any) => (
            <Link
              key={l.studentId}
              href={`/veli/cocuklarim/${l.studentId}`}
              className="pd-card"
              style={{ padding: 16, textDecoration: "none", color: "inherit" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <strong style={{ fontSize: 15 }}>{l.student.fullName}</strong>
                {l.isPrimary && (
                  <span className="pd-chip" style={{ fontSize: 10, background: "#fef3c7" }}>Birincil</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--pd-muted-2)" }}>
                {l.student.classLevel ?? "—"} · {l.relationship ?? "Veli"}
              </div>
              <div style={{ fontSize: 12, color: "var(--pd-muted-2)", marginTop: 4 }}>
                {l.student.user?.email ?? "—"}
              </div>
              {l.student.packages[0] && (
                <div style={{ fontSize: 12, marginTop: 8 }}>
                  Paket: <strong>{l.student.packages[0].package.name}</strong>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
