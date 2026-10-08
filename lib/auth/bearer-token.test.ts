import assert from "node:assert/strict";
import test from "node:test";
import { parseBearerToken, resolveRequestCredential } from "./bearer-token";

test("geçerli Bearer header'ından token'ı çıkarır", () => {
  assert.equal(parseBearerToken("Bearer abc123"), "abc123");
});

test("büyük/küçük harf duyarsız şema", () => {
  assert.equal(parseBearerToken("bearer abc123"), "abc123");
  assert.equal(parseBearerToken("BEARER abc123"), "abc123");
});

test("baştaki/sondaki boşlukları temizler", () => {
  assert.equal(parseBearerToken("  Bearer   abc123  "), "abc123");
});

test("header yoksa null döner", () => {
  assert.equal(parseBearerToken(null), null);
  assert.equal(parseBearerToken(undefined), null);
  assert.equal(parseBearerToken(""), null);
});

test("şema Bearer değilse null döner", () => {
  assert.equal(parseBearerToken("Basic abc123"), null);
  assert.equal(parseBearerToken("abc123"), null);
});

test("token boşsa null döner", () => {
  assert.equal(parseBearerToken("Bearer"), null);
  assert.equal(parseBearerToken("Bearer   "), null);
});


test("credential: yalnız çerez → çerez (tarayıcı akışı)", () => {
  assert.deepEqual(resolveRequestCredential({ cookieToken: "web", authorization: null }), { kind: "token", token: "web", source: "cookie" });
});

test("credential: yalnız Bearer → Bearer (mobil)", () => {
  assert.deepEqual(resolveRequestCredential({ cookieToken: undefined, authorization: "Bearer mob" }), { kind: "token", token: "mob", source: "bearer" });
});

test("credential: çerez ve Bearer aynı token → kabul", () => {
  assert.deepEqual(resolveRequestCredential({ cookieToken: "same", authorization: "Bearer same" }), { kind: "token", token: "same", source: "bearer" });
});

test("credential: çerez ve Bearer farklı → conflict (fail-closed)", () => {
  assert.deepEqual(resolveRequestCredential({ cookieToken: "user-a", authorization: "Bearer user-b" }), { kind: "conflict", reason: "COOKIE_BEARER_MISMATCH" });
});

test("credential: geçersiz Bearer + geçerli çerez → çereze geri düşülmez", () => {
  const result = resolveRequestCredential({ cookieToken: "valid-cookie", authorization: "Bearer revoked-or-garbage" });
  assert.equal(result.kind, "conflict");
});

test("credential: boş Bearer şeması → conflict, çerez kullanılmaz", () => {
  assert.deepEqual(resolveRequestCredential({ cookieToken: "valid", authorization: "Bearer   " }), { kind: "conflict", reason: "EMPTY_BEARER" });
  assert.deepEqual(resolveRequestCredential({ cookieToken: null, authorization: "Bearer" }), { kind: "conflict", reason: "EMPTY_BEARER" });
});

test("credential: Bearer dışı şema (HTTP Basic) yok sayılır, çerez akışı korunur", () => {
  assert.deepEqual(resolveRequestCredential({ cookieToken: "web", authorization: "Basic dXNlcjpwYXNz" }), { kind: "token", token: "web", source: "cookie" });
  assert.deepEqual(resolveRequestCredential({ cookieToken: null, authorization: "Basic dXNlcjpwYXNz" }), { kind: "none" });
});

test("credential: hiçbiri yok → none; boş çerez değeri yok sayılır", () => {
  assert.deepEqual(resolveRequestCredential({ cookieToken: null, authorization: null }), { kind: "none" });
  assert.deepEqual(resolveRequestCredential({ cookieToken: "  ", authorization: undefined }), { kind: "none" });
});
