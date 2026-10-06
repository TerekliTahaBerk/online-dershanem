import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { after } from "node:test";

import type { CommerceProduct, Prisma } from "@prisma/client";
import { POST as handlePaytrCallback } from "@/app/api/paytr/callback/route";
import { prisma as db } from "@/lib/prisma";
import { getUnifiedActivityTimeline } from "@/lib/student-success/server/progress-server";
import { resolveStudentScopeForViewer } from "@/lib/student-success/server/viewer-scope";
import { listParentVisibleChildren } from "@/lib/panel/parent-product-policy";
import { listOdkReportStudents } from "@/lib/odk/reporting-server";
import { assertAssignedCoach } from "@/lib/kocum/access-server";
import { rebalanceApprovedPlanForRecovery } from "@/lib/recovery-package-server";
import { applyAdminProductAccessChange } from "@/lib/products/admin-product-access-server";
import { runOdMembershipAudit } from "@/lib/commerce/od-membership-audit-server";
import { buildMerchantOid } from "@/lib/odk/paytr-merchant-oid";
import { defaultOdkPackagePolicy } from "@/lib/odk/product-contract";
import { integration } from "./integration-utils";

/**
 * PHASE 0 — panel güvenlik ve veri bütünlüğü değişmezleri (P0-1 … P0-5).
 *
 * Gerçek Postgres üzerinde koşar; sahte DB yok. Her test kendi kullanıcı /
 * öğrenci / sipariş fikstürünü açar ve kapatır.
 */

const PASSWORD_HASH = "scrypt$1$8$1$YmFzZTY0$c2hhMDA=";
const created = { userIds: [] as string[], orderIds: [] as string[], packageIds: [] as string[] };

after(async () => {
  await db.odkEntitlement.deleteMany({ where: { OR: [{ userId: { in: created.userIds } }, { packageId: { in: created.packageIds } }] } });
  await db.productMembership.deleteMany({ where: { OR: [{ userId: { in: created.userIds } }, { sourceOdOrderId: { in: created.orderIds } }] } });
  await db.financialTransaction.deleteMany({ where: { externalSourceId: { in: created.orderIds } } });
  await db.purchaseIntent.deleteMany({ where: { notes: { in: created.orderIds.map((id) => `OD Order: ${id}`) } } });
  await db.odOrder.deleteMany({ where: { id: { in: created.orderIds } } });
  await db.odkPackage.deleteMany({ where: { id: { in: created.packageIds } } });
  const emails = await db.user.findMany({ where: { id: { in: created.userIds } }, select: { id: true } });
  const ids = emails.map((row) => row.id);
  await db.coachAssignment.deleteMany({ where: { OR: [{ student: { userId: { in: ids } } }, { coach: { userId: { in: ids } } }] } });
  await db.weeklyPlan.deleteMany({ where: { student: { userId: { in: ids } } } });
  await db.teacherProfile.deleteMany({ where: { userId: { in: ids } } });
  await db.enrollment.deleteMany({ where: { student: { userId: { in: ids } } } });
  await db.group.deleteMany({ where: { teacherId: { in: ids } } });
  await db.studentProfile.deleteMany({ where: { userId: { in: ids } } });
  await db.auditLog.deleteMany({ where: { OR: [{ actorUserId: { in: ids } }, { entityId: { in: ids } }] } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
});

async function user(role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT", label: string) {
  const row = await db.user.create({
    data: {
      email: `phase0-${label}-${randomUUID().slice(0, 8)}@example.com`,
      passwordHash: PASSWORD_HASH,
      mustChangePassword: false,
      inviteAcceptedAt: new Date(),
      role,
      status: "ACTIVE",
      fullName: `Phase0 ${label}`,
    },
  });
  created.userIds.push(row.id);
  return row;
}

async function studentWith(products: Array<"OD" | "OK" | "ODK">, label = "student") {
  const studentUser = await user("STUDENT", label);
  const profile = await db.studentProfile.create({ data: { userId: studentUser.id } });
  for (const product of products) {
    await db.productMembership.create({ data: { userId: studentUser.id, product, startsAt: new Date(0) } });
  }
  return { studentUser, profile };
}

/* ------------------------------------------------------------------ *
 * P0-1 — zaman çizelgesi görünürlüğü
 * ------------------------------------------------------------------ */

integration("P0-1 zaman çizelgesi STAFF/INTERNAL olayları öğrenci ve veliye döndürmez", async () => {
  const { profile } = await studentWith(["OD"]);
  const now = Date.now();
  const events = await Promise.all(
    (["INTERNAL", "STAFF", "STUDENT", "PARENT"] as const).map((visibility, index) =>
      db.studentTimelineEvent.create({
        data: { studentId: profile.id, kind: "OTHER", title: `olay-${visibility}`, summary: visibility, visibility, occurredAt: new Date(now - index * 1000) },
      }),
    ),
  );
  const staffCross = await db.crossProductEventOutbox.create({
    data: { eventType: "INTERVENTION_CREATED", deduplicationKey: `phase0-${randomUUID()}`, studentId: profile.id, entityType: "InterventionCase", entityId: "x", payload: {}, status: "PROCESSED", occurredAt: new Date(now) },
  });
  const familyCross = await db.crossProductEventOutbox.create({
    data: { eventType: "LESSON_COMPLETED", deduplicationKey: `phase0-${randomUUID()}`, studentId: profile.id, entityType: "Lesson", entityId: "y", payload: {}, status: "PROCESSED", occurredAt: new Date(now) },
  });
  try {
    const titles = async (role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT") =>
      new Set((await getUnifiedActivityTimeline(profile.id, role)).map((entry) => entry.id));
    const ids = Object.fromEntries(events.map((event) => [event.visibility, event.id]));

    const student = await titles("STUDENT");
    assert.ok(!student.has(ids.INTERNAL) && !student.has(ids.STAFF), "öğrenci STAFF/INTERNAL görmemeli");
    assert.ok(student.has(ids.STUDENT) && student.has(ids.PARENT), "öğrenci kendine açık olayı görür");
    assert.ok(!student.has(staffCross.id), "müdahale olayı öğrenciye dönmemeli");
    assert.ok(student.has(familyCross.id));

    const parent = await titles("PARENT");
    assert.deepEqual([...parent].filter((id) => events.some((event) => event.id === id)), [ids.PARENT], "veli yalnız PARENT görür");
    assert.ok(!parent.has(staffCross.id));

    const teacher = await titles("TEACHER");
    assert.ok(teacher.has(ids.STAFF) && teacher.has(ids.STUDENT) && teacher.has(ids.PARENT) && !teacher.has(ids.INTERNAL));
    assert.ok(teacher.has(staffCross.id));

    const admin = await titles("ADMIN");
    for (const event of events) assert.ok(admin.has(event.id), `admin ${event.visibility} görür`);
  } finally {
    await db.studentTimelineEvent.deleteMany({ where: { studentId: profile.id } });
    await db.crossProductEventOutbox.deleteMany({ where: { studentId: profile.id } });
  }
});

/* ------------------------------------------------------------------ *
 * P0-4 — canViewAcademic
 * ------------------------------------------------------------------ */

integration("P0-4 veli akademik kapsamı canViewAcademic + aktif bağlantı ister; hesap kapsamı korunur", async () => {
  const { studentUser, profile } = await studentWith(["OD", "ODK"]);
  const parent = await user("PARENT", "parent");
  const teacher = await user("TEACHER", "scope-teacher");
  const link = await db.parentStudent.create({ data: { parentId: parent.id, studentId: profile.id, canViewAcademic: true, canViewPayments: false } });

  // Case A — akademik izin var.
  assert.ok(await resolveStudentScopeForViewer(profile.id, "PARENT", parent.id));
  assert.deepEqual((await listParentVisibleChildren(parent.id)).map((child) => child.id), [profile.id]);

  // Case B — akademik izin yok: akademik kapsam dışı.
  await db.parentStudent.update({ where: { id: link.id }, data: { canViewAcademic: false } });
  assert.equal(await resolveStudentScopeForViewer(profile.id, "PARENT", parent.id), null);
  assert.deepEqual(await listParentVisibleChildren(parent.id), []);
  assert.deepEqual(await listParentVisibleChildren(parent.id, "academic"), []);

  // Case C — akademik yok, ödeme var: hesap/paket kapsamı çalışmaya devam eder.
  await db.parentStudent.update({ where: { id: link.id }, data: { canViewPayments: true } });
  assert.deepEqual((await listParentVisibleChildren(parent.id, "account")).map((child) => child.id), [profile.id]);

  // Case D — bağlantı sonlanmış: akademik izin true olsa da erişim yok.
  await db.parentStudent.update({ where: { id: link.id }, data: { canViewAcademic: true, active: false, endedAt: new Date() } });
  assert.equal(await resolveStudentScopeForViewer(profile.id, "PARENT", parent.id), null);
  assert.deepEqual(await listParentVisibleChildren(parent.id), []);
  assert.deepEqual(await listParentVisibleChildren(parent.id, "account"), [], "sonlanmış bağlantı hesap kapsamında da yok");

  // Öğretmen kapsamı etkilenmez (ilişkisiz öğretmen yine reddedilir).
  assert.equal(await resolveStudentScopeForViewer(profile.id, "TEACHER", teacher.id), null);

  // Deneme Ligi veli raporu da aynı kurala uyar (sözleşme veli raporuna izin verse bile).
  const line = await odkContractLine();
  await db.odkEntitlement.create({ data: { userId: studentUser.id, packageId: line.productId, startsAt: new Date(0), contractSnapshot: line.snapshot as Prisma.InputJsonValue } });
  await db.parentStudent.update({ where: { id: link.id }, data: { active: true, endedAt: null, canViewAcademic: true } });
  assert.ok((await listOdkReportStudents({ userId: parent.id, role: "PARENT" })).some((row) => row.userId === studentUser.id), "akademik izinli veli raporu görür");
  await db.parentStudent.update({ where: { id: link.id }, data: { canViewAcademic: false } });
  assert.ok(!(await listOdkReportStudents({ userId: parent.id, role: "PARENT" })).some((row) => row.userId === studentUser.id), "akademik izinsiz veli deneme raporu listesinde öğrenciyi görmez");
  await db.parentStudent.delete({ where: { id: link.id } });
});

/* ------------------------------------------------------------------ *
 * P0-3 — OD grup öğretmeni Yön koçu değildir
 * ------------------------------------------------------------------ */

integration("P0-3 OD grup öğretmeni Yön planını telafi ile yeniden kuramaz; atanmış koç kurabilir", async () => {
  const { profile } = await studentWith(["OD", "OK"]);
  const groupTeacher = await user("TEACHER", "group-teacher");
  const coachUser = await user("TEACHER", "coach");
  const group = await db.group.create({ data: { name: `phase0-${randomUUID().slice(0, 6)}`, subject: "Matematik", teacherId: groupTeacher.id } });
  await db.enrollment.create({ data: { groupId: group.id, studentId: profile.id } });
  const coachProfile = await db.teacherProfile.create({ data: { userId: coachUser.id, isCoach: true } });
  await db.studentPlanPreference.create({ data: { studentId: profile.id, availableDays: [1, 2, 3, 4, 5] } });
  const okProduct = await db.product.findUniqueOrThrow({ where: { code: "OK" }, select: { id: true } });
  const plan = await db.weeklyPlan.create({
    data: { studentId: profile.id, productRefId: okProduct.id, weekStart: new Date("2026-10-04T21:00:00.000Z"), status: "APPROVED", capacityMinutes: 300, createdById: coachUser.id, approvedById: coachUser.id, approvedAt: new Date() },
  });
  const task = await db.weeklyPlanTask.create({
    data: { planId: plan.id, scheduledFor: new Date("2026-10-06T09:00:00.000Z"), position: 0, title: "Koçun görevi", durationMinutes: 30, sourceType: "MANUAL_COACH", reasonCode: "CAPACITY_BALANCE" },
  });
  try {
    // Negatif: grup öğretmeni koç değil.
    assert.equal(await assertAssignedCoach({ role: "TEACHER", userId: groupTeacher.id, studentProfileId: profile.id }), false);
    assert.equal(await rebalanceApprovedPlanForRecovery(profile.id, groupTeacher.id), false);
    const untouched = await db.weeklyPlanTask.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(untouched.status, "PLANNED", "koçun onayladığı görev OD öğretmenince SKIPPED yapılmamalı");
    assert.equal((await db.weeklyPlan.findUniqueOrThrow({ where: { id: plan.id } })).approvedById, coachUser.id);

    // Pozitif: aktif koç.
    const assignment = await db.coachAssignment.create({ data: { studentId: profile.id, coachId: coachProfile.id } });
    assert.equal(await assertAssignedCoach({ role: "TEACHER", userId: coachUser.id, studentProfileId: profile.id }), true);
    assert.equal(await assertAssignedCoach({ role: "ADMIN", userId: groupTeacher.id, studentProfileId: profile.id }), true);
    assert.equal(await rebalanceApprovedPlanForRecovery(profile.id, coachUser.id), true);

    // Sonlanmış atama: yetki düşer.
    await db.coachAssignment.update({ where: { id: assignment.id }, data: { endedAt: new Date() } });
    assert.equal(await assertAssignedCoach({ role: "TEACHER", userId: coachUser.id, studentProfileId: profile.id }), false);
    assert.equal(await rebalanceApprovedPlanForRecovery(profile.id, coachUser.id), false);
  } finally {
    await db.studentPlanPreference.deleteMany({ where: { studentId: profile.id } });
  }
});

/* ------------------------------------------------------------------ *
 * P0-2 — yönetim ürün erişimi satın alma verisini bozmaz
 * ------------------------------------------------------------------ */

integration("P0-2 seçili kalan PURCHASE üyeliği aynen korunur; eksik ürün MANUAL açılır; çıkarılan iptal edilir", async () => {
  const admin = await user("ADMIN", "admin");
  const { studentUser } = await studentWith([]);
  const order = await db.odOrder.create({ data: { packageName: "phase0", category: "TEST", subject: "TEST", subtotalCents: 1000, totalCents: 1000, buyerInfo: {} } });
  created.orderIds.push(order.id);
  const startsAt = new Date("2026-09-01T00:00:00.000Z");
  const expiresAt = new Date("2099-06-30T00:00:00.000Z");
  const purchase = await db.productMembership.create({
    data: { userId: studentUser.id, product: "OD", source: "PURCHASE", startsAt, expiresAt, sourceOdOrderId: order.id },
  });

  // 1) Ürün seçili kalarak form kaydedilir → satın alma alanları değişmez.
  const keep = await applyAdminProductAccessChange({ userId: studentUser.id, actorUserId: admin.id, requested: ["OD"] });
  assert.equal(keep.changed, false);
  const kept = await db.productMembership.findUniqueOrThrow({ where: { id: purchase.id } });
  assert.equal(kept.source, "PURCHASE");
  assert.equal(kept.startsAt.toISOString(), startsAt.toISOString());
  assert.equal(kept.expiresAt?.toISOString(), expiresAt.toISOString());
  assert.equal(kept.sourceOdOrderId, order.id);
  assert.equal(kept.grantedById, null);
  assert.equal(kept.revokedAt, null);

  // 2) Eksik ürün eklenir → MANUAL, mevcut satın alma yine korunur, mükerrer satır yok.
  const add = await applyAdminProductAccessChange({ userId: studentUser.id, actorUserId: admin.id, requested: ["OD", "OK"] });
  assert.deepEqual(add.grant, ["OK"]);
  const rows = await db.productMembership.findMany({ where: { userId: studentUser.id }, orderBy: { product: "asc" } });
  assert.deepEqual(rows.map((row) => [row.product, row.source]), [["OD", "PURCHASE"], ["OK", "MANUAL"]]);
  assert.equal(rows.find((row) => row.product === "OK")?.grantedById, admin.id);
  assert.equal(rows.find((row) => row.product === "OD")?.expiresAt?.toISOString(), expiresAt.toISOString());

  // 3) Ürün çıkarılır → satır silinmez, yalnız revokedAt; satın alma alanları korunur.
  const remove = await applyAdminProductAccessChange({ userId: studentUser.id, actorUserId: admin.id, requested: ["OK"] });
  assert.deepEqual(remove.revoke, ["OD"]);
  const revoked = await db.productMembership.findUniqueOrThrow({ where: { id: purchase.id } });
  assert.ok(revoked.revokedAt, "OD iptal edildi");
  assert.equal(revoked.source, "PURCHASE");
  assert.equal(revoked.sourceOdOrderId, order.id);
  assert.equal(revoked.expiresAt?.toISOString(), expiresAt.toISOString());
  assert.equal(await db.productMembership.count({ where: { userId: studentUser.id } }), 2, "mükerrer satır yok");

  // 4) Tekrar açılırsa önceki satırın değerleri plan çıktısında (audit yükü) saklanır.
  const reopen = await applyAdminProductAccessChange({ userId: studentUser.id, actorUserId: admin.id, requested: ["OD", "OK"] });
  assert.deepEqual(reopen.grant, ["OD"]);
  assert.equal(reopen.replacedRows[0]?.source, "PURCHASE");
  assert.equal(reopen.replacedRows[0]?.sourceOdOrderId, order.id);
});

/* ------------------------------------------------------------------ *
 * P0-5 — OK / ODK satın alımı OD açmaz
 * ------------------------------------------------------------------ */

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
  const totalAmount = String(totalCents);
  const hash = createHmac("sha256", PAYTR_TEST_ENV.PAYTR_MERCHANT_KEY)
    .update(merchantOid + PAYTR_TEST_ENV.PAYTR_MERCHANT_SALT + "success" + totalAmount)
    .digest("base64");
  const body = new URLSearchParams({ merchant_oid: merchantOid, status: "success", total_amount: totalAmount, payment_amount: totalAmount, currency: "TL", payment_type: "card", test_mode: "1", hash });
  return new Request("http://localhost/api/paytr/callback", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: body.toString() });
}

async function odkContractLine() {
  const pkg = await db.odkPackage.create({ data: { title: "phase0 ODK", slug: `phase0-odk-${randomUUID().slice(0, 8)}`, priceCents: 1000, contractPolicy: defaultOdkPackagePolicy as unknown as Prisma.InputJsonValue } });
  created.packageIds.push(pkg.id);
  const snapshot = {
    schemaVersion: 1,
    catalogVersion: 1,
    capturedAt: new Date().toISOString(),
    package: { id: pkg.id, slug: pkg.slug, title: pkg.title, description: null, priceCents: 1000, originalPriceCents: null },
    policy: { ...defaultOdkPackagePolicy, sales: { state: "AVAILABLE" } },
    exams: [],
  };
  return { product: "ODK" as const, productId: pkg.id, sku: pkg.slug, snapshot };
}

type CartLine = { product: CommerceProduct; sku: string; snapshot: Prisma.InputJsonValue; productId?: string };

async function paidCartOrder(label: string, lines: CartLine[]) {
  const email = `phase0-cart-${label}-${randomUUID().slice(0, 8)}@example.com`;
  const owner = { fullName: `Phase0 ${label}`, email, phone: "05550000000" };
  const unit = 1000;
  const totalCents = unit * Math.max(lines.length, 1);
  const order = await db.odOrder.create({
    data: {
      packageName: `phase0 ${label}`,
      category: "TEST",
      subject: "TEST",
      subtotalCents: totalCents,
      totalCents,
      buyerInfo: { ...owner, city: "İstanbul", district: "Kadıköy", classLevel: "8. Sınıf" },
      onboarding: { create: {} },
      lines: {
        create: lines.map((line, position) => ({
          position,
          product: line.product,
          productId: line.productId ?? null,
          sku: line.sku,
          productName: line.sku,
          productSnapshot: line.snapshot,
          quantity: 1,
          unitPriceCents: unit,
          subtotalCents: unit,
          totalCents: unit,
          fulfillmentOwnerKey: email,
          fulfillmentOwnerSnapshot: owner,
        })),
      },
    },
  });
  created.orderIds.push(order.id);
  const merchantOid = buildMerchantOid(order.id, "OD");
  await db.odPayment.create({ data: { orderId: order.id, provider: "PAYTR", providerRef: merchantOid, amountCents: totalCents } });
  const response = await handlePaytrCallback(signedCallback(merchantOid, totalCents));
  assert.equal(await response.text(), "OK", label);
  const paid = await db.odOrder.findUniqueOrThrow({ where: { id: order.id }, include: { lines: true } });
  assert.equal(paid.provisioningStatus, "SUCCEEDED", `${label}: ${paid.provisioningError ?? ""}`);
  for (const line of paid.lines) assert.equal(line.fulfillmentStatus, "SUCCEEDED", `${label} ${line.product}: ${line.fulfillmentError ?? ""}`);
  created.userIds.push(paid.userId!);
  const memberships = await db.productMembership.findMany({ where: { userId: paid.userId!, revokedAt: null }, select: { product: true } });
  return { order: paid, products: memberships.map((row) => row.product).sort() };
}

integration("P0-5 OD sepetinde yalnız OD satırı OD açar; satın alınan ürünler yine açılır", async () => {
  const od = { product: "OD" as const, sku: "LGS:Matematik", snapshot: { id: "LGS:Matematik" } };
  const ok = { product: "OK" as const, sku: "kocum-aylik", snapshot: { id: "kocum-aylik" } };
  await withPaytrTestEnv(async () => {
    const cases: Array<[string, () => Promise<CartLine[]>, string[]]> = [
      ["od", async () => [od], ["OD"]],
      ["ok", async () => [ok], ["OK"]],
      ["odk", async () => [await odkContractLine()], ["ODK"]],
      ["ok-odk", async () => [ok, await odkContractLine()], ["ODK", "OK"]],
      ["od-ok", async () => [od, ok], ["OD", "OK"]],
      ["od-odk", async () => [od, await odkContractLine()], ["OD", "ODK"]],
      ["od-ok-odk", async () => [od, ok, await odkContractLine()], ["OD", "ODK", "OK"]],
      // Satırsız eski sipariş: belgelenmiş tarihsel davranış (alıcıya OD) korunur.
      ["legacy-lineless", async () => [], ["OD"]],
    ];
    for (const [label, lines, expected] of cases) {
      const result = await paidCartOrder(label, await lines());
      assert.deepEqual(result.products, expected, label);
      if (expected.includes("ODK") && label !== "legacy-lineless") {
        assert.equal(await db.odkEntitlement.count({ where: { userId: result.order.userId! } }), 1, `${label}: ODK sözleşmesi açıldı`);
      }
    }
  });
});

integration("P0-5 salt-okunur denetim raporu yalnız kanıtlı adayları işaretler ve hiçbir şeye yazmaz", async () => {
  const { studentUser } = await studentWith([]);
  const okOnly = await db.odOrder.create({
    data: {
      packageName: "phase0 audit", category: "TEST", subject: "TEST", subtotalCents: 1000, totalCents: 1000, buyerInfo: {}, status: "PAID", userId: studentUser.id,
      lines: { create: [{ position: 0, product: "OK", sku: "kocum", productName: "kocum", productSnapshot: {}, quantity: 1, unitPriceCents: 1000, subtotalCents: 1000, totalCents: 1000, fulfillmentOwnerKey: studentUser.email, fulfillmentOwnerSnapshot: {} }] },
    },
  });
  created.orderIds.push(okOnly.id);
  // Eski kuralın açtığı hatalı OD üyeliğini taklit eder.
  const wrong = await db.productMembership.create({ data: { userId: studentUser.id, product: "OD", source: "PURCHASE", sourceOdOrderId: okOnly.id } });
  const before = await db.productMembership.findUniqueOrThrow({ where: { id: wrong.id } });

  const report = await runOdMembershipAudit();
  const candidate = report.candidates.find((row) => row.membershipId === wrong.id);
  assert.ok(candidate, "OK-only siparişten açılan OD adayı raporlanır");
  assert.deepEqual(candidate.lineProducts, ["OK"]);
  assert.equal(candidate.hasOdLine, false);
  assert.ok(!candidate.email.includes(studentUser.email.split("@")[0]!.slice(2)), "e-posta varsayılan maskeli");
  assert.equal(report.readOnly, true);

  const afterRow = await db.productMembership.findUniqueOrThrow({ where: { id: wrong.id } });
  assert.deepEqual(afterRow, before, "rapor üyeliği değiştirmez");
});
