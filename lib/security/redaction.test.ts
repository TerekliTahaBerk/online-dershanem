import test from "node:test";
import assert from "node:assert/strict";
import { REDACTED_VALUE, redactSensitiveValue } from "./redaction.mjs";

test("ortak redaction e-posta, telefon, kimlik, secret ve öğrenci adını ayıklar", () => {
  assert.deepEqual(redactSensitiveValue({
    email: "ali@example.com", phoneE164: "+905551234567", tcKimlik: "12345678901",
    password: "secret", accessToken: "token", studentName: "Ali Veli",
    nested: { safeCount: 2 },
  }), {
    email: REDACTED_VALUE, phoneE164: REDACTED_VALUE, tcKimlik: REDACTED_VALUE,
    password: REDACTED_VALUE, accessToken: REDACTED_VALUE, studentName: REDACTED_VALUE,
    nested: { safeCount: 2 },
  });
});

test("anahtarsız CLI metnindeki e-posta, telefon ve bearer token da maskelenir", () => {
  assert.equal(
    redactSensitiveValue("ali@example.com +905551234567 Bearer abcdefghijklmnop"),
    "[REDACTED] [REDACTED] Bearer [REDACTED]",
  );
});
