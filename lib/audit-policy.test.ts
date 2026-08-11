import test from "node:test";
import assert from "node:assert/strict";
import { paytrAuditIdempotencyKey, sanitizeAuditPayload, writeWithRetry } from "./audit-policy";

test("audit payload recursively redacts PII and secrets", () => {
  const safe = sanitizeAuditPayload({
    merchantOid: "OD-123",
    hash: "provider-hash",
    nested: { accessToken: "token", email: "student@example.com", answerKeyHash: "digest", amountCents: 12500 },
    rows: [{ phoneE164: "+905551234567", status: "success" }],
  });

  assert.deepEqual(safe, {
    merchantOid: "OD-123",
    hash: "[REDACTED]",
    nested: { accessToken: "[REDACTED]", email: "[REDACTED]", answerKeyHash: "[REDACTED]", amountCents: 12500 },
    rows: [{ phoneE164: "[REDACTED]", status: "success" }],
  });
});

test("PayTR retry keys collapse the same logical callback event", () => {
  assert.equal(
    paytrAuditIdempotencyKey("PAYTR_PAYMENT_SUCCESS", "OD-123"),
    paytrAuditIdempotencyKey("PAYTR_PAYMENT_SUCCESS", "OD-123"),
  );
  assert.notEqual(
    paytrAuditIdempotencyKey("PAYTR_PAYMENT_SUCCESS", "OD-123"),
    paytrAuditIdempotencyKey("PAYTR_PAYMENT_FAILED", "OD-123"),
  );
});

test("critical audit waits for transient retries and eventually succeeds", async () => {
  let calls = 0;
  const sleeps: number[] = [];
  const attempts = await writeWithRetry(async () => {
    calls += 1;
    if (calls < 3) throw new Error("temporary database error");
  }, { maxAttempts: 3, sleep: async (milliseconds) => { sleeps.push(milliseconds); } });

  assert.equal(attempts, 3);
  assert.equal(calls, 3);
  assert.deepEqual(sleeps, [25, 50]);
});

test("critical audit exposes the final failure after bounded retries", async () => {
  let calls = 0;
  await assert.rejects(
    writeWithRetry(async () => { calls += 1; throw new Error("database unavailable"); }, {
      maxAttempts: 3,
      sleep: async () => undefined,
    }),
    /database unavailable/,
  );
  assert.equal(calls, 3);
});
