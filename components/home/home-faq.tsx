/**
 * 13 SIKÇA SORULAN SORULAR — onaylı tasarım (Web.dc.html).
 * 340px başlık kolonu + esnek liste; details/summary, "+" ikonu açıkken "×"e döner.
 */

const faqs = [
  {
    q: "Hangi ürünle başlamalıyım?",
    a: "Konuyu öğrenme tarafında zorlanıyorsan Online Dershanem ile, planı uygulamada zorlanıyorsan Online Koçum ile, seviyeni ölçmek istiyorsan Online Deneme Kulübüm ile başlayabilirsin.",
  },
  {
    q: "Ürünleri ayrı ayrı alabilir miyim?",
    a: "Evet. Üç ürün de tek başına seçilebilir. Online ödeme akışı şu an ders paketinde açıktır; koçluk ve deneme için süreç ön görüşmeyle netleşir.",
  },
  {
    q: "Dino AI nedir?",
    a: "Dino AI, ders, plan ve deneme verisini açıklamaya yardımcı olan ortak katmandır. Ayrı satılan bir ürün değildir; öğretmen ve koçun kararını destekler.",
  },
  {
    q: "Online satın alma nasıl oluyor?",
    a: "Checkout adımında online satın alma açık olan yapılandırmayı doğrudan tamamlayabilirsin. Uygun olmayan kombinasyonlarda ön görüşme ile net teklif paylaşılır.",
  },
  {
    q: "Paketimi sonradan değiştirebilir miyim?",
    a: "Evet. İhtiyacın değiştiğinde tek ürünle devam edebilir, yeni ürün ekleyebilir veya kapsamı ön görüşmede güncelleyebilirsin.",
  },
  {
    q: "Canlı ders formatı nasıl?",
    a: "Online Dershanem canlı derslerinde birebir veya en fazla 4 kişilik küçük grup seçenekleri bulunur.",
  },
  {
    q: "Veli neleri görür?",
    a: "Veli görünümünde katılım, plan ilerlemesi ve gelişim özeti yer alır. Öğrencinin ekranı birebir yansıtılmaz.",
  },
  {
    q: "Mobil uygulama mevcut mu?",
    a: "Şu an mobil uygulama yayında değil. Platform mobil tarayıcıdan kullanılabilir; uygulama planlandığında burada duyurulur.",
  },
];

export function HomeFaq() {
  return (
    <section className="border-t border-dc-line-soft bg-white">
      <div className="site-container grid gap-10 py-[var(--dc-section-tight)] lg:grid-cols-[340px_1fr] lg:gap-12">
        <div>
          <h2 className="font-display text-[length:var(--public-title)] leading-[1.1] tracking-[-0.025em] text-dc-ink">
            Sıkça sorulan sorular
          </h2>
          <p className="mt-3.5 text-[15.5px] leading-[1.6] text-dc-ink-muted">
            Ürün, kapsam ve fiyatlama hakkında en çok sorulanlar.
          </p>
          <a
            href="/sss"
            className="mt-3.5 inline-block text-[14.5px] font-bold text-dc-brand-strong hover:text-dc-brand-hover"
          >
            Tüm sorular →
          </a>
        </div>

        <div className="flex flex-col gap-2.5">
          {faqs.map(({ q, a }) => (
            <details
              key={q}
              className="dc-faq group rounded-dc-card-sm border border-dc-line bg-[#FCFDFC] px-5 py-[18px]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-bold text-dc-ink">
                {q}
                <span
                  aria-hidden="true"
                  className="dc-faq-plus flex-none text-[20px] font-normal leading-none text-dc-brand-strong transition-transform"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-[15px] leading-[1.65] text-dc-ink-muted">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
