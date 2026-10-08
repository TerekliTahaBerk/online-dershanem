import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before } from "node:test";

import { prisma as db } from "@/lib/prisma";
import { createSession, loadSessionForToken, resolveSessionFromCredentials, revokeSession, type SessionUser } from "@/lib/auth/session";
import { buildMobileBootstrap } from "@/lib/mobile/bootstrap-server";
import { parseMobileBootstrap, type MobileBootstrap } from "@/lib/mobile-contracts/bootstrap";
import { integration } from "./integration-utils";

/**
 * M1 — mobil kimlik doğrulama ve bootstrap güvenlik değişmezleri.
 * Gerçek Postgres; sahte DB yok. Route katmanı (HTTP başlıkları) ayrıca
 * `tests/e2e/mobile-api.spec.ts` ile gerçek sunucuya karşı doğrulanır.
 */

const PASSWORD_HASH = "scrypt$1$8$1$YmFzZTY0$c2hhMDA=";
const createdUserIds: string[] = [];
const ENV_KEYS = ["ODK_ROLLOUT_MODE", "ODK_PILOT_KILL_SWITCH", "ODK_PILOT_ACCEPTANCE_APPROVED", "ODK_PILOT_SECURITY_REVIEW_APPROVED", "ODK_PILOT_OPERATIONS_APPROVED", "PANEL_ROLLOUT_MODE", "PANEL_PILOT_KILL_SWITCH", "STAFF_PRODUCT_ASSIGNMENTS"] as const;
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

before(() => {
  // Deneme Ligi genel yayında (CI üretim derlemesindeki ayarla aynı).
  process.env.ODK_ROLLOUT_MODE = "general";
  process.env.ODK_PILOT_KILL_SWITCH = "false";
  process.env.ODK_PILOT_ACCEPTANCE_APPROVED = "true";
  process.env.ODK_PILOT_SECURITY_REVIEW_APPROVED = "true";
  process.env.ODK_PILOT_OPERATIONS_APPROVED = "true";
  delete process.env.PANEL_ROLLOUT_MODE;
  delete process.env.PANEL_PILOT_KILL_SWITCH;
  delete process.env.STAFF_PRODUCT_ASSIGNMENTS;
});

after(async () => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  const ids = createdUserIds;
  await db.productStaffAssignment.deleteMany({ where: { userId: { in: ids } } });
  await db.parentStudent.deleteMany({ where: { OR: [{ parentId: { in: ids } }, { student: { userId: { in: ids } } }] } });
  await db.productMembership.deleteMany({ where: { userId: { in: ids } } });
  await db.notification.deleteMany({ where: { userId: { in: ids } } });
  await db.studentProfile.deleteMany({ where: { userId: { in: ids } } });
  await db.session.deleteMany({ where: { userId: { in: ids } } });
  await db.auditLog.deleteMany({ where: { OR: [{ actorUserId: { in: ids } }, { entityId: { in: ids } }] } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
});

type Role = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

async function user(role: Role, label: string, extra: { mustChangePassword?: boolean } = {}) {
  const row = await db.user.create({
    data: {
      email: `m1-${label}-${randomUUID().slice(0, 8)}@example.com`,
      passwordHash: PASSWORD_HASH,
      mustChangePassword: extra.mustChangePassword ?? false,
      inviteAcceptedAt: new Date(),
      role,
      status: "ACTIVE",
      fullName: `M1 ${label}`,
    },
  });
  createdUserIds.push(row.id);
  return row;
}

async function student(products: Array<"OD" | "OK" | "ODK">, label: string) {
  const row = await user("STUDENT", label);
  const profile = await db.studentProfile.create({ data: { userId: row.id } });
  for (const product of products) await db.productMembership.create({ data: { userId: row.id, product, startsAt: new Date(0) } });
  return { user: row, profile };
}

/** `setCookie: false` — istek kapsamı dışında `cookies()` ÇAĞRILMAZ; çağrılsaydı burada patlardı. */
async function mobileToken(userId: string, role: Role) {
  return (await createSession(userId, role, { setCookie: false, userAgent: "OnlineDershanemMobile/1.0.0 (ios)" })).token;
}

async function sessionFor(token: string): Promise<SessionUser> {
  const session = await loadSessionForToken(token);
  assert.ok(session, "oturum yüklenmeliydi");
  return session;
}

async function bootstrap(token: string, resolveAdminOverlay?: () => Promise<boolean>): Promise<MobileBootstrap> {
  const body = await buildMobileBootstrap(await sessionFor(token), { minSupportedVersion: null, resolveAdminOverlay });
  const parsed = parseMobileBootstrap(JSON.parse(JSON.stringify(body)));
  assert.ok(parsed.ok, parsed.ok ? "" : parsed.error);
  return parsed.value;
}

const states = (body: MobileBootstrap) => Object.fromEntries((body.workspace?.products ?? []).map((product) => [product.code, product.state]));

/* ------------------------------------------------------------------ *
 * Kimlik bilgisi çözümü (çerez / Bearer)
 * ------------------------------------------------------------------ */

integration("M1 auth: yalnız çerez (web) ve yalnız Bearer (mobil) doğru kullanıcıyı çözer", async () => {
  const web = await user("STUDENT", "cookie");
  const mobile = await user("STUDENT", "bearer");
  const webToken = await mobileToken(web.id, "STUDENT");
  const mobileTok = await mobileToken(mobile.id, "STUDENT");
  assert.equal((await resolveSessionFromCredentials({ cookieToken: webToken, authorization: null }))?.userId, web.id);
  assert.equal((await resolveSessionFromCredentials({ cookieToken: null, authorization: `Bearer ${mobileTok}` }))?.userId, mobile.id);
  assert.equal((await resolveSessionFromCredentials({ cookieToken: mobileTok, authorization: `Bearer ${mobileTok}` }))?.userId, mobile.id);
});

integration("M1 auth: çerez ve Bearer FARKLI kullanıcılara aitse hiçbiri doğrulanmaz (fail-closed)", async () => {
  const a = await user("STUDENT", "user-a");
  const b = await user("PARENT", "user-b");
  const tokenA = await mobileToken(a.id, "STUDENT");
  const tokenB = await mobileToken(b.id, "PARENT");
  assert.equal(await resolveSessionFromCredentials({ cookieToken: tokenA, authorization: `Bearer ${tokenB}` }), null);
  assert.equal(await resolveSessionFromCredentials({ cookieToken: tokenB, authorization: `Bearer ${tokenA}` }), null);
});

integration("M1 auth: geçersiz Bearer + geçerli çerez → geçerli çereze geri düşülmez", async () => {
  const web = await user("STUDENT", "fallback");
  const webToken = await mobileToken(web.id, "STUDENT");
  assert.equal(await resolveSessionFromCredentials({ cookieToken: webToken, authorization: "Bearer not-a-real-token" }), null);
  assert.equal(await resolveSessionFromCredentials({ cookieToken: webToken, authorization: "Bearer " }), null);
});

integration("M1 auth: iptal edilmiş token (çıkış) ve askıya alınmış kullanıcı reddedilir", async () => {
  const row = await user("STUDENT", "revoked");
  const token = await mobileToken(row.id, "STUDENT");
  const session = await sessionFor(token);
  await revokeSession(session.sessionId);
  assert.equal(await resolveSessionFromCredentials({ cookieToken: null, authorization: `Bearer ${token}` }), null);

  const suspended = await user("STUDENT", "suspended");
  const suspendedToken = await mobileToken(suspended.id, "STUDENT");
  await db.user.update({ where: { id: suspended.id }, data: { status: "SUSPENDED" } });
  assert.equal(await resolveSessionFromCredentials({ cookieToken: null, authorization: `Bearer ${suspendedToken}` }), null);
});

integration("M1 auth: hesap değiştirme — eski oturum iptal edilince yeni kullanıcının token'ı yalnız kendi kimliğini çözer", async () => {
  const first = await user("STUDENT", "switch-first");
  const second = await user("PARENT", "switch-second");
  const firstToken = await mobileToken(first.id, "STUDENT");
  await revokeSession((await sessionFor(firstToken)).sessionId);
  const secondToken = await mobileToken(second.id, "PARENT");
  assert.equal((await resolveSessionFromCredentials({ cookieToken: null, authorization: `Bearer ${secondToken}` }))?.userId, second.id);
  assert.equal(await resolveSessionFromCredentials({ cookieToken: null, authorization: `Bearer ${firstToken}` }), null);
});

integration("M1 auth: süresi dolmuş (boşta) oturum reddedilir ve iptal edilir", async () => {
  const row = await user("STUDENT", "idle");
  const token = await mobileToken(row.id, "STUDENT");
  const session = await sessionFor(token);
  await db.session.update({ where: { id: session.sessionId }, data: { lastSeenAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) } });
  assert.equal(await loadSessionForToken(token), null);
  assert.ok((await db.session.findUniqueOrThrow({ where: { id: session.sessionId } })).revokedAt);
});

/* ------------------------------------------------------------------ *
 * Bootstrap kapıları — kapı açık değilken veri yok
 * ------------------------------------------------------------------ */

integration("M1 bootstrap: geçici parolalı kullanıcı yalnız kimlik + PASSWORD_CHANGE_REQUIRED alır", async () => {
  const row = await user("STUDENT", "temp-pass", { mustChangePassword: true });
  await db.studentProfile.create({ data: { userId: row.id } });
  await db.productMembership.create({ data: { userId: row.id, product: "OD", startsAt: new Date(0) } });
  await db.notification.create({ data: { userId: row.id, type: "SYSTEM", title: "gizli-bildirim", body: "x" } });
  const body = await bootstrap(await mobileToken(row.id, "STUDENT"));
  assert.equal(body.gates.status, "PASSWORD_CHANGE_REQUIRED");
  assert.equal(body.workspace, null);
  assert.ok(!JSON.stringify(body).includes("gizli-bildirim"));
});

integration("M1 bootstrap: MFA zorunlu personel doğrulamadan önce yalnız kapı + yöntem bilgisi alır", async () => {
  process.env.STAFF_PRODUCT_ASSIGNMENTS = "enforce";
  try {
    const teacher = await user("TEACHER", "privileged");
    const odk = (await db.product.findUniqueOrThrow({ where: { code: "ODK" }, select: { id: true } })).id;
    await db.productStaffAssignment.create({ data: { userId: teacher.id, productId: odk, role: "EXAM_EDITOR" } });
    const token = await mobileToken(teacher.id, "TEACHER");
    const body = await bootstrap(token);
    assert.equal(body.gates.status, "MFA_REQUIRED");
    assert.deepEqual(body.gates.mfa, { enrolled: false, totp: false, recoveryCodes: false, passkey: false });
    assert.equal(body.workspace, null, "personel yeteneği / operasyon menüsü sızmamalı");

    // Sunucu MFA'yı doğruladıktan sonra (istemci kendi kendine işaretleyemez) kapı açılır.
    const session = await sessionFor(token);
    await db.session.update({ where: { id: session.sessionId }, data: { mfaVerifiedAt: new Date() } });
    const ready = await bootstrap(token);
    assert.equal(ready.gates.status, "READY");
    assert.ok(ready.workspace?.capabilities.staffPermissions.includes("odk:exam:edit"));
    assert.equal(states(ready).ODK, "ACTIVE");
  } finally {
    delete process.env.STAFF_PRODUCT_ASSIGNMENTS;
  }
});

/* ------------------------------------------------------------------ *
 * Ürün kombinasyonları ve çalışma alanı
 * ------------------------------------------------------------------ */

integration("M1 bootstrap: yalnız-OD, yalnız-Yön, yalnız-Deneme Ligi ve üç ürünlü öğrenci", async () => {
  const cases = [
    { products: ["OD"] as const, expected: { OD: "ACTIVE", OK: "LOCKED", ODK: "LOCKED" } },
    { products: ["OK"] as const, expected: { OD: "LOCKED", OK: "ACTIVE", ODK: "LOCKED" } },
    { products: ["ODK"] as const, expected: { OD: "LOCKED", OK: "LOCKED", ODK: "ACTIVE" } },
    { products: ["OD", "OK", "ODK"] as const, expected: { OD: "ACTIVE", OK: "ACTIVE", ODK: "ACTIVE" } },
    { products: [] as const, expected: { OD: "LOCKED", OK: "LOCKED", ODK: "LOCKED" } },
  ];
  for (const testCase of cases) {
    const { user: row } = await student([...testCase.products], `combo-${testCase.products.join("") || "none"}`);
    const token = await mobileToken(row.id, "STUDENT");
    const body = await bootstrap(token);
    assert.equal(body.gates.status, "READY");
    assert.deepEqual(states(body), testCase.expected, testCase.products.join("+"));
    assert.equal(body.workspace?.selectionRequired, testCase.products.length > 1);
    assert.equal(body.workspace?.activeProduct, null, "seçim yapılmadan etkin çalışma alanı yok");
    assert.deepEqual(body.workspace?.navigation.primary, []);
    assert.deepEqual(body.workspace?.capabilities.staffPermissions, [], "öğrenci personel yeteneği taşımaz");
  }
});

integration("M1 bootstrap: Yön seçili öğrencinin menüsünde OD öğesi yok; Deneme Ligi seçiliyken yalnız Deneme Ligi", async () => {
  const { user: row } = await student(["OD", "OK", "ODK"], "scoped");
  const token = await mobileToken(row.id, "STUDENT");
  const session = await sessionFor(token);

  await db.session.update({ where: { id: session.sessionId }, data: { activeProduct: "OK" } });
  const yon = await bootstrap(token);
  assert.equal(yon.workspace?.activeProduct, "OK");
  const yonIds = yon.workspace?.navigation.sections.flatMap((section) => section.items.map((item) => item.id)) ?? [];
  assert.ok(yonIds.includes("goals"));
  for (const odOnly of ["lessons", "materials"]) assert.ok(!yonIds.includes(odOnly), `${odOnly} Yön menüsünde olmamalı`);
  assert.equal(yon.workspace?.navigation.primary[0]?.webPath, "/panel/ogrenci/yon");

  await db.session.update({ where: { id: session.sessionId }, data: { activeProduct: "ODK" } });
  const dl = await bootstrap(token);
  const dlIds = dl.workspace?.navigation.sections.flatMap((section) => section.items.map((item) => item.id)) ?? [];
  assert.ok(dlIds.includes("odk-exams"));
  for (const other of ["lessons", "goals", "coaching"]) assert.ok(!dlIds.includes(other), `${other} Deneme Ligi menüsünde olmamalı`);
});

integration("M1 bootstrap: erişimi biten ürün oturumda seçili kalsa bile etkin çalışma alanı olmaz", async () => {
  const { user: row } = await student(["OD"], "stale-scope");
  const token = await mobileToken(row.id, "STUDENT");
  await db.session.update({ where: { id: (await sessionFor(token)).sessionId }, data: { activeProduct: "OK" } });
  const body = await bootstrap(token);
  assert.equal(body.workspace?.activeProduct, null);
  assert.deepEqual(body.workspace?.navigation.sections, []);
});

integration("M1 bootstrap: pilot dışındaki öğrencinin ürünü PILOT_CLOSED, seçilebilir değil", async () => {
  process.env.PANEL_ROLLOUT_MODE = "pilot";
  try {
    const { user: row } = await student(["OD"], "pilot-out");
    const token = await mobileToken(row.id, "STUDENT");
    await db.session.update({ where: { id: (await sessionFor(token)).sessionId }, data: { activeProduct: "OD" } });
    const body = await bootstrap(token);
    assert.equal(states(body).OD, "PILOT_CLOSED");
    assert.equal(body.workspace?.activeProduct, null);
  } finally {
    delete process.env.PANEL_ROLLOUT_MODE;
  }
});

integration("M1 bootstrap: veli yalnız bağlı ve akademik izinli çocuklarını görür (yabancı öğrenci yok)", async () => {
  const parent = await user("PARENT", "parent");
  const own = await student(["OD"], "own-child");
  const hidden = await student(["OD"], "no-academic");
  const foreign = await student(["OD"], "foreign-child");
  await db.parentStudent.create({ data: { parentId: parent.id, studentId: own.profile.id } });
  await db.parentStudent.create({ data: { parentId: parent.id, studentId: hidden.profile.id, canViewAcademic: false } });
  const body = await bootstrap(await mobileToken(parent.id, "PARENT"));
  const childIds = body.workspace?.parent?.children.map((child) => child.studentId) ?? [];
  assert.ok(childIds.includes(own.profile.id));
  assert.ok(!childIds.includes(hidden.profile.id));
  assert.ok(!childIds.includes(foreign.profile.id));
  assert.deepEqual(body.workspace?.capabilities.staffPermissions, []);
});

integration("M1 bootstrap: öğretmen ve ADMIN READY; ADMIN önizleme bayrağı gerçek aktörden gelir", async () => {
  const teacher = await user("TEACHER", "teacher");
  const teacherBody = await bootstrap(await mobileToken(teacher.id, "TEACHER"));
  assert.equal(teacherBody.gates.status, "READY");
  assert.equal(teacherBody.user.role, "TEACHER");

  const admin = await user("ADMIN", "admin");
  const adminBody = await bootstrap(await mobileToken(admin.id, "ADMIN"), async () => true);
  assert.equal(adminBody.gates.status, "READY", "ADMIN girişte MFA'dan muaftır (mevcut politika)");
  assert.equal(adminBody.gates.previewActive, true);
});

integration("M1 bootstrap: okunmamış bildirim sayısı yalnız kullanıcının kendi görünür bildirimleri", async () => {
  const { user: row } = await student(["OD"], "unread");
  const other = await user("STUDENT", "unread-other");
  await db.notification.createMany({
    data: [
      { userId: row.id, type: "SYSTEM", title: "a", body: "a" },
      { userId: row.id, type: "SYSTEM", title: "b", body: "b", readAt: new Date() },
      { userId: row.id, type: "SYSTEM", title: "c", body: "c", inAppVisible: false },
      { userId: other.id, type: "SYSTEM", title: "d", body: "d" },
    ],
  });
  const body = await bootstrap(await mobileToken(row.id, "STUDENT"));
  assert.equal(body.workspace?.unreadNotifications, 1);
});
