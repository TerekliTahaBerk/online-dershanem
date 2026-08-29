import assert from "node:assert/strict";
import test from "node:test";
import { parseBearerToken } from "./bearer-token";

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
