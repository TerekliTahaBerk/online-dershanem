import assert from "node:assert/strict";
import test from "node:test";

import { classifyFieldName, isCredentialField, protectionStatus } from "./pii-heuristics.mjs";

test("alan adları beklenen kategoriye düşer", () => {
  assert.equal(classifyFieldName("email")?.category, "iletişim");
  assert.equal(classifyFieldName("normalizedPhone")?.category, "iletişim");
  assert.equal(classifyFieldName("fullName")?.category, "kimlik");
  assert.equal(classifyFieldName("birthDate")?.category, "kimlik");
  assert.equal(classifyFieldName("passwordHash")?.category, "kimlik doğrulama sırrı");
  assert.equal(classifyFieldName("note")?.category, "serbest metin");
  assert.equal(classifyFieldName("amountCents")?.category, "finansal");
  assert.equal(classifyFieldName("classLevel")?.category, "akademik");
  assert.equal(classifyFieldName("name")?.confidence, "düşük");
});

test("kısa parçalar alt dizede yanlış pozitif üretmez", () => {
  assert.equal(classifyFieldName("shipped"), null);
  assert.equal(classifyFieldName("internalId"), null);
  assert.equal(classifyFieldName("createdAt"), null);
  assert.equal(classifyFieldName("ip")?.category, "kimlik");
});

test("kimlik doğrulama sırları ve koruma durumu", () => {
  assert.equal(isCredentialField("tokenHash"), true);
  assert.equal(isCredentialField("email"), false);
  assert.equal(protectionStatus("tokenHash", ["email"]), "tek yönlü hash");
  assert.equal(protectionStatus("encryptedSecret", []), "şifreli");
  assert.equal(protectionStatus("email", ["email"]), "log/audit redaction anahtarı; DB'de düz");
  assert.equal(protectionStatus("note", ["email"]), "yok (DB'de düz)");
});
