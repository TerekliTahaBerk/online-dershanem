import assert from "node:assert/strict";
import test from "node:test";
import { parseMobileBootstrap, type MobileWorkspace } from "@/lib/mobile-contracts/bootstrap";
import { bootstrapGates, projectBootstrap, selectActiveWorkspace, toMobileNavSections } from "./bootstrap";

const identity = { userId: "u1", email: "ogrenci@example.com", fullName: "Ada Yılmaz", role: "STUDENT" as const, mustChangePassword: false, mfaVerifiedAt: null };
const now = new Date("2026-10-08T09:00:00.000Z");
const workspace: MobileWorkspace = {
  products: [{ code: "OD", label: "onlinedershanem.", state: "ACTIVE" }],
  activeProduct: "OD",
  selectionRequired: false,
  navigation: { primary: [{ id: "today", label: "Bugün", webPath: "/panel/ogrenci" }], sections: [] },
  flags: { adaptivePlan: false },
  capabilities: { staffPermissions: ["od:student:read"] },
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
