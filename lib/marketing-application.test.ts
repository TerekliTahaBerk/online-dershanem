import assert from "node:assert/strict";
import test from "node:test";
import { marketingApplicationUrl } from "./marketing-application";
import { coachingOffer } from "./marketing-offers";
import { singleProductPrice } from "./commerce/package-builder-pricing";
import { serviceJsonLd } from "./seo/jsonld";

test("existing Tally destination only receives verified campaign fields and fixed product source", () => {
  const url = new URL(marketingApplicationUrl("yon-kocluk", "?utm_source=instagram&utm_medium=paid_social&utm_campaign=lgs_2026&utm_content=plan_a&product=bad&ref=account-secret&email=student@example.com"));
  assert.equal(url.origin + url.pathname, "https://tally.so/r/QK6MYp");
  assert.equal(url.searchParams.get("source"), "website_yon-kocluk");
  assert.equal(url.searchParams.get("utm_campaign"), "lgs_2026");
  for (const key of ["product", "ref", "email"]) assert.equal(url.searchParams.has(key), false);
});

test("rejects free text, emails, phone values and oversized campaign parameters", () => {
  const url = new URL(marketingApplicationUrl("deneme-ligi", `?utm_source=a%40example.com&utm_medium=%2B905551234567&utm_campaign=${"x".repeat(65)}&utm_content=student%20name`));
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) assert.equal(url.searchParams.has(key), false);
  assert.equal(url.searchParams.get("source"), "website_deneme-ligi");
});

test("marketing offer is arithmetically consistent and commerce remains unchanged", () => {
  assert.equal(coachingOffer.monthlyTl - coachingOffer.firstMonthTl, coachingOffer.savingsTl);
  assert.equal(coachingOffer.savingsTl / coachingOffer.monthlyTl * 100, coachingOffer.discountPercent);
  assert.equal(singleProductPrice("kocum")?.campaignCents, 300_000);
  assert.match(coachingOffer.summary, /yalnızca ilk ay/);
});

test("service schema identifies the canonical service without fabricated commercial evidence", () => {
  const schema = serviceJsonLd({ name: "Yön Koçluk", description: "Kişisel çalışma planı", url: "/urunler/online-kocum", serviceType: "Öğrenci koçluğu" });
  assert.equal(schema["@type"], "Service");
  assert.equal(schema.url, "https://www.onlinedershanem.com/urunler/online-kocum");
  for (const key of ["offers", "aggregateRating", "review", "award"]) assert.equal(key in schema, false);
});
