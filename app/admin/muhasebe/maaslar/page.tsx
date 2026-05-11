import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { formatTL } from "@/lib/accounting";
import { PayrollPayButton } from "./_components/pay-button";
import { PayrollCreateForm } from "./_components/payroll-form";

export const dynamic = "force-dynamic";

export default async function MaaslarPage() {
  await requireAdmin();

  const [payrolls, teachers] = await Promise.all([
    prisma.teacherPayroll.findMany({
      orderBy: [{ status: "asc" }, { periodEnd: "desc" }],
      take: 100,
      include: { teacher: { select: { user: { select: { name: true } } } } },
    }),
    prisma.teacher.findMany({
      select: { id: true, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <Link href="/admin/muhasebe" className="pd-link" style={{ fontSize: 12 }}>← Muhasebe</Link>
          <h1 className="pd-page-title">Öğretmen Maaşları</h1>
          <p className="pd-page-subtitle">Maaş döngüleri ve ödeme durumları.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
        <div className="pd-card" style={{ padding: 16 }}>
          <h2 style={{ fontSize: 14, marginBottom: 8 }}>Yeni Maaş Kaydı</h2>
          <PayrollCreateForm teachers={teachers.map((t: any) => ({ id: t.id, name: t.user?.name ?? "—" }))} />
        </div>

        <div className="pd-card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--pd-bg-2)" }}>
                <th style={{ padding: 10, textAlign: "left" }}>Öğretmen</th>
                <th style={{ padding: 10, textAlign: "left" }}>Dönem</th>
                <th style={{ padding: 10, textAlign: "right" }}>Tutar</th>
                <th style={{ padding: 10, textAlign: "left" }}>Durum</th>
                <th style={{ padding: 10, textAlign: "left" }}></th>
              </tr>
            </thead>
            <tbody>
              {payrolls.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 16, color: "var(--pd-muted-2)" }}>
                    Henüz maaş kaydı yok.
                  </td>
                </tr>
              ) : (
                payrolls.map((p: any) => (
                  <tr key={p.id} style={{ borderTop: "1px solid var(--pd-line)" }}>
                    <td style={{ padding: 10 }}>{p.teacher.user?.name ?? "—"}</td>
                    <td style={{ padding: 10 }}>
                      {new Date(p.periodStart).toLocaleDateString("tr-TR")} - {new Date(p.periodEnd).toLocaleDateString("tr-TR")}
                    </td>
                    <td style={{ padding: 10, textAlign: "right", fontWeight: 600 }}>{formatTL(p.amount)}</td>
                    <td style={{ padding: 10 }}>
                      <strong>{p.status}</strong>
                      {p.paidAt && (
                        <span style={{ fontSize: 11, color: "var(--pd-muted-2)", marginLeft: 4 }}>
                          ({new Date(p.paidAt).toLocaleDateString("tr-TR")})
                        </span>
                      )}
                    </td>
                    <td style={{ padding: 10 }}>
                      {p.status === "DUE" && <PayrollPayButton payrollId={p.id} />}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
