"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ProductCode, UserRole } from "@prisma/client";
import { rolePath } from "@/lib/auth/roles";
import { usePanelFeatureFlags } from "@/components/panel/panel-feature-provider";
import type { PanelFeatureFlags } from "@/lib/panel-feature-flags";
import { withParentStudentContext } from "@/lib/parent-home-summary";

type NavItem = { href: string; label: string };
type NavSection = { title: string; items: NavItem[] };

function section(title: string, items: NavItem[]): NavSection[] {
  return items.length ? [{ title, items }] : [];
}

function commonNav(flags: PanelFeatureFlags): NavItem[] {
  return [
    { href: "/panel/bildirimler", label: "Bildirimler" },
    ...(flags.accessibilityProfile
      ? [{ href: "/panel/erisilebilirlik", label: "Erişilebilirlik" }]
      : []),
    ...(flags.offlineMode ? [{ href: "/panel/veri-kullanimi", label: "Veri kullanımı" }] : []),
  ];
}

function studentSections(root: string, products: ProductCode[], flags: PanelFeatureFlags): NavSection[] {
  const hasOD = products.includes("OD");
  const hasOK = products.includes("OK");
  const hasODK = products.includes("ODK");

  return [
    ...section("BUGÜN", [
      { href: root, label: "Bugün" },
      { href: `${root}/odevler`, label: "Çalışmalar" },
    ]),
    ...section(
      "DERSHANEM",
      hasOD
        ? [
            { href: `${root}/takvim`, label: "Dersler" },
            { href: `${root}/materyaller`, label: "Kaynaklar" },
          ]
        : [],
    ),
    ...section(
      "KOÇUM",
      hasOK
        ? [
            ...(flags.adaptivePlan ? [{ href: `${root}/plan`, label: "Haftalık Plan" }] : []),
            { href: `${root}/hedefler`, label: "Hedefler" },
          ]
        : [],
    ),
    ...section(
      "DENEME KULÜBÜ",
      hasODK ? [{ href: "/panel/odk/ogrenci/denemeler", label: "Denemeler" }] : [],
    ),
    ...section("BEN", [
      { href: `${root}/gelisim`, label: "Gelişimim" },
      ...(flags.studentCheckIn ? [{ href: `${root}/check-in`, label: "Nasılım?" }] : []),
      ...(flags.dinoAi ? [{ href: `${root}/dino`, label: "Dino AI" }] : []),
    ]),
    ...section("AYARLAR", commonNav(flags)),
  ];
}

function parentSections(root: string, products: ProductCode[], flags: PanelFeatureFlags): NavSection[] {
  const hasOD = products.includes("OD");
  const hasOK = products.includes("OK");
  const hasODK = products.includes("ODK");

  return [
    ...section("BUGÜN", [
      { href: root, label: "Bugün" },
      { href: `${root}/takip`, label: "Gelişim" },
    ]),
    ...section("DERSHANEM", hasOD ? [{ href: `${root}/takvim`, label: "Dersler" }] : []),
    ...section(
      "KOÇUM",
      hasOK
        ? [
            { href: `${root}/kocluk`, label: "Koçluk" },
            ...(flags.parentWeeklyDigest ? [{ href: `${root}/haftalik`, label: "Haftalık özet" }] : []),
          ]
        : [],
    ),
    ...section("DENEMELER", [
      ...(hasOD && flags.mockExamAnalysis ? [{ href: `${root}/denemeler`, label: "Denemeler" }] : []),
      ...(hasODK ? [{ href: "/panel/odk/veli/raporlar", label: "Deneme raporları" }] : []),
    ]),
    ...section("BEN", [
      ...(flags.dinoAi ? [{ href: `${root}/dino`, label: "Dino AI" }] : []),
      { href: `${root}/hesap`, label: "Hesap ve paket" },
      ...commonNav(flags),
    ]),
  ];
}

function teacherSections(root: string, flags: PanelFeatureFlags): NavSection[] {
  return [
    ...section("BUGÜN", [
      { href: root, label: "Bugün" },
      { href: `${root}/takvim`, label: "Takvim" },
    ]),
    ...section("DERS", [
      { href: `${root}/odevler`, label: "Dersler" },
    ]),
    ...section("KOÇLUK", [
      ...(flags.adaptivePlan ? [{ href: `${root}/plan`, label: "Koçluk planı" }] : []),
      ...(flags.reviewQueue ? [{ href: `${root}/tekrar`, label: "Tekrar kuyruğu" }] : []),
    ]),
    ...section("TAKİP", [
      ...(flags.studentCheckIn ? [{ href: `${root}/yardim`, label: "Yardım İsteyenler" }] : []),
      ...(flags.interventionInbox ? [{ href: `${root}/mudahale`, label: "Müdahale kutusu" }] : []),
      { href: `${root}/gruplar`, label: "Öğrenciler" },
    ]),
    ...section("ÖLÇME", [
      ...(flags.mockExamAnalysis ? [{ href: `${root}/denemeler`, label: "Denemeler" }] : []),
      ...(flags.mockExamAnalysis
        ? [{ href: "/panel/odk/ogretmen/raporlar", label: "Deneme raporları" }]
        : []),
    ]),
    ...section("KAYNAKLAR", [{ href: `${root}/materyaller`, label: "Kaynaklar" }]),
    ...section("AYARLAR", commonNav(flags)),
  ];
}

function adminSections(root: string, flags: PanelFeatureFlags): NavSection[] {
  const operationHref = flags.interventionInbox ? `${root}/mudahale` : `${root}/raporlar`;

  return [
    ...section("BUGÜN", [
      { href: root, label: "Bugün" },
      { href: operationHref, label: "Operasyon" },
    ]),
    ...section("EĞİTİM", [
      { href: `${root}/kullanicilar`, label: "Öğrenciler" },
      { href: `${root}/egitmenler`, label: "Eğitmenler" },
      { href: `${root}/egitim`, label: "Dersler & Gruplar" },
      { href: `${root}/takvim`, label: "Takvim" },
    ]),
    ...section("KOÇLUK", [
      ...(flags.adaptivePlan ? [{ href: `${root}/kocluk`, label: "Koçluk" }] : []),
    ]),
    ...section("DENEMELER", [
      { href: "/panel/odk/yonetim/sinavlar", label: "Deneme Planlama" },
      { href: "/panel/odk/yonetim/operasyon", label: "Canlı Operasyon" },
      { href: "/panel/odk/yonetim/raporlar", label: "Raporlar" },
      ...(flags.mockExamAnalysis ? [{ href: `${root}/denemeler`, label: "Sonuç Analizi" }] : []),
    ]),
    ...section("TİCARET", [
      { href: `${root}/siparisler`, label: "Siparişler" },
      { href: `${root}/isler`, label: "İşler / Provisioning" },
    ]),
    ...section("SİSTEM", [
      { href: `${root}/ozellikler`, label: "Özellikler / Sistem" },
      { href: `${root}/kayitlar`, label: "İşlem geçmişi" },
      { href: `${root}/raporlar`, label: "Operasyon raporları" },
    ]),
    ...section("GENEL", commonNav(flags)),
  ];
}

export function panelNavSections(
  role: UserRole,
  products: ProductCode[],
  flags: PanelFeatureFlags,
  root: string,
): NavSection[] {
  return role === "STUDENT"
    ? studentSections(root, products, flags)
    : role === "PARENT"
      ? parentSections(root, products, flags)
      : role === "TEACHER"
        ? teacherSections(root, flags)
        : adminSections(root, flags);
}

export function mobilePrimaryNav(
  role: UserRole,
  products: ProductCode[],
  flags: PanelFeatureFlags,
  root: string,
): NavItem[] {
  const hasOD = products.includes("OD");
  const hasOK = products.includes("OK");
  const hasODK = products.includes("ODK");

  if (role === "STUDENT") {
    const primary = [
      { href: root, label: "Bugün" },
      { href: `${root}/odevler`, label: "Çalışmalar" },
      ...(hasOD
        ? [{ href: `${root}/takvim`, label: "Dersler" }]
        : flags.adaptivePlan && hasOK
          ? [{ href: `${root}/plan`, label: "Haftalık Plan" }]
          : []),
      ...(hasODK
        ? [{ href: "/panel/odk/ogrenci/denemeler", label: "Denemeler" }]
        : hasOK
            ? [{ href: `${root}/hedefler`, label: "Hedefler" }]
            : []),
    ];
    return primary.slice(0, 4);
  }

  if (role === "TEACHER") {
    const fourth =
      flags.studentCheckIn
        ? { href: `${root}/yardim`, label: "Yardım" }
        : flags.mockExamAnalysis
          ? { href: `${root}/denemeler`, label: "Denemeler" }
          : { href: `${root}/gruplar`, label: "Öğrenciler" };
    return [
      { href: root, label: "Bugün" },
      { href: `${root}/odevler`, label: "Çalışmalar" },
      { href: `${root}/takvim`, label: "Dersler" },
      fourth,
    ];
  }

  if (role === "ADMIN") {
    return [
      { href: root, label: "Bugün" },
      { href: `${root}/isler`, label: "Operasyon" },
      { href: `${root}/siparisler`, label: "Siparişler" },
      { href: "/panel/odk/yonetim/operasyon", label: "Denemeler" },
    ];
  }

  return [
    { href: root, label: "Bugün" },
    { href: `${root}/takip`, label: "Çalışmalar" },
    ...(hasOD ? [{ href: `${root}/takvim`, label: "Dersler" }] : []),
    ...(hasODK
      ? [{ href: "/panel/odk/veli/raporlar", label: "Denemeler" }]
      : hasOD && flags.mockExamAnalysis
        ? [{ href: `${root}/denemeler`, label: "Denemeler" }]
        : []),
  ].slice(0, 4);
}

export function PanelNav({
  role,
  products = [],
  onNavigate,
}: {
  role: UserRole;
  products?: ProductCode[];
  onNavigate?: () => void;
}) {
  const flags = usePanelFeatureFlags();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const root = rolePath(role);
  const sections = panelNavSections(role, products, flags, root);
  const selectedStudentId = role === "PARENT" ? searchParams.get("studentId") : null;

  return (
    <nav aria-label="Panel menüsü" className="flex flex-col gap-3">
      {sections.map((navSection) => (
        <section key={navSection.title} className="flex flex-col gap-0.5">
          <p className="px-3 pb-1 pt-0.5 text-[10.5px] font-extrabold uppercase tracking-[.08em] text-dc-ink-ghost">
            {navSection.title}
          </p>
          {navSection.items.map((item) => {
            const active =
              pathname === item.href || (item.href !== root && pathname.startsWith(`${item.href}/`));
            const shouldPreserveParentContext =
              Boolean(selectedStudentId) &&
              (item.href.startsWith(root) || item.href.startsWith("/panel/odk/veli"));
            const href = shouldPreserveParentContext
              ? withParentStudentContext(item.href, selectedStudentId)
              : item.href;

            return (
              <Link
                key={item.href}
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[14px] font-semibold transition-colors ${
                  active
                    ? "bg-dc-brand-soft text-dc-brand-deep"
                    : "text-[var(--pd-ink-3)] hover:bg-dc-surface-muted"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 flex-none rounded-full ${
                    active ? "bg-dc-brand" : "bg-dc-line"
                  }`}
                />
                {item.label}
              </Link>
            );
          })}
        </section>
      ))}
    </nav>
  );
}
