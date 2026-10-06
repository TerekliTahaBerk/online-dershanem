/**
 * Panel navigasyon mimarisi — tek kaynak.
 *
 * Business panel'deki `sections.ts` ile aynı sözleşme:
 * - Menüde görünen her öğe burada tanımlanır
 * - Feature flag kapalıysa öğe üretilmez (ölü link yok)
 * - Ürün erişimi (OD/OK/ODK) öğeyi gizler
 * - Menüyü gizlemek güvenlik sınırı değildir; sayfa `requireRole` + flag guard
 *   çalışmaya devam eder
 * - ÜRÜN PANELİ KAPSAMI: girişte seçilen ürün (`Session.activeProduct`)
 *   menüyü o ürüne daraltır. Öğrenci/veli menüsü ürün listesini tek ürüne
 *   indirerek, öğretmen/yönetim menüsü öğe bazlı `NAV_ITEM_SCOPE` ile süzülür.
 *   Kapsam verilmezse (eski çağrılar, testler) davranış değişmez.
 *
 * AYARLAR menüde değildir: hesap ayarları, bildirim tercihleri, erişilebilirlik,
 * veri kullanımı, güvenlik ve oturumlar kenar çubuğunun alt bloğundaki
 * "Ayarlar" merkezinden (`/panel/ayarlar`) açılır; Bildirimler kenar çubuğunun
 * global bloğundadır (docs/panel-design-roadmap.md §6.2).
 *
 * Rol zihinsel modelleri:
 * - ADMIN: Bugün · Kişiler · Eğitim · Denemeler · Sistem
 * - TEACHER: Bugün · Dersler · Öğrenciler · Koçluk · Ölçme · Kaynaklar
 * - STUDENT: Bugün · Çalışmalar · Dersler · Plan · Denemeler · Gelişim
 * - PARENT: sade Bugün · Dersler · Ödev · Öğretmenler · Koçluk · Denemeler · Hesap
 */

import type { ProductCode, UserRole } from "@prisma/client";
import { productRolePath, rolePath, roleStudentsPath } from "@/lib/auth/roles";
import type { PanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PANEL_DOMAIN } from "@/lib/panel/domain-vocabulary";
import { ODK_REPORT_WORKSPACE, odkStaffModules, resolveOdkStaffHome, type StaffPermission } from "@/lib/products/staff-permission-matrix";

export type PanelNavItem = {
  /** Kararlı kimlik — test ve analytics için. */
  id: string;
  href: string;
  label: string;
};

export type PanelNavSection = {
  id: string;
  title: string;
  items: PanelNavItem[];
};

function section(id: string, title: string, items: PanelNavItem[]): PanelNavSection[] {
  return items.length ? [{ id, title, items }] : [];
}

function studentSections(
  root: string,
  products: ProductCode[],
  flags: PanelFeatureFlags,
): PanelNavSection[] {
  const hasOD = products.includes("OD");
  const hasOK = products.includes("OK");
  const hasODK = products.includes("ODK");

  return [
    ...section("bugun", "BUGÜN", [
      { id: "today", href: root, label: PANEL_DOMAIN.bugun },
      { id: "assignments", href: `${root}/odevler`, label: PANEL_DOMAIN.calismalar },
    ]),
    ...section("dersler", "DERSLER", [
      ...(hasOD ? [{ id: "lessons", href: `${root}/takvim`, label: PANEL_DOMAIN.dersler }] : []),
      ...(hasOD
        ? [{ id: "materials", href: `${root}/materyaller`, label: PANEL_DOMAIN.kaynaklar }]
        : []),
      // Tekrar kuyruğu ve kaçırılan ders telafisi OD çalışma alanının parçasıdır;
      // eskiden yalnız ana sayfa önerilerinden açılabiliyordu.
      ...(hasOD && (flags.reviewQueue || flags.recoveryPackage)
        ? [
            {
              id: "review-recovery",
              href: flags.reviewQueue ? `${root}/tekrar` : `${root}/telafi`,
              label: "Tekrar ve telafi",
            },
          ]
        : []),
    ]),
    ...section("plan", "PLAN", [
      ...(hasOK ? [{ id: "coaching", href: `${root}/kocluk`, label: PANEL_DOMAIN.kocluk }] : []),
      ...(hasOK && flags.adaptivePlan
        ? [{ id: "plan", href: `${root}/plan`, label: PANEL_DOMAIN.plan }]
        : []),
      ...(hasOK ? [{ id: "goals", href: `${root}/hedefler`, label: PANEL_DOMAIN.hedefler }] : []),
    ]),
    ...section("denemeler", "DENEMELER", [
      ...(hasODK
        ? [{ id: "odk-exams", href: "/panel/odk/ogrenci/denemeler", label: PANEL_DOMAIN.denemeler }]
        : []),
      ...((hasOD || hasOK) && flags.mockExamAnalysis && !hasODK
        ? [{ id: "mock-exams", href: `${root}/denemeler`, label: PANEL_DOMAIN.denemeler }]
        : []),
      ...((hasOD || hasOK) && flags.mockExamAnalysis && hasODK
        ? [{ id: "mock-exams", href: `${root}/denemeler`, label: "Okul ve kurum denemeleri" }]
        : []),
    ]),
    ...section("gelisim", "GELİŞİM", [
      ...(flags.progressInsights
        ? [{ id: "analiz", href: `${root}/analiz`, label: PANEL_DOMAIN.analiz }]
        : [{ id: "progress", href: `${root}/gelisim`, label: PANEL_DOMAIN.gelisim }]),
      ...(flags.studentCheckIn
        ? [{ id: "check-in", href: `${root}/check-in`, label: PANEL_DOMAIN.checkIn }]
        : []),
      ...(flags.parentWeeklyDigest
        ? [{ id: "weekly-digest", href: `${root}/haftalik`, label: "Haftalık özet" }]
        : []),
      ...(flags.dinoAi ? [{ id: "dino", href: `${root}/dino`, label: "Dino AI" }] : []),
    ]),
  ];
}

function parentSections(
  root: string,
  products: ProductCode[],
  flags: PanelFeatureFlags,
): PanelNavSection[] {
  const hasOD = products.includes("OD");
  const hasOK = products.includes("OK");
  const hasODK = products.includes("ODK");

  return [
    ...section("bugun", "BUGÜN", [
      { id: "today", href: root, label: PANEL_DOMAIN.bugun },
      ...(flags.progressInsights
        ? [{ id: "analiz", href: `${root}/analiz`, label: "Akademik gelişim" }]
        : [{ id: "progress", href: `${root}/takip`, label: PANEL_DOMAIN.gelisim }]),
      ...(flags.parentWeeklyDigest
        ? [{ id: "weekly-digest", href: `${root}/haftalik`, label: "Öğretmen haftalık özeti" }]
        : []),
    ]),
    ...section("dersler", "DERSLER", [
      ...(hasOD ? [{ id: "lessons", href: `${root}/takvim`, label: PANEL_DOMAIN.dersler }] : []),
      ...(hasOD ? [{ id: "assignments", href: `${root}/odevler`, label: PANEL_DOMAIN.odev }] : []),
      ...(hasOD
        ? [{ id: "teachers", href: `${root}/ogretmenler`, label: PANEL_DOMAIN.ogretmenler }]
        : []),
    ]),
    ...section("kocluk", "KOÇLUK", [
      ...(hasOK ? [{ id: "coaching", href: `${root}/kocluk`, label: PANEL_DOMAIN.kocluk }] : []),
    ]),
    ...section("denemeler", "DENEMELER", [
      ...(hasODK
        ? [{ id: "odk-reports", href: "/panel/odk/veli/raporlar", label: PANEL_DOMAIN.denemeler }]
        : []),
      ...(hasOD && flags.mockExamAnalysis && !hasODK
        ? [{ id: "mock-exams", href: `${root}/denemeler`, label: PANEL_DOMAIN.denemeler }]
        : []),
      ...(hasOD && flags.mockExamAnalysis && hasODK
        ? [{ id: "mock-exams", href: `${root}/denemeler`, label: "Okul ve kurum denemeleri" }]
        : []),
    ]),
    ...section("hesap", "HESAP", [
      ...(flags.dinoAi ? [{ id: "dino", href: `${root}/dino`, label: "Dino AI" }] : []),
      { id: "account", href: `${root}/hesap`, label: "Hesap ve paket" },
    ]),
  ];
}

function teacherSections(root: string, flags: PanelFeatureFlags): PanelNavSection[] {
  const studentsHref = roleStudentsPath("TEACHER");

  return [
    ...section("bugun", "BUGÜN", [{ id: "today", href: root, label: PANEL_DOMAIN.bugun }]),
    ...section("dersler", "DERSLER", [
      { id: "lessons", href: `${root}/takvim`, label: PANEL_DOMAIN.dersler },
      { id: "assignments", href: `${root}/odevler`, label: PANEL_DOMAIN.calismalar },
    ]),
    ...section(
      "ogrenciler",
      "ÖĞRENCİLER",
      studentsHref
        ? [{ id: "students", href: studentsHref, label: PANEL_DOMAIN.ogrenciler }]
        : [],
    ),
    ...section("kocluk", "KOÇLUK", [
      ...(flags.adaptivePlan
        ? [{ id: "plan", href: `${root}/plan`, label: PANEL_DOMAIN.haftalikPlan }]
        : []),
      ...(flags.reviewQueue
        ? [{ id: "review", href: `${root}/tekrar`, label: "Tekrar gerekenler" }]
        : []),
      ...(flags.studentCheckIn
        ? [{ id: "help", href: `${root}/yardim`, label: "Yardım isteyenler" }]
        : []),
      ...(flags.interventionInbox
        ? [{ id: "interventions", href: `${root}/mudahale`, label: "Müdahale gerekenler" }]
        : []),
      ...(flags.parentWeeklyDigest
        ? [{ id: "digests", href: `${root}/ozetler`, label: "Haftalık özet" }]
        : []),
      ...(flags.recoveryPackage
        ? [{ id: "recovery", href: `${root}/telafi`, label: "Kaçırılan ders telafisi" }]
        : []),
    ]),
    ...section("olcme", "ÖLÇME", [
      ...(flags.progressInsights
        ? [{ id: "analiz", href: `${root}/analiz`, label: PANEL_DOMAIN.analiz }]
        : []),
      ...(flags.mockExamAnalysis
        ? [{ id: "mock-exams", href: `${root}/denemeler`, label: PANEL_DOMAIN.denemeler }]
        : []),
      ...(flags.mockExamAnalysis
        ? [
            {
              id: "odk-reports",
              href: "/panel/odk/ogretmen/raporlar",
              label: "Deneme Ligi raporları",
            },
          ]
        : []),
    ]),
    ...section("kaynaklar", "KAYNAKLAR", [
      { id: "materials", href: `${root}/materyaller`, label: PANEL_DOMAIN.kaynaklar },
      ...(flags.teacherAiDrafts
        ? [{ id: "ai-drafts", href: `${root}/ai-yardimci`, label: "AI yardımcı" }]
        : []),
    ]),
  ];
}

function adminSections(root: string, flags: PanelFeatureFlags): PanelNavSection[] {
  const operationHref = flags.interventionInbox ? `${root}/mudahale` : `${root}/raporlar`;

  return [
    ...section("bugun", "BUGÜN", [
      { id: "today", href: root, label: PANEL_DOMAIN.operasyonMerkezi },
      { id: "operations", href: operationHref, label: PANEL_DOMAIN.operasyon },
      { id: "provisioning", href: `${root}/isler`, label: PANEL_DOMAIN.provisioning },
    ]),
    ...section("kisiler", "KİŞİLER", [
      { id: "signups", href: `${root}/basvurular`, label: "Yeni kayıtlar" },
      { id: "people", href: `${root}/kisiler`, label: PANEL_DOMAIN.kisiler },
    ]),
    ...section("egitim", "EĞİTİM", [
      { id: "groups", href: `${root}/egitim`, label: "Ders, grup ve ödev yönetimi" },
      { id: "calendar", href: `${root}/takvim`, label: PANEL_DOMAIN.takvim },
      { id: "coaching", href: `${root}/kocluk`, label: PANEL_DOMAIN.kocluk },
      ...(flags.learningOutcomes
        ? [{ id: "outcomes", href: `${root}/kazanimlar`, label: PANEL_DOMAIN.kazanımlar }]
        : []),
    ]),
    ...section("denemeler", "DENEMELER", [
      { id: "odk-exams", href: "/panel/odk/yonetim/sinavlar", label: "Deneme yönetimi" },
      { id: "odk-ops", href: "/panel/odk/yonetim/operasyon", label: "Canlı Operasyon" },
      { id: "odk-results", href: "/panel/odk/yonetim/sonuclar", label: "Puanlama ve yayın" },
      { id: "odk-reports", href: "/panel/odk/yonetim/raporlar", label: "Sonuç raporları" },
      { id: "odk-packages", href: "/panel/odk/yonetim/paketler", label: "Deneme Ligi paketleri" },
      { id: "odk-pilot", href: "/panel/odk/yonetim/pilot", label: "Deneme Ligi kontrollü yayın" },
      ...(flags.mockExamAnalysis
        ? [{ id: "mock-analysis", href: `${root}/denemeler`, label: "Sonuç analizi" }]
        : []),
    ]),
    ...section("sistem", "SİSTEM", [
      { id: "orders", href: `${root}/siparisler`, label: PANEL_DOMAIN.siparisler },
      { id: "analytics", href: `${root}/analitik`, label: "Ürün ve yönetim analitiği" },
      { id: "features", href: `${root}/ozellikler`, label: "Özellikler" },
      { id: "audit", href: `${root}/kayitlar`, label: "İşlem geçmişi" },
      { id: "reports", href: `${root}/raporlar`, label: "Operasyon ve denetim raporları" },
      { id: "pilot", href: `${root}/pilot`, label: "Kontrollü yayın" },
      ...(flags.cohortQuality
        ? [{ id: "quality", href: `${root}/kalite`, label: "Öğrenme kalitesi" }]
        : []),
    ]),
  ];
}

/**
 * Öğretmen / yönetim menü öğelerinin ürün kapsamı. Listede olmayan öğeler
 * ORTAKTIR (kişiler, siparişler, ayarlar…) ve her ürün panelinde görünür.
 * Öğrenci/veli menüsü zaten ürün erişimiyle kurulduğu için bu tabloya ihtiyaç
 * duymaz.
 */
const NAV_ITEM_SCOPE: Partial<Record<"TEACHER" | "ADMIN", Record<string, ProductCode>>> = {
  TEACHER: {
    lessons: "OD",
    assignments: "OD",
    materials: "OD",
    "ai-drafts": "OD",
    recovery: "OD",
    review: "OD",
    plan: "OK",
    help: "OK",
    interventions: "OK",
    digests: "OK",
    // Dış (okul / yayınevi) deneme kayıtları OD öğretmen analizidir; Deneme Ligi değil.
    "mock-exams": "OD",
    "odk-reports": "ODK",
  },
  ADMIN: {
    groups: "OD",
    calendar: "OD",
    outcomes: "OD",
    "mock-analysis": "OD",
    coaching: "OK",
    "odk-exams": "ODK",
    "odk-ops": "ODK",
    "odk-results": "ODK",
    "odk-reports": "ODK",
    "odk-packages": "ODK",
    "odk-pilot": "ODK",
  },
};

/** Bir menü öğesi verilen ürün panelinde görünür mü? */
export function navItemVisibleInScope(role: UserRole, itemId: string, scope: ProductCode): boolean {
  const owner = role === "TEACHER" || role === "ADMIN" ? NAV_ITEM_SCOPE[role]?.[itemId] : undefined;
  return !owner || owner === scope;
}

/**
 * Seçili ürün paneli ve kullanıcının erişebildiği ürünlerden menünün gerçek
 * kapsamını çıkarır. Kullanıcının o ürüne erişimi yoksa (üyelik bitti,
 * eski oturum) kapsam uygulanmaz — boş menü göstermek yerine tam menü.
 */
export function resolveNavScope(
  role: UserRole,
  products: readonly ProductCode[],
  scope: ProductCode | null | undefined,
): ProductCode | null {
  if (!scope) return null;
  // ADMIN her ürün panelinde çalışır (break-glass). Öğretmenin ürünleri artık
  // personel atamalarından gelir (`staffAccessibleProducts`): bayat bir
  // `activeProduct` erişimi olmayan ürünün menüsünü göstermesin.
  if (role === "ADMIN") return scope;
  return products.includes(scope) ? scope : null;
}

function applyScope(
  role: UserRole,
  sections: PanelNavSection[],
  scope: ProductCode,
): PanelNavSection[] {
  const scoped = sections
    .map((navSection) => ({
      ...navSection,
      items: navSection.items
        .filter((item) => navItemVisibleInScope(role, item.id, scope))
        // ODK'nın kendi ana sayfası var; "Bugün" o panelde ODK köküne gider.
        .map((item) => (item.id === "today" && scope === "ODK" ? { ...item, href: productRolePath("ODK", role) } : item)),
    }))
    .filter((navSection) => navSection.items.length > 0);
  return scoped;
}

/**
 * Deneme Ligi PERSONEL menüsü (ADMIN olmayan): global rolden değil personel
 * izinlerinden kurulur. Menü yetki değildir; her sayfa izni ayrıca doğrular.
 */
export function staffOdkNavItems(permissions: readonly StaffPermission[]): PanelNavItem[] {
  const set = new Set(permissions);
  const home = resolveOdkStaffHome({ isAdmin: false, permissions: set });
  if (!home) return [];
  const items: PanelNavItem[] = [{ id: "today", href: home, label: PANEL_DOMAIN.bugun }];
  for (const entry of odkStaffModules(set)) {
    if (entry.href !== home) items.push({ id: entry.id, href: entry.href, label: entry.label });
  }
  if (set.has("odk:report:read_related") && home !== ODK_REPORT_WORKSPACE) {
    items.push({ id: "odk-teacher-reports", href: ODK_REPORT_WORKSPACE, label: "Öğrenci deneme raporları" });
  }
  return items;
}

export function panelNavSections(
  role: UserRole,
  products: ProductCode[],
  flags: PanelFeatureFlags,
  root: string = rolePath(role),
  scope: ProductCode | null = null,
  staffOdkPermissions: readonly StaffPermission[] | null = null,
): PanelNavSection[] {
  const effectiveScope = resolveNavScope(role, products, scope);
  // Personel atamaları uygulanıyorsa (enforce) öğretmenin Deneme Ligi menüsü izinlerden gelir.
  if (role === "TEACHER" && effectiveScope === "ODK" && staffOdkPermissions) {
    return [
      ...section("denemeler", "DENEME LİGİ", staffOdkNavItems(staffOdkPermissions)),
    ];
  }
  const scopedProducts = effectiveScope && (role === "STUDENT" || role === "PARENT") ? [effectiveScope] : products;
  let sections: PanelNavSection[];
  switch (role) {
    case "STUDENT":
      sections = studentSections(root, scopedProducts, flags);
      break;
    case "PARENT":
      sections = parentSections(root, scopedProducts, flags);
      break;
    case "TEACHER":
      sections = teacherSections(root, flags);
      break;
    case "ADMIN":
      sections = adminSections(root, flags);
      break;
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
  return effectiveScope ? applyScope(role, sections, effectiveScope) : sections;
}

/**
 * Mobil alt çubuk: en fazla 4 birincil aksiyon (+ Menü düğmesi ayrı).
 * Feature flag / ürün kapalıysa yedek öğe seçilir; ölü link üretilmez.
 */
export function mobilePrimaryNav(
  role: UserRole,
  allProducts: ProductCode[],
  flags: PanelFeatureFlags,
  root: string = rolePath(role),
  scope: ProductCode | null = null,
  staffOdkPermissions: readonly StaffPermission[] | null = null,
): PanelNavItem[] {
  const effectiveScope = resolveNavScope(role, allProducts, scope);
  if (effectiveScope && (role === "ADMIN" || role === "TEACHER")) {
    // Personel alt çubuğu: seçili panelin menüsünden ilk dört öğe.
    return panelNavSections(role, allProducts, flags, root, effectiveScope, staffOdkPermissions)
      .flatMap((navSection) => navSection.items)
      .slice(0, 4);
  }
  const items = baseMobilePrimaryNav(role, effectiveScope ? [effectiveScope] : allProducts, flags, root);
  return effectiveScope === "ODK"
    ? items.map((item) => (item.id === "today" ? { ...item, href: productRolePath("ODK", role) } : item))
    : items;
}

function baseMobilePrimaryNav(
  role: UserRole,
  products: ProductCode[],
  flags: PanelFeatureFlags,
  root: string,
): PanelNavItem[] {
  const hasOD = products.includes("OD");
  const hasOK = products.includes("OK");
  const hasODK = products.includes("ODK");

  if (role === "STUDENT") {
    const primary: PanelNavItem[] = [
      { id: "today", href: root, label: PANEL_DOMAIN.bugun },
      { id: "assignments", href: `${root}/odevler`, label: PANEL_DOMAIN.calismalar },
    ];
    if (hasOD) {
      primary.push({ id: "lessons", href: `${root}/takvim`, label: PANEL_DOMAIN.dersler });
    } else if (hasOK) {
      primary.push({ id: "coaching", href: `${root}/kocluk`, label: PANEL_DOMAIN.kocluk });
    }
    if (hasODK) {
      primary.push({
        id: "odk-exams",
        href: "/panel/odk/ogrenci/denemeler",
        label: PANEL_DOMAIN.denemeler,
      });
    } else if (flags.adaptivePlan && hasOK) {
      primary.push({ id: "plan", href: `${root}/plan`, label: PANEL_DOMAIN.plan });
    } else if (hasOK) {
      primary.push({ id: "goals", href: `${root}/hedefler`, label: PANEL_DOMAIN.hedefler });
    } else if (flags.progressInsights) {
      primary.push({ id: "analiz", href: `${root}/analiz`, label: PANEL_DOMAIN.analiz });
    } else {
      primary.push({ id: "progress", href: `${root}/gelisim`, label: PANEL_DOMAIN.gelisim });
    }
    return primary.slice(0, 4);
  }

  if (role === "TEACHER") {
    const fourth: PanelNavItem = flags.studentCheckIn
      ? { id: "help", href: `${root}/yardim`, label: "Yardım" }
      : flags.mockExamAnalysis
        ? { id: "mock-exams", href: `${root}/denemeler`, label: PANEL_DOMAIN.denemeler }
        : {
            id: "students",
            href: roleStudentsPath("TEACHER") ?? `${root}/gruplar`,
            label: PANEL_DOMAIN.ogrenciler,
          };
    return [
      { id: "today", href: root, label: PANEL_DOMAIN.bugun },
      { id: "assignments", href: `${root}/odevler`, label: PANEL_DOMAIN.calismalar },
      { id: "lessons", href: `${root}/takvim`, label: PANEL_DOMAIN.dersler },
      fourth,
    ];
  }

  if (role === "ADMIN") {
    const operationHref = flags.interventionInbox ? `${root}/mudahale` : `${root}/raporlar`;
    return [
      { id: "today", href: root, label: PANEL_DOMAIN.operasyonMerkezi },
      { id: "operations", href: operationHref, label: PANEL_DOMAIN.operasyon },
      { id: "orders", href: `${root}/siparisler`, label: PANEL_DOMAIN.siparisler },
      {
        id: "odk-ops",
        href: "/panel/odk/yonetim/operasyon",
        label: PANEL_DOMAIN.denemeler,
      },
    ];
  }

  // PARENT
  const parentPrimary: PanelNavItem[] = [
    { id: "today", href: root, label: PANEL_DOMAIN.bugun },
    flags.progressInsights
      ? { id: "analiz", href: `${root}/analiz`, label: PANEL_DOMAIN.analiz }
      : { id: "progress", href: `${root}/takip`, label: PANEL_DOMAIN.gelisim },
  ];
  if (hasOD) {
    parentPrimary.push({ id: "lessons", href: `${root}/takvim`, label: PANEL_DOMAIN.dersler });
  }
  if (hasODK) {
    parentPrimary.push({
      id: "odk-reports",
      href: "/panel/odk/veli/raporlar",
      label: PANEL_DOMAIN.denemeler,
    });
  } else if (hasOD && flags.mockExamAnalysis) {
    parentPrimary.push({
      id: "mock-exams",
      href: `${root}/denemeler`,
      label: PANEL_DOMAIN.denemeler,
    });
  } else if (hasOK) {
    parentPrimary.push({ id: "coaching", href: `${root}/kocluk`, label: PANEL_DOMAIN.kocluk });
  }
  return parentPrimary.slice(0, 4);
}

/** Menüdeki tüm href'ler — ölü link / flag tutarlılık testleri için. */
export function panelNavHrefs(
  role: UserRole,
  products: ProductCode[],
  flags: PanelFeatureFlags,
): string[] {
  return panelNavSections(role, products, flags).flatMap((section) =>
    section.items.map((item) => item.href),
  );
}
