import assert from "node:assert/strict";
import test from "node:test";

import {
  discountPercent,
  lessonSubjects,
  resolvePackageQuote,
  singleProductPrice,
  type BuilderSelection,
} from "./package-builder-pricing";

/**
 * Fiyat modelini kilitleyen testler.
 *
 * Buradaki rakamlar TİCARİ KARARDIR: değişirlerse bu testler de bilinçli
 * olarak güncellenir. Testlerin amacı rakamı dondurmak değil, HESABIN
 * bozulmadığını kanıtlamaktır — özellikle "ders sayısıyla çarpma", "paket
 * indirimi", "liste fiyatı toplamı" ve "toplam avantaj" ilişkileri.
 */

const base: BuilderSelection = {
  exam: "YKS",
  dershanem: false,
  kocum: false,
  denemeKulubum: false,
  format: "grup",
  subject: "Matematik",
  extraSubjects: [],
};

test("tek tek ürün fiyatları tanımlı ve liste fiyatı kampanyanın üstünde", () => {
  for (const product of ["dershanem", "kocum", "denemeKulubum"] as const) {
    const pair = singleProductPrice(product);
    assert.ok(pair, `${product} fiyatı tanımsız`);
    assert.ok(pair.campaignCents, `${product} kampanya fiyatı yok`);
    assert.ok(pair.listCents, `${product} liste fiyatı yok`);
    assert.ok(
      pair.listCents > pair.campaignCents,
      `${product} liste fiyatı kampanya fiyatının üstünde değil`,
    );
  }
});

test("grup dersi ₺3.000, birebir ₺4.500, koçluk ₺2.500, deneme ₺1.000", () => {
  assert.equal(singleProductPrice("dershanem")?.campaignCents, 300_000);
  assert.equal(singleProductPrice("kocum")?.campaignCents, 250_000);
  assert.equal(singleProductPrice("denemeKulubum")?.campaignCents, 100_000);

  const birebir = resolvePackageQuote({ ...base, dershanem: true, format: "birebir" });
  assert.equal(birebir.bundleTotalCents, 450_000);
});

test("deneme kulübü ₺1.500 liste fiyatından ₺1.000'e", () => {
  const quote = resolvePackageQuote({ ...base, denemeKulubum: true });
  assert.equal(quote.listTotalCents, 150_000);
  assert.equal(quote.bundleTotalCents, 100_000);
  assert.equal(quote.savingsCents, 50_000);
  assert.equal(discountPercent(150_000, 100_000), 33);
});

test("ders fiyatı derse göre değişmez, ders SAYISINA göre çarpılır", () => {
  const tek = resolvePackageQuote({ ...base, dershanem: true });
  assert.equal(tek.bundleTotalCents, 300_000);

  // Farklı ders seçmek fiyatı değiştirmemeli.
  const baskaDers = resolvePackageQuote({ ...base, dershanem: true, subject: "Fizik" });
  assert.equal(baskaDers.bundleTotalCents, 300_000);

  // İki ek ders → toplam 3 ders.
  const ucDers = resolvePackageQuote({
    ...base,
    dershanem: true,
    extraSubjects: ["Fizik", "Kimya"],
  });
  assert.equal(ucDers.bundleTotalCents, 900_000);
  assert.equal(ucDers.listTotalCents, 1_500_000);
});

test("tek üründe paket indirimi yok, kampanya indirimi var", () => {
  const quote = resolvePackageQuote({ ...base, kocum: true });
  assert.equal(quote.bundleDiscountCents, 0);
  assert.equal(quote.campaignSavingsCents, 100_000); // 3.500 → 2.500
  assert.equal(quote.savingsCents, 100_000);
  assert.equal(quote.bundleTotalCents, 250_000);
});

test("iki ürün birlikte alınınca paket indirimi uygulanır", () => {
  const quote = resolvePackageQuote({ ...base, dershanem: true, kocum: true });
  assert.equal(quote.individualTotalCents, 550_000); // 3.000 + 2.500
  assert.equal(quote.bundleDiscountCents, 50_000); // ₺500
  assert.equal(quote.bundleTotalCents, 500_000);
  assert.equal(quote.listTotalCents, 850_000); // 5.000 + 3.500
  assert.equal(quote.savingsCents, 350_000);
});

test("üç ürün en avantajlı toplamı verir", () => {
  const ucu = resolvePackageQuote({
    ...base,
    dershanem: true,
    kocum: true,
    denemeKulubum: true,
  });
  assert.equal(ucu.individualTotalCents, 650_000); // 3.000 + 2.500 + 1.000
  assert.equal(ucu.bundleDiscountCents, 75_000); // ₺750
  assert.equal(ucu.bundleTotalCents, 575_000);

  // Üç ürünün paket indirimi, her ikili kombinasyondan büyük olmalı —
  // yoksa "üçüncüyü ekle" çağrısı yalan olur.
  for (const pair of [
    { dershanem: true, kocum: true },
    { dershanem: true, denemeKulubum: true },
    { kocum: true, denemeKulubum: true },
  ]) {
    const two = resolvePackageQuote({ ...base, ...pair });
    assert.ok(
      (ucu.bundleDiscountCents ?? 0) > (two.bundleDiscountCents ?? 0),
      "üç ürün indirimi ikiliden büyük değil",
    );
  }
});

test("her kombinasyonda ödenecek toplam, tek tek toplamın altında", () => {
  const combos: Partial<BuilderSelection>[] = [
    { dershanem: true, kocum: true },
    { dershanem: true, denemeKulubum: true },
    { kocum: true, denemeKulubum: true },
    { dershanem: true, kocum: true, denemeKulubum: true },
  ];

  for (const combo of combos) {
    const quote = resolvePackageQuote({ ...base, ...combo });
    assert.ok(quote.priceResolved, "fiyat çözülemedi");
    assert.ok(
      (quote.bundleTotalCents ?? 0) < (quote.individualTotalCents ?? 0),
      "paket toplamı tek tek toplamdan düşük değil",
    );
    // Avantaj = kampanya indirimi + paket indirimi, başka bir şey değil.
    assert.equal(
      quote.savingsCents,
      (quote.campaignSavingsCents ?? 0) + (quote.bundleDiscountCents ?? 0),
    );
  }
});

test("hiç ürün seçilmediğinde fiyat çözülmez", () => {
  const quote = resolvePackageQuote(base);
  assert.equal(quote.selectedCount, 0);
  assert.equal(quote.priceResolved, false);
  assert.equal(quote.bundleTotalCents, null);
  assert.equal(quote.savingsCents, null);
});

test("sınav seçilmeden ders fiyatı hesaplanmaz", () => {
  const quote = resolvePackageQuote({ ...base, exam: null, dershanem: true });
  assert.equal(quote.priceResolved, false);
  assert.deepEqual(quote.missingPriceFor, ["dershanem"]);
});

test("indirim yüzdesi yalnızca gerçek indirimde döner", () => {
  assert.equal(discountPercent(500_000, 300_000), 40);
  assert.equal(discountPercent(300_000, 300_000), null);
  assert.equal(discountPercent(null, 300_000), null);
  assert.equal(discountPercent(300_000, null), null);
});

test("LGS ve YKS ders listeleri dolu ve tekrarsız", () => {
  for (const exam of ["LGS", "YKS"] as const) {
    const subjects = lessonSubjects[exam];
    assert.ok(subjects.length >= 5, `${exam} ders listesi çok kısa`);
    assert.equal(
      new Set(subjects).size,
      subjects.length,
      `${exam} ders listesinde tekrar var`,
    );
    assert.ok(subjects.includes("Matematik"), `${exam} listesinde matematik yok`);
  }
});
