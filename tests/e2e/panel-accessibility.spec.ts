import { expect, test, type Page } from "@playwright/test";
import { panelE2EAccounts } from "../../lib/e2e/panel-accounts";
import { accessibilityScan, describeViolations } from "./helpers/axe";
import { loginAs } from "./helpers/panel-login";

/**
 * PANEL GENELİ ERİŞİLEBİLİRLİK TARAMASI (rol × rota).
 *
 * Diğer spec'lerdeki Axe çağrıları tek tek seçilmiş ekranlarda koşuyordu;
 * burada her rolün `app/panel/**` altındaki sayfaları bir listeden gezilir.
 * Yeni bir panel sayfası eklendiğinde yapılacak iş, rolün listesine rotayı
 * eklemektir.
 *
 * Kapsam dışı bırakılanlar (bilinçli):
 * - `/panel`, `/panel/odk`, `/panel/urun-sec`: yalnız yönlendirme yapar.
 * - `/panel/odk/**` ana yüzeyleri `odk-product-quality.spec.ts` tarıyor;
 *   orada olmayan iki yönetim ekranı aşağıda admin listesinde.
 * - `/panel/odk/ogrenci/denemeler/[id]/sonuc`: tohumda tamamlanmış ODK
 *   denemesi yok; sayfa sonuç olmadan açılmıyor.
 * - `/panel/ogrenci/dino`, `/panel/veli/dino`: `dinoAi` panel bayrağı
 *   CI env'inde kapalı; sayfa `notFound()` döner. Bayrak açıldığında
 *   listelere eklenmeli.
 *
 * Bir rota "Sayfa bulunamadı" gösterirse bu da hata sayılır — erişilemeyen
 * bir sayfa taranmış gibi raporlanmasın.
 */

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1366, height: 900 };

type RoleSweep = {
  key: string;
  account: { email: string; password: string };
  home: string;
  routes: string[];
  /** Rolün en az bir modal/dialog akışı: dialog AÇIKKEN taranır. */
  openDialog: (page: Page) => Promise<void>;
};

/** Tüm rollerde açılan hesap sayfaları (`/panel/guvenlik` yalnız admin). */
const sharedAccountRoutes = [
  "/panel/bildirimler",
  "/panel/erisilebilirlik",
  "/panel/oturumlar",
  "/panel/parola",
  "/panel/veri-kullanimi",
];

async function openMobilePanelMenu(page: Page) {
  await page.setViewportSize(MOBILE);
  await page.getByRole("button", { name: "Panel menüsünü aç" }).click();
  await expect(page.getByRole("dialog", { name: "Panel menüsü" })).toBeVisible();
}

const sweeps: RoleSweep[] = [
  {
    key: "öğrenci",
    account: panelE2EAccounts.student,
    home: "/panel/ogrenci",
    routes: [
      "/panel/ogrenci",
      "/panel/ogrenci/analiz",
      "/panel/ogrenci/check-in",
      "/panel/ogrenci/denemeler",
      "/panel/ogrenci/gelisim",
      "/panel/ogrenci/haftalik",
      "/panel/ogrenci/hedefler",
      "/panel/ogrenci/kocluk",
      "/panel/ogrenci/materyaller",
      "/panel/ogrenci/odevler",
      "/panel/ogrenci/plan",
      "/panel/ogrenci/profil",
      "/panel/ogrenci/takvim",
      "/panel/ogrenci/takvim/e2e-lesson",
      "/panel/ogrenci/tekrar",
      "/panel/ogrenci/telafi",
      ...sharedAccountRoutes,
    ],
    openDialog: openMobilePanelMenu,
  },
  {
    key: "öğretmen",
    account: panelE2EAccounts.teacher,
    home: "/panel/ogretmen",
    routes: [
      "/panel/ogretmen",
      "/panel/ogretmen/ai-yardimci",
      "/panel/ogretmen/analiz",
      "/panel/ogretmen/denemeler",
      "/panel/ogretmen/ders/e2e-lesson",
      "/panel/ogretmen/gruplar",
      // Hazırlık sayfası öğrenci profili kimliği alır (ders değil).
      "/panel/ogretmen/hazirlik/e2e-student-profile",
      "/panel/ogretmen/materyaller",
      "/panel/ogretmen/mudahale",
      "/panel/ogretmen/odevler",
      "/panel/ogretmen/ogrenci/e2e-student-profile",
      "/panel/ogretmen/ozetler",
      "/panel/ogretmen/plan",
      "/panel/ogretmen/takvim",
      "/panel/ogretmen/tekrar",
      "/panel/ogretmen/telafi",
      "/panel/ogretmen/yardim",
    ],
    openDialog: openMobilePanelMenu,
  },
  {
    key: "veli",
    account: panelE2EAccounts.parent,
    home: "/panel/veli",
    routes: [
      "/panel/veli",
      "/panel/veli/analiz",
      "/panel/veli/bildirimler",
      "/panel/veli/denemeler",
      "/panel/veli/haftalik",
      "/panel/veli/hesap",
      "/panel/veli/kocluk",
      "/panel/veli/odevler",
      "/panel/veli/ogretmenler",
      "/panel/veli/takip",
      "/panel/veli/takvim",
    ],
    openDialog: openMobilePanelMenu,
  },
  {
    key: "yönetici",
    account: panelE2EAccounts.admin,
    home: "/panel/yonetim",
    routes: [
      "/panel/yonetim",
      "/panel/yonetim/analitik",
      "/panel/yonetim/analitik/lead_count",
      "/panel/yonetim/denemeler",
      "/panel/yonetim/egitim",
      "/panel/yonetim/egitmenler",
      "/panel/guvenlik",
      ...sharedAccountRoutes,
      "/panel/yonetim/gruplar/e2e-group",
      "/panel/yonetim/isler",
      "/panel/yonetim/kalite",
      "/panel/yonetim/kayitlar",
      "/panel/yonetim/kazanimlar",
      "/panel/yonetim/kisiler",
      "/panel/yonetim/kocluk",
      "/panel/yonetim/kullanicilar",
      "/panel/yonetim/kullanicilar/e2e-user-student",
      "/panel/yonetim/mudahale",
      "/panel/yonetim/ogrenciler",
      "/panel/yonetim/ogrenciler/e2e-student-profile",
      "/panel/yonetim/ozellikler",
      "/panel/yonetim/pilot",
      "/panel/yonetim/raporlar",
      // `siparisler/[id]` OD siparişi (odOrder) okur; e2e tohumunda OD
      // siparişi yok, bu yüzden detay sayfası burada taranamıyor.
      "/panel/yonetim/siparisler",
      "/panel/yonetim/takvim",
      "/panel/yonetim/veliler",
      "/panel/odk/yonetim/paketler",
      "/panel/odk/yonetim/sonuclar",
    ],
    openDialog: async (page) => {
      await page.setViewportSize(DESKTOP);
      await page.getByRole("button", { name: "Panelde ara" }).first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },
  {
    // İşletme erişimi BusinessRoleAssignment ile gelir; e2e yöneticisi her iki
    // iş biriminde SUPER_ADMIN olduğu için tüm bölümleri görebilir.
    key: "işletme yöneticisi",
    account: panelE2EAccounts.admin,
    home: "/panel/yonetim/isletme",
    routes: [
      "/panel/yonetim/isletme",
      ...[
        "genel-bakis",
        "mesaj-kutusu",
        "adaylar",
        "satis-hunisi",
        "reklamlar",
        "kampanyalar",
        "gelirler",
        "giderler",
        "vergiler",
        "mutabakat",
        "raporlar",
        "ai-bilgi-merkezi",
        "otomasyon-kurallari",
        "entegrasyonlar",
        "sistem-kayitlari",
        "ayarlar",
      ].map((section) => `/panel/yonetim/isletme/${section}`),
    ],
    openDialog: async (page) => {
      // Satış hunisinde LOST'a geçiş zorunlu "kayıp nedeni" dialog'unu açar;
      // dialog "Vazgeç" ile kapatılır, tohum verisi değişmez.
      await page.setViewportSize(DESKTOP);
      await page.goto("/panel/yonetim/isletme/satis-hunisi");
      await page.getByLabel(/aşaması$/).first().selectOption("LOST");
      await expect(page.getByRole("dialog", { name: "Kayıp nedeni zorunlu" })).toBeVisible();
    },
  },
];

async function enterPanel(page: Page, sweep: RoleSweep) {
  await loginAs(page, { ...sweep.account, failureLabel: sweep.key });
  await page.goto(sweep.home);
  await expect(page.getByRole("main")).toBeVisible();
}

async function expectPageAccessible(page: Page, label: string) {
  const result = await accessibilityScan(page).analyze();
  expect.soft(result.violations, `${label} erişilebilirlik ihlalleri:\n${describeViolations(result.violations)}`).toEqual([]);
}

test.describe("panel erişilebilirlik taraması", () => {
  for (const sweep of sweeps) {
    test(`${sweep.key}: panel rotaları mobilde WCAG taramasını geçer`, async ({ page }) => {
      test.setTimeout(60_000 + sweep.routes.length * 15_000);
      await page.setViewportSize(MOBILE);
      await enterPanel(page, sweep);

      for (const route of sweep.routes) {
        await test.step(route, async () => {
          await page.goto(route, { waitUntil: "domcontentloaded" });
          await expect(page.getByRole("main")).toBeVisible();
          await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
          const notFound = await page.getByRole("heading", { name: "Sayfa bulunamadı" }).count();
          expect.soft(notFound, `${route} bu rol için açılmadı`).toBe(0);
          if (notFound) return;
          await expectPageAccessible(page, route);
        });
      }
    });

    test(`${sweep.key}: masaüstü ana sayfa ve dialog açıkken WCAG taramasını geçer`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize(DESKTOP);
      await enterPanel(page, sweep);
      await expectPageAccessible(page, `${sweep.home} (masaüstü)`);

      await sweep.openDialog(page);
      await expectPageAccessible(page, `${sweep.key} dialog`);
    });
  }
});
