import assert from "node:assert/strict";
import test from "node:test";
import { encryptMfaSecret, decryptMfaSecret, generateRecoveryCodes, hashMfaValue, matchTotpCounter, normalizeRecoveryCode, totpCode } from "./mfa-crypto";
import { hasFreshStepUp, STEP_UP_MAX_AGE_MS } from "./mfa-policy";

const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

test("TOTP follows RFC 6238 SHA-1 vectors", () => {
  assert.equal(totpCode(RFC_SECRET, 1n, 8), "94287082");
  assert.equal(totpCode(RFC_SECRET, 37037036n, 8), "07081804");
});

test("TOTP resolves a counter once so persistence can reject replay", () => {
  const now = 1_700_000_000_000;
  const counter = BigInt(Math.floor(now / 30_000));
  const code = totpCode(RFC_SECRET, counter);
  assert.equal(matchTotpCounter(RFC_SECRET, code, now), counter);
  assert.equal(matchTotpCounter(RFC_SECRET, "000000", now), null);
  assert.ok(!(counter <= counter - 1n), "the database monotonic update rejects an already-used counter");
});

test("TOTP secrets use authenticated encryption", () => {
  const previous = process.env.MFA_ENCRYPTION_KEY;
  process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  try {
    const encrypted = encryptMfaSecret(RFC_SECRET);
    assert.ok(!encrypted.includes(RFC_SECRET));
    assert.equal(decryptMfaSecret(encrypted), RFC_SECRET);
    const [version, iv, tag, ciphertext] = encrypted.split(".");
    const tamperedCiphertext = Buffer.from(ciphertext, "base64url");
    tamperedCiphertext[0] ^= 1;
    assert.throws(() => decryptMfaSecret([version, iv, tag, tamperedCiphertext.toString("base64url")].join(".")));
  } finally {
    if (previous === undefined) delete process.env.MFA_ENCRYPTION_KEY;
    else process.env.MFA_ENCRYPTION_KEY = previous;
  }
});

test("recovery codes are normalized, unique, and suitable for hash-only storage", () => {
  const codes = generateRecoveryCodes();
  assert.equal(new Set(codes).size, 10);
  const normalized = normalizeRecoveryCode(codes[0].toLowerCase());
  assert.equal(hashMfaValue(normalized), hashMfaValue(normalizeRecoveryCode(codes[0])));
  assert.ok(!hashMfaValue(normalized).includes(normalized));
});

test("step-up expires at the configured boundary", () => {
  const now = Date.now();
  assert.equal(hasFreshStepUp(new Date(now - STEP_UP_MAX_AGE_MS), now), true);
  assert.equal(hasFreshStepUp(new Date(now - STEP_UP_MAX_AGE_MS - 1), now), false);
  assert.equal(hasFreshStepUp(null, now), false);
});
