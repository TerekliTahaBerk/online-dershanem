import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import type { CommerceProduct, Prisma } from "@prisma/client";
import { POST as handlePaytrCallback } from "../../app/api/paytr/callback/route";
import { getAccessibleProductCodes } from "../../lib/auth/products";
import { buildMerchantOid } from "../../lib/odk/paytr-merchant-oid";
import { grantProductMembership } from "../../lib/products/membership-server";
import { createIntegrationPrismaClient, integration } from "./integration-utils";

/**
 * KPSS Görev 5 — ticarileştirme altyapısı.
 *
 * Gerçek PayTR'a istek ATILMAZ: callback route'u, test anahtarlarıyla imzalanmış
 * sahte bir PayTR bildirimiyle doğrudan çağrılır (route `cookies()`/`headers()`
 * kullanmadığı için çağrılabilir; bkz. payment-safety.integration.ts).
 *
 * Buradaki KPSS fiyatı (12.345 kuruş) ve sınav tarihi TASLAK/TEST değeridir;
 * gerçek fiyat/paket kararı ürün sahibinin onayını bekliyor.
 */

const db = createIntegrationPrismaClient();
const PAYTR_TEST_ENV = {
  PAYTR_MERCHANT_ID: "integration-merchant",
  PAYTR_MERCHANT_KEY: "integration-only-merchant-key",
  PAYTR_MERCHANT_SALT: "integration-only-merchant-salt",
} as const;
const KPSS_TEST_PRICE_CENTS = 12_345;
const KPSS_TEST_ACCESS_ENDS_AT = "2099-07-12T21:00:00.000Z";

type LineInput = { product: CommerceProduct; sku: string; name: string; unitPriceCents: number; snapshot: Prisma.InputJsonValue; productRefId?: string };

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
  const body = new URLSearchParams({
    merchant_oid: merchantOid,
    status,
    total_amount: totalAmount,
    payment_amount: totalAmount,
    currency: "TL",
    payment_type: "card",
    test_mode: "1",
    hash,
  });
  return new Request("http://localhost/api/paytr/callback", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
}

async function createPendingOrder(label: string, lines: LineInput[]) {
  const runId = crypto.randomUUID().slice(0, 8);
  const email = `kpss-commerce-${label}-${runId}@example.com`;
  const totalCents = lines.reduce((sum, line) => sum + line.unitPriceCents, 0);
  const owner = { fullName: `KPSS Commerce ${label}`, email, phone: "05550000000" };
  const order = await db.odOrder.create({
    data: {
      packageName: `KPSS commerce ${label}`,
      category: "TEST",
      subject: "TEST",
      subtotalCents: totalCents,
      totalCents,
      buyerInfo: { ...owner, city: "İstanbul", district: "Kadıköy", classLevel: "Mezun" },
      onboarding: { create: {} },
      lines: {
        create: lines.map((line, position) => ({
          position,
          product: line.product,
          productRefId: line.productRefId ?? null,
          sku: line.sku,
          productName: line.name,
          productSnapshot: line.snapshot,
          quantity: 1,
          unitPriceCents: line.unitPriceCents,
          subtotalCents: line.unitPriceCents,
          totalCents: line.unitPriceCents,
          fulfillmentOwnerKey: email,
          fulfillmentOwnerSnapshot: owner,
        })),
      },
    },
  });
  const merchantOid = buildMerchantOid(order.id, "OD");
  await db.odPayment.create({ data: { orderId: order.id, provider: "PAYTR", providerRef: merchantOid, amountCents: totalCents } });
  return { order, email, merchantOid, totalCents };
}

async function cleanup(orderIds: string[], emails: string[]) {
  const users = await db.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
  const userIds = users.map((user) => user.id);
  await db.productMembership.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { sourceOdOrderId: { in: orderIds } }] } });
  await db.financialTransaction.deleteMany({ where: { externalSourceId: { in: orderIds } } });
  await db.odOrder.deleteMany({ where: { id: { in: orderIds } } });
  await db.purchaseIntent.deleteMany({ where: { notes: { in: orderIds.map((id) => `OD Order: ${id}`) } } });
  await db.studentProfile.deleteMany({ where: { userId: { in: userIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
}

async function activeKpssRegistry() {
  // kpss-rbac.integration.ts ile aynı: yalnız AKTİF yazar, asla pasife çekmez
  // (dosyalar paralel koşar; pasif senaryo aşağıda geri alınan transaction'da).
  return db.product.upsert({
    where: { code: "KPSS" },
    update: { isActive: true },
    create: { code: "KPSS", name: "KPSS", targetAudience: "adult" },
  });
}

integration("mock PayTR callback KPSS siparişini OdOrder'a işler, pencereli KPSS üyeliği açar, OD açmaz", async () => {
  const kpss = await activeKpssRegistry();
  const fixture = await createPendingOrder("kpss", [
    { product: "KPSS", productRefId: kpss.id, sku: "kpss-test-draft", name: "KPSS taslak paket (TEST)", unitPriceCents: KPSS_TEST_PRICE_CENTS, snapshot: { id: "kpss-test-draft", accessEndsAt: KPSS_TEST_ACCESS_ENDS_AT, examFamilyCode: "KPSS_EGITIM_BILIMLERI" } },
  ]);
  try {
    await withPaytrTestEnv(async () => {
      const response = await handlePaytrCallback(signedCallback(fixture.merchantOid, fixture.totalCents));
      assert.equal(response.status, 200);
      assert.equal(await response.text(), "OK");

      const order = await db.odOrder.findUniqueOrThrow({
        where: { id: fixture.order.id },
        include: { payments: true, lines: true, onboarding: true },
      });
      assert.equal(order.status, "PAID");
      assert.equal(order.provisioningStatus, "SUCCEEDED", order.provisioningError ?? undefined);
      assert.equal(order.payments[0]?.status, "SUCCEEDED");
      // Doğru tablo: COMMERCE_ORDER_TABLE.KPSS === "od".
      assert.equal(order.lines[0]?.odOrderId, fixture.order.id);
      assert.equal(order.lines[0]?.odkOrderId, null);
      assert.equal(order.lines[0]?.fulfillmentStatus, "SUCCEEDED", order.lines[0]?.fulfillmentError ?? undefined);
      assert.ok(order.userId);
      assert.equal(order.lines[0]?.fulfillmentOwnerUserId, order.userId);

      const memberships = await db.productMembership.findMany({ where: { userId: order.userId }, include: { productRef: true } });
      assert.equal(memberships.length, 1, "yalnız KPSS üyeliği açılmalı; KPSS-only sipariş OD açmaz");
      const [membership] = memberships;
      assert.equal(membership.product, "KPSS", "enum alanı dolu");
      assert.equal(membership.productRefId, kpss.id, "registry FK aynı kaydı gösteriyor");
      assert.equal(membership.productRef?.code, "KPSS");
      assert.equal(membership.source, "PURCHASE");
      assert.equal(membership.sourceOdOrderId, fixture.order.id);
      assert.equal(membership.expiresAt?.toISOString(), KPSS_TEST_ACCESS_ENDS_AT, "sınav tarihine kadar pencere");
      assert.equal(await db.odkEntitlement.count({ where: { userId: order.userId } }), 0, "ODK sözleşmesine düşmedi");
      assert.deepEqual(await getAccessibleProductCodes(order.userId, "STUDENT"), ["KPSS"]);

      // PayTR en az bir kez teslim eder: ikinci bildirim yan etki üretmez.
      const duplicate = await handlePaytrCallback(signedCallback(fixture.merchantOid, fixture.totalCents));
      assert.equal(await duplicate.text(), "OK");
      const afterDuplicate = await db.productMembership.findMany({ where: { userId: order.userId } });
      assert.equal(afterDuplicate.length, 1);
      assert.equal(afterDuplicate[0]?.updatedAt.getTime(), membership.updatedAt.getTime());
    });
  } finally {
    await cleanup([fixture.order.id], [fixture.email]);
  }
});

integration("KPSS registry'de pasifken üyelik açılamaz (satış kilidi) — değişiklik geri alınır", async () => {
  const kpss = await activeKpssRegistry();
  const user = await db.user.create({
    data: { email: `kpss-commerce-lock-${crypto.randomUUID().slice(0, 8)}@example.com`, fullName: "KPSS lock", passwordHash: "x", role: "STUDENT", status: "ACTIVE" },
  });
  const rollback = new Error("ROLLBACK_KPSS_LOCK_TEST");
  try {
    await assert.rejects(
      db.$transaction(async (tx) => {
        await tx.product.update({ where: { id: kpss.id }, data: { isActive: false } });
        await assert.rejects(
          grantProductMembership({ userId: user.id, productCode: "KPSS", source: "PURCHASE", expiresAt: new Date(KPSS_TEST_ACCESS_ENDS_AT) }, tx),
          /PRODUCT_INACTIVE:KPSS/,
        );
        assert.equal(await tx.productMembership.count({ where: { userId: user.id } }), 0);
        throw rollback;
      }),
      (error) => error === rollback,
    );
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: kpss.id } })).isActive, true, "pasifleştirme geri alındı");
  } finally {
    await db.user.delete({ where: { id: user.id } });
  }
});

integration("regresyon: OD-only ve OK-only siparişlerde callback eski yetkileri aynen açar", async () => {
  const od = await createPendingOrder("od", [
    { product: "OD", sku: "LGS:Matematik Ders Paketi", name: "LGS Matematik Ders Paketi", unitPriceCents: 300_000, snapshot: { id: "LGS:Matematik Ders Paketi" } },
  ]);
  const ok = await createPendingOrder("ok", [
    { product: "OK", sku: "kocum-aylik", name: "Online Koçum", unitPriceCents: 250_000, snapshot: { id: "kocum-aylik" } },
  ]);
  try {
    await withPaytrTestEnv(async () => {
      for (const fixture of [od, ok]) {
        const response = await handlePaytrCallback(signedCallback(fixture.merchantOid, fixture.totalCents));
        assert.equal(await response.text(), "OK");
      }

      const odOrder = await db.odOrder.findUniqueOrThrow({ where: { id: od.order.id }, include: { lines: true } });
      assert.equal(odOrder.provisioningStatus, "SUCCEEDED", odOrder.provisioningError ?? undefined);
      assert.equal(odOrder.lines[0]?.fulfillmentStatus, "SUCCEEDED");
      const odMemberships = await db.productMembership.findMany({ where: { userId: odOrder.userId! }, include: { productRef: true } });
      assert.deepEqual(odMemberships.map((row) => [row.product, row.productRef?.code, row.expiresAt]), [["OD", "OD", null]]);

      const okOrder = await db.odOrder.findUniqueOrThrow({ where: { id: ok.order.id }, include: { lines: true } });
      assert.equal(okOrder.provisioningStatus, "SUCCEEDED", okOrder.provisioningError ?? undefined);
      assert.equal(okOrder.lines[0]?.fulfillmentStatus, "SUCCEEDED", okOrder.lines[0]?.fulfillmentError ?? undefined);
      const okMemberships = await db.productMembership.findMany({ where: { userId: okOrder.userId! }, orderBy: { product: "asc" }, include: { productRef: true } });
      // Tarihsel davranış korunur: OD siparişi alıcıya OD de açar (ORDER_GRANTS_BUYER_OD_MEMBERSHIP.OK === true).
      assert.deepEqual(okMemberships.map((row) => [row.product, row.productRef?.code]), [["OD", "OD"], ["OK", "OK"]]);
    });
  } finally {
    await cleanup([od.order.id, ok.order.id], [od.email, ok.email]);
  }
});
