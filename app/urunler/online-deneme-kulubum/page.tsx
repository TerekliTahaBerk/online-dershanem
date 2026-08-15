import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import {
  ProductHero,
  StepCards,
  ProductDinoBand,
  CrossSellWithPrice,
  ProductFaq,
  ProductClosingCta,
} from "@/components/product/product-sections";
import { singleProductPriceLabel } from "@/lib/commerce/package-builder-pricing";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Online Deneme Kulübüm | Sonucun net sayısı olarak kalmasın",
  description:
    "LGS, TYT ve AYT denemeleri; konu ve soru tipine göre kayıp analizi, denemeler arası gelişim takibi ve Dino AI deneme yorumu.",
  canonical: "/urunler/online-deneme-kulubum",
});

const resultBars = [
  { h: "42%", c: "#DFEBE5" },
  { h: "60%", c: "#BFDDD0" },
  { h: "52%", c: "#DFEBE5" },
  { h: "78%", c: "#14976B" },
  { h: "66%", c: "#BFDDD0" },
  { h: "88%", c: "#14976B" },
];

/** ÜRÜN · ONLINE DENEME KULÜBÜM — onaylı tasarım (Web.dc.html → isDK). */
export default function OnlineDenemeKulubumPage() {
  return (
    <div className="site-scope">
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <ProductHero
          eyebrow="Ürün · Online Deneme Kulübüm"
          title="Sonucun sadece net sayısı olarak kalmasın."
          body="LGS, TYT ve AYT denemeleri. Hangi konuda, hangi soru tipinde ve zaman yönetiminde puan kaybettiğini görürsün; sonraki hafta neye ağırlık vereceğin belli olur."
          tracks={["LGS", "TYT", "AYT"]}
          // `secondaryCta` bilerek verilmiyor: eski "Örnek Analizi Gör"
          // bağlantısı `/deneme-kulubu`ya gidiyordu, o da next.config'te 308
          // ile BU sayfaya dönüyordu — kullanıcı aynı sayfaya geri atılıyordu.
          // Varsayılan ("Ücretsiz Görüşme") diğer iki ürün sayfasıyla aynı.
          visual={
            <div className="rounded-dc-card border border-dc-line bg-white p-5 shadow-[0_14px_34px_rgba(20,32,28,.07)]">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[11px] font-semibold text-[var(--dc-ink-faint)]">
                  DENEME SONUÇ EKRANI
                </p>
                <span className="rounded-full bg-dc-brand-soft px-2.5 py-1 text-[11px] font-semibold text-dc-brand-hover">
                  Örnek görünüm
                </span>
              </div>

              <div className="mt-4 flex h-[170px] items-end gap-2.5">
                {resultBars.map((b, i) => (
                  <span
                    key={i}
                    className="flex-1 rounded-t-lg"
                    style={{ height: b.h, background: b.c }}
                  />
                ))}
              </div>

              <div className="mt-4 flex gap-2.5">
                <div className="flex-1 rounded-xl bg-dc-brand-soft p-3">
                  <p className="font-mono text-[10.5px] font-semibold text-dc-brand-hover">
                    GÜÇLÜ ALAN
                  </p>
                  <p className="mt-1 text-[14.5px] font-bold text-dc-brand-deep">
                    Geometri temelleri
                  </p>
                </div>
                <div className="flex-1 rounded-xl bg-[#FCF6F0] p-3">
                  <p className="font-mono text-[10.5px] font-semibold text-[#8A5F37]">
                    GELİŞTİRİLECEK
                  </p>
                  <p className="mt-1 text-[14.5px] font-bold text-[#6B4A2C]">
                    Paragraf hızı
                  </p>
                </div>
              </div>
            </div>
          }
        />

        <StepCards
          title="Denemeye girdikten sonra ne oluyor?"
          columns={5}
          steps={[
            { title: "Denemeye gir", body: "Gerçek sınav formatında deneme." },
            { title: "Sonucunu gör", body: "Net, puan ve ders bazlı dağılım." },
            { title: "Alanlarını anla", body: "Güçlü ve zayıf konular ayrışır." },
            { title: "Sıradaki adımı öğren", body: "Ne çalışacağın somut hale gelir." },
            { title: "Gelişimini takip et", body: "Denemeler arası ilerleme grafiği." },
          ]}
        />

        <ProductDinoBand
          onWhite
          eyebrow="Dino AI · Deneme analizi"
          title="&ldquo;Nerede puan kaybediyorum?&rdquo;"
          body="Dino AI sonucu yorumlar: hangi konu, hangi soru tipi, hangi süre yönetimi hatası. Ardından bir sonraki adımı önerir."
          quote="Bu denemede kayıp ağırlıklı olarak paragrafta."
          quoteBody="Önerilen adım: 3 gün paragraf hız çalışması, ardından mini deneme."
        />

        <CrossSellWithPrice
          cards={[
            {
              eyebrow: "+ Online Dershanem",
              title: "Eksiği derste kapat",
              body: "Analizde çıkan zayıf konu, canlı derste öğretmenle çalışılır.",
            },
            {
              eyebrow: "+ Online Koçum",
              title: "Analizi plana çevir",
              body: "Koç, deneme sonucuna göre haftalık planı güncelleyebilir.",
            },
          ]}
          advantageNote="Birlikte aldığında paket fiyatın düşer."
          price={singleProductPriceLabel("denemeKulubum")}
          priceSuffix="/ dönem"
          features={[
            "LGS · TYT · AYT denemeleri",
            "Sonuç ve alan analizi",
            "Dino AI deneme yorumu",
          ]}
          priceFootnote="Ders ve koçluk eklendiğinde toplam avantaj artar."
        />

        <ProductFaq
          items={[
            {
              q: "Denemeler hangi sınavları kapsıyor?",
              a: "LGS, TYT ve AYT. Hangi denemeye gireceğini hedef sınavına göre seçersin.",
            },
            {
              q: "Deneme takvimi nasıl belirleniyor?",
              a: "Deneme takvimi dönem başında paneline düşer; her denemenin tarihi ve saati orada yazar. Katılamadığın denemeyi sonradan kendi başına çözebilirsin.",
            },
            {
              q: "Sonuç analizinde ne görüyorum?",
              a: "Net ve puan dağılımının yanında konu ve soru tipi bazlı kayıp analizi ile denemeler arası gelişim karşılaştırması.",
            },
          ]}
        />

        <ProductClosingCta
          title="Denemeni analizle birlikte çöz."
          body="Tek ürün olarak ya da ders ve koçlukla birlikte."
        />
      </main>
      <SiteFooter />
    </div>
  );
}
