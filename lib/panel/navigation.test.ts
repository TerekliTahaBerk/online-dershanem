import assert from "node:assert/strict";
import { test } from "node:test";
import type { ProductCode, UserRole } from "@prisma/client";
import { panelFeatureDefaults, type PanelFeatureFlags } from "../panel-feature-flags";
import { PANEL_DOMAIN } from "./domain-vocabulary";
import { mobilePrimaryNav, panelNavHrefs, panelNavSections } from "./navigation";

const ALL_FLAGS_OFF: PanelFeatureFlags = Object.fromEntries(
  (Object.keys(panelFeatureDefaults) as (keyof PanelFeatureFlags)[]).map((key) => [key, false]),
) as PanelFeatureFlags;

const ALL_FLAGS_ON: PanelFeatureFlags = Object.fromEntries(
  (Object.keys(panelFeatureDefaults) as (keyof PanelFeatureFlags)[]).map((key) => [key, true]),
) as PanelFeatureFlags;

const ALL_PRODUCTS: ProductCode[] = ["OD", "OK", "ODK"];

function sectionTitles(role: UserRole, products: ProductCode[], flags: PanelFeatureFlags) {
  return panelNavSections(role, products, flags).map((section) => section.title);
}

function labels(role: UserRole, products: ProductCode[], flags: PanelFeatureFlags) {
  return panelNavSections(role, products, flags).flatMap((section) =>
    section.items.map((item) => item.label),
  );
}

test("admin üst alanları Öğrenci Başarısı modeline göre gruplanır", () => {
  const titles = sectionTitles("ADMIN", [], ALL_FLAGS_ON);
  assert.deepEqual(
    titles.filter((title) => title !== "GENEL"),
    ["BUGÜN", "EĞİTİM", "ÖĞRENCİ BAŞARISI", "DENEMELER", "TİCARET", "SİSTEM"],
  );
  assert.ok(!titles.includes("KOÇLUK"));
});

test("admin terminolojisi eğitmen/işler yerine canonical etiketleri kullanır", () => {
  const navLabels = labels("ADMIN", [], ALL_FLAGS_ON);
  assert.ok(navLabels.includes(PANEL_DOMAIN.ogretmenler));
  assert.ok(navLabels.includes(PANEL_DOMAIN.provisioning));
  assert.ok(navLabels.includes("Özellikler"));
  assert.ok(navLabels.includes(`${PANEL_DOMAIN.gruplar} ve ${PANEL_DOMAIN.dersler}`));
  assert.ok(!navLabels.includes("Eğitmenler"));
  assert.ok(!navLabels.includes("İşler / Provisioning"));
  assert.ok(!navLabels.includes("Özellikler / Sistem"));
  assert.ok(!navLabels.includes("Dersler & Gruplar"));
});

test("öğretmen zihinsel modeli Dersler ≠ Çalışmalar ayrımını korur", () => {
  const sections = panelNavSections("TEACHER", [], ALL_FLAGS_ON);
  const dersler = sections.find((section) => section.id === "dersler");
  assert.ok(dersler);
  assert.deepEqual(
    dersler!.items.map((item) => ({ href: item.href, label: item.label })),
    [
      { href: "/panel/ogretmen/takvim", label: PANEL_DOMAIN.dersler },
      { href: "/panel/ogretmen/odevler", label: PANEL_DOMAIN.calismalar },
    ],
  );
  assert.ok(sections.some((section) => section.id === "ogrenciler"));
  assert.ok(sections.some((section) => section.id === "kocluk"));
  assert.ok(sections.some((section) => section.id === "olcme"));
  assert.ok(sections.some((section) => section.id === "kaynaklar"));
});

test("öğrenci zihinsel modeli ürün bayraklarıyla hizalanır", () => {
  const titles = sectionTitles("STUDENT", ALL_PRODUCTS, ALL_FLAGS_ON);
  assert.ok(titles.includes("BUGÜN"));
  assert.ok(titles.includes("DERSLER"));
  assert.ok(titles.includes("PLAN"));
  assert.ok(titles.includes("DENEMELER"));
  assert.ok(titles.includes("GELİŞİM"));
  assert.ok(!titles.includes("DERSHANEM"));
  assert.ok(!titles.includes("KOÇUM"));
  assert.ok(!titles.includes("DENEME KULÜBÜ"));

  const navLabels = labels("STUDENT", ALL_PRODUCTS, ALL_FLAGS_ON);
  assert.ok(navLabels.includes(PANEL_DOMAIN.calismalar));
  assert.ok(navLabels.includes(PANEL_DOMAIN.plan));
  assert.ok(navLabels.includes(PANEL_DOMAIN.gelisim));
  assert.ok(navLabels.includes(PANEL_DOMAIN.checkIn));
  assert.ok(!navLabels.includes("Ödevler"));
  assert.ok(!navLabels.includes("Gelişimim"));
  assert.ok(!navLabels.includes("Koçluk Merkezi"));
  assert.ok(!navLabels.includes("Haftalık Plan"));
  assert.ok(!navLabels.includes("Nasılım?"));
});

test("veli navigasyonu sade kalır ve ürün yokken boş bölüm üretmez", () => {
  const titles = sectionTitles("PARENT", [], ALL_FLAGS_OFF);
  assert.deepEqual(titles, ["BUGÜN", "HESAP"]);
  assert.ok(!titles.includes("DERSLER"));
  assert.ok(!titles.includes("KOÇLUK"));
  assert.ok(!titles.includes("DENEMELER"));
});

test("kapalı feature flag menüde ölü link üretmez", () => {
  for (const role of ["ADMIN", "TEACHER", "STUDENT", "PARENT"] as UserRole[]) {
    const flaggedHrefs = new Set(panelNavHrefs(role, ALL_PRODUCTS, ALL_FLAGS_ON));
    const closedHrefs = new Set(panelNavHrefs(role, ALL_PRODUCTS, ALL_FLAGS_OFF));
    for (const href of closedHrefs) {
      // Kapalı bayrak setinde kalan her link, açık sette de geçerli bir
      // temel yüzey olmalı; bayrağa bağlı yollar kapalı sette olmamalı.
      assert.ok(flaggedHrefs.has(href) || href.includes("/bildirimler"), href);
    }

    const closedLabels = labels(role, ALL_PRODUCTS, ALL_FLAGS_OFF);
    assert.ok(!closedLabels.includes(PANEL_DOMAIN.checkIn), role);
    assert.ok(!closedLabels.includes("Erişilebilirlik"), role);
    assert.ok(!closedLabels.includes("Veri kullanımı"), role);
    assert.ok(!closedLabels.includes("Sonuç analizi"), role);
  }

  const teacherClosed = panelNavHrefs("TEACHER", [], ALL_FLAGS_OFF);
  assert.ok(!teacherClosed.includes("/panel/ogretmen/plan"));
  assert.ok(!teacherClosed.includes("/panel/ogretmen/mudahale"));
  assert.ok(!teacherClosed.includes("/panel/ogretmen/tekrar"));
  assert.ok(!teacherClosed.includes("/panel/ogretmen/yardim"));
  assert.ok(!teacherClosed.includes("/panel/ogretmen/ai-yardimci"));

  const adminClosed = panelNavHrefs("ADMIN", [], ALL_FLAGS_OFF);
  assert.ok(!adminClosed.includes("/panel/yonetim/kazanimlar"));
  assert.ok(!adminClosed.includes("/panel/yonetim/kalite"));
  assert.ok(!adminClosed.includes("/panel/yonetim/denemeler"));
});

test("mobil birincil aksiyon en fazla 4 öğe üretir", () => {
  for (const role of ["ADMIN", "TEACHER", "STUDENT", "PARENT"] as UserRole[]) {
    const items = mobilePrimaryNav(role, ALL_PRODUCTS, ALL_FLAGS_ON);
    assert.ok(items.length <= 4, `${role} → ${items.length}`);
    assert.ok(items.length >= 2, role);
    assert.equal(new Set(items.map((item) => item.href)).size, items.length, role);
  }
});

test("admin mobil Operasyon hedefi masaüstü ile aynıdır", () => {
  const desktopOps = panelNavSections("ADMIN", [], ALL_FLAGS_ON)
    .flatMap((section) => section.items)
    .find((item) => item.id === "operations");
  const mobileOps = mobilePrimaryNav("ADMIN", [], ALL_FLAGS_ON).find(
    (item) => item.id === "operations",
  );
  assert.ok(desktopOps);
  assert.ok(mobileOps);
  assert.equal(mobileOps!.href, desktopOps!.href);
  assert.equal(mobileOps!.href, "/panel/yonetim/mudahale");

  const closedOps = mobilePrimaryNav("ADMIN", [], ALL_FLAGS_OFF).find(
    (item) => item.id === "operations",
  );
  assert.equal(closedOps?.href, "/panel/yonetim/raporlar");
});

test("öğrenci OD yokken Dersler linki üretmez", () => {
  const hrefs = panelNavHrefs("STUDENT", ["OK"], ALL_FLAGS_ON);
  assert.ok(!hrefs.includes("/panel/ogrenci/takvim"));
  assert.ok(hrefs.includes("/panel/ogrenci/kocluk"));
  assert.ok(hrefs.includes("/panel/ogrenci/plan"));
});
