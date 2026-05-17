import type { Metadata } from "next";
import { faq, siteUrl } from "@/lib/content";
import { Navbar } from "@/components/sections/navbar";
import { HomeHero } from "@/components/sections/home-hero";
import { UniversityStrip } from "@/components/sections/university-strip";
import { HomeFeatures } from "@/components/sections/home-features";
import { HomePricing } from "@/components/sections/home-pricing";
import { HomeOdkPreview } from "@/components/sections/home-odk-preview";
import { HomeTestimonials } from "@/components/sections/home-testimonials";
import { HomeFAQ } from "@/components/sections/home-faq";
import { Footer } from "@/components/sections/footer";
import { HomeYellowCTA } from "@/components/sections/home-yellow-cta";

export const metadata: Metadata = {
  title: "TYT-AYT ve LGS için Küçük Grup Online Özel Ders",
  description:
    "Toplu paket zorunluluğu olmadan ihtiyacın olan dersi seç. TYT-AYT ve LGS için küçük gruplarda canlı ders, haftalık takip ve düzenli ilerleme.",
  alternates: {
    canonical: "/"
  }
};

export default function HomePage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a
      }
    }))
  };

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Online Dershanem",
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      areaServed: "TR"
    }
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Online Dershanem",
    alternateName: "Online Dershanem Grup Ozel Ders",
    url: siteUrl,
    inLanguage: "tr-TR",
    keywords: "online dershanem, online dershane, özel ders, yks, tyt, ayt, lgs"
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <Navbar />
      <main>
        <HomeHero />
        <UniversityStrip />
        <HomeFeatures />
        <HomePricing />
        <HomeOdkPreview />
        <HomeTestimonials />
        <HomeFAQ />
        <HomeYellowCTA />
      </main>
      <Footer />
    </>
  );
}
