import assert from "node:assert/strict";
import test from "node:test";
import {
  createPasswordResetToken,
  hashPasswordResetToken,
  materializePasswordResetEmailHtml,
  passwordResetTokenId,
  passwordResetUrlMarker,
} from "./password-reset";

test("reset token round-trip validates its HMAC and stores only a hash", () => {
  const previous = process.env.NEXTAUTH_SECRET;
  process.env.NEXTAUTH_SECRET = "password-reset-test-secret-with-enough-entropy";
  try {
    const generated = createPasswordResetToken();
    assert.equal(passwordResetTokenId(generated.token), generated.id);
    assert.equal(hashPasswordResetToken(generated.token), generated.tokenHash);
    assert.notEqual(generated.tokenHash, generated.token);
    assert.equal(passwordResetTokenId(`${generated.id}.tampered`), null);
  } finally {
    if (previous === undefined) delete process.env.NEXTAUTH_SECRET;
    else process.env.NEXTAUTH_SECRET = previous;
  }
});

test("durable HTML contains no usable token and materializes it only for delivery", () => {
  const previousSecret = process.env.NEXTAUTH_SECRET;
  const previousUrl = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXTAUTH_SECRET = "password-reset-test-secret-with-enough-entropy";
  process.env.NEXT_PUBLIC_APP_URL = "https://example.test";
  try {
    const generated = createPasswordResetToken();
    const storedHtml = `<a href="${passwordResetUrlMarker(generated.id)}">reset</a>`;
    assert.equal(storedHtml.includes(generated.token), false);
    const deliveredHtml = materializePasswordResetEmailHtml(storedHtml);
    assert.match(deliveredHtml, /^<a href="https:\/\/example\.test\/parola-sifirla#token=/);
    const encoded = deliveredHtml.match(/token=([^"]+)/)?.[1];
    assert.ok(encoded);
    assert.equal(passwordResetTokenId(decodeURIComponent(encoded)), generated.id);
  } finally {
    if (previousSecret === undefined) delete process.env.NEXTAUTH_SECRET;
    else process.env.NEXTAUTH_SECRET = previousSecret;
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previousUrl;
  }
});
