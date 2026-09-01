/**
 * Panel navigasyon mimarisi — tek kaynak.
 *
 * Business panel'deki `sections.ts` ile aynı sözleşme:
 * - Menüde görünen her öğe burada tanımlanır
 * - Feature flag kapalıysa öğe üretilmez (ölü link yok)
 * - Ürün erişimi (OD/OK/ODK) öğeyi gizler
 * - Menüyü gizlemek güvenlik sınırı değildir; sayfa `requireRole` + flag guard
 *   çalışmaya devam eder
 *
 * Rol zihinsel modelleri:
 * - ADMIN: Bugün · Eğitim · Öğrenci Başarısı · Denemeler · Ticaret · Sistem
 * - TEACHER: Bugün · Dersler · Öğrenciler · Koçluk · Ölçme · Kaynaklar
 * - STUDENT: Bugün · Çalışmalar · Dersler · Plan · Denemeler · Gelişim
 * - PARENT: sade Bugün · Dersler · Koçluk · Denemeler · Hesap
 */

import type { ProductCode, UserRole } from "@prisma/client";
import { rolePath, roleStudentsPath } from "@/lib/auth/roles";
import type { PanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PANEL_DOMAIN } from "@/lib/panel/domain-vocabulary";

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

function commonItems(flags: PanelFeatureFlags): PanelNavItem[] {
  return [
    { id: "notifications", href: "/panel/bildirimler", label: PANEL_DOMAIN.bildirimler },
    ...(flags.accessibilityProfile
      ? [{ id: "accessibility", href: "/panel/erisilebilirlik", label: "Erişilebilirlik" }]
      : []),
    ...(flags.offlineMode
      ? [{ id: "data-usage", href: "/panel/veri-kullanimi", label: "Veri kullanımı" }]
      : []),
  ];
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
      ...(hasOD && flags.mockExamAnalysis && !hasODK
        ? [{ id: "mock-exams", href: `${root}/denemeler`, label: PANEL_DOMAIN.denemeler }]
        : []),
      ...(hasOD && flags.mockExamAnalysis && hasODK
        ? [{ id: "mock-exams", href: `${root}/denemeler`, label: "Dış denemeler" }]
        : []),
    ]),
    ...section("gelisim", "GELİŞİM", [
      { id: "progress", href: `${root}/gelisim`, label: PANEL_DOMAIN.gelisim },
      ...(flags.studentCheckIn
        ? [{ id: "check-in", href: `${root}/check-in`, label: PANEL_DOMAIN.checkIn }]
        : []),
      ...(flags.dinoAi ? [{ id: "dino", href: `${root}/dino`, label: "Dino AI" }] : []),
    ]),
    ...section("ayarlar", "AYARLAR", commonItems(flags)),
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
      { id: "progress", href: `${root}/takip`, label: PANEL_DOMAIN.gelisim },
      ...(flags.parentWeeklyDigest
        ? [{ id: "weekly-digest", href: `${root}/haftalik`, label: "Haftalık özet" }]
        : []),
    ]),
    ...section(
      "dersler",
      "DERSLER",
      hasOD ? [{ id: "lessons", href: `${root}/takvim`, label: PANEL_DOMAIN.dersler }] : [],
    ),
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
        ? [{ id: "mock-exams", href: `${root}/denemeler`, label: "Dış denemeler" }]
        : []),
    ]),
    ...section("hesap", "HESAP", [
      ...(flags.dinoAi ? [{ id: "dino", href: `${root}/dino`, label: "Dino AI" }] : []),
      { id: "account", href: `${root}/hesap`, label: "Hesap ve paket" },
      ...commonItems(flags),
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
        ? [{ id: "review", href: `${root}/tekrar`, label: "Tekrar kuyruğu" }]
        : []),
      ...(flags.studentCheckIn
        ? [{ id: "help", href: `${root}/yardim`, label: "Yardım isteyenler" }]
        : []),
      ...(flags.interventionInbox
        ? [{ id: "interventions", href: `${root}/mudahale`, label: PANEL_DOMAIN.mudahale }]
        : []),
      ...(flags.parentWeeklyDigest
        ? [{ id: "digests", href: `${root}/ozetler`, label: "Haftalık özet" }]
        : []),
      ...(flags.recoveryPackage
        ? [{ id: "recovery", href: `${root}/telafi`, label: "Telafi" }]
        : []),
    ]),
    ...section("olcme", "ÖLÇME", [
      ...(flags.mockExamAnalysis
        ? [{ id: "mock-exams", href: `${root}/denemeler`, label: PANEL_DOMAIN.denemeler }]
        : []),
      ...(flags.mockExamAnalysis
        ? [
            {
              id: "odk-reports",
              href: "/panel/odk/ogretmen/raporlar",
              label: "Deneme raporları",
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
    ...section("ayarlar", "AYARLAR", commonItems(flags)),
  ];
}

function adminSections(root: string, flags: PanelFeatureFlags): PanelNavSection[] {
  const operationHref = flags.interventionInbox ? `${root}/mudahale` : `${root}/raporlar`;
  const studentsHref = roleStudentsPath("ADMIN");

  return [
    ...section("bugun", "BUGÜN", [
      { id: "today", href: root, label: PANEL_DOMAIN.operasyonMerkezi },
      { id: "operations", href: operationHref, label: PANEL_DOMAIN.operasyon },
    ]),
    ...section("egitim", "EĞİTİM", [
      ...(studentsHref
        ? [{ id: "students", href: studentsHref, label: PANEL_DOMAIN.ogrenciler }]
        : []),
      { id: "teachers", href: `${root}/egitmenler`, label: PANEL_DOMAIN.ogretmenler },
      { id: "parents", href: `${root}/veliler`, label: PANEL_DOMAIN.veliler },
      { id: "people", href: `${root}/kullanicilar`, label: PANEL_DOMAIN.kisiler },
      {
        id: "education",
        href: `${root}/egitim`,
        label: `${PANEL_DOMAIN.gruplar} ve ${PANEL_DOMAIN.dersler}`,
      },
      { id: "calendar", href: `${root}/takvim`, label: PANEL_DOMAIN.takvim },
    ]),
    ...section("ogrenci-basarisi", "ÖĞRENCİ BAŞARISI", [
      { id: "coaching", href: `${root}/kocluk`, label: PANEL_DOMAIN.kocluk },
      ...(flags.learningOutcomes
        ? [{ id: "outcomes", href: `${root}/kazanimlar`, label: PANEL_DOMAIN.kazanımlar }]
        : []),
      ...(flags.cohortQuality
        ? [{ id: "quality", href: `${root}/kalite`, label: "Kalite" }]
        : []),
    ]),
    ...section("denemeler", "DENEMELER", [
      { id: "odk-exams", href: "/panel/odk/yonetim/sinavlar", label: "Deneme planlama" },
      { id: "odk-ops", href: "/panel/odk/yonetim/operasyon", label: "Canlı operasyon" },
      { id: "odk-reports", href: "/panel/odk/yonetim/raporlar", label: "Raporlar" },
      ...(flags.mockExamAnalysis
        ? [{ id: "mock-analysis", href: `${root}/denemeler`, label: "Sonuç analizi" }]
        : []),
    ]),
    ...section("ticaret", "TİCARET", [
      { id: "orders", href: `${root}/siparisler`, label: PANEL_DOMAIN.siparisler },
      { id: "provisioning", href: `${root}/isler`, label: PANEL_DOMAIN.provisioning },
    ]),
    ...section("sistem", "SİSTEM", [
      { id: "analytics", href: `${root}/analitik`, label: PANEL_DOMAIN.yonetimAnalitikleri },
      { id: "features", href: `${root}/ozellikler`, label: "Özellikler" },
      { id: "audit", href: `${root}/kayitlar`, label: "İşlem geçmişi" },
      { id: "reports", href: `${root}/raporlar`, label: "Operasyon raporları" },
    ]),
    ...section("genel", "GENEL", commonItems(flags)),
  ];
}

export function panelNavSections(
  role: UserRole,
  products: ProductCode[],
  flags: PanelFeatureFlags,
  root: string = rolePath(role),
): PanelNavSection[] {
  switch (role) {
    case "STUDENT":
      return studentSections(root, products, flags);
    case "PARENT":
      return parentSections(root, products, flags);
    case "TEACHER":
      return teacherSections(root, flags);
    case "ADMIN":
      return adminSections(root, flags);
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

/**
 * Mobil alt çubuk: en fazla 4 birincil aksiyon (+ Menü düğmesi ayrı).
 * Feature flag / ürün kapalıysa yedek öğe seçilir; ölü link üretilmez.
 */
export function mobilePrimaryNav(
  role: UserRole,
  products: ProductCode[],
  flags: PanelFeatureFlags,
  root: string = rolePath(role),
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
    { id: "progress", href: `${root}/takip`, label: PANEL_DOMAIN.gelisim },
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
