import assert from "node:assert/strict";
import test from "node:test";
import { compareSemVer, evaluateClientVersion, isNativeMobileClient, loginTransport, parseSemVer } from "./client-transport";

const headers = (values: Record<string, string>) => ({
  get: (name: string) => values[name.toLowerCase()] ?? null,
});

test("mobil istemci başlığı büyük/küçük harf duyarsız; başka değerler mobil değil", () => {
  assert.equal(isNativeMobileClient(headers({ "x-od-client": "mobile" })), true);
  assert.equal(isNativeMobileClient(headers({ "x-od-client": " Mobile " })), true);
  assert.equal(isNativeMobileClient(headers({ "x-od-client": "web" })), false);
  assert.equal(isNativeMobileClient(headers({})), false);
});

test("giriş taşıması: tarayıcı çerez alır token almaz; mobil token alır çerez almaz", () => {
  assert.deepEqual(loginTransport(headers({})), { setCookie: true, returnToken: false });
  assert.deepEqual(loginTransport(headers({ "x-od-client": "mobile" })), { setCookie: false, returnToken: true });
});

test("semver ayrıştırma yalnız üç parçalı sayısal sürümü kabul eder", () => {
  assert.deepEqual(parseSemVer("1.2.3"), [1, 2, 3]);
  assert.deepEqual(parseSemVer("1.2.3-beta.1"), [1, 2, 3]);
  assert.equal(parseSemVer("1.2"), null);
  assert.equal(parseSemVer("v1.2.3"), null);
  assert.equal(parseSemVer(""), null);
  assert.equal(parseSemVer(null), null);
  assert.equal(compareSemVer([1, 10, 0], [1, 9, 9]), 1);
  assert.equal(compareSemVer([1, 0, 0], [1, 0, 0]), 0);
});

test("sürüm kapısı: minimum tanımsızsa her istemci geçer (yerel geliştirme)", () => {
  assert.deepEqual(evaluateClientVersion(headers({ "x-od-client": "mobile" }), undefined), { ok: true, minSupportedVersion: null });
  assert.deepEqual(evaluateClientVersion(headers({ "x-od-client": "mobile" }), "not-a-version"), { ok: true, minSupportedVersion: null });
});

test("sürüm kapısı: web istekleri hiç etkilenmez", () => {
  assert.deepEqual(evaluateClientVersion(headers({}), "2.0.0"), { ok: true, minSupportedVersion: "2.0.0" });
});

test("sürüm kapısı: eski, eksik veya geçersiz mobil sürüm güncelleme ister", () => {
  const minimum = "1.4.0";
  const blocked = { ok: false, code: "CLIENT_UPGRADE_REQUIRED", minSupportedVersion: "1.4.0" };
  assert.deepEqual(evaluateClientVersion(headers({ "x-od-client": "mobile", "x-od-client-version": "1.3.9" }), minimum), blocked);
  assert.deepEqual(evaluateClientVersion(headers({ "x-od-client": "mobile" }), minimum), blocked);
  assert.deepEqual(evaluateClientVersion(headers({ "x-od-client": "mobile", "x-od-client-version": "latest" }), minimum), blocked);
  assert.deepEqual(evaluateClientVersion(headers({ "x-od-client": "mobile", "x-od-client-version": "1.4.0" }), minimum), { ok: true, minSupportedVersion: "1.4.0" });
  assert.deepEqual(evaluateClientVersion(headers({ "x-od-client": "mobile", "x-od-client-version": "2.0.0" }), minimum), { ok: true, minSupportedVersion: "1.4.0" });
});
