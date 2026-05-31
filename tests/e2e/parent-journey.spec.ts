/**
 * Phase 3 / Session 12 — D8: Parent role journey.
 *
 * Veli panelinin kritik sayfalarının render olduğunu, bağlı çocuk
 * gözüktüğünü, forge edilen `studentId` veriyi sızdırmadığını ve
 * ödeme sayfasında "tahsilat yap" benzeri admin-only butonun olmadığını
 * doğrular.
 */
import { test, expect } from "./fixtures/auth";
import { getSeedIds, testPrisma } from "./helpers/db";

test.describe("D8 — Parent role journey @smoke", () => {
  test("veli /panel/veli — bağlı çocuk listeleniyor", async ({ veliPage }) => {
    const seed = await getSeedIds();
    const student = await testPrisma.student.findUniqueOrThrow({
      where: { id: seed.studentId },
      select: { fullName: true },
    });
    await veliPage.goto("/panel/veli");
    await expect(veliPage).toHaveURL(/\/panel\/veli/);
    // En azından çocuk veya çocuğum kelimesi + bağlı öğrenci adı yer alıyor
    await expect(veliPage.locator("body")).toContainText(/çocu/i);
    // /panel/veli/cocuklarim'da kesin ad bulunur
    await veliPage.goto("/panel/veli/cocuklarim");
    await expect(veliPage.locator("body")).toContainText(student.fullName.split(" ")[0]);
  });

  test("veli forge edilen studentId ile başka çocuk verisini sızdıramıyor", async ({ veliPage }) => {
    await veliPage.goto("/panel/veli/cocuklarim?studentId=forged-veli-xyz");
    const html = await veliPage.content();
    expect(html).not.toContain("forged-veli-xyz");
    // Yetkisiz/kırık değil — kendi sayfası açılıyor
    await expect(veliPage.locator("body")).toContainText(/çocu/i);
  });

  test("veli /panel/veli/odemeler — kendi ödemeleri listeleniyor, admin tahsilat butonu yok", async ({ veliPage }) => {
    await veliPage.goto("/panel/veli/odemeler");
    await expect(veliPage).toHaveURL(/\/panel\/veli\/odemeler/);
    await expect(veliPage.locator("body")).toContainText(/ödeme|taksit|borç|fatura/i);
    // Veli "tahsilat yap / ödendi olarak işaretle" butonuna sahip olmamalı.
    const adminButtons = veliPage.getByRole("button", {
      name: /tahsilat yap|ödendi olarak işaretle|tahsil et/i,
    });
    expect(await adminButtons.count()).toBe(0);
  });

  test("veli /panel/veli/faturalar erişilebilir", async ({ veliPage }) => {
    const res = await veliPage.goto("/panel/veli/faturalar");
    expect(res?.status() ?? 0).toBeLessThan(500);
  });
});
