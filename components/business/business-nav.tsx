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

export const BUSINESS_SECTIONS = [
  ["genel-bakis", "Genel Bakış"],
  ["mesaj-kutusu", "Mesaj Kutusu"],
  ["adaylar", "Adaylar"],
  ["satis-hunisi", "Satış Hunisi"],
  ["reklamlar", "Reklamlar"],
  ["kampanyalar", "Kampanyalar"],
  ["gelirler", "Gelirler"],
  ["giderler", "Giderler"],
  ["vergiler", "Vergiler"],
  ["mutabakat", "Mutabakat"],
  ["raporlar", "Raporlar"],
  ["ai-bilgi-merkezi", "AI Bilgi Merkezi"],
  ["otomasyon-kurallari", "Otomasyon Kuralları"],
  ["entegrasyonlar", "Entegrasyonlar"],
  ["sistem-kayitlari", "Sistem Kayıtları"],
  ["ayarlar", "Ayarlar"],
] as const;

const icons: Record<(typeof BUSINESS_SECTIONS)[number][0], LucideIcon> = {
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

export function BusinessNav({ active }: { active: string }) {
  return (
    <nav aria-label="İşletme panel menüsü" className="panel-nav-scroll flex gap-2 overflow-x-auto lg:flex-col lg:gap-1 lg:overflow-visible">
      {BUSINESS_SECTIONS.map(([slug, label]) => {
        const Icon = icons[slug];
        const selected = active === slug;
        return (
          <Link
            key={slug}
            href={`/panel/yonetim/isletme/${slug}`}
            aria-current={selected ? "page" : undefined}
            className={`group flex min-w-fit items-center gap-3 rounded-2xl px-3 py-2.5 transition-all lg:w-full ${selected ? "bg-[var(--panel-nav-active)] text-[var(--brand-olive)] shadow-[inset_0_0_0_1px_rgba(58,74,44,.05)]" : "text-[var(--site-body)] hover:bg-white hover:text-[var(--site-ink)]"}`}
          >
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-colors ${selected ? "bg-white text-[var(--brand-olive)] shadow-sm" : "bg-white/65 text-[var(--site-muted)] group-hover:text-[var(--site-ink)]"}`}>
              <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span className="text-left text-[13px] font-bold leading-4">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
