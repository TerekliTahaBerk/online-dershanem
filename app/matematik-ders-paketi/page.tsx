import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PackagesExperience } from "@/components/pricing/packages-experience";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd, courseJsonLd, productJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { lessonPackages } from "@/lib/pricing-content";
import { homeFaqs } from "@/lib/site-content";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Matematik Ders Paketleri — LGS ve YKS",
  description:
    "LGS ve YKS için en fazla 4 öğrencilik canlı matematik ders paketleri. Derste soru-cevap, ders sonrası yönlendirme ve aylık ₺3.000 fiyat.",
  canonical: "/ders-paketleri",
  imageAlt: "LGS ve YKS Matematik Ders Paketleri",
});

export default function MatematikDersPaketiPage() {
  return (
    <div className="site-scope">
      <SchemaJsonLd
        schema={[
          breadcrumbJsonLd([
            { name: "Ana Sayfa", url: "/" },
            { name: "Matematik Ders Paketleri", url: "/matematik-ders-paketi/" },
          ]),
          ...lessonPackages.flatMap((pkg) => [
            productJsonLd({
              name: pkg.name,
              description:
                "En fazla 4 öğrencilik grupta canlı matematik dersi, derste soru-cevap, ders sonrası ödevlendirme ve veliye kısa gelişim notu.",
              url: "/matematik-ders-paketi/",
              image: "/logo.png",
              priceCents: pkg.priceCents,
              sku: `${pkg.category.toLowerCase()}-matematik-ders-paketi`,
            }),
            courseJsonLd({
              name: pkg.name,
              description:
                "LGS veya YKS hedefine göre, en fazla 4 öğrencilik küçük grupta canlı matematik dersi.",
              url: "/matematik-ders-paketi/",
            }),
          ]),
          faqJsonLd(homeFaqs),
        ]}
      />
      <SiteHeader />
      <PackagesExperience
        primarySource="math_package_page_primary"
        title={
          <>
            <span className="site-hl">LGS ve YKS paketleri</span> ile matematik düzenini kur.
          </>
        }
        subtitle="En fazla 4 öğrencilik canlı matematik dersi, derste soru-cevap, ders sonrası yönlendirme ve güvenli ödeme."
      />
      <SiteFooter />
    </div>
  );
}
