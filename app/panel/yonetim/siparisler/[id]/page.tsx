import Link from "next/link";
import { notFound } from "next/navigation";
import type { OdProvisioningStatus, OrderLineFulfillmentStatus, OdkPaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelCard, PanelCardTitle, PanelHeading } from "@/components/panel/ui";
import {
  OD_ONBOARDING_LABELS,
  OD_ONBOARDING_NEXT_ACTION,
  type OdOnboardingStateValue,
} from "@/lib/od/onboarding-state";
import { retryOrderProvisioning } from "./actions";

export const dynamic = "force-dynamic";

/**
 * ADMIN · COMMERCE RESOLUTION CENTER
 *
 * Sipariş → ödeme → kullanıcı → ürün erişimi zinciri tek vaka olarak okunur.
 * Ana karar alanı üç soruyu önceleyerek operasyonu hızlandırır:
 * "Ne oldu?", "Kimi etkiliyor?", "Şimdi ne yapacağım?".
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
      user: { select: { id: true, fullName: true, email: true, studentProfile: { select: { id: true } } } },
      onboarding: {
        select: {
          state: true,
          dueAt: true,
          owner: { select: { fullName: true, email: true } },
        },
      },
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
  const canRetryNow = canRetry && Boolean(order.user);
  const failedLines = order.lines.filter(
    (l) => l.fulfillmentStatus === "MANUAL_REVIEW" || l.fulfillmentStatus === "RETRY_PENDING",
  );
  const onboardingState = order.onboarding?.state as OdOnboardingStateValue | undefined;
  const requiresRefundFollowup =
    order.status === "REFUNDED" || order.status === "CANCELLED" || payment?.status === "REFUNDED";
  const accessSummary = order.lines.length
    ? order.lines.map((line) => `${line.productName}: ${FULFILLMENT[line.fulfillmentStatus].label}`).join(" · ")
    : ORDER_PROVISIONING[order.provisioningStatus];
  const caseSummary =
    order.status !== "PAID"
      ? "Sipariş ödenmiş durumda değil; önce ödeme ve iade/iptal kaydını netleştirin."
      : order.provisioningStatus === "SUCCEEDED"
        ? "Ödeme alındı ve ürün erişimleri açılmış görünüyor."
        : "Ödeme alındı, fakat erişim akışında operasyon müdahalesi gerekiyor.";

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Sipariş detayı"
    >
      <div className="max-w-[900px]">
        <p className="text-[13px] text-dc-ink-faint">
          <Link href="/panel/yonetim/siparisler" className="hover:text-dc-brand-hover hover:underline">
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
        </div>

        <div className="mt-[22px] grid gap-5 md:grid-cols-3">
          <PanelCard>
            <PanelCardTitle>Ne oldu?</PanelCardTitle>
            <dl className="mt-3 flex flex-col gap-2.5 text-[14px] font-medium text-dc-ink-body">
              <Row label="Sipariş" value={`${order.packageName} · ${LIRA.format(order.totalCents / 100)}`} />
              <Row
                label="Ödeme"
                value={payment ? PAYMENT_STATUS[payment.status].label : "Ödeme kaydı yok"}
                tone={payment ? PAYMENT_STATUS[payment.status].tone : undefined}
              />
              <Row
                label="Kullanıcı"
                value={order.user?.fullName || order.user?.email || "Henüz hesabı bağlanmadı"}
              />
              <Row label="Ürün erişimi" value={accessSummary} />
            </dl>
            <p className="mt-3 text-[12.5px] leading-[1.6] text-dc-ink-faint">{caseSummary}</p>
          </PanelCard>

          <PanelCard>
            <PanelCardTitle>Kimi etkiliyor?</PanelCardTitle>
            <dl className="mt-3 flex flex-col gap-2.5 text-[14px] font-medium text-dc-ink-body">
              <Row
                label="Öğrenci hesabı"
                value={order.user ? (order.user.fullName || order.user.email) : "Bağlanmadı"}
              />
              {order.user ? (
                <Row
                  label="Hesap kaydı"
                  value={order.user.studentProfile?.id ? "Öğrenci profili var" : "Sadece kullanıcı hesabı var"}
                />
              ) : null}
              <Row
                label="Onboarding"
                value={
                  onboardingState
                    ? OD_ONBOARDING_LABELS[onboardingState]
                    : order.status === "PAID"
                      ? "Henüz onboarding başlatılmamış"
                      : "Ödeme kesinleşmeden onboarding açılmaz"
                }
              />
              {order.onboarding?.owner ? (
                <Row
                  label="Sorumlu"
                  value={order.onboarding.owner.fullName || order.onboarding.owner.email || "Atanmamış"}
                />
              ) : null}
              {order.onboarding?.dueAt ? (
                <Row label="Son tarih" value={DATE_TIME.format(order.onboarding.dueAt)} />
              ) : null}
            </dl>
            {!order.user ? (
              <p className="mt-3 text-[12.5px] leading-[1.6] text-[#C2493D]">
                Kullanıcı bağlı olmadıkça erişim açma zinciri tamamlanamaz.
              </p>
            ) : null}
          </PanelCard>

          <PanelCard>
            <PanelCardTitle>Şimdi ne yapacağım?</PanelCardTitle>
            <div className="mt-3 space-y-2 text-[13.5px] text-dc-ink-body">
              {!order.user ? (
                <p>
                  Siparişi bir öğrenci hesabına bağlayın.{" "}
                  <Link className="font-semibold text-dc-brand hover:underline" href="/panel/yonetim/isler">
                    İşler ekranına git
                  </Link>
                </p>
              ) : null}
              {canRetryNow ? (
                <form action={retryOrderProvisioning} className="pt-1">
                  <input type="hidden" name="orderId" value={order.id} />
                  <button
                    type="submit"
                    className="rounded-[10px] bg-dc-brand px-[14px] py-[9px] text-[13px] font-bold text-white transition-colors hover:bg-dc-brand-hover"
                  >
                    Erişim açmayı yeniden dene
                  </button>
                </form>
              ) : null}
              {canRetry && !order.user ? (
                <p>Erişim açmayı yeniden denemeden önce siparişi kullanıcı hesabına bağlayın.</p>
              ) : null}
              {failedLines.length > 0 ? (
                <p>
                  Ürün satırı problemi var ({failedLines.length}). Önce etkilenen hesabı kontrol edin:{" "}
                  {order.user ? (
                    <Link
                      href={
                        order.user.studentProfile?.id
                          ? `/panel/yonetim/ogrenciler/${order.user.studentProfile.id}`
                          : `/panel/yonetim/kullanicilar/${order.user.id}`
                      }
                      className="font-semibold text-dc-brand hover:underline"
                    >
                      Hesabı aç
                    </Link>
                  ) : (
                    "Hesap bağlı değil"
                  )}
                </p>
              ) : null}
              {requiresRefundFollowup ? (
                <p>
                  Sipariş iade/iptal durumunda. Erişim geri alma ve kapanış adımlarını
                  ödeme kaydıyla birlikte doğrulayın.
                </p>
              ) : null}
              {onboardingState ? (
                <p>
                  Onboarding sıradaki işlem:{" "}
                  <span className="font-semibold">{OD_ONBOARDING_NEXT_ACTION[onboardingState]}</span>
                </p>
              ) : null}
              {!canRetry && failedLines.length === 0 && order.user && order.provisioningStatus === "SUCCEEDED" ? (
                <p>Tüm ana adımlar tamamlandı; yalnız rutin takip gerekli.</p>
              ) : null}
            </div>
          </PanelCard>
        </div>

        <PanelCard className="mt-5">
          <PanelCardTitle>Teknik ayrıntılar</PanelCardTitle>
          <details className="mt-2">
            <summary className="cursor-pointer text-[13px] font-semibold text-dc-brand hover:underline">
              Provisioning denemeleri, hata nedenleri ve satır bazlı durumlar
            </summary>
            <div className="mt-3 space-y-3">
              <dl className="grid gap-2 text-[13px] text-dc-ink-body sm:grid-cols-2">
                <Row label="Sipariş provisioning durumu" value={ORDER_PROVISIONING[order.provisioningStatus]} />
                <Row label="Provisioning deneme sayısı" value={String(order.provisioningAttempts)} />
                {order.provisionedAt ? <Row label="Erişim açılma zamanı" value={DATE_TIME.format(order.provisionedAt)} /> : null}
                {payment?.provider ? <Row label="Ödeme sağlayıcısı" value={payment.provider} /> : null}
              </dl>
              {payment?.failureReason ? (
                <p className="rounded-[10px] border border-[#F3DDD7] bg-[#FFF6F3] px-3 py-2 text-[12.5px] text-[#A24839]">
                  Ödeme hata notu: {payment.failureReason}
                </p>
              ) : null}
              {order.provisioningError || order.lines.length > 0 ? (
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-[10px] border border-dc-line-soft bg-[#FCFDFC] p-3.5 font-mono text-[13px] leading-[1.7] text-dc-ink-muted">
                  {[
                    order.provisioningError ? `order: ${order.provisioningError}` : null,
                    ...order.lines.map((line) =>
                      `${line.productName} · ${FULFILLMENT[line.fulfillmentStatus].label}${
                        line.fulfillmentError ? ` · ${line.fulfillmentError}` : ""
                      } · ${line.fulfillmentAttempts} deneme`,
                    ),
                  ]
                    .filter(Boolean)
                    .join("\n")}
                </pre>
              ) : (
                <p className="text-[13px] text-dc-ink-muted">Teknik hata kaydı bulunmuyor.</p>
              )}
            </div>
          </details>
        </PanelCard>
      </div>
    </PanelShell>
  );
}
