import test from "node:test";
import assert from "node:assert/strict";
import { applicationClick, GA_CONSENT_DAYS, googleAnalyticsPath, googleAnalyticsReferrer, googleAnalyticsUrl, readGoogleAnalyticsConsent } from "./google-analytics-policy";

test("GA only permits known marketing paths, including published articles", () => {
  assert.equal(googleAnalyticsPath("/urunler/online-kocum"), "/urunler/online-kocum");
  assert.ok(googleAnalyticsPath("/blog/online-dershane-fiyatlari-2026"));
  for (const path of ["/panel/ogrenci/123", "/giris", "/kayit", "/odeme", "/checkout", "/blog/private-student-name", "/api/orders"]) assert.equal(googleAnalyticsPath(path), null);
  assert.equal(googleAnalyticsUrl("https://www.onlinedershanem.com", "/urunler"), "https://www.onlinedershanem.com/urunler");
});

test("referrers lose their private paths, query and fragments", () => {
  assert.equal(googleAnalyticsReferrer("https://example.com/private/name?email=private@example.com#token"), "https://example.com");
  assert.equal(googleAnalyticsReferrer(""), "");
});

test("only the verified Tally form is an application click, never a completed lead", () => {
  assert.ok(applicationClick("https://tally.so/r/QK6MYp?source=website_yon-kocluk"));
  for (const href of ["https://evil.test/?url=https://tally.so/r/QK6MYp", "https://tally.so.evil.test/r/QK6MYp", "https://tally.so/r/other", "javascript:alert(1)"]) assert.equal(applicationClick(href), false);
});

test("missing, malformed, expired or excessive consent fails closed", () => {
  const now = Date.now();
  for (const value of [null, "broken", "{}", JSON.stringify({choice:"granted", expiresAt:now - 1}), JSON.stringify({choice:"granted", expiresAt:now + (GA_CONSENT_DAYS + 1) * 86_400_000})]) assert.equal(readGoogleAnalyticsConsent(value, now), "unset");
  assert.equal(readGoogleAnalyticsConsent(JSON.stringify({choice:"granted", expiresAt:now + 1000}), now), "granted");
  assert.equal(readGoogleAnalyticsConsent(JSON.stringify({choice:"denied", expiresAt:now + 1000}), now), "denied");
});
