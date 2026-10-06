import Link from "next/link";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PageHero } from "@/components/site/page-hero";
import { ProductBrandLabel } from "@/components/product/product-brand-label";
import { PublicSection, SectionIntro } from "@/components/public/primitives";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { listActivePublicProducts } from "@/lib/public-marketing-products-server";
import { getDinoMarketingCopy } from "@/lib/dino-marketing";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Hakkımızda | Öğrenme, plan ve ölçme aynı çatı altında",
  description: "onlinedershanem. ile canlı öğrenme, Yön Koçluk ile çalışma düzeni, Deneme Ligi ile ölçülebilir ilerleme. İnsan uzmanlığını merkeze alan yaklaşımımızı tanıyın.",
  canonical: "/hakkimizda",
});

const principles = [
  { title: "Gerçek etkileşim", body: "Birebir ya da en fazla 4 kişilik canlı grupta öğrenci soru sorabilmeli, çözümünü gösterebilmeli ve geri bildirim alabilmeli." },
  { title: "İnsan uzmanlığı merkezde", body: "Konuyu öğretmen öğretir, planı öğrenciyi tanıyan insan koç kurar. Teknoloji onların sorumluluğunu devralmaz." },
  { title: "Şeffaf kapsam ve koşullar", body: "Ürünün ne sunduğunu, fiyatını ve erişim koşullarını açıkça anlatırız. Öğrenci ve veli neye başladığını bilmelidir." },
  { title: "Görünür ilerleme", body: "Katılım, çalışma ve deneme sonuçları süreci anlamaya yardımcı olur. Tek bir puan öğrencinin bütün hikâyesini anlatmaz." },
  { title: "Uygulanabilir sonraki adım", body: "Ders veya deneme sonunda öğrencinin elinde çalışabileceği net bir yön olmalı. Plan günlük hayatına sığmalıdır." },
  { title: "Sürdürülebilir destek", body: "İhtiyaç kadar destekle başlamak, küçük grupta öğrenmeyi erişilebilir kılmak ve gerçekçi bir çalışma temposu kurmak için çalışırız." },
];
const roles = { OD: "Öğren", OK: "Planla", ODK: "Ölç", KPSS: "Planla" };

export default async function HakkimizdaPage() {
  const products = await listActivePublicProducts();
  const dino = getDinoMarketingCopy(getPanelFeatureFlags().dinoAi);
  return (
    <div className="site-scope">
      <SiteHeader />
      <SchemaJsonLd schema={breadcrumbJsonLd([{ name: "Ana sayfa", url: "/" }, { name: "Hakkımızda", url: "/hakkimizda" }])} />
      <main id="main-content" tabIndex={-1}>
        <PageHero eyebrow="Hakkımızda" align="left" title="Öğrencinin bir sonraki adımı net olsun." subtitle="Öğrenmek için doğru ortam, çalışmak için uygulanabilir plan, ilerlemeyi görmek için ölçme. Bu ihtiyaçları aynı çatı altında bir araya getiriyoruz." />
        <PublicSection id="misyonumuz">
          <SectionIntro eyebrow="Neden varız?" title="İçerik bol. Yön bulmak her zaman kolay değil." body="Öğrenci bir konuyu izleyebilir ama takıldığı adımda geri bildirime, haftasını düzenlerken desteğe ve çalışmasının karşılığını görmeye ihtiyaç duyabilir." />
          <p className="mt-6 max-w-3xl text-[17px] leading-8 text-dc-ink-body">Misyonumuz, öğrencinin kalabalıkta kaybolmadan öğrenebildiği ve ne çalışacağını bildiği bir düzen kurmak. Canlı öğrenme, kişisel plan ve deneme analizi bu düzenin farklı parçalarıdır. Her öğrenci hepsine birden ihtiyaç duymayabilir.</p>
        </PublicSection>
        <PublicSection tone="soft">
          <SectionIntro title="Nasıl çalışıyoruz?" body="Her ürün ayrı bir ihtiyaca yanıt verir; birlikte kullanıldığında öğrenme, çalışma ve ölçme birbirini destekler." />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {products.map((product) => (
              <article key={product.slug} className="rounded-dc-card border border-dc-line bg-white p-6">
                <p className="dc-eyebrow">{roles[product.registryCode]}</p>
                <h3 className="mt-4 text-[20px] font-bold text-dc-ink"><ProductBrandLabel href={product.href} fallback={product.name} /></h3>
                <p className="mt-3 text-[15px] leading-7 text-dc-ink-body">{product.description}</p>
                <Link href={product.href} className="mt-4 inline-flex min-h-11 items-center font-semibold text-dc-brand-strong">Yaklaşımı incele →</Link>
              </article>
            ))}
          </div>
        </PublicSection>
        <PublicSection>
          <SectionIntro title="Bize yön veren ilkeler" />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {principles.map((principle) => <article key={principle.title} className="rounded-dc-card border border-dc-line p-6"><h3 className="text-[19px] font-bold text-dc-ink">{principle.title}</h3><p className="mt-3 text-[15px] leading-7 text-dc-ink-body">{principle.body}</p></article>)}
          </div>
        </PublicSection>
        <PublicSection tone="soft">
          <SectionIntro eyebrow={`Dino AI · ${dino.status}`} title="Teknoloji destekler. İnsan yol gösterir." body={dino.description} />
          <Link href="/dino-ai" className="mt-5 inline-flex min-h-11 items-center font-semibold text-dc-brand-strong">Ortak destek katmanını tanı →</Link>
        </PublicSection>
        <PublicSection>
          <SectionIntro title="Öğrenciyi tanıyan bir ekip" body="Canlı derslerde öğretmenler, çalışma düzeninde insan koçlar ve deneyimin arkasında ürün ekibi birlikte çalışır. Sorularını ve ihtiyaç duyduğun desteği bizimle paylaşabilirsin." />
          <Link href="/iletisim" className="site-btn site-btn-secondary mt-6">Bize ulaş</Link>
        </PublicSection>
      </main>
      <SiteFooter />
    </div>
  );
}
