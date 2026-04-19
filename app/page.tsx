import type { Metadata } from "next";
import { faq, siteUrl } from "@/lib/content";
import { Navbar } from "@/components/sections/navbar";
import { ConversionHeroSection } from "@/components/sections/conversion-hero-section";
import { UniversityStrip } from "@/components/sections/university-strip";
import { HowItWorks } from "@/components/sections/how-it-works";
import { WhyUsSection } from "@/components/sections/why-us-section";
import { TeacherSection } from "@/components/sections/teacher-section";
import { PricingComparisonSection } from "@/components/sections/pricing-comparison-section";
import { CampsPreviewSection } from "@/components/sections/camps-preview-section";
import { VideoTestimonialsSection } from "@/components/sections/video-testimonials-section";
import { FAQSection } from "@/components/sections/faq-section";
import { FinalConversionCTA } from "@/components/sections/final-conversion-cta";
import { Footer } from "@/components/sections/footer";
import { StickyContactBar } from "@/components/sections/sticky-contact-bar";
import { MultiStepLeadForm } from "@/components/sections/multi-step-lead-form";
import { PurchaseIntentForm } from "@/components/sections/purchase-intent-form";

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
        <ConversionHeroSection />
        <UniversityStrip />
        <PricingComparisonSection />
        <CampsPreviewSection />
        <HowItWorks />
        <WhyUsSection />
        <TeacherSection />
        <VideoTestimonialsSection />
        <FAQSection />
        <FinalConversionCTA />
      </main>
      <MultiStepLeadForm />
      <PurchaseIntentForm />
      <Footer />
      <StickyContactBar />
    </>
  );
}
