import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  CircleDollarSign,
  FileCheck2,
  GitMerge,
  Inbox,
  Landmark,
  Megaphone,
  MessagesSquare,
  ReceiptText,
  ScrollText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  UsersRound,
} from "lucide-react";
import {
  BUSINESS_SECTION_GROUPS,
  SECTION_LABELS,
  type BusinessSectionSlug,
} from "@/lib/business/sections";

/** Geriye dönük uyumluluk: mevcut import'lar bu diziye dayanıyor. */
export const BUSINESS_SECTIONS = Object.entries(SECTION_LABELS) as Array<[BusinessSectionSlug, string]>;

const icons: Record<BusinessSectionSlug, LucideIcon> = {
  "genel-bakis": BarChart3,
  "mesaj-kutusu": Inbox,
  adaylar: UsersRound,
  "satis-hunisi": GitMerge,
  reklamlar: Megaphone,
  kampanyalar: Tags,
  gelirler: CircleDollarSign,
  giderler: ReceiptText,
  vergiler: Landmark,
  mutabakat: FileCheck2,
  raporlar: ScrollText,
  "ai-bilgi-merkezi": Bot,
  "otomasyon-kurallari": SlidersHorizontal,
  entegrasyonlar: MessagesSquare,
  "sistem-kayitlari": ShieldCheck,
  ayarlar: Settings,
};

/**
 * İşletme menüsü.
 *
 * `allowed` yalnız kullanıcının görüntüleme izni olan bölümleri içerir;
 * bunlar sunucuda `getUserBusinessPermissions` ile hesaplanır. Menüyü
 * gizlemek bir güvenlik sınırı DEĞİLDİR — her sayfa kendi guard'ını
 * çalıştırmaya devam eder; bu yalnız kullanıcıya 404 ile biten linkler
 * göstermemek içindir.
 */
export function BusinessNav({
  active,
  allowed,
}: {
  active: string;
  allowed: readonly BusinessSectionSlug[];
}) {
  const allowedSet = new Set(allowed);
  const groups = BUSINESS_SECTION_GROUPS.map((group) => ({
    ...group,
    sections: group.sections.filter((slug) => allowedSet.has(slug)),
  })).filter((group) => group.sections.length > 0);

  return (
    <nav aria-label="İşletme panel menüsü" className="panel-nav-scroll flex gap-4 overflow-x-auto lg:flex-col lg:gap-5 lg:overflow-visible">
      {groups.map((group) => (
        <div key={group.id} className="min-w-fit lg:w-full">
          <p
            id={`business-nav-group-${group.id}`}
            className="mb-1.5 px-3 text-[10px] font-extrabold uppercase tracking-[.12em] text-[var(--site-muted)]"
          >
            {group.label}
          </p>
          <ul
            aria-labelledby={`business-nav-group-${group.id}`}
            className="flex gap-2 lg:flex-col lg:gap-1"
          >
            {group.sections.map((slug) => {
              const Icon = icons[slug];
              const selected = active === slug;
              return (
                <li key={slug}>
                  <Link
                    href={`/panel/yonetim/isletme/${slug}`}
                    aria-current={selected ? "page" : undefined}
                    className={`group flex min-w-fit items-center gap-3 rounded-2xl px-3 py-2.5 transition-all lg:w-full ${selected ? "bg-[var(--panel-nav-active)] text-[var(--brand-olive)] shadow-[inset_0_0_0_1px_rgba(58,74,44,.05)]" : "text-[var(--site-body)] hover:bg-white hover:text-[var(--site-ink)]"}`}
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-colors ${selected ? "bg-white text-[var(--brand-olive)] shadow-sm" : "bg-white/65 text-[var(--site-muted)] group-hover:text-[var(--site-ink)]"}`}>
                      <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
                    </span>
                    <span className="text-left text-[13px] font-bold leading-4">{SECTION_LABELS[slug]}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
