import assert from "node:assert/strict";
import test from "node:test";
import { getPublicPricingCopy } from "./public-pricing-copy";
import { subjectPackageGroups } from "@/lib/content";
import { getPublicFaqCategories } from "@/lib/public-faq";
import { homeFaqs } from "@/lib/site-content";

test("ürün ve birlikte alım metinleri aylık/dönemlik fiyatları açıkça ayırır", () => {
  const pricing = getPublicPricingCopy();
  assert.match(pricing.standalone, /Grup dersi ₺2\.000\/ay/);
  assert.match(pricing.standalone, /birebir ders ₺4\.000\/ay/);
  assert.match(pricing.standalone, /onlinekoçum\. × Yön Koçluk ₺3\.000\/ay/);
  assert.match(pricing.standalone, /onlinedenemekulübüm\. × Deneme Ligi ₺1\.000\/dönem/);
  assert.match(pricing.bundles, /onlinekoçum\. × Yön Koçluk ₺2\.500\/ay/);
  assert.match(pricing.bundles, /onlinedenemekulübüm\. × Deneme Ligi ₺500\/dönem/);
  assert.match(pricing.bundles, /onlinedenemekulübüm\. × Deneme Ligi ₺750\/dönem/);
  assert.doesNotMatch(pricing.standalone + pricing.bundles, /ön görüş/);
});

test("SSS fiyatları katalog etiketlerini ve ortak ürün fiyat metnini kullanır", () => {
  const categories = getPublicFaqCategories(false);
  const durationFaq = categories.flatMap((group) => group.items)
    .find((item) => item.q === "Dersler kaç dakika ve haftada kaç ders var?");
  for (const pkg of subjectPackageGroups[0].packages) {
    assert.ok(durationFaq?.a.includes(pkg.discountedPrice));
  }
  assert.ok(homeFaqs.find((item) => item.q === "Üçünü birden almak zorunda mıyım?")?.a
    .includes(getPublicPricingCopy().standalone));
});
