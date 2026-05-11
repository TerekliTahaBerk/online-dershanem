import { redirect } from "next/navigation";
import { requireParent } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { canSeeOwnedPackagePrice, formatPriceMasked } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function VeliOdemelerPage() {
  const { session, parentId, isAdmin } = await requireParent();
  if (!parentId && !isAdmin) redirect("/giris");
  const role = (session.user?.role ?? "PARENT") as any;
  const showPrice = canSeeOwnedPackagePrice(role);

  const links = parentId
    ? await prisma.parentStudent.findMany({
        where: { parentId },
        select: { studentId: true, student: { select: { fullName: true } } },
      })
    : [];
  const studentIds = links.map((l: any) => l.studentId);
  const nameById: Record<string, string> = Object.fromEntries(
    links.map((l: any) => [l.studentId, l.student.fullName]),
  );

  const intents = studentIds.length
    ? await prisma.purchaseIntent.findMany({
        where: { studentId: { in: studentIds } },
        orderBy: { submittedAt: "desc" },
        take: 100,
      })
    : [];

  const assignments = studentIds.length
    ? await prisma.studentPackage.findMany({
        where: { studentId: { in: studentIds }, revokedAt: null },
        include: {
          package: { select: { name: true, price: true } },
          student: { select: { fullName: true } },
        },
        orderBy: { assignedAt: "desc" },
      })
    : [];

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <h1 className="pd-page-title">Ödemeler</h1>
          <p className="pd-page-subtitle">Çocuğunuzun aktif paketleri ve ödeme geçmişi.</p>
        </div>
      </div>

      <section style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Aktif Paketler</h2>
        {assignments.length === 0 ? (
          <div className="pd-card" style={{ padding: 16, color: "var(--pd-muted-2)" }}>Aktif paket yok.</div>
        ) : (
          <div className="pd-card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--pd-bg-2)" }}>
                  <th style={{ padding: 10, textAlign: "left" }}>Öğrenci</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Paket</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Fiyat</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Atanma</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a: any) => (
                  <tr key={a.id} style={{ borderTop: "1px solid var(--pd-line)" }}>
                    <td style={{ padding: 10 }}>{a.student.fullName}</td>
                    <td style={{ padding: 10 }}>{a.package.name}</td>
                    <td style={{ padding: 10 }}>{formatPriceMasked(a.package.price, showPrice)}</td>
                    <td style={{ padding: 10 }}>{new Date(a.assignedAt).toLocaleDateString("tr-TR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Ödeme Geçmişi</h2>
        {intents.length === 0 ? (
          <div className="pd-card" style={{ padding: 16, color: "var(--pd-muted-2)" }}>Ödeme kaydı bulunmuyor.</div>
        ) : (
          <div className="pd-card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--pd-bg-2)" }}>
                  <th style={{ padding: 10, textAlign: "left" }}>Tarih</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Öğrenci</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Paket</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Durum</th>
                </tr>
              </thead>
              <tbody>
                {intents.map((p: any) => (
                  <tr key={p.id} style={{ borderTop: "1px solid var(--pd-line)" }}>
                    <td style={{ padding: 10 }}>{new Date(p.submittedAt).toLocaleDateString("tr-TR")}</td>
                    <td style={{ padding: 10 }}>{p.studentId ? nameById[p.studentId] ?? p.studentFullName : p.studentFullName}</td>
                    <td style={{ padding: 10 }}>{p.packageName}</td>
                    <td style={{ padding: 10 }}>{p.status}</td>
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
