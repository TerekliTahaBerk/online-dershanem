import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { postPaytrCallback } from "./helpers/paytr-callback";
import { uniqueTestClientIp } from "./helpers/client-ip";
import { defaultOdkPackagePolicy } from "../../lib/odk/product-contract";

const prisma = new PrismaClient();
const amountCents = 12_900;

async function testContract(packageId: string) {
  const pack = await prisma.odkPackage.findUniqueOrThrow({ where: { id: packageId }, include: { examLinks: { include: { exam: true } } } });
  return { schemaVersion: 1 as const, catalogVersion: pack.contractVersion, capturedAt: new Date().toISOString(), package: { id: pack.id, slug: pack.slug, title: pack.title, description: pack.description, priceCents: pack.priceCents, originalPriceCents: pack.originalPriceCents }, policy: { ...defaultOdkPackagePolicy, sales: { state: "AVAILABLE" as const } }, exams: pack.examLinks.map(({ exam }) => ({ id: exam.id, seriesId: exam.seriesId, title: exam.title, slug: exam.slug, family: exam.family, startsAt: exam.startsAt?.toISOString() ?? null, endsAt: exam.endsAt?.toISOString() ?? null, lateEntryMinutes: exam.lateEntryMinutes, attemptLimit: exam.attemptLimit, resultsReleasedAt: exam.resultsReleasedAt?.toISOString() ?? null, answerKeyReleasedAt: exam.answerKeyReleasedAt?.toISOString() ?? null, liveServiceRequired: exam.meetRequired })) };
}

async function fixture(label: string, buyerInfo: Record<string, string>) {
  const suffix = `${label}-${crypto.randomUUID()}`;
  const pack = await prisma.odkPackage.create({ data: { slug: `e2e-${suffix}`, title: `E2E ${label}`, priceCents: amountCents, contractPolicy: { ...defaultOdkPackagePolicy, sales: { state: "AVAILABLE" } } } });
  await prisma.odkPackageExam.create({ data: { packageId: pack.id, examId: "e2e-odk-exam-live" } });
  const contractSnapshot = await testContract(pack.id);
  const order = await prisma.odkOrder.create({ data: { packageId: pack.id, subtotalCents: amountCents, totalCents: amountCents, buyerInfo, contractSnapshot } });
  const merchantOid = `ODK${order.id.replace(/[^a-zA-Z0-9]/g, "").slice(-28)}`;
  await prisma.odkPayment.create({ data: { orderId: order.id, provider: "PAYTR", providerRef: merchantOid, amountCents } });
  return { order, pack, merchantOid };
}

async function chain(orderId: string, email: string) {
  const user = await prisma.user.findUnique({ where: { email }, include: { studentProfile: true, productMemberships: { where: { product: "ODK" } } } });
  const order = await prisma.odkOrder.findUniqueOrThrow({ where: { id: orderId }, include: { payments: true, entitlement: true } });
  return { user, order };
}

async function login(page: Page, email: string) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": uniqueTestClientIp() });
  const response = await page.request.post("/api/auth/login", { data: { email, password: process.env.E2E_PASSWORD ?? "testpass123" } });
  expect(response.status()).toBe(200);
}

test.describe("ODK ödeme → provisioning bütünlüğü", () => {
  test.describe.configure({ mode: "serial" });

  test("yeni müşteri ve eşzamanlı duplicate callback tek erişim zinciri üretir", async ({ request }) => {
    const email = `new-${crypto.randomUUID()}@example.com`;
    const { order, merchantOid } = await fixture("new", { email, fullName: "Yeni ODK Öğrencisi", phone: "05550000001" });
    const input = { merchantOid, amountCents };
    const responses = await Promise.all([postPaytrCallback(request, input), postPaytrCallback(request, input), postPaytrCallback(request, input)]);
    expect(responses.some((response) => response.status() === 200)).toBeTruthy();
    const retry = await postPaytrCallback(request, input);
    expect(retry.status()).toBe(200);

    const state = await chain(order.id, email);
    expect(state.order).toMatchObject({ status: "PAID", provisioningStatus: "SUCCEEDED" });
    expect(state.order.payments).toHaveLength(1);
    expect(state.order.payments[0].status).toBe("SUCCEEDED");
    expect(state.order.entitlement).not.toBeNull();
    expect(state.user?.studentProfile).not.toBeNull();
    expect(state.user?.productMemberships).toHaveLength(1);
    expect(await prisma.user.count({ where: { email } })).toBe(1);
    expect(await prisma.odkEntitlement.count({ where: { orderId: order.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityType: "OdkOrder", entityId: order.id, action: "odk.provisioning.succeeded" } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityType: "OdkOrder", entityId: order.id, action: "PAYTR_PAYMENT_SUCCESS" } })).toBe(1);
  });

  test("mevcut OD öğrencisini yeniden kullanıp yalnız ODK erişimini ekler", async ({ request }) => {
    const email = `cross-sell-${crypto.randomUUID()}@example.com`;
    const passwordHash = (await prisma.user.findUniqueOrThrow({ where: { id: "e2e-user-student" }, select: { passwordHash: true } })).passwordHash;
    const existing = await prisma.user.create({ data: { email, fullName: "Mevcut OD Öğrencisi", role: "STUDENT", passwordHash, mustChangePassword: false, inviteAcceptedAt: new Date(), studentProfile: { create: {} }, productMemberships: { create: { product: "OD", source: "MANUAL" } } } });
    const { order, merchantOid } = await fixture("cross-sell", { email, fullName: "Mevcut OD Öğrencisi" });
    expect((await postPaytrCallback(request, { merchantOid, amountCents })).status()).toBe(200);
    const state = await chain(order.id, email);
    expect(state.user?.id).toBe(existing.id);
    expect(await prisma.productMembership.count({ where: { userId: existing.id } })).toBe(2);
    expect(await prisma.studentProfile.count({ where: { userId: existing.id } })).toBe(1);
    expect(state.order.studentUserId).toBe(existing.id);
  });

  test("partial failure PAID durumunu korur; retry eksik parçayı çoğaltmadan tamamlar", async ({ request }) => {
    const email = `retry-${crypto.randomUUID()}@example.com`;
    const { order, merchantOid } = await fixture("retry", { email, fullName: "Retry Öğrencisi" });
    const failed = await postPaytrCallback(request, { merchantOid, amountCents }, "AFTER_MEMBERSHIP");
    expect(failed.status()).toBe(500);
    let state = await chain(order.id, email);
    expect(state.order).toMatchObject({ status: "PAID", provisioningStatus: "RETRY_PENDING" });
    expect(state.order.payments[0].status).toBe("SUCCEEDED");
    expect(state.user?.studentProfile).not.toBeNull();
    expect(state.user?.productMemberships).toHaveLength(1);
    expect(state.order.entitlement).toBeNull();

    expect((await postPaytrCallback(request, { merchantOid, amountCents })).status()).toBe(200);
    state = await chain(order.id, email);
    expect(state.order.provisioningStatus).toBe("SUCCEEDED");
    expect(state.order.provisioningAttempts).toBe(2);
    expect(await prisma.productMembership.count({ where: { userId: state.user!.id, product: "ODK" } })).toBe(1);
    expect(await prisma.odkEntitlement.count({ where: { orderId: order.id } })).toBe(1);
  });

  test("failed payment ile tutar/para birimi ihlali erişim açmaz", async ({ request }) => {
    const failedEmail = `declined-${crypto.randomUUID()}@example.com`;
    const failedFixture = await fixture("declined", { email: failedEmail });
    expect((await postPaytrCallback(request, { merchantOid: failedFixture.merchantOid, amountCents, status: "failed" })).status()).toBe(200);
    expect((await chain(failedFixture.order.id, failedEmail)).order.payments[0].status).toBe("FAILED");
    expect(await prisma.user.count({ where: { email: failedEmail } })).toBe(0);

    const invalidEmail = `invalid-${crypto.randomUUID()}@example.com`;
    const invalidFixture = await fixture("invalid", { email: invalidEmail });
    expect((await postPaytrCallback(request, { merchantOid: invalidFixture.merchantOid, amountCents, paymentAmountCents: amountCents + 1, currency: "USD" })).status()).toBe(400);
    const invalidOrder = await prisma.odkOrder.findUniqueOrThrow({ where: { id: invalidFixture.order.id }, include: { payments: true, entitlement: true } });
    expect(invalidOrder).toMatchObject({ status: "PENDING", provisioningStatus: "PENDING", entitlement: null });
    expect(invalidOrder.payments[0].status).toBe("PENDING");
    expect(await prisma.user.count({ where: { email: invalidEmail } })).toBe(0);
  });

  test("membership ve entitlement revoke/expire edilince sınav başlangıcı kapanır", async ({ page }) => {
    const email = `access-${crypto.randomUUID()}@example.com`;
    const passwordHash = (await prisma.user.findUniqueOrThrow({ where: { id: "e2e-user-student" }, select: { passwordHash: true } })).passwordHash;
    const user = await prisma.user.create({ data: { email, fullName: "Erişim Öğrencisi", role: "STUDENT", passwordHash, mustChangePassword: false, inviteAcceptedAt: new Date(), studentProfile: { create: {} }, productMemberships: { create: { product: "ODK", source: "PURCHASE" } } } });
    const pack = await prisma.odkPackage.findUniqueOrThrow({ where: { id: "e2e-odk-package-live" } });
    const contractSnapshot = await testContract(pack.id);
    const order = await prisma.odkOrder.create({ data: { packageId: pack.id, status: "PAID", subtotalCents: pack.priceCents, totalCents: pack.priceCents, studentUserId: user.id, provisioningStatus: "SUCCEEDED", provisionedAt: new Date(), buyerInfo: { email }, contractSnapshot } });
    const entitlement = await prisma.odkEntitlement.create({ data: { orderId: order.id, userId: user.id, packageId: pack.id, contractSnapshot } });
    const membership = await prisma.productMembership.findUniqueOrThrow({ where: { userId_product: { userId: user.id, product: "ODK" } } });
    await login(page, email);

    await prisma.productMembership.update({ where: { id: membership.id }, data: { revokedAt: new Date() } });
    let response = await page.request.post("/api/odk/student/exams/e2e-odk-exam-live/start", { data: { meetAcknowledged: false } });
    expect(response.status()).toBe(404);
    await prisma.productMembership.update({ where: { id: membership.id }, data: { revokedAt: null, expiresAt: new Date(Date.now() - 1000) } });
    response = await page.request.post("/api/odk/student/exams/e2e-odk-exam-live/start", { data: { meetAcknowledged: false } });
    expect(response.status()).toBe(404);
    await prisma.productMembership.update({ where: { id: membership.id }, data: { expiresAt: null } });

    await prisma.odkEntitlement.update({ where: { id: entitlement.id }, data: { revokedAt: new Date() } });
    response = await page.request.post("/api/odk/student/exams/e2e-odk-exam-live/start", { data: { meetAcknowledged: false } });
    expect(response.status()).toBe(403);
    await prisma.odkEntitlement.update({ where: { id: entitlement.id }, data: { revokedAt: null, expiresAt: new Date(Date.now() - 1000) } });
    response = await page.request.post("/api/odk/student/exams/e2e-odk-exam-live/start", { data: { meetAcknowledged: false } });
    expect(response.status()).toBe(403);
  });
});

test.afterAll(async () => prisma.$disconnect());
