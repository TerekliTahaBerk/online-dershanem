import assert from "node:assert/strict";
import test from "node:test";

import { POST as handleLegacyPurchaseWebhook } from "../../app/api/purchases/webhook/route";
import { findStuckPayments } from "../../lib/commerce/stuck-payments";
import { createIntegrationPrismaClient, integration } from "./integration-utils";

const db = createIntegrationPrismaClient();

function purchaseIntentData(runId: string) {
  return {
    source: "integration-test",
    packageName: "Payment safety fixture",
    studentFullName: "Test Student",
    studentPhone: "05550000000",
    studentEmail: `payment-safety-${runId}@example.com`,
    schoolName: "Test School",
    city: "Istanbul",
    district: "Kadikoy",
    classLevel: "8",
    examType: "LGS",
    targetRanking: "1000",
    currentLevel: "Orta",
    currentNet: "10",
    weakLessons: "Matematik",
    needType: "Ders",
    studyStatus: "Aktif",
    weeklyStudyHours: "10",
    kvkkConsent: true,
    paymentConsent: true,
    submittedAt: new Date(),
  };
}

async function waitForAuditCount(purchaseId: string, expected: number) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const count = await db.auditLog.count({
      where: { entityType: "PurchaseIntent", entityId: purchaseId, action: "WEBHOOK_PAYMENT_CONFIRMED" },
    });
    if (count === expected) return count;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return db.auditLog.count({
    where: { entityType: "PurchaseIntent", entityId: purchaseId, action: "WEBHOOK_PAYMENT_CONFIRMED" },
  });
}

integration("legacy purchase webhook eşzamanlı duplicate teslimatı tek kez işler", async () => {
  const runId = crypto.randomUUID();
  const providerReference = `payment-safety-${runId}`;
  const purchase = await db.purchaseIntent.create({ data: purchaseIntentData(runId) });
  const previousSecret = process.env.PAYMENT_WEBHOOK_SECRET;
  process.env.PAYMENT_WEBHOOK_SECRET = "integration-only-webhook-secret";

  const request = () =>
    new Request("http://localhost/api/purchases/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-payment-webhook-secret": "integration-only-webhook-secret",
      },
      body: JSON.stringify({
        purchaseId: purchase.id,
        provider: "FAKE_GATEWAY",
        eventType: "PAYMENT_CONFIRMED",
        status: "PAID",
        providerReference,
        payload: { test: true },
      }),
    });

  try {
    const responses = await Promise.all([
      handleLegacyPurchaseWebhook(request()),
      handleLegacyPurchaseWebhook(request()),
    ]);

    assert.deepEqual(responses.map((response) => response.status), [200, 200]);
    assert.equal(
      await db.purchaseEvent.count({ where: { providerReference } }),
      1,
      "aynı providerReference için yalnız bir PurchaseEvent kalmalı",
    );
    assert.equal(
      (await db.purchaseIntent.findUniqueOrThrow({ where: { id: purchase.id } })).status,
      "PAID",
    );
    assert.equal(await waitForAuditCount(purchase.id, 1), 1, "audit yan etkisi yalnız bir kez yazılmalı");
  } finally {
    if (previousSecret === undefined) delete process.env.PAYMENT_WEBHOOK_SECRET;
    else process.env.PAYMENT_WEBHOOK_SECRET = previousSecret;
    await db.auditLog.deleteMany({ where: { entityType: "PurchaseIntent", entityId: purchase.id } });
    await db.purchaseEvent.deleteMany({ where: { purchaseIntentId: purchase.id } });
    await db.purchaseIntent.delete({ where: { id: purchase.id } });
  }
});

integration("reconciliation ödenmiş ama provisioning tamamlanmamış siparişi yakalar", async () => {
  const paidAt = new Date("2026-09-14T06:00:00.000Z");
  const order = await db.odOrder.create({
    data: {
      packageName: "Stuck payment fixture",
      status: "PAID",
      subtotalCents: 24_900,
      totalCents: 24_900,
      provisioningStatus: "RETRY_PENDING",
      provisioningError: "synthetic provisioning failure",
      payments: {
        create: {
          provider: "PAYTR",
          providerRef: `ODSTUCK${crypto.randomUUID().replaceAll("-", "")}`,
          status: "SUCCEEDED",
          amountCents: 24_900,
          paidAt,
        },
      },
    },
    include: { payments: true },
  });

  try {
    const stuck = await findStuckPayments({
      client: db,
      olderThanMinutes: 30,
      now: new Date("2026-09-14T07:00:00.000Z"),
    });
    assert.deepEqual(
      stuck.filter((payment) => payment.orderId === order.id),
      [{
        service: "OD",
        paymentId: order.payments[0].id,
        orderId: order.id,
        paidAt,
        provisioningStatus: "RETRY_PENDING",
        provisioningError: "synthetic provisioning failure",
      }],
    );

    await db.odOrder.update({
      where: { id: order.id },
      data: { provisioningStatus: "SUCCEEDED", provisionedAt: new Date("2026-09-14T06:05:00.000Z") },
    });
    assert.equal(
      (await findStuckPayments({
        client: db,
        olderThanMinutes: 30,
        now: new Date("2026-09-14T07:00:00.000Z"),
      })).some((payment) => payment.orderId === order.id),
      false,
    );
  } finally {
    await db.odPayment.deleteMany({ where: { orderId: order.id } });
    await db.odOrder.delete({ where: { id: order.id } });
  }
});

test.after(() => db.$disconnect());
