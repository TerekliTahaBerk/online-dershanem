import { expect, test, type Page } from "@playwright/test";
import { formatCents, resolvePackageQuote, type BuilderSelection } from "../../lib/commerce/package-builder-pricing";

async function openBuilder(page: Page) {
  await page.goto("/paketler");
  await page.waitForFunction(() => {
    const button = document.querySelector('button[aria-pressed]');
    return !!button && Object.keys(button).some((key) => key.startsWith("__reactProps$"));
  });
}

const base: BuilderSelection = {
  exam: "LGS", dershanem: false, kocum: false, denemeKulubum: false,
  format: "grup", subject: "Matematik", extraSubjects: [],
};

test("üç ürünün fiyatı sınav ve online satın alma durumundan bağımsız görünür", async ({ page }) => {
  await openBuilder(page);
  const quote = resolvePackageQuote(base);
  for (const line of quote.lines) {
    const card = page.getByRole("button", { name: new RegExp(line.label) }).first();
    await expect(card).toContainText(formatCents(line.cents!));
    await expect(card).not.toContainText("Fiyat ön görüşmede netleşir");
  }
});

for (const combo of [
  { dershanem: true, kocum: true, denemeKulubum: false },
  { dershanem: true, kocum: false, denemeKulubum: true },
  { dershanem: false, kocum: true, denemeKulubum: true },
  { dershanem: true, kocum: true, denemeKulubum: true },
]) {
  test(`birlikte alım hesaplanan aylık ve dönemlik fiyatı gösterir: ${JSON.stringify(combo)}`, async ({ page }) => {
    await openBuilder(page);
    const quote = resolvePackageQuote({ ...base, ...combo });
    for (const line of quote.lines.filter((item) => item.selected)) {
      await page.getByRole("button", { name: new RegExp(line.label) }).first().click();
    }
    const summary = page.getByRole("complementary", { name: "Paket özeti" });
    for (const total of [quote.monthlyTotal, quote.periodTotal].filter((item) => item.selectedLineCount > 0)) {
      await expect(summary).toContainText(formatCents(total.payableCents!));
      await expect(summary).toContainText(total.billing === "monthly" ? "Aylık" : "Dönemlik");
    }
    await expect(summary).not.toContainText("Fiyat ön görüşmede netleşir");
    await summary.getByRole("link", { name: "Başlangıcı Planla" }).click();
    await expect(page).toHaveURL(/\/iletisim/);
    expect(new URL(page.url()).searchParams.has("fiyat")).toBe(false);
    expect(new URL(page.url()).hash).toBe("#on-gorusme");
    const selection = page.getByRole("complementary", { name: "Seçiminiz" });
    for (const [selected, label] of [
      [combo.dershanem, "onlinedershanem."],
      [combo.kocum, "onlinekoçum."],
      [combo.denemeKulubum, "onlinedenemekulübüm."],
    ] as const) {
      if (selected) await expect(selection).toContainText(label);
    }
  });
}

test("birebir ve ek ders fiyatı kurucunun fiyat kaynağını izler", async ({ page }) => {
  await openBuilder(page);
  await page.getByRole("button", { name: /onlinedershanem./ }).first().click();
  await page.getByRole("button", { name: /LGS sınavına gireceğim/ }).click();
  await page.getByRole("button", { name: /Birebir özel ders/ }).click();
  const summary = page.getByRole("complementary", { name: "Paket özeti" });
  const quote = resolvePackageQuote({ ...base, dershanem: true, format: "birebir" });
  await expect(summary).toContainText(formatCents(quote.monthlyTotal.payableCents!));
  await expect(summary).not.toContainText("Fiyat ön görüşmede netleşir");
  await page.getByRole("button", { name: "+ Fen Bilimleri", exact: true }).click();
  const extra = resolvePackageQuote({ ...base, dershanem: true, format: "birebir", extraSubjects: ["Fen Bilimleri"] });
  await expect(summary).toContainText(formatCents(extra.monthlyTotal.payableCents!));
});

test("grup dersi seçimi mevcut sepet kimliği ve fiyatıyla satın alınır", async ({ page }) => {
  await openBuilder(page);
  await page.getByRole("button", { name: /onlinedershanem./ }).first().click();
  await page.getByRole("button", { name: /LGS sınavına gireceğim/ }).click();
  await page.getByRole("complementary", { name: "Paket özeti" }).getByRole("button", { name: "Bu Paketle Başla" }).click();
  await expect(page).toHaveURL(/\/sepet/);
  const items = await page.evaluate(() => JSON.parse(localStorage.getItem("od_cart_v1") ?? "[]"));
  expect(items[0]).toMatchObject({ category: "LGS", subject: "Matematik Ders Paketi", priceCents: resolvePackageQuote({ ...base, dershanem: true }).monthlyTotal.payableCents });
});

test("ana ekrana ekleme yönergesi mobilde bulunur; kamplar menü ve sitemap'te görünmez", async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  // Streamed SSR placeholders can briefly duplicate footer content.
  await expect(page.getByText("Ana ekrana ekle", { exact: true })).toHaveCount(1);
  await expect(page.getByText("Ana ekrana ekle", { exact: true })).toBeVisible();
  await expect(page.getByText(/iPhone.*Safari.*Paylaş.*Android.*Ana ekrana ekle/).first()).toBeVisible();
  await expect(page.locator('header a[href="/kamplar"], footer a[href="/kamplar"]')).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("Mobil uygulama yakında");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).not.toContain("/kamplar");
  const camp = await request.get("/kamplar");
  expect(camp.ok()).toBe(true);
});
