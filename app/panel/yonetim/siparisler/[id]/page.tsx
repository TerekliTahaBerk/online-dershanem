import Link from "next/link";
import { notFound } from "next/navigation";
import type { OdProvisioningStatus, OrderLineFulfillmentStatus, OdkPaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelCard, PanelCardTitle, PanelHeading } from "@/components/panel/ui";
import { retryOrderProvisioning } from "./actions";

export const dynamic = "force-dynamic";

/**
 * ADMIN · SİPARİŞ DETAYI — onaylı tasarım (Panel.dc.html → aOrder).
 *
 * TASARIMIN ANA FİKRİ: ödeme durumu ile erişim açma (provisioning) durumu
 * AYRI iki şeydir ve ekran bunu net göstermelidir. "Ödeme alındı" satırının
 * yanında "Online Koçum · başarısız" durabilir; bu bir tutarsızlık değil,
 * operasyonun müdahale etmesi gereken normal bir hâldir.
 *
 * Ürün bazlı erişim durumu `CommerceOrderLine.fulfillmentStatus` alanından
 * gelir — sipariş seviyesindeki tek durumdan türetilmez, çünkü bir ürün
 * açılıp diğeri başarısız olabilir.
 */

const DATE_TIME = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Istanbul",
});
const LIRA = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

const PAYMENT_STATUS: Record<OdkPaymentStatus, { label: string; tone: string }> = {
  SUCCEEDED: { label: "Alındı", tone: "text-dc-brand-hover" },
  PENDING: { label: "Bekliyor", tone: "text-[#A5764A]" },
  FAILED: { label: "Başarısız", tone: "text-[#C2493D]" },
  REFUNDED: { label: "İade edildi", tone: "text-dc-ink-muted" },
};

const FULFILLMENT: Record<OrderLineFulfillmentStatus, { label: string; tone: string }> = {
  SUCCEEDED: { label: "Açıldı", tone: "text-dc-brand-hover" },
  PENDING: { label: "Bekliyor", tone: "text-[#A5764A]" },
  RUNNING: { label: "Açılıyor", tone: "text-[#A5764A]" },
  RETRY_PENDING: { label: "Yeniden denenecek", tone: "text-[#A5764A]" },
  MANUAL_REVIEW: { label: "Elle inceleme gerekiyor", tone: "text-[#C2493D]" },
  REVOKED: { label: "Geri alındı", tone: "text-dc-ink-muted" },
};

const ORDER_PROVISIONING: Record<OdProvisioningStatus, string> = {
  SUCCEEDED: "Tamamlandı",
  PENDING: "Bekliyor",
  RUNNING: "Çalışıyor",
  RETRY_PENDING: "Yeniden denenecek",
  MANUAL_REVIEW: "Elle inceleme gerekiyor",
};

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className={tone ?? "text-dc-ink-muted"}>{value}</dd>
    </div>
  );
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("ADMIN");
  const { id } = await params;

  const order = await prisma.odOrder.findUnique({
    where: { id },
    select: {
      id: true,
      packageName: true,
      status: true,
      totalCents: true,
      createdAt: true,
      provisioningStatus: true,
      provisioningAttempts: true,
      provisioningError: true,
      provisionedAt: true,
      user: { select: { id: true, fullName: true, email: true } },
      payments: {
        select: {
          status: true,
          provider: true,
          amountCents: true,
          paidAt: true,
          failureReason: true,
        },
        orderBy: { createdAt: "desc" },
      },
      lines: {
        select: {
          id: true,
          productName: true,
          fulfillmentStatus: true,
          fulfillmentError: true,
          fulfillmentAttempts: true,
        },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!order) notFound();

  const payment = order.payments[0] ?? null;
  const canRetry = order.status === "PAID" && order.provisioningStatus !== "SUCCEEDED";
  const failedLines = order.lines.filter(
    (l) => l.fulfillmentStatus === "MANUAL_REVIEW" || l.fulfillmentStatus === "RETRY_PENDING",
  );

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Sipariş detayı"
    >
      <div className="max-w-[900px]">
        <p className="text-[13px] text-dc-ink-faint">
          <Link href="/panel/yonetim/isler" className="hover:text-dc-brand-hover hover:underline">
            Siparişler
          </Link>
        </p>

        <div className="mt-2 flex flex-wrap items-end justify-between gap-5">
          <div>
            <PanelHeading title={order.packageName} />
            <p className="mt-1.5 text-[14px] text-dc-ink-muted">
              {order.user?.fullName || order.user?.email || "Henüz hesaba bağlanmadı"} ·{" "}
              {DATE_TIME.format(order.createdAt)}
            </p>
          </div>

          {canRetry ? (
            <form action={retryOrderProvisioning}>
              <input type="hidden" name="orderId" value={order.id} />
              <button
                type="submit"
                className="rounded-[10px] bg-dc-brand px-[18px] py-[11px] text-[13.5px] font-bold text-white transition-colors hover:bg-dc-brand-hover"
              >
                Erişim açmayı yeniden dene
              </button>
            </form>
          ) : null}
        </div>

        <div className="mt-[22px] grid gap-5 md:grid-cols-2">
          <PanelCard>
            <PanelCardTitle>Ödeme</PanelCardTitle>
            <dl className="mt-3 flex flex-col gap-2.5 text-[14px] font-medium text-dc-ink-body">
              <Row
                label="Durum"
                value={payment ? PAYMENT_STATUS[payment.status].label : "Ödeme kaydı yok"}
                tone={payment ? PAYMENT_STATUS[payment.status].tone : undefined}
              />
              <Row label="Tutar" value={LIRA.format(order.totalCents / 100)} />
              {payment ? <Row label="Yöntem" value={payment.provider} /> : null}
              {payment?.paidAt ? (
                <Row label="Ödeme zamanı" value={DATE_TIME.format(payment.paidAt)} />
              ) : null}
            </dl>
            {payment?.failureReason ? (
              <p className="mt-3 text-[12.5px] leading-[1.6] text-[#C2493D]">
                {payment.failureReason}
              </p>
            ) : null}
          </PanelCard>

          <PanelCard>
            <PanelCardTitle>Erişim açma</PanelCardTitle>
            {order.lines.length === 0 ? (
              <p className="mt-3 text-[13.5px] text-dc-ink-muted">
                Bu siparişte ürün satırı kaydı yok. Genel durum:{" "}
                {ORDER_PROVISIONING[order.provisioningStatus]}.
              </p>
            ) : (
              <dl className="mt-3 flex flex-col gap-2.5 text-[14px] font-medium text-dc-ink-body">
                {order.lines.map((line) => (
                  <Row
                    key={line.id}
                    label={line.productName}
                    value={FULFILLMENT[line.fulfillmentStatus].label}
                    tone={FULFILLMENT[line.fulfillmentStatus].tone}
                  />
                ))}
              </dl>
            )}
            <p className="mt-3 text-[12.5px] leading-[1.6] text-dc-ink-faint">
              Ödeme ile erişim ayrı süreçlerdir. Ödeme geri alınmadan erişim yeniden
              denenebilir. Deneme sayısı: {order.provisioningAttempts}.
            </p>
          </PanelCard>
        </div>

        {order.provisioningError || failedLines.length > 0 ? (
          <PanelCard className="mt-5">
            <PanelCardTitle>Hata detayı</PanelCardTitle>
            <pre className="mt-2.5 overflow-x-auto whitespace-pre-wrap rounded-[10px] border border-dc-line-soft bg-[#FCFDFC] p-3.5 font-mono text-[13px] leading-[1.7] text-dc-ink-muted">
              {[
                order.provisioningError,
                ...failedLines.map((l) =>
                  `${l.productName} · ${FULFILLMENT[l.fulfillmentStatus].label}${
                    l.fulfillmentError ? ` · ${l.fulfillmentError}` : ""
                  } · ${l.fulfillmentAttempts} deneme`,
                ),
              ]
                .filter(Boolean)
                .join("\n")}
            </pre>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {order.user ? (
                <Link
                  href={`/panel/yonetim/kullanicilar/${order.user.id}`}
                  className="rounded-[10px] border border-[#DDE4E0] bg-white px-4 py-2.5 text-[13.5px] font-bold text-dc-ink transition-colors hover:border-dc-brand"
                >
                  Öğrenci kaydını aç
                </Link>
              ) : (
                <Link
                  href="/panel/yonetim/isler"
                  className="rounded-[10px] border border-[#DDE4E0] bg-white px-4 py-2.5 text-[13.5px] font-bold text-dc-ink transition-colors hover:border-dc-brand"
                >
                  Siparişi bir öğrenciye bağla
                </Link>
              )}
            </div>
          </PanelCard>
        ) : null}
      </div>
    </PanelShell>
  );
}
