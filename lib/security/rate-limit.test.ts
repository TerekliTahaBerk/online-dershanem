import assert from "node:assert/strict";
import test from "node:test";

import {
  getClientIp,
  getRateLimitKeyComposite,
  getRateLimitKeyFromIp,
  getRateLimitKeyFromUser,
  rateLimitResponseHeaders,
  retryAfterSeconds,
} from "./rate-limit";

function headers(values: Record<string, string>) {
  const normalized = new Map(
    Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return { get: (name: string) => normalized.get(name.toLowerCase()) ?? null };
}

test("Vercel modunda yalnız platform IP başlığına güvenir", () => {
  const input = headers({
    "x-vercel-forwarded-for": "203.0.113.8",
    "x-forwarded-for": "198.51.100.99",
    "cf-connecting-ip": "192.0.2.10",
  });
  assert.equal(getClientIp(input, "vercel"), "203.0.113.8");
  assert.equal(
    getClientIp(headers({ "x-forwarded-for": "198.51.100.99" }), "vercel"),
    "unknown",
  );
});

test("Cloudflare modu tek ve geçerli CF-Connecting-IP ister", () => {
  assert.equal(
    getClientIp(headers({ "cf-connecting-ip": "2001:DB8::1" }), "cloudflare"),
    "2001:db8::1",
  );
  assert.equal(
    getClientIp(headers({ "cf-connecting-ip": "not-an-ip", "x-forwarded-for": "203.0.113.1" }), "cloudflare"),
    "unknown",
  );
  assert.equal(
    getClientIp(headers({ "cf-connecting-ip": "2001:0db8:0:0:0:0:0:1" }), "cloudflare"),
    "2001:db8::1",
  );
});

test("çok uzun bileşenleri sabit uzunlukta ve deterministik anahtara indirger", () => {
  const value = "Ğ".repeat(500);
  const first = getRateLimitKeyComposite(value, value, value);
  assert.equal(first, getRateLimitKeyComposite(value, value, value));
  assert.ok(first.length < 500);
  assert.match(first, /sha256-/);
});

test("yerel mod adresi doğrular, portu ve IPv4-mapped IPv6 biçimini normalize eder", () => {
  assert.equal(getClientIp(headers({ "x-forwarded-for": "203.0.113.5:443" }), "local"), "203.0.113.5");
  assert.equal(getClientIp(headers({ "x-forwarded-for": "::ffff:192.0.2.4" }), "local"), "192.0.2.4");
  assert.equal(getClientIp(headers({ "x-forwarded-for": "attacker-value" }), "local"), "unknown");
});

test("IP, kullanıcı ve bileşik anahtarlar kanonik ve ayraç çakışmasına kapalıdır", () => {
  assert.equal(
    getRateLimitKeyFromUser("  USER-1 ", " ODK.Attempt.Answer "),
    "act:odk.attempt.answer:user:user-1",
  );
  assert.equal(
    getRateLimitKeyFromIp(headers({ "x-forwarded-for": "203.0.113.9" }), " Checkout.OD ", "local"),
    "act:checkout.od:ip:203.0.113.9",
  );
  assert.equal(
    getRateLimitKeyComposite("User:1", "Exam Submit", "Attempt:42"),
    "act:exam%20submit:user:user%3A1:res:attempt%3A42",
  );
});

test("Retry-After daima yukarı yuvarlanan pozitif saniyedir", () => {
  assert.equal(retryAfterSeconds(1), 1);
  assert.equal(retryAfterSeconds(1_001), 2);
  assert.deepEqual(rateLimitResponseHeaders(60_001), {
    "Retry-After": "61",
    "Cache-Control": "no-store",
  });
});
