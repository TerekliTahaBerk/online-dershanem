import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { Field, Input } from "@/components/panel/ui/form";
import {
  markOdkPaymentSucceededAction,
  markOdkPaymentFailedAction,
  markOdkPaymentRefundedAction,
} from "../_actions";
import type { OdkPaymentStatus } from "@prisma/client";

export const metadata: Metadata = {
  title: "ODK Ödeme Detayı · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const fmtTRY = (c: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(c / 100);

const TONE: Record<OdkPaymentStatus, "ok" | "warn" | "bad" | "neutral"> = {
  SUCCEEDED: "ok",
  PENDING: "warn",
  FAILED: "bad",
  REFUNDED: "neutral",
};

export default async function OdkPaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOdkPanel("admin");
  const { id } = await params;

  const payment = await prisma.odkPayment.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          package: { select: { id: true, title: true } },
        },
      },
    },
  });
  if (!payment) notFound();

  const canSucceed = payment.status !== "SUCCEEDED" && payment.status !== "REFUNDED";
  const canFail = payment.status === "PENDING";
  const canRefund = payment.status === "SUCCEEDED";

  return (
    <>
      <PageHeader
        title={"Ödeme · " + payment.provider}
        subtitle={
          fmtTRY(payment.amountCents) +
          " · " +
          payment.status +
          " · " +
          (payment.order.user.name ?? payment.order.user.email)
        }
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/panel/admin/odk/odemeler" className="od-btn od-btn-ghost od-btn-sm">
              ← Liste
            </Link>
            <Badge tone="purple">ODK</Badge>
          </div>
        }
      />

      <div className="od-grid g-2" style={{ marginBottom: 16 }}>
        <Card>
          <CardHeader
            title="Ödeme bilgileri"
            subtitle={<Badge tone={TONE[payment.status]}>{payment.status}</Badge>}
          />
          <CardBody>
            <dl style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 6, fontSize: 13 }}>
              <dt className="od-muted">Ödeme ID</dt>
              <dd className="od-mono" style={{ fontSize: 11 }}>{payment.id}</dd>
              <dt className="od-muted">Sipariş</dt>
              <dd>
                <Link href={`/panel/admin/odk/siparisler/${payment.orderId}`}>
                  {payment.order.package.title}
                </Link>
              </dd>
              <dt className="od-muted">Kullanıcı</dt>
              <dd>
                {payment.order.user.name ?? "—"}
                <div className="od-muted" style={{ fontSize: 11 }}>{payment.order.user.email}</div>
              </dd>
              <dt className="od-muted">Tutar</dt>
              <dd className="od-mono"><strong>{fmtTRY(payment.amountCents)}</strong></dd>
              <dt className="od-muted">Provider</dt>
              <dd>{payment.provider}</dd>
              <dt className="od-muted">Provider Ref</dt>
              <dd className="od-mono" style={{ fontSize: 11 }}>{payment.providerRef ?? "—"}</dd>
              <dt className="od-muted">Oluşturma</dt>
              <dd className="od-mono">{payment.createdAt.toLocaleString("tr-TR")}</dd>
              <dt className="od-muted">Ödeme tarihi</dt>
              <dd className="od-mono">
                {payment.paidAt ? payment.paidAt.toLocaleString("tr-TR") : "—"}
              </dd>
              {payment.failureReason ? (
                <>
                  <dt className="od-muted">Hata nedeni</dt>
                  <dd>{payment.failureReason}</dd>
                </>
              ) : null}
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Admin işlemleri" subtitle="Ödeme durumu güncelle" />
          <CardBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <form action={markOdkPaymentSucceededAction.bind(null, payment.id)}>
                <button
                  type="submit"
                  className="od-btn od-btn-primary od-btn-sm"
                  disabled={!canSucceed}
                  style={{ width: "100%" }}
                >
                  SUCCEEDED yap (sipariş PAID + entitlement + muhasebe)
                </button>
              </form>
              <form action={markOdkPaymentFailedAction.bind(null, payment.id)}>
                <Field label="Hata nedeni (opsiyonel)">
                  <Input name="reason" placeholder="Örn. Kart reddedildi" />
                </Field>
                <button
                  type="submit"
                  className="od-btn od-btn-ghost od-btn-sm"
                  disabled={!canFail}
                  style={{ width: "100%", marginTop: 6 }}
                >
                  FAILED yap
                </button>
              </form>
              <form action={markOdkPaymentRefundedAction.bind(null, payment.id)}>
                <button
                  type="submit"
                  className="od-btn od-btn-ghost od-btn-sm"
                  disabled={!canRefund}
                  style={{ width: "100%", color: "var(--pd-bad)" }}
                >
                  REFUNDED yap (sipariş iadesi + erişim iptal)
                </button>
              </form>
              <p className="od-muted" style={{ fontSize: 11, marginTop: 6 }}>
                Tüm işlemler idempotent — tekrar tetiklenmesi duplicate entitlement/muhasebe kaydı
                üretmez.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
