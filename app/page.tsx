import type { Metadata } from "next";
import { faq, siteUrl } from "@/lib/content";
import { Navbar } from "@/components/sections/navbar";
import { ConversionHeroSection } from "@/components/sections/conversion-hero-section";
import { ProgramsSection } from "@/components/sections/programs-section";
import { FreeTrialSection } from "@/components/sections/free-trial-section";
import { DashboardPreviewSection } from "@/components/sections/dashboard-preview-section";
import { HowItWorks } from "@/components/sections/how-it-works";
import { WhyUsSection } from "@/components/sections/why-us-section";
import { TeacherSection } from "@/components/sections/teacher-section";
import { PricingComparisonSection } from "@/components/sections/pricing-comparison-section";
import { VideoTestimonialsSection } from "@/components/sections/video-testimonials-section";
import { FAQSection } from "@/components/sections/faq-section";
import { FinalConversionCTA } from "@/components/sections/final-conversion-cta";
import { Footer } from "@/components/sections/footer";
import { StickyContactBar } from "@/components/sections/sticky-contact-bar";
import { MultiStepLeadForm } from "@/components/sections/multi-step-lead-form";

export const metadata: Metadata = {
  title: "TYT, AYT ve LGS İçin Online Dershane Sistemi",
  description:
    "TYT-AYT ve LGS için ders bazlı Grup Özel Ders paketleri: küçük grup, seviyeye göre yerleşim ve odaklı canlı ders modeli.",
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
    url: siteUrl,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      areaServed: "TR"
    }
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <Navbar />
      <main>
        <ConversionHeroSection />
        <FreeTrialSection />
        <PricingComparisonSection />
        <DashboardPreviewSection />
        <ProgramsSection />
        <HowItWorks />
        <WhyUsSection />
        <TeacherSection />
        <VideoTestimonialsSection />
        <FAQSection />
        <FinalConversionCTA />
      </main>
      <MultiStepLeadForm />
      <Footer />
      <StickyContactBar />
    </>
  );
}
