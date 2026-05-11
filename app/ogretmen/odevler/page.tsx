import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { requireTeacher } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OgretmenOdevlerPage() {
  const { teacherId, isAdmin } = await requireTeacher();
  if (!teacherId && !isAdmin) redirect("/giris");

  const items = teacherId
    ? await prisma.assignment.findMany({
        where: isAdmin ? {} : { teacherId },
        include: {
          classroom: { select: { name: true } },
          student: { select: { fullName: true } },
          _count: { select: { submissions: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      })
    : [];

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <h1 className="pd-page-title">Ödevler</h1>
          <p className="pd-page-subtitle">Verdiğiniz ödevler ve teslimler.</p>
        </div>
        <Link href="/ogretmen/odevler/yeni" className="pd-btn-accent">
          <Plus size={14} /> Yeni Ödev
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="pd-card" style={{ padding: 16, color: "var(--pd-muted-2)" }}>
          Henüz ödev yok.
        </div>
      ) : (
        <div className="pd-card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--pd-bg-2)" }}>
                <th style={{ padding: 10, textAlign: "left" }}>Başlık</th>
                <th style={{ padding: 10, textAlign: "left" }}>Hedef</th>
                <th style={{ padding: 10, textAlign: "left" }}>Son Tarih</th>
                <th style={{ padding: 10, textAlign: "left" }}>Teslim</th>
                <th style={{ padding: 10, textAlign: "left" }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((a: any) => (
                <tr key={a.id} style={{ borderTop: "1px solid var(--pd-line)" }}>
                  <td style={{ padding: 10 }}>
                    <strong>{a.title}</strong>
                    {a.subject && <span style={{ color: "var(--pd-muted-2)", marginLeft: 6 }}>· {a.subject}</span>}
                  </td>
                  <td style={{ padding: 10 }}>
                    {a.classroom?.name ?? a.student?.fullName ?? "—"}
                  </td>
                  <td style={{ padding: 10 }}>
                    {a.dueAt ? new Date(a.dueAt).toLocaleDateString("tr-TR") : "—"}
                  </td>
                  <td style={{ padding: 10 }}>{a._count.submissions}</td>
                  <td style={{ padding: 10 }}>
                    <Link href={`/ogretmen/odevler/${a.id}`} className="pd-link" style={{ fontSize: 12 }}>
                      Detay
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
