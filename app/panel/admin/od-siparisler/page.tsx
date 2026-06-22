import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { SearchInput } from "@/components/panel/ui/search-input";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

function formatTRY(cents: number): string {
  return `₺${(cents / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;
}

function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(d);
}

function statusBadge(status: string): string {
  switch (status) {
    case "PAID":
      return "✓ Ödendi";
    case "PENDING":
      return "⏳ Beklemede";
    case "CANCELLED":
      return "✕ İptal";
    case "REFUNDED":
      return "↺ İade";
    default:
      return status;
  }
}

type Search = Promise<{ q?: string; status?: string; page?: string }>;

const PAGE_SIZE = 30;

export default async function AdminOdOrdersPage({ searchParams }: { searchParams: Search }) {
  await requirePanelRole("admin");
  const { q, status, page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw || "1", 10) || 1);

  const where: Prisma.OdOrderWhereInput = {};
  if (status && ["PENDING", "PAID", "CANCELLED", "REFUNDED"].includes(status)) {
    where.status = status as Prisma.OdOrderWhereInput["status"];
  }
  if (q) {
    where.OR = [
      { packageName: { contains: q, mode: "insensitive" } },
      { user: { is: { email: { contains: q, mode: "insensitive" } } } },
      { user: { is: { name: { contains: q, mode: "insensitive" } } } },
      { id: { contains: q } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.odOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { id: true, email: true, name: true } },
        package: { select: { id: true, name: true } },
        payments: {
          where: { status: "SUCCEEDED" },
          select: { id: true, paidAt: true },
          take: 1,
        },
      },
    }),
    prisma.odOrder.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="OD Siparişleri"
        subtitle={`${total} sipariş${status ? ` · ${status}` : ""}${q ? ` · "${q}"` : ""}`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <SearchInput placeholder="Email, ad, paket…" />
            <Link
              href="/panel/admin/od-siparisler"
              className={`od-btn od-btn-sm ${!status ? "od-btn-primary" : "od-btn-ghost"}`}
            >
              Tümü
            </Link>
            <Link
              href="/panel/admin/od-siparisler?status=PAID"
              className={`od-btn od-btn-sm ${status === "PAID" ? "od-btn-primary" : "od-btn-ghost"}`}
            >
              Ödendi
            </Link>
            <Link
              href="/panel/admin/od-siparisler?status=PENDING"
              className={`od-btn od-btn-sm ${status === "PENDING" ? "od-btn-primary" : "od-btn-ghost"}`}
            >
              Beklemede
            </Link>
            <Link
              href="/panel/admin/od-siparisler?status=CANCELLED"
              className={`od-btn od-btn-sm ${status === "CANCELLED" ? "od-btn-primary" : "od-btn-ghost"}`}
            >
              İptal
            </Link>
            <Link
              href="/panel/admin/od-siparisler?status=REFUNDED"
              className={`od-btn od-btn-sm ${status === "REFUNDED" ? "od-btn-primary" : "od-btn-ghost"}`}
            >
              İade
            </Link>
          </div>
        }
      />

      <Card>
        <table className="od-table">
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Müşteri</th>
              <th>Paket</th>
              <th>Ürün Sayısı</th>
              <th>Ara Tplm.</th>
              <th>İnd.</th>
              <th>Toplam</th>
              <th>Durum</th>
              <th>Kod</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: 24, color: "var(--pd-text-muted)" }}>
                  Sipariş bulunamadı.
                </td>
              </tr>
            )}
            {orders.map((o) => {
              const buyer = (o.buyerInfo as Record<string, unknown> | null) || {};
              const cart = Array.isArray((buyer as { cart?: unknown[] }).cart)
                ? ((buyer as { cart: unknown[] }).cart as Record<string, unknown>[])
                : [];
              const itemCount = cart.length || 1;
              const couponInfo = (buyer as { coupon?: { code?: string } | null }).coupon;
              return (
                <tr key={o.id}>
                  <td style={{ fontSize: 12 }}>{formatDateTime(o.createdAt)}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{o.user?.name || (buyer.fullName as string) || "—"}</div>
                    <div style={{ fontSize: 11, color: "var(--pd-text-muted)" }}>{o.user?.email ?? (buyer.email as string) ?? "(guest — hesap açılacak)"}</div>
                  </td>
                  <td>
                    <div>{o.packageName}</div>
                    {o.package && (
                      <Link
                        href={`/panel/admin/paketler/${o.package.id}/duzenle`}
                        style={{ fontSize: 11, color: "var(--pd-primary)" }}
                      >
                        Pakete git →
                      </Link>
                    )}
                  </td>
                  <td className="od-mono">{itemCount}</td>
                  <td className="od-mono">{formatTRY(o.subtotalCents)}</td>
                  <td className="od-mono" style={{ color: o.discountCents > 0 ? "var(--pd-good)" : undefined }}>
                    {o.discountCents > 0 ? `−${formatTRY(o.discountCents)}` : "—"}
                  </td>
                  <td className="od-mono" style={{ fontWeight: 600 }}>{formatTRY(o.totalCents)}</td>
                  <td>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background:
                          o.status === "PAID"
                            ? "rgba(16,185,129,0.12)"
                            : o.status === "PENDING"
                            ? "rgba(245,158,11,0.12)"
                            : o.status === "REFUNDED"
                            ? "rgba(244,114,182,0.12)"
                            : "rgba(148,163,184,0.12)",
                        color:
                          o.status === "PAID"
                            ? "var(--pd-good)"
                            : o.status === "PENDING"
                            ? "var(--pd-warn)"
                            : o.status === "REFUNDED"
                            ? "#db2777"
                            : "var(--pd-text-muted)",
                      }}
                    >
                      {statusBadge(o.status)}
                    </span>
                  </td>
                  <td className="od-mono" style={{ fontSize: 11 }}>
                    {couponInfo?.code || "—"}
                  </td>
                  <td>
                    <Link
                      href={`/panel/admin/od-siparisler/${o.id}`}
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
      </Card>

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (status) params.set("status", status);
            if (p > 1) params.set("page", String(p));
            return (
              <Link
                key={p}
                href={`/panel/admin/od-siparisler${params.toString() ? `?${params}` : ""}`}
                className={`od-btn od-btn-sm ${p === page ? "od-btn-primary" : "od-btn-ghost"}`}
              >
                {p}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
