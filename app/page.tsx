import type { Metadata } from "next";
import { faq, siteUrl } from "@/lib/content";
import { Navbar } from "@/components/sections/navbar";
import { HomeHero } from "@/components/sections/home-hero";
import { UniversityStrip } from "@/components/sections/university-strip";
import { HomeProblem } from "@/components/sections/home-problem";
import { HomeFeatures } from "@/components/sections/home-features";
import { HomePricing } from "@/components/sections/home-pricing";
import { HomeHowItWorks } from "@/components/sections/home-how-it-works";
import { HomeParentTrust } from "@/components/sections/home-parent-trust";
import { HomeOdkPreview } from "@/components/sections/home-odk-preview";
import { HomeTestimonials } from "@/components/sections/home-testimonials";
import { HomeFAQ } from "@/components/sections/home-faq";
import { Footer } from "@/components/sections/footer";
import { HomeYellowCTA } from "@/components/sections/home-yellow-cta";

export const metadata: Metadata = {
  title: "Online Matematik Dershanesi | Butik Canlı Ders ve Deneme Kulübü",
  description:
    "Online matematik dershanesi: en fazla 4 kişilik butik canlı matematik dersleri, matematik deneme kulübü ve veliye açık gelişim takibi. Çocuğunuzun matematikte nerede takıldığını görüp birlikte kapatıyoruz.",
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
    "@type": "EducationalOrganization",
    name: "Online Dershanem",
    description:
      "Online matematik dershanesi: butik canlı matematik dersleri, matematik deneme kulübü ve veliye açık gelişim takibi.",
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
    alternateName: "Online Matematik Dershanesi",
    url: siteUrl,
    inLanguage: "tr-TR",
    keywords: "online matematik dershanesi, matematik özel ders, matematik deneme kulübü, tyt matematik, ayt matematik, lgs matematik"
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
        <HomeProblem />
        <HomeFeatures />
        <HomePricing />
        <HomeHowItWorks />
        <HomeParentTrust />
        <HomeOdkPreview />
        <HomeTestimonials />
        <HomeFAQ />
        <HomeYellowCTA />
      </main>
      <Footer />
    </>
  );
}
