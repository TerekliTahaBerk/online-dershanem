import Link from "next/link";
export const BUSINESS_SECTIONS = [
  ["genel-bakis", "Genel Bakış"], ["mesaj-kutusu", "Mesaj Kutusu"], ["adaylar", "Adaylar"], ["satis-hunisi", "Satış Hunisi"], ["reklamlar", "Reklamlar"], ["kampanyalar", "Kampanyalar"], ["gelirler", "Gelirler"], ["giderler", "Giderler"], ["vergiler", "Vergiler"], ["mutabakat", "Mutabakat"], ["raporlar", "Raporlar"], ["ai-bilgi-merkezi", "AI Bilgi Merkezi"], ["otomasyon-kurallari", "Otomasyon Kuralları"], ["entegrasyonlar", "Entegrasyonlar"], ["sistem-kayitlari", "Sistem Kayıtları"], ["ayarlar", "Ayarlar"],
] as const;
export function BusinessNav({ active }: { active: string }) { return <nav aria-label="İşletme modülü" className="flex gap-2 overflow-x-auto pb-2">{BUSINESS_SECTIONS.map(([slug, label]) => <Link key={slug} href={`/panel/yonetim/isletme/${slug}`} aria-current={active === slug ? "page" : undefined} className={`whitespace-nowrap rounded-full border px-3 py-2 text-[11px] font-bold ${active === slug ? "border-[var(--brand-olive)] bg-[var(--brand-olive)] text-white" : "border-[var(--site-line)] bg-white text-[var(--site-body)]"}`}>{label}</Link>)}</nav>; }

