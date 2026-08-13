import Link from "next/link";
import { PublicSection, SectionIntro } from "@/components/public/primitives";

const steps = [
  ["01", "İhtiyacı belirle", "Canlı ders, planlama desteği veya deneme ölçümünden hangisinin bugün gerekli olduğunu seç."],
  ["02", "Ürününle başla", "Online Dershanem, Online Koçum veya Online Deneme Kulübüm kendi açık başlangıç akışıyla ilerler."],
  ["03", "İlerlemeyi görünür kıl", "Ders geri bildirimi, haftalık plan veya deneme analizi öğrenciye sıradaki adımı gösterir."],
  ["04", "Gerektiğinde birleştir", "İhtiyaç değiştiğinde diğer ürünü aynı öğrenme yolculuğuna ekleyebilirsin."],
];

export function First30Days() {
  return (
    <PublicSection id="nasil-calisir" tone="soft">
        <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:gap-20">
          <div>
            <SectionIntro eyebrow="Nasıl çalışır?" title="Tek bir pakete sıkışmadan kendi destek yolunu kur." />
            <Link href="/urunler/" className="site-btn site-btn-primary mt-8">Ürünleri karşılaştır</Link>
          </div>
          <ol className="divide-y divide-[var(--site-line)] border-y border-[var(--site-line)]">
            {steps.map(([number, title, body]) => (
              <li key={number} className="grid gap-3 py-6 sm:grid-cols-[54px_180px_1fr] sm:items-start sm:py-7">
                <span className="font-mono text-[12px] text-[var(--brand-olive)]">{number}</span>
                <h3 className="text-[16px] font-semibold text-[var(--site-ink)]">{title}</h3>
                <p className="text-[14px] leading-6 text-[var(--site-body)]">{body}</p>
              </li>
            ))}
          </ol>
        </div>
    </PublicSection>
  );
}
