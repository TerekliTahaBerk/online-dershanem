import type { Metadata } from "next";
import Link from "next/link";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import type { OdkOrderStatus } from "@prisma/client";

export const metadata: Metadata = {
  title: "ODK Siparişleri · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const fmtTRY = (c: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(c / 100);

type StatusFilter = OdkOrderStatus | "ALL";

function parseStatus(raw: string | undefined): StatusFilter {
  if (raw === "PENDING" || raw === "PAID" || raw === "CANCELLED" || raw === "REFUNDED") return raw;
  return "ALL";
}

const STATUS_TONE: Record<OdkOrderStatus, "ok" | "warn" | "bad" | "neutral"> = {
  PAID: "ok",
  PENDING: "warn",
  CANCELLED: "neutral",
  REFUNDED: "bad",
};

export default async function OdkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireOdkPanel("admin");
  const sp = await searchParams;
  const status = parseStatus(sp.status);
  const q = sp.q?.trim() || "";

  const where: Record<string, unknown> = {};
  if (status !== "ALL") where.status = status;
  if (q) {
    where.OR = [
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { package: { title: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [orders, kpis] = await Promise.all([
    prisma.odkOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { name: true, email: true } },
        package: { select: { title: true } },
        entitlements: { select: { id: true, status: true } },
        payments: { select: { id: true, status: true, provider: true } },
      },
    }),
    prisma.odkOrder.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { totalCents: true },
    }),
  ]);

  const sum = (st: OdkOrderStatus) =>
    kpis.find((k) => k.status === st)?._sum.totalCents ?? 0;
  const cnt = (st: OdkOrderStatus) =>
    kpis.find((k) => k.status === st)?._count._all ?? 0;

  const filterHref = (s: StatusFilter) => {
    const p = new URLSearchParams();
    if (s !== "ALL") p.set("status", s);
    if (q) p.set("q", q);
    return "?" + p.toString();
  };

  return (
    <>
      <PageHeader
        title="ODK Siparişleri"
        subtitle="OnlineDenemeKulübü sipariş yönetimi"
        right={
          <Badge tone="purple">ODK</Badge>
        }
      />

      <div className="od-grid g-4" style={{ marginBottom: 12 }}>
        <KpiCard label="Bekleyen" value={String(cnt("PENDING"))} meta={fmtTRY(sum("PENDING"))} />
        <KpiCard label="Ödenmiş" value={String(cnt("PAID"))} meta={fmtTRY(sum("PAID"))} />
        <KpiCard label="İptal" value={String(cnt("CANCELLED"))} meta={fmtTRY(sum("CANCELLED"))} />
        <KpiCard label="İade" value={String(cnt("REFUNDED"))} meta={fmtTRY(sum("REFUNDED"))} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {(["ALL", "PENDING", "PAID", "CANCELLED", "REFUNDED"] as const).map((s) => (
          <Link
            key={s}
            href={filterHref(s)}
            className={"od-btn od-btn-sm " + (status === s ? "od-btn-primary" : "od-btn-ghost")}
          >
            {s === "ALL"
              ? "Tüm durumlar"
              : s === "PENDING"
              ? "Bekleyen"
              : s === "PAID"
              ? "Ödenmiş"
              : s === "CANCELLED"
              ? "İptal"
              : "İade"}
          </Link>
        ))}
      </div>

      <Card>
        {orders.length === 0 ? (
          <div style={{ padding: 16 }}>
            <EmptyState
              icon="folder"
              title="Bu filtreye uygun sipariş yok"
              description="Filtreyi değiştirin veya bekleyin — ilk satıştan sonra burada görünür."
            />
          </div>
        ) : (
          <table className="od-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Kullanıcı</th>
                <th>Paket</th>
                <th>Tutar</th>
                <th>Durum</th>
                <th>Ödeme</th>
                <th>Erişim</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const lastPay = o.payments[o.payments.length - 1];
                const ent = o.entitlements[0];
                return (
                  <tr key={o.id}>
                    <td className="od-mono od-muted">
                      {new Intl.DateTimeFormat("tr-TR").format(o.createdAt)}
                    </td>
                    <td>
                      <div>{o.user?.name ?? "(guest — hesap açılacak)"}</div>
                      <div className="od-muted" style={{ fontSize: 11 }}>{o.user?.email ?? "—"}</div>
                    </td>
                    <td>{o.package.title}</td>
                    <td className="od-mono">{fmtTRY(o.totalCents)}</td>
                    <td>
                      <Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge>
                    </td>
                    <td className="od-muted" style={{ fontSize: 12 }}>
                      {lastPay ? `${lastPay.provider} · ${lastPay.status}` : "—"}
                    </td>
                    <td>
                      {ent ? (
                        <Badge tone={ent.status === "ACTIVE" ? "ok" : "neutral"}>
                          {ent.status}
                        </Badge>
                      ) : (
                        <span className="od-muted">—</span>
                      )}
                    </td>
                    <td>
                      <Link
                        href={`/panel/admin/odk/siparisler/${o.id}`}
                        className="od-btn od-btn-ghost od-btn-sm"
                      >
                        Detay
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
