import type { Metadata } from "next";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { StickyContactBar } from "@/components/sections/sticky-contact-bar";
import { MultiStepLeadForm } from "@/components/sections/multi-step-lead-form";
import { Container } from "@/components/ui/container";
import { ExamClubPageContent } from "@/components/sections/exam-club-page-content";
import { siteUrl } from "@/lib/content";

export const metadata: Metadata = {
  title: "Online Deneme Kulübü — odk.",
  description:
    "TYT, AYT ve LGS öğrencileri için haftalık deneme, canlı analiz seansı, kişisel hata haritası ve net artış koçluğu. Sadece soru değil, çözüm.",
  alternates: {
    canonical: "/deneme-kulubu/",
  },
  openGraph: {
    title: "Online Deneme Kulübü | odk.",
    description:
      "Sadece deneme değil; analiz, strateji ve koçlukla net artışını garantile. TYT, AYT ve LGS için.",
    url: `${siteUrl}/deneme-kulubu/`,
  },
};

export default function DenemeKulubuPage() {
  return (
    <>
      <Navbar />
      <main>
        <Container className="py-14 sm:py-20">
          <ExamClubPageContent />
        </Container>
      </main>
      <MultiStepLeadForm />
      <Footer />
      <StickyContactBar />
    </>
  );
}
