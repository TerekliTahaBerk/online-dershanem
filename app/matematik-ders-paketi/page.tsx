import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PackagesExperience } from "@/components/pricing/packages-experience";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd, courseJsonLd, productJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { siteUrl } from "@/lib/content";
import { lessonPackages } from "@/lib/pricing-content";
import { homeFaqs } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Matematik Ders Paketi — Butik Canlı Matematik Dersi",
  description:
    "En fazla 4 öğrencilik grupta canlı matematik dersi, derste soru-cevap, ders sonrası ödevlendirme ve veliye kısa gelişim notu. Aylık ₺3.000.",
  alternates: { canonical: "/paketler" },
  openGraph: {
    title: "Matematik Ders Paketi | Online Dershanem",
    description:
      "En fazla 4 öğrencilik grupta canlı matematik dersi, öğretmen notu ve ders sonrası çalışma yönü.",
    url: `${siteUrl}/matematik-ders-paketi`,
    images: [{ url: `${siteUrl}/opengraph-image`, width: 1200, height: 630, alt: "Matematik Ders Paketi" }],
  },
};

export default function MatematikDersPaketiPage() {
  return (
    <div className="site-scope">
      <SchemaJsonLd
        schema={[
          breadcrumbJsonLd([
            { name: "Ana Sayfa", url: "/" },
            { name: "Matematik Ders Paketi", url: "/matematik-ders-paketi/" },
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
            <span className="site-hl">Matematik Ders Paketi</span> ile netlerini yükselt.
          </>
        }
        subtitle="En fazla 4 öğrencilik canlı matematik dersi, derste soru-cevap, ders sonrası ödevlendirme ve veliye kısa gelişim notu."
      />
      <SiteFooter />
    </div>
  );
}
