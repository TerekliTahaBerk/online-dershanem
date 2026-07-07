import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PackagesExperience } from "@/components/pricing/packages-experience";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/seo/jsonld";
import { parsePriceToCents, siteUrl } from "@/lib/content";
import { lessonPackages } from "@/lib/pricing-content";

export const metadata: Metadata = {
  title: "Ders Paketleri",
  description: "LGS ve YKS için canlı matematik dersi, en fazla 4 öğrencilik grup ve ders sonrası takip. Aylık ₺3.000.",
  alternates: { canonical: "/ders-paketleri" },
  openGraph: {
    title: "Ders Paketleri | Online Dershanem",
    description: "LGS ve YKS için iki matematik paketi: küçük grup canlı ders ve düzenli takip.",
    url: `${siteUrl}/ders-paketleri`,
  },
};

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
        title={<>İki paket, <span className="site-hl">net bir matematik yolu.</span></>}
        subtitle="LGS ve YKS için canlı matematik dersi, küçük grup ve ders sonrası takip."
      />
      <SiteFooter />
    </div>
  );
}
