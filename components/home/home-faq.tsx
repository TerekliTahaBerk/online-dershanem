/**
 * 13 SIKÇA SORULAN SORULAR — onaylı tasarım (Web.dc.html).
 * 340px başlık kolonu + esnek liste; details/summary, "+" ikonu açıkken "×"e döner.
 */

import { getPublicPricingCopy } from "@/lib/commerce/public-pricing-copy";
import { getDinoMarketingCopy } from "@/lib/dino-marketing";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";

export function HomeFaq() {
  const faqs = [
    {
      q: "Hangi ürünle başlamalıyım?",
      a: "Konuyu öğrenme tarafında zorlanıyorsan onlinedershanem. ile, planı uygulamada zorlanıyorsan onlinekoçum. ile, seviyeni ölçmek istiyorsan onlinedenemekulübüm. ile başlayabilirsin.",
    },
    {
      q: "Ürünleri ayrı ayrı alabilir miyim?",
      a: `Evet. ${getPublicPricingCopy().standalone} Online satın alma ders paketinde kullanılabilir; diğer seçimlerin başlangıcını ekibimizle planlayabilirsin.`,
    },
    {
      q: "Dino AI nedir?",
      a: getDinoMarketingCopy(getPanelFeatureFlags().dinoAi).description,
    },
    {
      q: "Online satın alma nasıl oluyor?",
      a: "Online satın alınabilir ders paketini ödeme adımında tamamlayabilirsin. Diğer seçimlerde fiyatını paket özetinde görüp başlangıcını ekibimizle planlayabilirsin. Fiyatı hesaplanamayan özel kapsamlar için ön görüşmede yazılı teklif paylaşılır.",
    },
    {
      q: "Paketimi sonradan değiştirebilir miyim?",
      a: "Evet. İhtiyacın değiştiğinde tek ürünle devam edebilir veya yeni ürün ekleyebilirsin. Yeni seçimin tutarını paket kurucuda görüp başlangıcını ekibimizle planlayabilirsin.",
    },
    {
      q: "Canlı ders formatı nasıl?",
      a: "onlinedershanem. canlı derslerinde birebir veya en fazla 4 kişilik küçük grup seçenekleri bulunur.",
    },
    {
      q: "Veli neleri görür?",
      a: "Veli görünümünde katılım, plan ilerlemesi ve gelişim özeti yer alır. Öğrencinin ekranı birebir yansıtılmaz.",
    },
    {
      q: "Telefondan nasıl kolayca erişebilirim?",
      a: "Platformu mobil tarayıcıdan açıp ana ekranına ekleyebilirsin. iPhone'da Safari'nin Paylaş menüsünden, Android'de tarayıcı menüsünden Ana ekrana ekle seçeneğini kullan.",
    },
  ];

  return (
    <section className="border-t border-dc-line-soft bg-white">
      <div className="site-container grid gap-10 py-(--dc-section-tight) lg:grid-cols-[340px_1fr] lg:gap-12">
        <div>
          <h2 className="font-display text-(length:--public-title) leading-[1.1] tracking-tight text-dc-ink">
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
              <p className="mt-3 text-[15px] leading-[1.65] text-dc-ink-muted">
                {a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
