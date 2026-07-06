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
  description:
    "Tek abonelik, tüm YKS ve LGS matematik ihtiyacın. En fazla 4 öğrencilik canlı dersler, kişiye özel plan ve düzenli takip. Aylık ₺3.000.",
  alternates: { canonical: "/paketler" },
  openGraph: {
    title: "Ders Paketleri | Online Dershanem",
    description:
      "Tek, sade abonelik: haftalık birebir matematik dersleri, kişiye özel plan ve düzenli takip.",
    url: `${siteUrl}/paketler`,
  },
};

export default function PackagesPage() {
  return (
    <div className="site-scope">
      <SchemaJsonLd
        schema={[
          breadcrumbJsonLd([
            { name: "Ana Sayfa", url: "/" },
            { name: "Ders Paketleri", url: "/paketler/" },
          ]),
          productJsonLd({
            name: lessonPackage.name,
            description:
              "En fazla 4 öğrencilik canlı matematik dersi, kişiye özel haftalık plan, ödevlendirme ve veliye gelişim notu.",
            url: "/paketler/",
            image: "/logo.png",
            priceCents: lessonPackage.priceCents,
            originalPriceCents: lessonPackage.oldPriceLabel
              ? parsePriceToCents(lessonPackage.oldPriceLabel)
              : null,
            sku: "matematik-ders-paketi",
          }),
        ]}
      />
      <SiteHeader />
      <PackagesExperience
        primarySource="pricing_page_primary"
        title={
          <>
            Tek abonelik, <span className="site-hl">tüm matematik</span> ihtiyacın.
          </>
        }
        subtitle="LGS, TYT ve AYT matematik için haftalık birebir dersler, kişiye özel plan ve düzenli takip — hepsi tek, sade bir pakette."
      />
      <SiteFooter />
    </div>
  );
}
