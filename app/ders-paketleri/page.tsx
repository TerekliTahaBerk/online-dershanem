import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PackagesExperience } from "@/components/pricing/packages-experience";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/seo/jsonld";
import { parsePriceToCents } from "@/lib/content";
import { lessonPackage, lessonPackages } from "@/lib/pricing-content";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Ders Seçenekleri | LGS ve YKS Matematik Kataloğu",
  description:
    `LGS ve YKS online matematik ders paketleri: ayda ${lessonPackage.lessonsPerMonth} × ${lessonPackage.lessonDurationMinutes} dakika canlı ders, en fazla 4 öğrenci, ${lessonPackage.priceLabel} ve taahhütsüz ödeme.`,
  canonical: "/ders-paketleri",
});

export default function LessonPackagesPage() {
  return (
    <div className="site-scope">
      <SchemaJsonLd
        schema={[
          breadcrumbJsonLd([
            { name: "Ana Sayfa", url: "/" },
            { name: "onlinedershanem.", url: "/urunler/online-dershanem/" },
            { name: "Ders Seçenekleri", url: "/ders-paketleri/" },
          ]),
          ...lessonPackages.map((pkg) =>
            productJsonLd({
              name: pkg.name,
              description:
                "En fazla 4 öğrencilik canlı matematik dersi, ders sonrası çalışma yönü ve öğretmen notu.",
              url: "/ders-paketleri/",
              image: "/logo.png",
              priceCents: pkg.priceCents,
              originalPriceCents: pkg.oldPriceLabel
                ? parsePriceToCents(pkg.oldPriceLabel)
                : null,
              sku: `${pkg.category.toLowerCase()}-matematik-ders-paketi`,
            }),
          ),
        ]}
      />
      <SiteHeader />
      <PackagesExperience
        primarySource="lesson_packages_page_primary"
        title={
          <>
            Canlı ders seçenekleri,{" "}
            onlinedershanem. kapsamında.
          </>
        }
        subtitle="Bu sayfa onlinedershanem. içindeki doğrudan satın alınabilir LGS ve YKS matematik ders seçeneklerini gösterir."
      />
      <SiteFooter />
    </div>
  );
}
