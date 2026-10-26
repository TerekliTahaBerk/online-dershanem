import { MarketingApplicationLink } from "@/components/forms/marketing-application-link";
import type { MarketingProduct } from "@/lib/marketing-application";

export function ConsultationSteps({ product }: { product?: MarketingProduct }) {
  return <section className="site-container py-(--dc-section-tight)" aria-labelledby="application-steps-title">
    <div className="rounded-dc-card border border-dc-line bg-white p-6 sm:p-10">
      <h2 id="application-steps-title" className="font-display text-(length:--public-title) leading-tight tracking-tight text-dc-ink">Başvurudan sonra ne oluyor?</h2>
      <ol className="mt-7 grid gap-6 md:grid-cols-3">
        {[
          ["İhtiyacını paylaş", "Mevcut başvuru formunda ilgilendiğin ürünü ve hedef sınavını belirt."],
          ["Birlikte değerlendirelim", "Ekibimiz seninle iletişime geçer; kapsamı ve sana uygun başlangıcı konuşursunuz."],
          ["Koşulları netleştir", "Ücret, program ve erişim koşullarını başlamadan önce öğren. Başvuru kesin kayıt veya ödeme oluşturmaz."],
        ].map(([title, body], index) => <li key={title} className="border-t border-dc-line pt-4"><p className="text-sm font-bold text-dc-brand-strong">0{index + 1}</p><h3 className="mt-2 text-lg font-bold text-dc-ink">{title}</h3><p className="mt-2 text-[15px] leading-relaxed text-dc-ink-body">{body}</p></li>)}
      </ol>
      <MarketingApplicationLink product={product} className="site-btn site-btn-primary mt-7" />
      <p className="mt-3 text-sm leading-relaxed text-dc-ink-muted">Ön görüşme ücretsizdir. Hizmetler ücretlidir; satın alma zorunluluğu yoktur.</p>
    </div>
  </section>;
}
