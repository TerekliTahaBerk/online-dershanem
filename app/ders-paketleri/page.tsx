import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PackagesExperience } from "@/components/pricing/packages-experience";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/seo/jsonld";
import { parsePriceToCents } from "@/lib/content";
import { lessonPackages } from "@/lib/pricing-content";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Matematik Ders Paketleri ve Fiyatları",
  description: "LGS ve YKS online matematik ders paketleri: ayda 4 × 90 dakika canlı ders, en fazla 4 öğrenci, ₺3.000/ay ve taahhütsüz ödeme.",
  canonical: "/ders-paketleri",
});

export default function LessonPackagesPage() {
  return (
    <div className="site-scope">
      <SchemaJsonLd schema={[
        breadcrumbJsonLd([
          { name: "Ana Sayfa", url: "/" },
          { name: "Ders Paketleri", url: "/ders-paketleri/" },
        ]),
        ...lessonPackages.map((pkg) =>
          productJsonLd({
            name: pkg.name,
            description: "En fazla 4 öğrencilik canlı matematik dersi, ders sonrası çalışma yönü ve öğretmen notu.",
            url: "/ders-paketleri/",
            image: "/logo.png",
            priceCents: pkg.priceCents,
            originalPriceCents: pkg.oldPriceLabel ? parsePriceToCents(pkg.oldPriceLabel) : null,
            sku: `${pkg.category.toLowerCase()}-matematik-ders-paketi`,
          }),
        ),
      ]} />
      <SiteHeader />
      <PackagesExperience
        primarySource="lesson_packages_page_primary"
        title={<>İki paket, <span className="site-hl">tek net çalışma düzeni.</span></>}
        subtitle="LGS ve YKS için en fazla 4 kişilik canlı matematik dersi, ders sonrası yönlendirme ve güvenli ödeme."
      />
      <SiteFooter />
    </div>
  );
}
