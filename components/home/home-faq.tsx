/**
 * 13 SIKÇA SORULAN SORULAR — onaylı tasarım (Web.dc.html).
 * 340px başlık kolonu + esnek liste; details/summary, "+" ikonu açıkken "×"e döner.
 */

const faqs = [
  {
    q: "Ürünleri ayrı ayrı alabilir miyim?",
    a: "Evet. Üç ürün de tek başına satın alınabilir. İhtiyacın tek üründeyse yalnızca onu seçebilirsin.",
  },
  {
    q: "Birden fazla ürün aldığımda fiyat nasıl değişiyor?",
    a: "İki ürünü birlikte aldığında toplam, tek tek fiyatların altına düşer. Üç ürün en avantajlı toplamı verir. Kesin tutarlar fiyat tablosundan gelir.",
  },
  {
    q: "Online Dershanem nedir?",
    a: "LGS ve YKS için canlı ders ürünü. Maks. 4 kişilik gruplarda öğretmenle birlikte çalışma, ders takibi ve veli özeti içerir.",
  },
  {
    q: "Online Koçum nedir?",
    a: "Eğitim koçluğu ürünü: haftalık plan, birebir görüşme, düzenli takip ve hedef yönetimi. Dino AI koça öneri üretir, koçun yerini almaz.",
  },
  {
    q: "Online Deneme Kulübüm nedir?",
    a: "LGS, TYT ve AYT denemeleri, sonuç ekranı, güçlü/zayıf alan analizi ve zaman içindeki gelişim takibi.",
  },
  {
    q: "Dino AI nedir?",
    a: "Üç ürünün verisini birlikte okuyan zekâ katmanı. Ders, koçluk ve deneme akışlarında öneri ve analiz üretir; ayrı satılan bir ürün değildir.",
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
