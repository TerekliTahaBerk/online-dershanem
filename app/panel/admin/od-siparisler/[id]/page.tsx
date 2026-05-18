import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";

export const dynamic = "force-dynamic";

function formatTRY(cents: number): string {
  return `₺${(cents / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;
}

function formatDateTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(d);
}

type CartItem = {
  id?: string;
  name?: string;
  category?: string;
  subject?: string;
  priceCents?: number;
  qty?: number;
};

export default async function OdOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePanelRole("admin");
  const { id } = await params;
  const order = await prisma.odOrder.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, name: true } },
      package: { select: { id: true, name: true } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();

  const buyer = (order.buyerInfo as Record<string, unknown> | null) || {};
  const cart = Array.isArray((buyer as { cart?: unknown[] }).cart)
    ? ((buyer as { cart: CartItem[] }).cart)
    : [];
  const coupon = (buyer as { coupon?: { code?: string; discountCents?: number } | null }).coupon;

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--pd-border)" }}>
      <div style={{ color: "var(--pd-text-muted)", fontSize: 13 }}>{label}</div>
      <div>{value}</div>
    </div>
  );

  return (
    <>
      <PageHeader
        title={`Sipariş ${order.id.slice(0, 10)}…`}
        subtitle={`${order.user.email} · ${order.status}`}
        right={
          <Link href="/panel/admin/od-siparisler" className="od-btn od-btn-ghost od-btn-sm">
            ← Liste
          </Link>
        }
      />

      <Card>
        <CardBody>
          <Row label="Tarih" value={formatDateTime(order.createdAt)} />
          <Row label="Müşteri" value={<>{order.user.name || "—"} · {order.user.email}</>} />
          <Row label="Paket" value={
            <>
              {order.packageName}
              {order.package && (
                <Link href={`/panel/admin/paketler/${order.package.id}/duzenle`} style={{ marginLeft: 8, fontSize: 12, color: "var(--pd-primary)" }}>
                  · Pakete git →
                </Link>
              )}
            </>
          } />
          <Row label="Kategori / Konu" value={`${order.category || "—"} · ${order.subject || "—"}`} />
          <Row label="Ara toplam" value={formatTRY(order.subtotalCents)} />
          <Row label="İndirim" value={order.discountCents > 0 ? `−${formatTRY(order.discountCents)} (${coupon?.code || "—"})` : "—"} />
          <Row label="Toplam" value={<strong>{formatTRY(order.totalCents)}</strong>} />
          <Row label="Durum" value={order.status} />
        </CardBody>
      </Card>

      {cart.length > 0 && (
        <Card style={{ marginTop: 16 }}>
          <CardBody>
            <h3 style={{ marginBottom: 12 }}>Sepet Kalemleri ({cart.length})</h3>
            <table className="od-table">
              <thead><tr><th>Ürün</th><th>Kategori</th><th>Adet</th><th>Birim</th><th>Toplam</th></tr></thead>
              <tbody>
                {cart.map((item, i) => (
                  <tr key={i}>
                    <td>{item.name || `${item.category} ${item.subject}`}</td>
                    <td>{item.category}</td>
                    <td className="od-mono">{item.qty || 1}</td>
                    <td className="od-mono">{formatTRY(item.priceCents || 0)}</td>
                    <td className="od-mono">{formatTRY((item.priceCents || 0) * (item.qty || 1))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      <Card style={{ marginTop: 16 }}>
        <CardBody>
          <h3 style={{ marginBottom: 12 }}>Müşteri Bilgileri</h3>
          <Row label="Ad Soyad" value={String(buyer.fullName || "—")} />
          <Row label="E-posta" value={String(buyer.email || "—")} />
          <Row label="Telefon" value={String(buyer.phone || "—")} />
          <Row label="İl / İlçe" value={`${buyer.city || "—"} / ${buyer.district || "—"}`} />
          <Row label="Adres" value={String(buyer.address || "—")} />
          <Row label="Okul" value={String(buyer.schoolName || "—")} />
          <Row label="Sınıf" value={String(buyer.classLevel || "—")} />
          <Row label="Sınav" value={String(buyer.examType || "—")} />
          <Row label="Veli" value={`${buyer.parentFullName || "—"} · ${buyer.parentPhone || "—"}`} />
        </CardBody>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <CardBody>
          <h3 style={{ marginBottom: 12 }}>Ödeme Geçmişi ({order.payments.length})</h3>
          <table className="od-table">
            <thead><tr><th>Tarih</th><th>Sağlayıcı</th><th>Ref</th><th>Tutar</th><th>Durum</th><th>Ödendi</th></tr></thead>
            <tbody>
              {order.payments.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 16, color: "var(--pd-text-muted)" }}>Ödeme kaydı yok.</td></tr>
              )}
              {order.payments.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontSize: 12 }}>{formatDateTime(p.createdAt)}</td>
                  <td>{p.provider}</td>
                  <td className="od-mono" style={{ fontSize: 11 }}>{p.providerRef || "—"}</td>
                  <td className="od-mono">{formatTRY(p.amountCents)}</td>
                  <td>{p.status}</td>
                  <td style={{ fontSize: 12 }}>{formatDateTime(p.paidAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </>
  );
}
