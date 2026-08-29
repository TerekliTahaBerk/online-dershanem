import assert from "node:assert/strict";
import test from "node:test";

import {
  builderContactQuery,
  discountPercent,
  lessonFormatPrices,
  lessonSubjects,
  resolveBuilderCheckout,
  resolveBuilderProductCheckout,
  resolvePackageQuote,
  singleProductPrice,
  type BuilderSelection,
} from "./package-builder-pricing";
import { getPackagePriceCents } from "@/lib/content";

/**
 * Fiyat modelini kilitleyen testler.
 *
 * Buradaki rakamlar TİCARİ KARARDIR: değişirlerse bu testler de bilinçli
 * olarak güncellenir. Testlerin amacı rakamı dondurmak değil, HESABIN
 * bozulmadığını kanıtlamaktır — özellikle "ders sayısıyla çarpma" ve her
 * indirimin yalnız kendi faturalama döneminde uzlaşması ilişkileri.
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
  assert.equal(birebir.monthlyTotal.payableCents, 450_000);
});

test("deneme kulübü ₺1.500 liste fiyatından ₺1.000'e", () => {
  const quote = resolvePackageQuote({ ...base, denemeKulubum: true });
  assert.equal(quote.periodTotal.listCents, 150_000);
  assert.equal(quote.periodTotal.payableCents, 100_000);
  assert.equal(quote.periodTotal.savingsCents, 50_000);
  assert.equal(quote.monthlyTotal.selectedLineCount, 0);
  assert.equal(discountPercent(150_000, 100_000), 33);
});

test("ders fiyatı derse göre değişmez, ders SAYISINA göre çarpılır", () => {
  const tek = resolvePackageQuote({ ...base, dershanem: true });
  assert.equal(tek.monthlyTotal.payableCents, 300_000);

  // Farklı ders seçmek fiyatı değiştirmemeli.
  const baskaDers = resolvePackageQuote({ ...base, dershanem: true, subject: "Fizik" });
  assert.equal(baskaDers.monthlyTotal.payableCents, 300_000);

  // İki ek ders → toplam 3 ders.
  const ucDers = resolvePackageQuote({
    ...base,
    dershanem: true,
    extraSubjects: ["Fizik", "Kimya"],
  });
  assert.equal(ucDers.monthlyTotal.payableCents, 900_000);
  assert.equal(ucDers.monthlyTotal.listCents, 1_500_000);
});

test("tek üründe paket indirimi yok, kampanya indirimi var", () => {
  const quote = resolvePackageQuote({ ...base, kocum: true });
  assert.equal(quote.monthlyTotal.bundleDiscountCents, 0);
  assert.equal(quote.monthlyTotal.campaignSavingsCents, 100_000); // 3.500 → 2.500
  assert.equal(quote.monthlyTotal.savingsCents, 100_000);
  assert.equal(quote.monthlyTotal.payableCents, 250_000);
});

test("iki ürün birlikte alınınca paket indirimi uygulanır", () => {
  const quote = resolvePackageQuote({ ...base, dershanem: true, kocum: true });
  assert.equal(quote.monthlyTotal.campaignCents, 550_000); // 3.000 + 2.500
  assert.equal(quote.monthlyTotal.bundleDiscountCents, 50_000); // ₺500/ay
  assert.equal(quote.monthlyTotal.payableCents, 500_000);
  assert.equal(quote.monthlyTotal.listCents, 850_000); // 5.000 + 3.500
  assert.equal(quote.monthlyTotal.savingsCents, 350_000);
});

test("üç ürün indirimi aylık ve dönemlik bucket'lara ayrılır", () => {
  const ucu = resolvePackageQuote({
    ...base,
    dershanem: true,
    kocum: true,
    denemeKulubum: true,
  });
  assert.equal(ucu.monthlyTotal.campaignCents, 550_000);
  assert.equal(ucu.monthlyTotal.bundleDiscountCents, 50_000);
  assert.equal(ucu.monthlyTotal.payableCents, 500_000);
  assert.equal(ucu.periodTotal.campaignCents, 100_000);
  assert.equal(ucu.periodTotal.bundleDiscountCents, 25_000);
  assert.equal(ucu.periodTotal.payableCents, 75_000);
  assert.equal(ucu.oneTimeTotal.selectedLineCount, 0);
});

test("her indirim yalnız kendi billing bucket'ında uzlaşır", () => {
  const combos: Partial<BuilderSelection>[] = [
    { dershanem: true, kocum: true },
    { dershanem: true, denemeKulubum: true },
    { kocum: true, denemeKulubum: true },
    { dershanem: true, kocum: true, denemeKulubum: true },
  ];

  for (const combo of combos) {
    const quote = resolvePackageQuote({ ...base, ...combo });
    assert.ok(quote.priceResolved, "fiyat çözülemedi");
    for (const total of [quote.monthlyTotal, quote.periodTotal, quote.oneTimeTotal]) {
      if (total.selectedLineCount === 0) continue;
      assert.equal(total.payableCents, (total.campaignCents ?? 0) - (total.bundleDiscountCents ?? 0));
      assert.equal(total.savingsCents, (total.campaignSavingsCents ?? 0) + (total.bundleDiscountCents ?? 0));
    }
  }
});

test("farklı dönemler tek bir parasal toplam alanında birleşmez", () => {
  const quote = resolvePackageQuote({
    ...base,
    dershanem: true,
    kocum: true,
    denemeKulubum: true,
  });
  for (const legacyField of ["listTotalCents", "individualTotalCents", "bundleTotalCents", "savingsCents"]) {
    assert.equal(legacyField in quote, false, `${legacyField} quote modelinden kaldırılmalı`);
  }
  assert.equal(quote.lines.filter((line) => line.selected && line.billing === "monthly").length, quote.monthlyTotal.selectedLineCount);
  assert.equal(quote.lines.filter((line) => line.selected && line.billing === "period").length, quote.periodTotal.selectedLineCount);
});

test("hiç ürün seçilmediğinde fiyat çözülmez", () => {
  const quote = resolvePackageQuote(base);
  assert.equal(quote.selectedCount, 0);
  assert.equal(quote.priceResolved, false);
  assert.equal(quote.monthlyTotal.selectedLineCount, 0);
  assert.equal(quote.periodTotal.selectedLineCount, 0);
  assert.equal(quote.oneTimeTotal.selectedLineCount, 0);
});

test("ders fiyatı sınav seçilmeden de gösterilir", () => {
  // Ders fiyatı LGS ve YKS'de aynı olduğu için sınav seçimi fiyatı beklemez.
  // Eskiden burada `null` dönülüyordu ve kart, fiyat belliyken bile
  // "Fiyat ön görüşmede netleşir" yazıyordu.
  const grup = resolvePackageQuote({ ...base, exam: null, dershanem: true });
  assert.equal(grup.priceResolved, true);
  assert.deepEqual(grup.missingPriceFor, []);
  assert.equal(grup.monthlyTotal.payableCents, 300_000);

  const birebir = resolvePackageQuote({
    ...base,
    exam: null,
    dershanem: true,
    format: "birebir",
  });
  assert.equal(birebir.monthlyTotal.payableCents, 450_000);
});

test("her iki ders formatının da fiyatı tanımlı", () => {
  const formats = lessonFormatPrices();
  assert.equal(formats.grup.campaignCents, 300_000);
  assert.equal(formats.birebir.campaignCents, 450_000);
  for (const [name, pair] of Object.entries(formats)) {
    assert.ok(pair.listCents, `${name} liste fiyatı yok`);
    assert.ok(
      pair.listCents > (pair.campaignCents ?? 0),
      `${name} liste fiyatı kampanyanın üstünde değil`,
    );
  }
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

/* ── Kurucudan doğrudan satın alma sınırı ─────────────────────────────────
 * `resolveBuilderCheckout` ödeme-kritiktir: yalnız gerçek bir checkout SKU'su
 * olan yapılandırma sepete gidebilir. Sınır gevşerse kullanıcı, karşılığı
 * olmayan bir paketi ders paketi fiyatına satın alır.
 */

test("yalnız tek başına grup dersi doğrudan sepete gider", () => {
  const item = resolveBuilderCheckout({ ...base, exam: "LGS", dershanem: true });
  assert.ok(item);
  assert.equal(item.category, "LGS");
  assert.equal(item.subject, "Matematik Ders Paketi");
  assert.equal(item.id, "LGS__Matematik Ders Paketi");
  assert.equal(item.priceCents, getPackagePriceCents("LGS", "Matematik Ders Paketi"));
});

test("sepet kimliği ve fiyatı ödeme-kritik katalogla aynıdır", () => {
  for (const exam of ["LGS", "YKS"] as const) {
    const item = resolveBuilderCheckout({ ...base, exam, dershanem: true });
    assert.ok(item);
    assert.equal(item.id, `${exam}__Matematik Ders Paketi`);
    assert.equal(item.priceCents, getPackagePriceCents(exam, "Matematik Ders Paketi"));
    assert.ok(item.priceCents > 0);
  }
});

test("sınav seçilmeden doğrudan satın alma açılmaz", () => {
  assert.equal(resolveBuilderCheckout({ ...base, exam: null, dershanem: true }), null);
});

test("SKU'su olmayan yapılandırmalar ön görüşmeye kalır", () => {
  const selection = { ...base, exam: "YKS" as const, dershanem: true };
  // birebir format, ek ders ve diğer ürünlerin checkout karşılığı yok
  assert.equal(resolveBuilderCheckout({ ...selection, format: "birebir" }), null);
  assert.equal(resolveBuilderCheckout({ ...selection, extraSubjects: ["Fizik"] }), null);
  assert.equal(resolveBuilderCheckout({ ...selection, kocum: true }), null);
  assert.equal(resolveBuilderCheckout({ ...selection, denemeKulubum: true }), null);
  assert.equal(resolveBuilderCheckout({ ...base, exam: "YKS", kocum: true }), null);
});

test("ürün kartında kesin fiyat yalnız checkout SKU'su olan grup dersi için açılır", () => {
  const selection = { ...base, exam: "YKS" as const };
  const dershanem = resolveBuilderProductCheckout(selection, "dershanem");
  assert.ok(dershanem);
  assert.equal(dershanem.priceCents, resolvePackageQuote({ ...selection, dershanem: true }).lines[0].cents);
  assert.equal(resolveBuilderProductCheckout(selection, "kocum"), null);
  assert.equal(resolveBuilderProductCheckout(selection, "denemeKulubum"), null);
  assert.equal(resolveBuilderProductCheckout({ ...selection, format: "birebir" }, "dershanem"), null);
  assert.equal(resolveBuilderProductCheckout({ ...selection, extraSubjects: ["Fizik"] }, "dershanem"), null);
});

test("ön görüşme seçimi fiyatın kilitlenmediğini iletişim akışına taşır", () => {
  const query = builderContactQuery({ ...base, kocum: true });
  const params = new URLSearchParams(query.slice(1));
  assert.equal(params.get("fiyat"), "on_gorusme");
  assert.match(params.get("paket") ?? "", /Online Koçum/);

  const checkoutBacked = builderContactQuery({ ...base, dershanem: true });
  assert.equal(new URLSearchParams(checkoutBacked.slice(1)).get("fiyat"), null);
});
