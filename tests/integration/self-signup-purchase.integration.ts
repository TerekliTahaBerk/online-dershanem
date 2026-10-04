import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import { POST as handlePaytrCallback } from "../../app/api/paytr/callback/route";
import { getAccessibleProducts } from "../../lib/auth/products";
import { buildMerchantOid } from "../../lib/odk/paytr-merchant-oid";
import { provisionOdOrder } from "../../lib/od/provisioning";
import { createIntegrationPrismaClient, integration } from "./integration-utils";

/**
 * Kendi kendine kayıt sonrası satın alım: erişim kime, ne zaman açılır?
 *
 *  - Veli, hesabı OLMAYAN çocuk için öder → velinin erişimi hemen açılır,
 *    öğrenci hesabı AÇILMAZ, sipariş "öğrenci hesabı bekleniyor" incelemesine
 *    düşer. Admin hesabı açınca öğrencinin erişimi otomatik açılır.
 *  - Veli, bağlı çocuğu için öder → öğrenci ve velinin erişimi birlikte açılır.
 *
 * Gerçek PayTR'a istek ATILMAZ; callback test anahtarlarıyla imzalanır.
 */

const db = createIntegrationPrismaClient();
const PAYTR_TEST_ENV = {
  PAYTR_MERCHANT_ID: "integration-merchant",
  PAYTR_MERCHANT_KEY: "integration-only-merchant-key",
  PAYTR_MERCHANT_SALT: "integration-only-merchant-salt",
} as const;

async function withPaytrTestEnv(fn: () => Promise<void>) {
  const previous = Object.fromEntries(Object.keys(PAYTR_TEST_ENV).map((key) => [key, process.env[key]]));
  Object.assign(process.env, PAYTR_TEST_ENV);
  try {
    await fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function signedCallback(merchantOid: string, totalCents: number) {
  const status = "success";
  const totalAmount = String(totalCents);
  const hash = createHmac("sha256", PAYTR_TEST_ENV.PAYTR_MERCHANT_KEY)
    .update(merchantOid + PAYTR_TEST_ENV.PAYTR_MERCHANT_SALT + status + totalAmount)
    .digest("base64");
  const body = new URLSearchParams({ merchant_oid: merchantOid, status, total_amount: totalAmount, payment_amount: totalAmount, currency: "TL", payment_type: "card", test_mode: "1", hash });
  return new Request("http://localhost/api/paytr/callback", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: body.toString() });
}

async function createParent(runId: string) {
  return db.user.create({
    data: {
      email: `signup-parent-${runId}@example.com`,
      fullName: "Kayıt Velisi",
      phone: "+905550000001",
      role: "PARENT",
      registrationSource: "SELF_SIGNUP",
      passwordHash: "scrypt$test",
      mustChangePassword: false,
    },
  });
}

async function createPaidableOrder(input: { runId: string; buyerUserId: string; pendingChildId?: string | null; buyerInfo: Record<string, unknown>; ownerEmail: string }) {
  const totalCents = 200_000;
  const order = await db.odOrder.create({
    data: {
      packageName: `Self signup ${input.runId}`,
      category: "TEST",
      subject: "TEST",
      subtotalCents: totalCents,
      totalCents,
      buyerUserId: input.buyerUserId,
      pendingChildId: input.pendingChildId ?? null,
      buyerInfo: { city: "İstanbul", district: "Kadıköy", classLevel: "8", ...input.buyerInfo } as never,
      onboarding: { create: {} },
      lines: {
        create: [{
          position: 0,
          product: "OD",
          sku: `self-signup-${input.runId}`,
          productName: "LGS Matematik",
          productSnapshot: { id: `self-signup-${input.runId}`, name: "LGS Matematik", category: "TEST", subject: "TEST" },
          quantity: 1,
          unitPriceCents: totalCents,
          subtotalCents: totalCents,
          totalCents,
          fulfillmentOwnerKey: input.ownerEmail,
          fulfillmentOwnerSnapshot: { fullName: "Sahip", email: input.ownerEmail },
        }],
      },
    },
  });
  const merchantOid = buildMerchantOid(order.id, "OD");
  await db.odPayment.create({ data: { orderId: order.id, provider: "PAYTR", providerRef: merchantOid, amountCents: totalCents } });
  return { order, merchantOid, totalCents };
}

async function cleanup(orderIds: string[], userIds: string[]) {
  await db.productMembership.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { sourceOdOrderId: { in: orderIds } }] } });
  await db.financialTransaction.deleteMany({ where: { externalSourceId: { in: orderIds } } });
  await db.odOrder.deleteMany({ where: { id: { in: orderIds } } });
  await db.purchaseIntent.deleteMany({ where: { notes: { in: orderIds.map((id) => `OD Order: ${id}`) } } });
  await db.pendingChild.deleteMany({ where: { parentUserId: { in: userIds } } });
  await db.parentStudent.deleteMany({ where: { OR: [{ parentId: { in: userIds } }, { student: { userId: { in: userIds } } }] } });
  await db.studentProfile.deleteMany({ where: { userId: { in: userIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
}

integration("veli bekleyen çocuk için öder: veli erişimi açılır, öğrenci hesabını admin açınca öğrenci erişimi açılır", async () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const parent = await createParent(runId);
  const child = await db.pendingChild.create({ data: { parentUserId: parent.id, fullName: "Bekleyen Çocuk", classLevel: "8", examType: "LGS", relationship: "ANNE" } });
  const fixture = await createPaidableOrder({
    runId,
    buyerUserId: parent.id,
    pendingChildId: child.id,
    ownerEmail: parent.email,
    buyerInfo: { fullName: parent.fullName, email: parent.email, studentEmail: parent.email, parentEmail: parent.email, parentFullName: parent.fullName, pendingChildId: child.id },
  });
  const userIds = [parent.id];
  try {
    await withPaytrTestEnv(async () => {
      const response = await handlePaytrCallback(signedCallback(fixture.merchantOid, fixture.totalCents));
      assert.equal(await response.text(), "OK");
    });

    const order = await db.odOrder.findUniqueOrThrow({ where: { id: fixture.order.id }, include: { onboarding: true } });
    assert.equal(order.status, "PAID");
    assert.equal(order.provisioningStatus, "MANUAL_REVIEW");
    assert.equal(order.userId, null, "öğrenci hesabı otomatik açılmamalı");
    assert.equal(order.onboarding?.state, "MANUAL_REVIEW");
    assert.deepEqual(await getAccessibleProducts(parent.id, "PARENT"), ["OD"], "ödeyen velinin OD erişimi açıldı");
    assert.equal(await db.user.count({ where: { email: parent.email, role: "STUDENT" } }), 0);

    // Admin "Öğrenci hesabı aç": hesap + profil + veli bağı, sonra provisioning.
    const student = await db.user.create({
      data: { email: `signup-child-${runId}@example.com`, fullName: "Bekleyen Çocuk", role: "STUDENT", passwordHash: "scrypt$test", studentProfile: { create: { classLevel: "8", examType: "LGS" } } },
      include: { studentProfile: true },
    });
    userIds.push(student.id);
    await db.pendingChild.update({ where: { id: child.id }, data: { status: "ACCOUNT_CREATED", studentProfileId: student.studentProfile!.id } });

    const result = await provisionOdOrder(fixture.order.id);
    assert.equal(result.status, "SUCCEEDED", result.reason);
    assert.equal(result.userId, student.id, "çözülmüş bekleyen çocuk kaydı öğrenci hesabına yönlendirir");
    assert.deepEqual(await getAccessibleProducts(student.id, "STUDENT"), ["OD"]);
    const link = await db.parentStudent.findFirst({ where: { parentId: parent.id, studentId: student.studentProfile!.id, active: true } });
    assert.ok(link, "veli öğrenciye bağlandı");
    const line = await db.commerceOrderLine.findFirstOrThrow({ where: { odOrderId: fixture.order.id } });
    assert.equal(line.fulfillmentStatus, "SUCCEEDED");
    assert.equal(line.fulfillmentOwnerUserId, student.id, "satır velide değil öğrencide teslim edildi");
  } finally {
    await cleanup([fixture.order.id], userIds);
  }
});

integration("veli bağlı çocuğu için öder: öğrenci ve veli erişimi birlikte açılır", async () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const parent = await createParent(runId);
  const student = await db.user.create({
    data: { email: `signup-linked-${runId}@example.com`, fullName: "Bağlı Çocuk", role: "STUDENT", passwordHash: "scrypt$test", studentProfile: { create: { classLevel: "8" } } },
    include: { studentProfile: true },
  });
  await db.parentStudent.create({ data: { parentId: parent.id, studentId: student.studentProfile!.id, relationship: "Anne" } });
  const fixture = await createPaidableOrder({
    runId,
    buyerUserId: parent.id,
    ownerEmail: student.email,
    buyerInfo: { fullName: parent.fullName, email: parent.email, studentEmail: student.email, studentFullName: student.fullName, parentEmail: parent.email, parentFullName: parent.fullName },
  });
  try {
    await withPaytrTestEnv(async () => {
      const response = await handlePaytrCallback(signedCallback(fixture.merchantOid, fixture.totalCents));
      assert.equal(await response.text(), "OK");
    });
    const order = await db.odOrder.findUniqueOrThrow({ where: { id: fixture.order.id } });
    assert.equal(order.provisioningStatus, "SUCCEEDED", order.provisioningError ?? undefined);
    assert.equal(order.userId, student.id);
    assert.deepEqual(await getAccessibleProducts(student.id, "STUDENT"), ["OD"]);
    assert.deepEqual(await getAccessibleProducts(parent.id, "PARENT"), ["OD"]);
  } finally {
    await cleanup([fixture.order.id], [parent.id, student.id]);
  }
});
