import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PackagesExperience } from "@/components/pricing/packages-experience";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/seo/jsonld";
import { parsePriceToCents, siteUrl } from "@/lib/content";
import { lessonPackage } from "@/lib/pricing-content";

export const metadata: Metadata = {
  title: "Ders Paketleri",
  description: "Canlı matematik dersi, en fazla 4 öğrencilik grup ve ders sonrası takip tek pakette. Aylık ₺3.000.",
  alternates: { canonical: "/ders-paketleri" },
  openGraph: {
    title: "Ders Paketleri | Online Dershanem",
    description: "Tek paket, net bir matematik yolu: küçük grup canlı ders ve düzenli takip.",
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
        productJsonLd({
          name: lessonPackage.name,
          description: "En fazla 4 öğrencilik canlı matematik dersi, ders sonrası çalışma yönü ve öğretmen notu.",
          url: "/ders-paketleri/",
          image: "/logo.png",
          priceCents: lessonPackage.priceCents,
          originalPriceCents: lessonPackage.oldPriceLabel ? parsePriceToCents(lessonPackage.oldPriceLabel) : null,
          sku: "matematik-ders-paketi",
        }),
      ]} />
      <SiteHeader />
      <PackagesExperience
        primarySource="lesson_packages_page_primary"
        title={<>Tek paket, <span className="site-hl">net bir matematik yolu.</span></>}
        subtitle="Canlı matematik dersi, küçük grup ve ders sonrası takip tek pakette."
      />
      <SiteFooter />
    </div>
  );
}
