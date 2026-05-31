import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import { markPayrollPaidAction, deletePayrollAction } from "./_actions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function fmtTRY(cents: number): string {
  return `₺${(cents / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short" }).format(d);
}

type Search = Promise<{ status?: string; teacherId?: string; page?: string }>;

export default async function AdminPayrollsPage({ searchParams }: { searchParams: Search }) {
  await requirePanelRole("admin");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);

  const where: Prisma.TeacherPayrollWhereInput = {};
  if (sp.status && ["DUE", "PAID", "CANCELLED"].includes(sp.status)) {
    where.status = sp.status as Prisma.TeacherPayrollWhereInput["status"];
  }
  if (sp.teacherId) where.teacherId = sp.teacherId;

  const [items, total, agg] = await Promise.all([
    prisma.teacherPayroll.findMany({
      where,
      orderBy: [{ status: "asc" }, { periodEnd: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { teacher: { select: { id: true, fullName: true } } },
    }),
    prisma.teacherPayroll.count({ where }),
    prisma.teacherPayroll.groupBy({
      by: ["status"],
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const totalsByStatus = Object.fromEntries(
    agg.map((a) => [a.status, { sum: a._sum.amount ?? 0, count: a._count._all }]),
  ) as Record<string, { sum: number; count: number }>;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { ...sp, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, String(v));
    const s = params.toString();
    return `/panel/admin/maaslar${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Öğretmen Ödemeleri"
        subtitle={`${total} kayıt${sp.status ? ` · ${sp.status}` : ""}`}
        breadcrumbs={[
          { label: "Yönetim", href: "/panel/admin" },
          { label: "Öğretmen Ödemeleri" },
        ]}
        right={
          <Link href="/panel/admin/maaslar/yeni" className="od-btn dark sm">
            + Yeni ödeme
          </Link>
        }
      />

      <div className="od-grid g-4" style={{ marginBottom: 16 }}>
        <KpiCard
          label="Bekleyen"
          value={String(totalsByStatus.DUE?.count ?? 0)}
          meta={fmtTRY(totalsByStatus.DUE?.sum ?? 0)}
        />
        <KpiCard
          label="Ödenen"
          value={String(totalsByStatus.PAID?.count ?? 0)}
          meta={fmtTRY(totalsByStatus.PAID?.sum ?? 0)}
        />
        <KpiCard
          label="İptal"
          value={String(totalsByStatus.CANCELLED?.count ?? 0)}
          meta={fmtTRY(totalsByStatus.CANCELLED?.sum ?? 0)}
        />
      </div>

      <Card>
        <div style={{ padding: 12, display: "flex", gap: 8, alignItems: "center", borderBottom: "1px solid var(--pd-border)" }}>
          <span style={{ fontSize: 12, color: "var(--pd-text-muted)" }}>Durum:</span>
          <Link href={buildHref({ status: undefined })} className={`od-btn sm ${!sp.status ? "dark" : "ghost"}`}>Tümü</Link>
          <Link href={buildHref({ status: "DUE" })} className={`od-btn sm ${sp.status === "DUE" ? "dark" : "ghost"}`}>Bekleyen</Link>
          <Link href={buildHref({ status: "PAID" })} className={`od-btn sm ${sp.status === "PAID" ? "dark" : "ghost"}`}>Ödenen</Link>
          <Link href={buildHref({ status: "CANCELLED" })} className={`od-btn sm ${sp.status === "CANCELLED" ? "dark" : "ghost"}`}>İptal</Link>
        </div>

        <table className="od-table">
          <thead>
            <tr>
              <th>Öğretmen</th>
              <th>Dönem</th>
              <th>Tutar</th>
              <th>Durum</th>
              <th>Ödendi</th>
              <th>Not</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--pd-text-muted)" }}>Kayıt yok.</td></tr>
            )}
            {items.map((p) => {
              const isPaid = p.status === "PAID";
              const isCancelled = p.status === "CANCELLED";
              const badgeColor = isPaid ? "var(--pd-good)" : isCancelled ? "var(--pd-text-muted)" : "var(--pd-warn)";
              return (
                <tr key={p.id}>
                  <td>
                    <Link href={`/panel/admin/ogretmenler/${p.teacher.id}/duzenle`} style={{ color: "var(--pd-primary)" }}>
                      {p.teacher.fullName}
                    </Link>
                  </td>
                  <td style={{ fontSize: 12 }}>{fmtDate(p.periodStart)} → {fmtDate(p.periodEnd)}</td>
                  <td className="od-mono" style={{ fontWeight: 600 }}>{fmtTRY(p.amount)}</td>
                  <td>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, color: badgeColor, border: `1px solid ${badgeColor}33` }}>
                      {p.status === "DUE" ? "Bekleyen" : p.status === "PAID" ? "Ödendi" : "İptal"}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>{fmtDate(p.paidAt)}</td>
                  <td style={{ fontSize: 12, color: "var(--pd-text-muted)" }}>{p.notes || "—"}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <Link href={`/panel/admin/maaslar/${p.id}/duzenle`} className="od-btn ghost sm">
                      Düzenle
                    </Link>
                    {!isPaid && !isCancelled && (
                      <form action={markPayrollPaidAction.bind(null, p.id)} style={{ display: "inline" }}>
                        <button type="submit" className="od-btn dark sm">
                          Ödendi işaretle
                        </button>
                      </form>
                    )}
                    <form action={deletePayrollAction.bind(null, p.id)} style={{ display: "inline" }}>
                      <button type="submit" className="od-btn ghost sm" style={{ color: "var(--pd-bad)" }}>
                        Sil
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={buildHref({ page: p === 1 ? undefined : String(p) })} className={`od-btn sm ${p === page ? "dark" : "ghost"}`}>
              {p}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
