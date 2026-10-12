import assert from "node:assert/strict";
import test from "node:test";
import { parseMobileBootstrap, type MobileWorkspace } from "@/lib/mobile-contracts/bootstrap";
import { bootstrapGates, projectBootstrap, selectActiveWorkspace, toMobileNavItems, toMobileNavSections } from "./bootstrap";

const identity = { userId: "u1", email: "ogrenci@example.com", fullName: "Ada Yılmaz", role: "STUDENT" as const, mustChangePassword: false, mfaVerifiedAt: null };
const now = new Date("2026-10-08T09:00:00.000Z");
const workspace: MobileWorkspace = {
  products: [{ code: "OD", label: "onlinedershanem.", state: "ACTIVE" }],
  activeProduct: "OD",
  selectionRequired: false,
  navigation: { primary: [{ id: "today", label: "Bugün", webPath: "/panel/ogrenci" }], sections: [] },
  flags: { adaptivePlan: false },
  capabilities: { staffPermissions: ["od:student:read"], security: null },
  parent: null,
  unreadNotifications: 2,
};
const methods = { enrolled: true, totp: true, recoveryCodes: true, passkey: false };

test("kapı: geçici parola MFA'dan önce gelir", () => {
  const gates = bootstrapGates({ mustChangePassword: true, mfaVerifiedAt: null, loginMfaRequired: true, mfaMethods: methods, previewActive: false });
  assert.equal(gates.status, "PASSWORD_CHANGE_REQUIRED");
  assert.equal(gates.mfa, null, "parola kapısında MFA yöntemleri sızmaz");
});

test("kapı: MFA zorunlu ve doğrulanmamış → MFA_REQUIRED, yöntemler döner", () => {
  const gates = bootstrapGates({ mustChangePassword: false, mfaVerifiedAt: null, loginMfaRequired: true, mfaMethods: methods, previewActive: false });
  assert.equal(gates.status, "MFA_REQUIRED");
  assert.deepEqual(gates.mfa, methods);
});

test("kapı: MFA doğrulanmış veya politika istemiyor → READY", () => {
  assert.equal(bootstrapGates({ mustChangePassword: false, mfaVerifiedAt: now, loginMfaRequired: true, mfaMethods: methods, previewActive: false }).status, "READY");
  assert.equal(bootstrapGates({ mustChangePassword: false, mfaVerifiedAt: null, loginMfaRequired: false, mfaMethods: null, previewActive: false }).status, "READY");
});

test("projeksiyon: kapı açık değilken çalışma alanı verisi YANITA GİRMEZ (veri sızıntısı yok)", () => {
  for (const gateInput of [
    { mustChangePassword: true, mfaVerifiedAt: null, loginMfaRequired: false },
    { mustChangePassword: false, mfaVerifiedAt: null, loginMfaRequired: true },
  ]) {
    const gates = bootstrapGates({ ...gateInput, mfaMethods: methods, previewActive: false });
    const body = projectBootstrap({ identity, gates, minSupportedVersion: null, now, workspace });
    assert.equal(body.workspace, null);
    const json = JSON.stringify(body);
    assert.ok(!json.includes("od:student:read"), "personel yeteneği sızmamalı");
    assert.ok(!json.includes("/panel/ogrenci"), "navigasyon sızmamalı");
    assert.ok(!json.includes("unreadNotifications"));
  }
});

test("projeksiyon: READY yanıtı paylaşılan sözleşme doğrulayıcısından geçer", () => {
  const gates = bootstrapGates({ mustChangePassword: false, mfaVerifiedAt: null, loginMfaRequired: false, mfaMethods: null, previewActive: false });
  const body = JSON.parse(JSON.stringify(projectBootstrap({ identity, gates, minSupportedVersion: "1.0.0", now, workspace })));
  const parsed = parseMobileBootstrap(body);
  assert.equal(parsed.ok, true, parsed.ok ? "" : parsed.error);
  assert.equal(body.serverTime, "2026-10-08T09:00:00.000Z");
});

test("sözleşme: kapı açık değilken workspace dolu yanıt reddedilir", () => {
  const gates = bootstrapGates({ mustChangePassword: false, mfaVerifiedAt: null, loginMfaRequired: true, mfaMethods: methods, previewActive: false });
  const forged = { ...JSON.parse(JSON.stringify(projectBootstrap({ identity, gates, minSupportedVersion: null, now, workspace: null }))), workspace };
  const parsed = parseMobileBootstrap(forged);
  assert.equal(parsed.ok, false);
});

test("sözleşme: durum bayraklarla çelişirse reddedilir; eksik alan reddedilir; ek alan yok sayılır", () => {
  const gates = bootstrapGates({ mustChangePassword: false, mfaVerifiedAt: null, loginMfaRequired: false, mfaMethods: null, previewActive: false });
  const body = JSON.parse(JSON.stringify(projectBootstrap({ identity, gates, minSupportedVersion: null, now, workspace })));
  assert.equal(parseMobileBootstrap({ ...body, gates: { ...body.gates, mfaRequired: true } }).ok, false);
  assert.equal(parseMobileBootstrap({ ...body, user: { ...body.user, role: "SUPERUSER" } }).ok, false);
  assert.equal(parseMobileBootstrap({ ...body, serverTime: "dün" }).ok, false);
  assert.equal(parseMobileBootstrap({ ...body, contractVersion: 2 }).ok, false);
  assert.equal(parseMobileBootstrap({ ...body, futureField: { anything: true } }).ok, true);
  assert.equal(parseMobileBootstrap(null).ok, false);
  // P2.7 eklemeli `business` alanı: yoksa null; varsa bölümler doğrulanır.
  const plain = parseMobileBootstrap(body);
  assert.equal(plain.ok && plain.value.business, null);
  const business = parseMobileBootstrap({ ...body, business: { sections: [{ slug: "adaylar", label: "Adaylar", group: "crm", groupLabel: "CRM" }] } });
  assert.deepEqual(business.ok && business.value.business, { sections: [{ slug: "adaylar", label: "Adaylar", group: "crm", groupLabel: "CRM" }] });
  assert.equal(parseMobileBootstrap({ ...body, business: { sections: [{ slug: "adaylar" }] } }).ok, false);
  assert.equal(parseMobileBootstrap("<html>").ok, false);
});

test("çalışma alanı: yalnız ACTIVE ürün seçili olabilir; bayat seçim yok sayılır", () => {
  const products = [
    { code: "OD" as const, state: "ACTIVE" as const },
    { code: "OK" as const, state: "LOCKED" as const },
    { code: "ODK" as const, state: "PILOT_CLOSED" as const },
  ];
  assert.deepEqual(selectActiveWorkspace({ products, sessionActiveProduct: "OD" }), { activeProduct: "OD", selectionRequired: false });
  assert.deepEqual(selectActiveWorkspace({ products, sessionActiveProduct: "ODK" }), { activeProduct: null, selectionRequired: false });
  assert.deepEqual(selectActiveWorkspace({ products, sessionActiveProduct: "OK" }), { activeProduct: null, selectionRequired: false });
});

test("çalışma alanı: birden çok ACTIVE ürün ve seçim yoksa kullanıcıya sorulur", () => {
  const products = [
    { code: "OD" as const, state: "ACTIVE" as const },
    { code: "OK" as const, state: "ACTIVE" as const },
    { code: "ODK" as const, state: "ACTIVE" as const },
  ];
  assert.deepEqual(selectActiveWorkspace({ products, sessionActiveProduct: null }), { activeProduct: null, selectionRequired: true });
  assert.deepEqual(selectActiveWorkspace({ products, sessionActiveProduct: "KPSS" }), { activeProduct: null, selectionRequired: true });
  assert.deepEqual(selectActiveWorkspace({ products, sessionActiveProduct: "OK" }), { activeProduct: "OK", selectionRequired: false });
});

test("çalışma alanı: hiç ACTIVE ürün yoksa seçim de istenmez", () => {
  const products = [{ code: "OD" as const, state: "LOCKED" as const }];
  assert.deepEqual(selectActiveWorkspace({ products, sessionActiveProduct: null }), { activeProduct: null, selectionRequired: false });
});

test("navigasyon çevirisi web href'ini yalnız webPath olarak taşır", () => {
  assert.deepEqual(toMobileNavSections([{ id: "bugun", title: "BUGÜN", items: [{ id: "today", label: "Bugün", href: "/panel/ogrenci" }] }]), [
    { id: "bugun", title: "BUGÜN", items: [{ id: "today", label: "Bugün", webPath: "/panel/ogrenci" }] },
  ]);
});

test("navigasyon: ticaret yolları mobil menüye girmez; yalnız ADMIN arka ofisi istisnadır", () => {
  const items = [
    { id: "today", label: "Operasyon merkezi", href: "/panel/yonetim" },
    { id: "orders", label: "Siparişler", href: "/panel/yonetim/siparisler" },
    { id: "odk-packages", label: "Deneme Ligi paketleri", href: "/panel/odk/yonetim/paketler" },
    { id: "checkout", label: "Satın al", href: "/panel/veli/odeme" },
    { id: "veli-paket", label: "Paketler", href: "/panel/veli/paketler" },
  ];
  assert.deepEqual(toMobileNavItems(items).map((item) => item.id), ["today"], "varsayılan: hiçbir ticaret yolu yok");
  assert.deepEqual(toMobileNavItems(items, { backOffice: true }).map((item) => item.id), ["today", "orders", "odk-packages"], "arka ofis: yalnız yönetim sipariş / paket yönetimi");
});

test("güvenlik yeteneği: eksik alan null kabul edilir (eklemeli sözleşme), bozuk alan reddedilir", () => {
  const base = projectBootstrap({ identity, gates: bootstrapGates({ mustChangePassword: false, mfaVerifiedAt: now, loginMfaRequired: false, mfaMethods: null, previewActive: false }), minSupportedVersion: null, now, workspace });
  const legacy = JSON.parse(JSON.stringify(base));
  delete legacy.workspace.capabilities.security;
  const parsedLegacy = parseMobileBootstrap(legacy);
  assert.ok(parsedLegacy.ok);
  assert.equal(parsedLegacy.ok && parsedLegacy.value.workspace?.capabilities.security, null);

  const withSecurity = JSON.parse(JSON.stringify(base));
  withSecurity.workspace.capabilities.security = { mfa: methods, stepUpExpiresAt: "2026-10-08T09:10:00.000Z" };
  const parsed = parseMobileBootstrap(withSecurity);
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.ok && parsed.value.workspace?.capabilities.security, { mfa: methods, stepUpExpiresAt: "2026-10-08T09:10:00.000Z" });

  withSecurity.workspace.capabilities.security = { mfa: methods, stepUpExpiresAt: "yarın" };
  assert.equal(parseMobileBootstrap(withSecurity).ok, false);
});

test("P2.9 overlay sözleşmesi eklemeli, süre ve mod alanları doğrulanır", () => {
  const base = projectBootstrap({ identity, gates: bootstrapGates({ mustChangePassword: false, mfaVerifiedAt: null, loginMfaRequired: false, mfaMethods: null, previewActive: true }), minSupportedVersion: null, now, workspace });
  assert.equal(parseMobileBootstrap(base).ok, true);
  const adminOverlay = { mode: "PREVIEW", actorUserId: "admin", expiresAt: "2026-10-08T11:00:00.000Z" };
  const parsed = parseMobileBootstrap({ ...base, adminOverlay });
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.value.adminOverlay, adminOverlay);
  assert.equal(parseMobileBootstrap({ ...base, adminOverlay: { ...adminOverlay, mode: "ADMIN" } }).ok, false);
  assert.equal(parseMobileBootstrap({ ...base, adminOverlay: { ...adminOverlay, expiresAt: "yarın" } }).ok, false);
});
