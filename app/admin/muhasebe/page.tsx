import Link from "next/link";
import { TrendingUp, TrendingDown, Wallet, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { getMonthlyTotals, getCategoryBreakdown, formatTL } from "@/lib/accounting";

export const dynamic = "force-dynamic";

export default async function AdminMuhasebePage() {
  await requireAdmin();

  const sinceMonth = new Date();
  sinceMonth.setDate(1);
  sinceMonth.setHours(0, 0, 0, 0);

  const sinceYear = new Date();
  sinceYear.setMonth(0, 1);
  sinceYear.setHours(0, 0, 0, 0);

  const [monthly, monthIncomeAgg, monthExpenseAgg, ytdIncomeAgg, ytdExpenseAgg, incomeBreakdown, expenseBreakdown, recentEntries, duePayrolls] =
    await Promise.all([
      getMonthlyTotals(12),
      prisma.accountingEntry.aggregate({
        _sum: { amount: true },
        where: { type: "INCOME", occurredAt: { gte: sinceMonth } },
      }),
      prisma.accountingEntry.aggregate({
        _sum: { amount: true },
        where: { type: "EXPENSE", occurredAt: { gte: sinceMonth } },
      }),
      prisma.accountingEntry.aggregate({
        _sum: { amount: true },
        where: { type: "INCOME", occurredAt: { gte: sinceYear } },
      }),
      prisma.accountingEntry.aggregate({
        _sum: { amount: true },
        where: { type: "EXPENSE", occurredAt: { gte: sinceYear } },
      }),
      getCategoryBreakdown("INCOME", sinceYear),
      getCategoryBreakdown("EXPENSE", sinceYear),
      prisma.accountingEntry.findMany({
        orderBy: { occurredAt: "desc" },
        take: 20,
        include: {
          student: { select: { fullName: true } },
          teacher: { select: { user: { select: { name: true } } } },
        },
      }),
      prisma.teacherPayroll.count({ where: { status: "DUE" } }),
    ]);

  const monthIncome = monthIncomeAgg._sum.amount ?? 0;
  const monthExpense = monthExpenseAgg._sum.amount ?? 0;
  const ytdIncome = ytdIncomeAgg._sum.amount ?? 0;
  const ytdExpense = ytdExpenseAgg._sum.amount ?? 0;

  const maxAbs = Math.max(...monthly.map((m) => Math.max(m.income, m.expense)), 1);

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <h1 className="pd-page-title">Muhasebe</h1>
          <p className="pd-page-subtitle">Gelir, gider ve maaş tablonuz.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/admin/muhasebe/gelir" className="pd-btn-ghost">+ Gelir</Link>
          <Link href="/admin/muhasebe/gider" className="pd-btn-ghost">+ Gider</Link>
          <Link href="/admin/muhasebe/maaslar" className="pd-btn-accent">Maaşlar</Link>
        </div>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 20 }}>
        <Kpi icon={<TrendingUp size={16} />} label="Bu ay gelir" value={formatTL(monthIncome)} color="#10b981" />
        <Kpi icon={<TrendingDown size={16} />} label="Bu ay gider" value={formatTL(monthExpense)} color="#ef4444" />
        <Kpi icon={<Wallet size={16} />} label="Bu ay net" value={formatTL(monthIncome - monthExpense)} color={monthIncome - monthExpense >= 0 ? "#10b981" : "#ef4444"} />
        <Kpi icon={<Users size={16} />} label="Ödenecek maaş" value={String(duePayrolls)} color="#f59e0b" />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 20 }}>
        <Kpi label="YTD Gelir" value={formatTL(ytdIncome)} icon={<TrendingUp size={16} />} color="#10b981" />
        <Kpi label="YTD Gider" value={formatTL(ytdExpense)} icon={<TrendingDown size={16} />} color="#ef4444" />
        <Kpi label="YTD Net" value={formatTL(ytdIncome - ytdExpense)} icon={<Wallet size={16} />} color={ytdIncome - ytdExpense >= 0 ? "#10b981" : "#ef4444"} />
      </section>

      <section className="pd-card" style={{ padding: 16, marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, marginBottom: 12 }}>Son 12 Ay</h2>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 160 }}>
          {monthly.map((m) => {
            const incH = (m.income / maxAbs) * 140;
            const expH = (m.expense / maxAbs) * 140;
            return (
              <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 140 }}>
                  <div style={{ width: 8, height: incH || 1, background: "#10b981", borderRadius: 2 }} title={`Gelir: ${formatTL(m.income)}`} />
                  <div style={{ width: 8, height: expH || 1, background: "#ef4444", borderRadius: 2 }} title={`Gider: ${formatTL(m.expense)}`} />
                </div>
                <span style={{ fontSize: 9, color: "var(--pd-muted-2)" }}>{m.month.slice(5)}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 12, fontSize: 11 }}>
          <span><span style={{ display: "inline-block", width: 8, height: 8, background: "#10b981", marginRight: 4 }} />Gelir</span>
          <span><span style={{ display: "inline-block", width: 8, height: 8, background: "#ef4444", marginRight: 4 }} />Gider</span>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16, marginBottom: 16 }}>
        <BreakdownCard title="Gelir Kategorileri (YTD)" rows={incomeBreakdown} color="#10b981" />
        <BreakdownCard title="Gider Kategorileri (YTD)" rows={expenseBreakdown} color="#ef4444" />
      </div>

      <section>
        <h2 style={{ fontSize: 14, marginBottom: 8 }}>Son Hareketler</h2>
        {recentEntries.length === 0 ? (
          <div className="pd-card" style={{ padding: 16, color: "var(--pd-muted-2)" }}>Henüz kayıt yok.</div>
        ) : (
          <div className="pd-card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--pd-bg-2)" }}>
                  <th style={{ padding: 10, textAlign: "left" }}>Tarih</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Tip</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Kategori</th>
                  <th style={{ padding: 10, textAlign: "right" }}>Tutar</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Açıklama</th>
                </tr>
              </thead>
              <tbody>
                {recentEntries.map((e: any) => (
                  <tr key={e.id} style={{ borderTop: "1px solid var(--pd-line)" }}>
                    <td style={{ padding: 10 }}>{new Date(e.occurredAt).toLocaleDateString("tr-TR")}</td>
                    <td style={{ padding: 10, color: e.type === "INCOME" ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                      {e.type === "INCOME" ? "Gelir" : "Gider"}
                    </td>
                    <td style={{ padding: 10 }}>{e.category}</td>
                    <td style={{ padding: 10, textAlign: "right", fontWeight: 600 }}>
                      {formatTL(e.amount)}
                    </td>
                    <td style={{ padding: 10, color: "var(--pd-muted-2)", fontSize: 12 }}>
                      {e.description ?? ""}
                      {e.student && ` · ${e.student.fullName}`}
                      {e.teacher && ` · ${e.teacher.user?.name ?? "Öğretmen"}`}
                    </td>
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

function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color?: string }) {
  return (
    <div className="pd-kpi-card">
      <div style={{ fontSize: 12, color: "var(--pd-muted-2)", display: "flex", alignItems: "center", gap: 6 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color }}>{value}</div>
    </div>
  );
}

function BreakdownCard({ title, rows, color }: { title: string; rows: { label: string; amount: number }[]; color: string }) {
  const total = rows.reduce((s, r) => s + r.amount, 0) || 1;
  return (
    <div className="pd-card" style={{ padding: 16 }}>
      <h3 style={{ fontSize: 14, marginBottom: 8 }}>{title}</h3>
      {rows.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--pd-muted-2)" }}>Veri yok.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map((r) => (
            <div key={r.label}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                <span>{r.label}</span>
                <strong>{formatTL(r.amount)}</strong>
              </div>
              <div style={{ height: 6, background: "var(--pd-bg-2)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${(r.amount / total) * 100}%`, height: "100%", background: color }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
