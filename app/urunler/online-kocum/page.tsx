import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import {
  ProductHero,
  StepCards,
  CrossSellWithPrice,
  ProductFaq,
  ProductClosingCta,
} from "@/components/product/product-sections";
import { singleProductPriceLabel } from "@/lib/commerce/package-builder-pricing";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Online Koçum | Planını uygula",
  description:
    "Kişisel haftalık çalışma planı, birebir koç görüşmesi ve düzenli takip. LGS ve YKS için, tüm dersleri kapsar.",
  canonical: "/urunler/online-kocum/",
});

const planDays = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
const planCells = ["#DFEBE5", "#14976B", "#EDF4F0", "#DFEBE5", "#14976B", "#EDF4F0", ""];

/** ÜRÜN · ONLINE KOÇUM — onaylı tasarım (Web.dc.html → isOK). */
export default function OnlineKocumPage() {
  return (
    <div className="site-scope">
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <ProductHero
          eyebrow="Ürün · Online Koçum"
          title="Planını uygula."
          body="Kişisel çalışma planı, birebir koç görüşmesi ve düzenli takip. Ne çalışacağını bilmemek sorun olmaktan çıkar."
          tracks={["LGS", "YKS"]}
          note="Planı koç kurar, tüm dersleri kapsar"
          visual={
            <div className="rounded-dc-card border border-dc-line bg-white p-5 shadow-[0_14px_34px_rgba(20,32,28,.07)]">
              <p className="font-mono text-[11px] font-semibold text-[var(--dc-ink-faint)]">
                HAFTALIK PLAN
              </p>
              <div className="mt-3 grid grid-cols-7 gap-1.5">
                {planDays.map((d) => (
                  <span
                    key={d}
                    className="text-center text-[10.5px] font-semibold text-dc-ink-faint"
                  >
                    {d}
                  </span>
                ))}
                {planCells.map((c, i) => (
                  <span
                    key={i}
                    className={`h-16 rounded-lg ${
                      c ? "" : "border border-dashed border-[#D6E2DC] bg-dc-surface-muted"
                    }`}
                    style={c ? { background: c, opacity: i === 4 ? 0.7 : 1 } : undefined}
                  />
                ))}
              </div>
              <div className="mt-4 border-t border-dc-line-soft pt-4">
                <p className="text-[14px] font-bold text-dc-ink">Bu haftanın durumu</p>
                <p className="mt-1 text-[13.5px] leading-[1.55] text-dc-ink-muted">
                  Planın ne kadarının yapıldığı koç görüşmesinde birlikte işaretlenir.
                </p>
                <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-[#E4EBE7]">
                  <span
                    aria-hidden="true"
                    className="block h-full w-[58%] rounded-full bg-dc-brand"
                  />
                </span>
              </div>
            </div>
          }
        />

        <StepCards
          title="Koçluk nasıl işliyor?"
          steps={[
            {
              title: "Tanışma ve hedef",
              body: "Mevcut durum, hedef sınav ve haftalık kapasite belirlenir.",
            },
            {
              title: "Haftalık plan",
              body: "Gerçekçi, uygulanabilir plan; ders ve deneme takvimiyle uyumlu.",
            },
            {
              title: "Birebir görüşme",
              body: "Düzenli görüşmede plan gözden geçirilir, tıkanan yer açılır.",
            },
            {
              title: "Takip ve veli görünürlüğü",
              body: "İlerleme kayıtlı; veli özeti paylaşılabilir.",
            },
          ]}
        />

        {/* Dino AI · koçluk önerisi — sağda öncelik listesi */}
        <section className="mt-[var(--dc-section-tight)] border-y border-dc-line-soft bg-white">
          <div className="site-container grid items-center gap-10 py-[var(--dc-section-tight)] lg:grid-cols-2">
            <div>
              <p className="dc-eyebrow">Dino AI · Koçluk önerisi</p>
              <h2 className="mt-3.5 font-display text-[28px] leading-[1.14] tracking-[-0.02em] text-dc-ink sm:text-[36px]">
                Koçun kararı, Dino AI&apos;ın bağlamı.
              </h2>
              <p className="mt-3.5 text-[16.5px] leading-[1.65] text-dc-ink-body">
                Dino AI ders ve deneme verisinden bu haftanın odak konularını önerir.
                Planı kuran ve öğrenciyi tanıyan yine koçtur.
              </p>
            </div>

            <div className="rounded-[20px] border border-dc-line bg-[#FCFDFC] p-5 sm:p-[22px]">
              <p className="font-mono text-[11px] font-semibold text-[var(--dc-ink-faint)]">
                ÖNERİLEN ODAK
              </p>
              <ul className="mt-3.5 flex flex-col gap-2.5">
                {[
                  { label: "Paragraf · hız", rank: "öncelik 1", top: true },
                  { label: "Türev kuralları", rank: "öncelik 2", top: false },
                  { label: "Deneme tekrarı", rank: "öncelik 3", top: false },
                ].map((r) => (
                  <li
                    key={r.label}
                    className={`flex items-center justify-between gap-3 rounded-[10px] px-3.5 py-3 text-[14.5px] font-semibold ${
                      r.top
                        ? "bg-dc-brand-soft text-dc-brand-deep"
                        : "bg-dc-surface-muted text-[var(--pd-ink-3)]"
                    }`}
                  >
                    <span>{r.label}</span>
                    <span>{r.rank}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] font-medium text-[var(--dc-ink-muted)]">
                Örnek metin — gerçek öneri öğrencinin kendi verisinden üretilir.
              </p>
            </div>
          </div>
        </section>

        <CrossSellWithPrice
          cards={[
            {
              eyebrow: "+ Online Dershanem",
              title: "Konuyu öğretmenle kapat",
              body: "Plan hazır ama konu eksikse, canlı ders bu boşluğu kapatır.",
            },
            {
              eyebrow: "+ Deneme Kulübüm",
              title: "Planın işe yaradığını gör",
              body: "Deneme sonuçları planın bir sonraki haftasını besler.",
            },
          ]}
          advantageNote="Online Dershanem ile birlikte daha avantajlı."
          price={singleProductPriceLabel("kocum")}
          priceSuffix="/ ay"
          features={["Haftalık plan", "Birebir koç görüşmesi", "Dino AI plan önerileri"]}
          priceFootnote="Üç ürünü birleştirdiğinde en avantajlı toplam."
        />

        {/* DOĞRULUK: koçluk için online kayıt akışı henüz yayında değil.
            Durum açıkça yazılır; sayfa satın alınabilirmiş gibi davranmaz. */}
        <section className="site-container pt-6">
          <p className="rounded-dc-card-sm border border-dc-line bg-white px-5 py-4 text-[14.5px] leading-[1.6] text-dc-ink-muted">
            Online Koçum için kayıtlar hazırlanıyor. Koçluk kontenjanı ve başlangıç
            tarihi ön görüşmede netleşir; online kayıt akışı yayına alınmadan ödeme
            almıyoruz.
          </p>
        </section>

        <ProductFaq
          items={[
            {
              q: "Koçum gerçek bir insan mı?",
              a: "Evet. Koçluk insan koç tarafından yürütülür; Dino AI yalnızca veri ve öneri sağlar.",
            },
            {
              q: "Görüşme sıklığı ne?",
              a: "Görüşme sıklığı öğrencinin programına göre ön görüşmede belirlenir.",
            },
            {
              q: "Ders almadan koçluk alabilir miyim?",
              a: "Evet, Online Koçum tek başına satın alınabilir.",
            },
          ]}
        />

        <ProductClosingCta
          title="Planını koçunla kur."
          body="Tek ürün olarak ya da ders ve denemeyle birlikte."
        />
      </main>
      <SiteFooter />
    </div>
  );
}
