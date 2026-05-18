import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { SearchInput } from "@/components/panel/ui/search-input";
import { toggleCouponAction, deleteCouponAction } from "./_actions";

export const dynamic = "force-dynamic";

function formatTRY(cents: number | null | undefined): string {
  if (!cents || cents <= 0) return "—";
  return `₺${(cents / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;
}

function formatValue(type: "PERCENT" | "FIXED", value: number): string {
  return type === "PERCENT" ? `%${value}` : `₺${value.toLocaleString("tr-TR")}`;
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short" }).format(d);
}

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePanelRole("admin");
  const { q } = await searchParams;
  const where = q
    ? {
        OR: [
          { code: { contains: q.toUpperCase(), mode: "insensitive" as const } },
          { description: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const coupons = await prisma.coupon.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { redemptions: true } } },
  });

  return (
    <>
      <PageHeader
        title="İndirim Kodları"
        subtitle={`${coupons.length} kod${q ? ` · "${q}"` : ""}`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <SearchInput placeholder="Kod, açıklama…" />
            <Link
              href="/panel/admin/indirim-kodlari/yeni"
              className="od-btn od-btn-primary od-btn-sm"
            >
              + Yeni kod
            </Link>
          </div>
        }
      />
      <Card>
        <table className="od-table">
          <thead>
            <tr>
              <th>Kod</th>
              <th>Tür</th>
              <th>Servis</th>
              <th>Değer</th>
              <th>Min. Sepet</th>
              <th>Maks. İnd.</th>
              <th>Kullanım</th>
              <th>Geçerlilik</th>
              <th>Durum</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: 24, color: "var(--pd-text-muted)" }}>
                  Henüz tanımlı kod yok.
                </td>
              </tr>
            )}
            {coupons.map((c) => {
              const used = c._count.redemptions;
              const limit = c.usageLimit;
              const exhausted = limit != null && used >= limit;
              return (
                <tr key={c.id}>
                  <td className="od-mono" style={{ fontWeight: 600 }}>{c.code}</td>
                  <td>{c.type === "PERCENT" ? "Yüzde" : "Sabit"}</td>
                  <td>{c.service}</td>
                  <td className="od-mono">{formatValue(c.type, c.value)}</td>
                  <td className="od-mono">{formatTRY(c.minOrderCents)}</td>
                  <td className="od-mono">{formatTRY(c.maxDiscountCents)}</td>
                  <td className="od-mono">
                    {used}
                    {limit != null && ` / ${limit}`}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {formatDate(c.startsAt)} → {formatDate(c.expiresAt)}
                  </td>
                  <td>
                    {!c.isActive ? "Pasif" : exhausted ? "Tükendi" : "Aktif"}
                  </td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <Link
                      href={`/panel/admin/indirim-kodlari/${c.id}/duzenle`}
                      className="od-btn od-btn-ghost od-btn-sm"
                    >
                      Düzenle
                    </Link>
                    <form action={toggleCouponAction.bind(null, c.id, !c.isActive)} style={{ display: "inline" }}>
                      <button type="submit" className="od-btn od-btn-ghost od-btn-sm">
                        {c.isActive ? "Pasifle" : "Aktifle"}
                      </button>
                    </form>
                    <form action={deleteCouponAction.bind(null, c.id)} style={{ display: "inline" }}>
                      <button
                        type="submit"
                        className="od-btn od-btn-ghost od-btn-sm"
                        style={{ color: "var(--pd-bad)" }}
                      >
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
    </>
  );
}
