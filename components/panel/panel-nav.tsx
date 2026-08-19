"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ProductCode, UserRole } from "@prisma/client";
import { rolePath } from "@/lib/auth/roles";
import { usePanelFeatureFlags } from "@/components/panel/panel-feature-provider";
import type { PanelFeatureFlags } from "@/lib/panel-feature-flags";

/**
 * PANEL MENÜSÜ — onaylı tasarım (Panel.dc.html).
 * Dikey liste, 6px nokta göstergesi, aktifte #EDF7F2 zemin + #0C4A38 metin.
 *
 * MENÜ = ROL × YETKİ. Erişimi olmayan ürünün girişi menüde HİÇ GÖRÜNMEZ
 * (§16 — pasif/disabled bir hedefle menü şişirilmez). Yetki `ProductCode`
 * üyeliklerinden sunucuda çözülür ve buraya prop olarak iner; bu yalnızca
 * SUNUMDUR — asıl yetki kontrolü sunucu guard'larındadır.
 *
 * Üç ürün de yetki olarak temsil edilir: OD (Dershanem), OK (Koçum),
 * ODK (Deneme Kulübüm).
 */

type NavItem = { href: string; label: string };

function studentNav(root: string, products: ProductCode[], flags: PanelFeatureFlags): NavItem[] {
  const hasOD = products.includes("OD");
  const hasOK = products.includes("OK");
  const hasODK = products.includes("ODK");

  return [
    { href: root, label: "Ana Sayfa" },

    // ── Online Dershanem (OD) bölümleri ──
    ...(hasOD
      ? [
          { href: `${root}/takvim`, label: "Dersler" },
          { href: `${root}/odevler`, label: "Ödevler" },
          { href: `${root}/materyaller`, label: "Materyaller" },
        ]
      : []),

    // ── Online Koçum (OK) bölümü ──
    ...(hasOK && flags.adaptivePlan
      ? [
          { href: `${root}/plan`, label: "Koçum" },
          // Tasarımda (sGoals) hedefler koçluk bölümünün parçası.
          { href: `${root}/hedefler`, label: "Hedefler" },
        ]
      : []),

    // ── Online Deneme Kulübüm (ODK) bölümü — sınav motoru aynı panelin içinde ──
    ...(hasODK
      ? [
          { href: "/panel/odk/ogrenci", label: "Deneme Kulübüm" },
          { href: "/panel/odk/ogrenci/denemeler", label: "Denemelerim" },
        ]
      : []),

    { href: `${root}/gelisim`, label: "Gelişim" },
    ...(flags.studentCheckIn ? [{ href: `${root}/check-in`, label: "Nasılım?" }] : []),
  ];
}

function parentNav(root: string, products: ProductCode[], flags: PanelFeatureFlags): NavItem[] {
  const hasOD = products.includes("OD");
  const hasOK = products.includes("OK");
  const hasODK = products.includes("ODK");

  return [
    { href: root, label: "Ana Sayfa" },
    { href: `${root}/takip`, label: "Gelişim" },
    ...(hasOD ? [{ href: `${root}/takvim`, label: "Dersler" }] : []),
    ...(hasOD && flags.mockExamAnalysis
      ? [{ href: `${root}/denemeler`, label: "Denemeler" }]
      : []),
    ...(hasODK ? [{ href: "/panel/odk/veli/raporlar", label: "Deneme raporları" }] : []),
    ...(hasOK ? [{ href: `${root}/kocluk`, label: "Koçluk" }] : []),
    ...(flags.parentWeeklyDigest ? [{ href: `${root}/haftalik`, label: "Haftalık özet" }] : []),
    // Tasarımda (pAcc) hesap ekranı velinin menüsünde yer alır — ürüne bağlı değil.
    { href: `${root}/hesap`, label: "Hesap ve paket" },
  ];
}

function teacherNav(root: string, flags: PanelFeatureFlags): NavItem[] {
  return [
    { href: root, label: "Ana Sayfa" },
    { href: `${root}/takvim`, label: "Takvim" },
    { href: `${root}/gruplar`, label: "Öğrenciler" },
    { href: `${root}/odevler`, label: "Dersler" },
    ...(flags.adaptivePlan ? [{ href: `${root}/plan`, label: "Koçluk" }] : []),
    ...(flags.mockExamAnalysis ? [{ href: `${root}/denemeler`, label: "Denemeler" }] : []),
    ...(flags.reviewQueue ? [{ href: `${root}/tekrar`, label: "Tekrar kuyruğu" }] : []),
    ...(flags.interventionInbox ? [{ href: `${root}/mudahale`, label: "Müdahale kutusu" }] : []),
    { href: `${root}/materyaller`, label: "Materyaller" },
    // Personel her iki üründe de çalışır; ODK raporları aynı panelin bölümü.
    { href: "/panel/odk/ogretmen/raporlar", label: "Deneme raporları" },
  ];
}

function adminNav(root: string, flags: PanelFeatureFlags): NavItem[] {
  return [
    { href: root, label: "Ana Sayfa" },
    { href: `${root}/kullanicilar`, label: "Öğrenciler" },
    // Tasarımda (aEdu) eğitmenler öğrencilerden ayrı bir menü girişi.
    { href: `${root}/egitmenler`, label: "Eğitmenler" },
    { href: `${root}/egitim`, label: "Dersler ve gruplar" },
    // Tasarımda (aCoach) koçluk operasyonu ayrı bir menü girişi.
    ...(flags.adaptivePlan ? [{ href: `${root}/kocluk`, label: "Koçluk" }] : []),
    { href: `${root}/takvim`, label: "Takvim" },
    ...(flags.mockExamAnalysis ? [{ href: `${root}/denemeler`, label: "Deneme analizi" }] : []),
    // ── Deneme Kulübü operasyonu — ayrı çalışma alanı değil, aynı panelin bölümü ──
    { href: "/panel/odk/yonetim", label: "Deneme Kulübüm" },
    { href: "/panel/odk/yonetim/sinavlar", label: "Deneme planlama" },
    { href: "/panel/odk/yonetim/operasyon", label: "Canlı operasyon" },
    // Tasarımın sipariş ekranı (aOrders); geniş operasyon kuyruğu ayrı girişte.
    { href: `${root}/siparisler`, label: "Siparişler" },
    { href: `${root}/isler`, label: "Operasyon kuyruğu" },
    { href: `${root}/raporlar`, label: "Raporlar" },
    ...(flags.interventionInbox ? [{ href: `${root}/mudahale`, label: "Müdahale kutusu" }] : []),
    { href: `${root}/kayitlar`, label: "İşlem geçmişi" },
    { href: `${root}/ozellikler`, label: "Sistem" },
  ];
}

/** Her rolde ortak, ürüne bağlı olmayan girişler. */
function commonNav(flags: PanelFeatureFlags): NavItem[] {
  return [
    { href: "/panel/bildirimler", label: "Bildirimler" },
    ...(flags.accessibilityProfile
      ? [{ href: "/panel/erisilebilirlik", label: "Erişilebilirlik" }]
      : []),
    ...(flags.offlineMode ? [{ href: "/panel/veri-kullanimi", label: "Veri kullanımı" }] : []),
  ];
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

  const items =
    role === "STUDENT"
      ? studentNav(root, products, flags)
      : role === "PARENT"
        ? parentNav(root, products, flags)
        : role === "TEACHER"
          ? teacherNav(root, flags)
          : adminNav(root, flags);

  // Veli, seçili öğrenci bağlamını kaybetmemeli.
  const selectedStudentId = role === "PARENT" ? searchParams.get("studentId") : null;

  return (
    <nav aria-label="Panel menüsü" className="flex flex-col gap-0.5">
      {[...items, ...commonNav(flags)].map((item) => {
        const active =
          pathname === item.href || (item.href !== root && pathname.startsWith(`${item.href}/`));
        const href =
          selectedStudentId && item.href.startsWith(root)
            ? `${item.href}?studentId=${encodeURIComponent(selectedStudentId)}`
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
                active ? "bg-dc-brand" : "bg-[#C9D3CE]"
              }`}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
