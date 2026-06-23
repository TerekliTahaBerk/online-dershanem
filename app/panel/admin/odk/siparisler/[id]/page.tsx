import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import {
  markOdkOrderPaidAction,
  markOdkOrderCancelledAction,
  markOdkOrderRefundedAction,
} from "../_actions";
import type { OdkOrderStatus } from "@prisma/client";

export const metadata: Metadata = {
  title: "ODK Sipariş Detayı · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const fmtTRY = (c: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(c / 100);

const STATUS_TONE: Record<OdkOrderStatus, "ok" | "warn" | "bad" | "neutral"> = {
  PAID: "ok",
  PENDING: "warn",
  CANCELLED: "neutral",
  REFUNDED: "bad",
};

export default async function OdkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOdkPanel("admin");
  const { id } = await params;

  const order = await prisma.odkOrder.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      package: { select: { id: true, title: true, slug: true, durationDays: true } },
      payments: { orderBy: { createdAt: "asc" } },
      entitlements: { include: { userAccessTags: { include: { accessTag: true } } } },
    },
  });
  if (!order) notFound();

  // Bu siparişe bağlı muhasebe kayıtları (sale + refund izleri)
  const accounting = await prisma.accountingEntry.findMany({
    where: {
      OR: [
        { refType: "OdkOrder", refId: order.id },
        { refType: "OdkOrderRefund", refId: order.id },
      ],
    },
    orderBy: { occurredAt: "asc" },
  });

  // Timeline (siparişin yaşam döngüsü)
  const timeline: Array<{ at: Date; label: string; tone?: string }> = [];
  timeline.push({ at: order.createdAt, label: `Sipariş oluşturuldu — ${order.package.title}` });
  for (const p of order.payments) {
    timeline.push({
      at: p.createdAt,
      label: `Ödeme oluştu (${p.provider}, ${p.status})${
        p.providerRef ? ` · ref: ${p.providerRef}` : ""
      }`,
    });
    if (p.paidAt) {
      timeline.push({ at: p.paidAt, label: `Ödeme tamamlandı (${p.provider})` });
    }
  }
  for (const e of order.entitlements) {
    timeline.push({ at: e.createdAt, label: `Entitlement oluştu (${e.status})` });
    if (e.revokedAt) timeline.push({ at: e.revokedAt, label: `Entitlement iptal edildi` });
  }
  for (const a of accounting) {
    timeline.push({
      at: a.occurredAt,
      label: `Muhasebe (${a.type}/${a.category}) ${fmtTRY(a.amount)}`,
    });
  }
  timeline.sort((a, b) => a.at.getTime() - b.at.getTime());

  const canMarkPaid = order.status === "PENDING";
  const canCancel = order.status === "PENDING";
  const canRefund = order.status === "PAID";

  return (
    <>
      <PageHeader
        title={"Sipariş · " + order.package.title}
        subtitle={
          "ODK · " +
          fmtTRY(order.totalCents) +
          " · " +
          order.status +
          " · " +
          (order.user?.name ?? order.user?.email ?? "(guest — hesap açılacak)")
        }
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/panel/admin/odk/siparisler" className="od-btn od-btn-ghost od-btn-sm">
              ← Liste
            </Link>
            <Badge tone="purple">ODK</Badge>
          </div>
        }
      />

      <div className="od-grid g-2" style={{ marginBottom: 16 }}>
        <Card>
          <CardHeader
            title="Sipariş bilgileri"
            subtitle={
              <span>
                Durum: <Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>
              </span>
            }
          />
          <CardBody>
            <dl style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 6, fontSize: 13 }}>
              <dt className="od-muted">ID</dt>
              <dd className="od-mono" style={{ fontSize: 11 }}>{order.id}</dd>
              <dt className="od-muted">Kullanıcı</dt>
              <dd>
                {order.user?.name ?? "(guest — hesap açılacak)"}
                <div className="od-muted" style={{ fontSize: 11 }}>{order.user?.email ?? "—"}</div>
              </dd>
              <dt className="od-muted">Paket</dt>
              <dd>
                <Link href={`/panel/admin/odk/paketler/${order.package.id}`}>
                  {order.package.title}
                </Link>
              </dd>
              <dt className="od-muted">Ara toplam</dt>
              <dd className="od-mono">{fmtTRY(order.subtotalCents)}</dd>
              <dt className="od-muted">İndirim</dt>
              <dd className="od-mono">{fmtTRY(order.discountCents)}</dd>
              <dt className="od-muted">Toplam</dt>
              <dd className="od-mono"><strong>{fmtTRY(order.totalCents)}</strong></dd>
              <dt className="od-muted">Oluşturma</dt>
              <dd className="od-mono">{order.createdAt.toLocaleString("tr-TR")}</dd>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Admin işlemleri" subtitle="Sipariş durum değişiklikleri" />
          <CardBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <form action={markOdkOrderPaidAction.bind(null, order.id)}>
                <button
                  type="submit"
                  className="od-btn od-btn-primary od-btn-sm"
                  disabled={!canMarkPaid}
                  style={{ width: "100%" }}
                >
                  PAID olarak işaretle (entitlement + muhasebe)
                </button>
              </form>
              <form action={markOdkOrderCancelledAction.bind(null, order.id)}>
                <button
                  type="submit"
                  className="od-btn od-btn-ghost od-btn-sm"
                  disabled={!canCancel}
                  style={{ width: "100%" }}
                >
                  CANCELLED yap
                </button>
              </form>
              <form action={markOdkOrderRefundedAction.bind(null, order.id)}>
                <button
                  type="submit"
                  className="od-btn od-btn-ghost od-btn-sm"
                  disabled={!canRefund}
                  style={{ width: "100%", color: "var(--pd-bad)" }}
                >
                  REFUNDED yap (erişim iptali + iade kaydı)
                </button>
              </form>
              <p className="od-muted" style={{ fontSize: 11, marginTop: 6 }}>
                PAID işlemi entitlement + access tag + AccountingEntry (service=ODK) zincirini
                idempotent olarak tetikler. Aynı sipariş tekrar PAID yapılırsa duplicate kayıt
                üretmez.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Ödemeler" subtitle={`${order.payments.length} ödeme kaydı`} />
        <CardBody>
          {order.payments.length === 0 ? (
            <p className="od-muted">Henüz ödeme kaydı yok.</p>
          ) : (
            <table className="od-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Provider</th>
                  <th>Durum</th>
                  <th>Tutar</th>
                  <th>Provider Ref</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {order.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="od-mono od-muted">
                      {new Intl.DateTimeFormat("tr-TR").format(p.createdAt)}
                    </td>
                    <td>{p.provider}</td>
                    <td>
                      <Badge
                        tone={
                          p.status === "SUCCEEDED"
                            ? "ok"
                            : p.status === "FAILED"
                            ? "bad"
                            : p.status === "REFUNDED"
                            ? "neutral"
                            : "warn"
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="od-mono">{fmtTRY(p.amountCents)}</td>
                    <td className="od-mono od-muted" style={{ fontSize: 11 }}>
                      {p.providerRef ?? "—"}
                    </td>
                    <td>
                      <Link
                        href={`/panel/admin/odk/odemeler/${p.id}`}
                        className="od-btn od-btn-ghost od-btn-sm"
                      >
                        Detay
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <CardHeader
          title="Entitlement & Erişim Tagları"
          subtitle={`${order.entitlements.length} entitlement`}
        />
        <CardBody>
          {order.entitlements.length === 0 ? (
            <p className="od-muted">Henüz entitlement yok — sipariş PAID yapıldığında otomatik oluşur.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {order.entitlements.map((e) => (
                <div
                  key={e.id}
                  style={{
                    padding: 10,
                    border: "1px solid var(--pd-line)",
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Badge tone={e.status === "ACTIVE" ? "ok" : "neutral"}>{e.status}</Badge>
                    <span className="od-mono" style={{ fontSize: 11 }}>{e.id}</span>
                    {e.expiresAt ? (
                      <span className="od-muted" style={{ fontSize: 12 }}>
                        Bitiş: {new Intl.DateTimeFormat("tr-TR").format(e.expiresAt)}
                      </span>
                    ) : (
                      <span className="od-muted" style={{ fontSize: 12 }}>Süresiz</span>
                    )}
                  </div>
                  {e.userAccessTags.length > 0 ? (
                    <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {e.userAccessTags.map((t) => (
                        <Badge
                          key={t.id}
                          tone={t.revokedAt ? "neutral" : "purple"}
                        >
                          {t.accessTag.title}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Muhasebe izleri" subtitle="Bu siparişe bağlı AccountingEntry kayıtları" />
        <CardBody>
          {accounting.length === 0 ? (
            <p className="od-muted">Muhasebe kaydı yok.</p>
          ) : (
            <table className="od-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Tip</th>
                  <th>Kategori</th>
                  <th>Tutar</th>
                  <th>RefType</th>
                </tr>
              </thead>
              <tbody>
                {accounting.map((a) => (
                  <tr key={a.id}>
                    <td className="od-mono od-muted">
                      {new Intl.DateTimeFormat("tr-TR").format(a.occurredAt)}
                    </td>
                    <td>
                      <Badge tone={a.type === "INCOME" ? "ok" : "bad"}>{a.type}</Badge>
                    </td>
                    <td>{a.category}</td>
                    <td className="od-mono">{fmtTRY(a.amount)}</td>
                    <td className="od-mono od-muted" style={{ fontSize: 11 }}>
                      {a.refType}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Timeline" subtitle="Bu siparişin yaşam döngüsü" />
        <CardBody>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 13 }}>
            {timeline.map((t, i) => (
              <li
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px 1fr",
                  gap: 12,
                  padding: "6px 0",
                  borderBottom:
                    i < timeline.length - 1 ? "1px dashed var(--pd-line)" : "none",
                }}
              >
                <span className="od-mono od-muted" style={{ fontSize: 11 }}>
                  {t.at.toLocaleString("tr-TR")}
                </span>
                <span>{t.label}</span>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>
    </>
  );
}
