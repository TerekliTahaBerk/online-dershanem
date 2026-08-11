import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { postPaytrCallback } from "./helpers/paytr-callback";

const prisma = new PrismaClient();
const amountCents = 24_900;

async function passwordHash() {
  return (await prisma.user.findUniqueOrThrow({ where: { id: "e2e-user-student" }, select: { passwordHash: true } })).passwordHash;
}

async function fixture(label: string, buyerInfo: Record<string, string>) {
  const suffix = `${label}-${crypto.randomUUID()}`;
  const order = await prisma.odOrder.create({
    data: { packageName: `E2E OD ${label}`, category: "LGS", subject: "Matematik", subtotalCents: amountCents, totalCents: amountCents, buyerInfo },
  });
  const merchantOid = `OD${order.id.replace(/[^a-zA-Z0-9]/g, "").slice(-28)}`;
  await prisma.odPayment.create({ data: { orderId: order.id, provider: "PAYTR", providerRef: merchantOid, amountCents } });
  return { order, merchantOid };
}

test.describe("OD ödeme → onboarding provisioning bütünlüğü", () => {
  test.describe.configure({ mode: "serial" });

  test("yeni öğrenci ve veli hesabını, OD üyeliğini ve bağlantıyı tekil üretir", async ({ request }) => {
    const token = crypto.randomUUID();
    const studentEmail = `od-student-${token}@example.com`;
    const parentEmail = `od-parent-${token}@example.com`;
    const { order, merchantOid } = await fixture("new-family", {
      email: studentEmail,
      fullName: "Yeni OD Öğrencisi",
      phone: "05551000001",
      classLevel: "8",
      schoolName: "E2E Okulu",
      tcKimlik: `1${Date.now().toString().slice(-10)}`,
      parentFullName: "Yeni OD Velisi",
      parentPhone: "05551000002",
      parentEmail,
    });
    expect((await postPaytrCallback(request, { merchantOid, amountCents })).status()).toBe(200);
    expect((await postPaytrCallback(request, { merchantOid, amountCents })).status()).toBe(200);

    const stored = await prisma.odOrder.findUniqueOrThrow({ where: { id: order.id }, include: { payments: true, onboarding: true } });
    const student = await prisma.user.findUniqueOrThrow({ where: { email: studentEmail }, include: { studentProfile: { include: { parents: true } }, productMemberships: { where: { product: "OD" } } } });
    const parent = await prisma.user.findUniqueOrThrow({ where: { email: parentEmail } });
    expect(stored).toMatchObject({ status: "PAID", provisioningStatus: "SUCCEEDED", userId: student.id });
    expect(stored.onboarding).toMatchObject({ state: "PARENT_LINKED", flowType: "NEW_STUDENT" });
    expect(student.productMemberships).toHaveLength(1);
    expect(student.productMemberships[0]).toMatchObject({ source: "PURCHASE", sourceOdOrderId: order.id, revokedAt: null });
    expect(student.studentProfile?.parents).toHaveLength(1);
    expect(student.studentProfile?.parents[0].parentId).toBe(parent.id);
    expect(await prisma.parentStudent.count({ where: { parentId: parent.id, studentId: student.studentProfile!.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityType: "OdOrder", entityId: order.id, action: "od.provisioning.succeeded" } })).toBe(1);
  });

  test("mevcut öğrenciyi e-postayla yeniden kullanır ve duplicate user/membership açmaz", async ({ request }) => {
    const email = `existing-od-${crypto.randomUUID()}@example.com`;
    const existing = await prisma.user.create({ data: { email, fullName: "Mevcut Öğrenci", role: "STUDENT", passwordHash: await passwordHash(), mustChangePassword: false, studentProfile: { create: {} } } });
    const { order, merchantOid } = await fixture("existing", { email, fullName: "Mevcut Öğrenci", phone: "05552000001" });
    const responses = await Promise.all([
      postPaytrCallback(request, { merchantOid, amountCents }),
      postPaytrCallback(request, { merchantOid, amountCents }),
    ]);
    expect(responses.some((response) => response.status() === 200)).toBeTruthy();
    expect((await postPaytrCallback(request, { merchantOid, amountCents })).status()).toBe(200);
    const stored = await prisma.odOrder.findUniqueOrThrow({ where: { id: order.id }, include: { onboarding: true } });
    expect(stored).toMatchObject({ userId: existing.id, provisioningStatus: "SUCCEEDED" });
    expect(stored.onboarding?.flowType).toBe("EXISTING_STUDENT");
    expect(await prisma.user.count({ where: { email } })).toBe(1);
    expect(await prisma.productMembership.count({ where: { userId: existing.id, product: "OD" } })).toBe(1);
  });

  test("rol çakışmasını merge etmeden MANUAL_REVIEW durumuna düşürür", async ({ request }) => {
    const email = `identity-conflict-${crypto.randomUUID()}@example.com`;
    await prisma.user.create({ data: { email, fullName: "Veli Rolü", role: "PARENT", passwordHash: await passwordHash(), mustChangePassword: false } });
    const { order, merchantOid } = await fixture("manual-review", { email, fullName: "Aynı E-postalı Öğrenci", phone: "05553000001" });
    expect((await postPaytrCallback(request, { merchantOid, amountCents })).status()).toBe(200);
    const stored = await prisma.odOrder.findUniqueOrThrow({ where: { id: order.id }, include: { payments: true, onboarding: true } });
    expect(stored).toMatchObject({ status: "PAID", userId: null, provisioningStatus: "MANUAL_REVIEW" });
    expect(stored.payments[0].status).toBe("SUCCEEDED");
    expect(stored.onboarding?.state).toBe("MANUAL_REVIEW");
    expect(stored.onboarding?.blockerReason).toMatch(/başka bir hesap rolüne/);
    expect(await prisma.productMembership.count({ where: { userId: (await prisma.user.findUniqueOrThrow({ where: { email } })).id, product: "OD" } })).toBe(0);
  });

  test("provisioning hatasında ödeme kalır ve retry çoğaltmadan tamamlar", async ({ request }) => {
    const email = `od-retry-${crypto.randomUUID()}@example.com`;
    const { order, merchantOid } = await fixture("retry", { email, fullName: "Retry OD Öğrencisi", phone: "05554000001" });
    const failed = await postPaytrCallback(request, { merchantOid, amountCents }, "AFTER_MEMBERSHIP", "OD");
    expect(failed.status()).toBe(500);
    let stored = await prisma.odOrder.findUniqueOrThrow({ where: { id: order.id }, include: { payments: true } });
    expect(stored).toMatchObject({ status: "PAID", provisioningStatus: "RETRY_PENDING" });
    expect(stored.payments[0].status).toBe("SUCCEEDED");
    expect((await postPaytrCallback(request, { merchantOid, amountCents })).status()).toBe(200);
    stored = await prisma.odOrder.findUniqueOrThrow({ where: { id: order.id }, include: { payments: true } });
    expect(stored.provisioningStatus).toBe("SUCCEEDED");
    expect(stored.provisioningAttempts).toBe(2);
    expect(await prisma.user.count({ where: { email } })).toBe(1);
    expect(await prisma.productMembership.count({ where: { user: { email }, product: "OD" } })).toBe(1);
  });
});

test.afterAll(async () => prisma.$disconnect());
