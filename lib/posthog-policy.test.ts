import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanAnalyticsUrl, posthogHost, trackablePath, validVisitorId } from "./posthog-policy";

test("analytics removes tokens, queries and fragments from URLs", () => {
  assert.equal(cleanAnalyticsUrl("https://example.com/paketler?token=private#secret"), "https://example.com/paketler");
  assert.equal(cleanAnalyticsUrl("not a URL"), "");
});

test("panel and authentication pages are excluded without excluding public products", () => {
  for (const path of ["/panel", "/panel/od/ogrenci", "/api/auth", "/giris", "/kayit", "/sifremi-unuttum"]) {
    assert.equal(trackablePath(path), false, path);
  }
  for (const path of ["/", "/paketler", "/urunler/online-deneme-kulubum"]) {
    assert.equal(trackablePath(path), true, path);
  }
});

test("visitor identifiers cannot contain arbitrary personal data", () => {
  assert.equal(validVisitorId("12345678-1234-4123-8123-123456789abc"), true);
  assert.equal(validVisitorId("student@example.com"), false);
  assert.equal(validVisitorId(undefined), false);
});

test("EU dashboard host maps to ingestion host", () => {
  assert.equal(posthogHost("https://eu.posthog.com"), "https://eu.i.posthog.com");
  assert.equal(posthogHost(undefined), "https://eu.i.posthog.com");
});
