/**
 * Unified PayTR Notification (callback) endpoint.
 *
 * POST /api/paytr/callback
 *
 * PayTR ödeme sonucunu bu URL'e POST eder (x-www-form-urlencoded).
 * `merchant_oid` prefix'ine göre doğru servise (ODK / OD) yönlendirir.
 *
 *   merchant_oid "ODK..." → ODK akışı  (entitlement + access tag + accounting)
 *   merchant_oid "OD..."  → OD akışı   (accounting + PurchaseIntent; entitlement YOK)
 *
 * Güvenlik:
 *  - Hash doğrulaması zorunlu (timing-safe).
 *  - Auth yoktur; PayTR sunucusu çağırır.
 *  - Her durumda body olarak "OK" döner (hatalı hash hariç → 400) ki PayTR retry storm'a girmesin.
 *  - Tüm callback olayları AuditLog'a yazılır.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import { logAudit } from "@/lib/audit";
import { markOdkOrderPaid } from "@/lib/odk/finance";
import { markOdOrderPaid } from "@/lib/od/finance";
import { provisionOdOrder, type OdProvisioningFailurePoint } from "@/lib/od/provisioning";
import {
  verifyPaytrCallbackHash,
  detectPaytrService,
  type PaytrCallbackPayload,
} from "@/lib/odk/paytr";
import { validatePaytrPaymentInvariant } from "@/lib/odk/paytr-callback-validation";
import { upsertOrderLedger } from "@/lib/business/finance";
import { provisionOdkOrder, type OdkProvisioningFailurePoint } from "@/lib/odk/provisioning";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function plain(body: string, status = 200): Response {
  return new NextResponse(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  let payload: PaytrCallbackPayload;
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    payload = {
      merchant_oid: params.get("merchant_oid") ?? "",
      status: (params.get("status") as "success" | "failed") ?? "failed",
      total_amount: params.get("total_amount") ?? "0",
      hash: params.get("hash") ?? "",
      failed_reason_code: params.get("failed_reason_code") ?? undefined,
      failed_reason_msg: params.get("failed_reason_msg") ?? undefined,
      payment_type: params.get("payment_type") ?? undefined,
      payment_amount: params.get("payment_amount") ?? undefined,
      currency: params.get("currency") ?? undefined,
      installment_count: params.get("installment_count") ?? undefined,
      test_mode: params.get("test_mode") ?? undefined,
    };
  } catch (err) {
    log.error("paytr.callback.parse_error", err);
    return plain("OK");
  }

  if (!payload.merchant_oid || !payload.hash) {
    log.warn("paytr.callback.missing_fields", { hasOid: !!payload.merchant_oid });
    return plain("OK");
  }

  // KRİTİK: hash doğrulama
  if (!verifyPaytrCallbackHash(payload)) {
    log.warn("paytr.callback.bad_hash", { merchantOid: payload.merchant_oid });
    void logAudit({
      actorUserId: null,
      actorType: "SYSTEM",
      entityType: "Payment",
      entityId: payload.merchant_oid,
      action: "PAYTR_CALLBACK_BAD_HASH",
      summary: `Geçersiz hash — merchant_oid=${payload.merchant_oid}`,
      payload: { merchantOid: payload.merchant_oid },
    });
    return plain("PAYTR notification failed: bad hash", 400);
  }

  const service = detectPaytrService(payload.merchant_oid);

  if (service === "ODK") {
    const requestedFailure = req.headers.get("x-odk-test-failure") as OdkProvisioningFailurePoint | null;
    const failurePoint = process.env.ODK_PROVISIONING_TEST_MODE === "true"
      && process.env.VERCEL_ENV !== "production"
      && requestedFailure
      && ["AFTER_USER", "AFTER_PROFILE", "AFTER_MEMBERSHIP"].includes(requestedFailure)
      ? requestedFailure
      : undefined;
    return handleOdk(payload, failurePoint);
  }
  if (service === "OD") {
    const requestedFailure = req.headers.get("x-od-test-failure") as OdProvisioningFailurePoint | null;
    const failurePoint = process.env.OD_PROVISIONING_TEST_MODE === "true"
      && process.env.VERCEL_ENV !== "production"
      && requestedFailure
      && ["AFTER_USER", "AFTER_PROFILE", "AFTER_MEMBERSHIP"].includes(requestedFailure)
      ? requestedFailure
      : undefined;
    return handleOd(payload, failurePoint);
  }

  log.warn("paytr.callback.unknown_prefix", { merchantOid: payload.merchant_oid });
  void logAudit({
    actorUserId: null,
    actorType: "SYSTEM",
    entityType: "Payment",
    entityId: payload.merchant_oid,
    action: "PAYTR_CALLBACK_UNKNOWN_SERVICE",
    summary: `Bilinmeyen prefix — ${payload.merchant_oid}`,
    payload: { merchantOid: payload.merchant_oid, status: payload.status },
  });
  return plain("OK");
}

async function handleOdk(payload: PaytrCallbackPayload, failurePoint?: OdkProvisioningFailurePoint): Promise<Response> {
  const payment = await prisma.odkPayment.findFirst({
    where: { provider: "PAYTR", providerRef: payload.merchant_oid },
    select: {
      id: true,
      orderId: true,
      status: true,
      order: { select: { status: true, totalCents: true, discountCents: true, buyerInfo: true, provisioningStatus: true } },
    },
  });

  if (!payment) {
    log.warn("paytr.callback.odk.payment_not_found", { merchantOid: payload.merchant_oid });
    void logAudit({
      actorUserId: null,
      actorType: "SYSTEM",
      entityType: "OdkPayment",
      entityId: payload.merchant_oid,
      action: "PAYTR_CALLBACK_ORPHAN",
      summary: `Bilinmeyen ODK merchant_oid — ${payload.merchant_oid}`,
      payload: { merchantOid: payload.merchant_oid, status: payload.status },
    });
    return plain("OK");
  }

  if (payment.status === "SUCCEEDED" && payment.order.status === "PAID" && payment.order.provisioningStatus === "SUCCEEDED") {
    log.debug("paytr.callback.odk.already_processed", { orderId: payment.orderId });
    return plain("OK");
  }

  const totalCents = parseInt(payload.total_amount, 10);

  if (payload.status === "success") {
    const invariant = validatePaytrPaymentInvariant({
      expectedAmountCents: payment.order.totalCents,
      paymentAmount: payload.payment_amount,
      currency: payload.currency,
    });
    if (!invariant.ok) {
      log.error("paytr.callback.odk.payment_invariant_failed", {
        orderId: payment.orderId,
        merchantOid: payload.merchant_oid,
        reason: invariant.reason,
      });
      void logAudit({
        actorUserId: null,
        actorType: "SYSTEM",
        entityType: "OdkOrder",
        entityId: payment.orderId,
        action: "PAYTR_PAYMENT_INVARIANT_FAILED",
        summary: `ODK ödeme tutarı/para birimi doğrulanamadı: ${invariant.reason}`,
        payload: {
          merchantOid: payload.merchant_oid,
          reason: invariant.reason,
          paymentAmount: payload.payment_amount,
          currency: payload.currency,
        },
      });
      return plain("PAYTR notification failed: payment invariant", 400);
    }

    const afterCommit: Array<() => Promise<void>> = [];
    try {
      if (payment.status !== "SUCCEEDED" || payment.order.status !== "PAID") {
        await prisma.$transaction(async (tx) => {
          const paidAt = new Date();
          await markOdkOrderPaid(payment.orderId, { transaction: tx, afterCommit });
          await tx.odkPayment.update({
            where: { id: payment.id },
            data: {
              status: "SUCCEEDED",
              amountCents: invariant.paymentAmountCents,
              paidAt,
              failureReason: null,
            },
          });
          await upsertOrderLedger(tx, { source: "ONLINE_DENEME_KULUBU", orderId: payment.orderId, totalCents: invariant.paymentAmountCents, discountCents: payment.order.discountCents, description: `ODK siparişi ${payment.orderId}`, paidAt, paymentMethod: payload.payment_type, buyerInfo: payment.order.buyerInfo });
        }, { isolationLevel: "Serializable" });
      }
      await Promise.all(afterCommit.map((run) => run()));
      await provisionOdkOrder(payment.orderId, { failurePoint });
      log.info("paytr.callback.odk.success", { orderId: payment.orderId, merchantOid: payload.merchant_oid, amount: totalCents });
      void logAudit({
        actorUserId: null,
        actorType: "SYSTEM",
        entityType: "OdkOrder",
        entityId: payment.orderId,
        action: "PAYTR_PAYMENT_SUCCESS",
        summary: `ODK ${(totalCents / 100).toFixed(2)} TL — ${payload.payment_type ?? "card"}`,
        payload: {
          merchantOid: payload.merchant_oid,
          totalAmount: totalCents,
          paymentType: payload.payment_type,
          installment: payload.installment_count,
          testMode: payload.test_mode,
        },
      });
    } catch (err) {
      log.error("paytr.callback.odk.success_handler_error", err, { orderId: payment.orderId });
      return plain("PAYTR notification failed: processing error", 500);
    }
  } else {
    try {
      await prisma.odkPayment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          failureReason:
            payload.failed_reason_msg ?? payload.failed_reason_code ?? "PayTR failed",
        },
      });
      log.info("paytr.callback.odk.failed", {
        orderId: payment.orderId,
        merchantOid: payload.merchant_oid,
        code: payload.failed_reason_code,
        msg: payload.failed_reason_msg,
      });
      void logAudit({
        actorUserId: null,
        actorType: "SYSTEM",
        entityType: "OdkOrder",
        entityId: payment.orderId,
        action: "PAYTR_PAYMENT_FAILED",
        summary: `ODK başarısız: ${payload.failed_reason_msg ?? payload.failed_reason_code ?? "?"}`,
        payload: {
          merchantOid: payload.merchant_oid,
          code: payload.failed_reason_code,
          msg: payload.failed_reason_msg,
        },
      });
    } catch (err) {
      log.error("paytr.callback.odk.failed_handler_error", err);
    }
  }

  return plain("OK");
}

async function handleOd(payload: PaytrCallbackPayload, failurePoint?: OdProvisioningFailurePoint): Promise<Response> {
  const payment = await prisma.odPayment.findFirst({
    where: { provider: "PAYTR", providerRef: payload.merchant_oid },
    select: {
      id: true,
      orderId: true,
      status: true,
      order: { select: { status: true, totalCents: true, discountCents: true, packageName: true, buyerInfo: true, provisioningStatus: true } },
    },
  });

  if (!payment) {
    log.warn("paytr.callback.od.payment_not_found", { merchantOid: payload.merchant_oid });
    void logAudit({
      actorUserId: null,
      actorType: "SYSTEM",
      entityType: "OdPayment",
      entityId: payload.merchant_oid,
      action: "PAYTR_CALLBACK_ORPHAN",
      summary: `Bilinmeyen OD merchant_oid — ${payload.merchant_oid}`,
      payload: { merchantOid: payload.merchant_oid, status: payload.status },
    });
    return plain("OK");
  }

  if (payment.status === "SUCCEEDED" && payment.order.status === "PAID" && payment.order.provisioningStatus === "SUCCEEDED") {
    log.debug("paytr.callback.od.already_processed", { orderId: payment.orderId });
    return plain("OK");
  }

  const totalCents = parseInt(payload.total_amount, 10);

  if (payload.status === "success") {
    const invariant = validatePaytrPaymentInvariant({
      expectedAmountCents: payment.order.totalCents,
      paymentAmount: payload.payment_amount,
      currency: payload.currency,
    });
    if (!invariant.ok) {
      log.error("paytr.callback.od.payment_invariant_failed", {
        orderId: payment.orderId,
        merchantOid: payload.merchant_oid,
        reason: invariant.reason,
      });
      void logAudit({
        actorUserId: null,
        actorType: "SYSTEM",
        entityType: "OdOrder",
        entityId: payment.orderId,
        action: "PAYTR_PAYMENT_INVARIANT_FAILED",
        summary: `OD ödeme tutarı/para birimi doğrulanamadı: ${invariant.reason}`,
        payload: {
          merchantOid: payload.merchant_oid,
          reason: invariant.reason,
          paymentAmount: payload.payment_amount,
          currency: payload.currency,
        },
      });
      return plain("PAYTR notification failed: payment invariant", 400);
    }

    const afterCommit: Array<() => Promise<void>> = [];
    try {
      if (payment.status !== "SUCCEEDED" || payment.order.status !== "PAID") {
        await prisma.$transaction(async (tx) => {
          const paidAt = new Date();
          await markOdOrderPaid(payment.orderId, { transaction: tx, afterCommit });
          await tx.odPayment.update({
            where: { id: payment.id },
            data: {
              status: "SUCCEEDED",
              amountCents: invariant.paymentAmountCents,
              paidAt,
              failureReason: null,
            },
          });
          await upsertOrderLedger(tx, { source: "ONLINE_DERSHANEM", orderId: payment.orderId, totalCents: invariant.paymentAmountCents, discountCents: payment.order.discountCents, description: payment.order.packageName, paidAt, paymentMethod: payload.payment_type, buyerInfo: payment.order.buyerInfo });
        }, { isolationLevel: "Serializable" });
      }
      await Promise.all(afterCommit.map((run) => run()));
      const provisioning = await provisionOdOrder(payment.orderId, { failurePoint });
      if (provisioning.status === "MANUAL_REVIEW") {
        log.warn("paytr.callback.od.manual_review", { orderId: payment.orderId, reason: provisioning.reason });
        return plain("OK");
      }
      log.info("paytr.callback.od.success", { orderId: payment.orderId, merchantOid: payload.merchant_oid, amount: totalCents });
      void logAudit({
        actorUserId: null,
        actorType: "SYSTEM",
        entityType: "OdOrder",
        entityId: payment.orderId,
        action: "PAYTR_PAYMENT_SUCCESS",
        summary: `OD ${(totalCents / 100).toFixed(2)} TL — ${payload.payment_type ?? "card"}`,
        payload: {
          merchantOid: payload.merchant_oid,
          totalAmount: totalCents,
          paymentType: payload.payment_type,
          installment: payload.installment_count,
          testMode: payload.test_mode,
        },
      });

    } catch (err) {
      log.error("paytr.callback.od.success_handler_error", err, { orderId: payment.orderId });
      return plain("PAYTR notification failed: processing error", 500);
    }
  } else {
    try {
      await prisma.odPayment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          failureReason:
            payload.failed_reason_msg ?? payload.failed_reason_code ?? "PayTR failed",
        },
      });
      log.info("paytr.callback.od.failed", {
        orderId: payment.orderId,
        merchantOid: payload.merchant_oid,
        code: payload.failed_reason_code,
        msg: payload.failed_reason_msg,
      });
      void logAudit({
        actorUserId: null,
        actorType: "SYSTEM",
        entityType: "OdOrder",
        entityId: payment.orderId,
        action: "PAYTR_PAYMENT_FAILED",
        summary: `OD başarısız: ${payload.failed_reason_msg ?? payload.failed_reason_code ?? "?"}`,
        payload: {
          merchantOid: payload.merchant_oid,
          code: payload.failed_reason_code,
          msg: payload.failed_reason_msg,
        },
      });

    } catch (err) {
      log.error("paytr.callback.od.failed_handler_error", err);
    }
  }

  return plain("OK");
}
