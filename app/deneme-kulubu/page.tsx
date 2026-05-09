import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { StickyContactBar } from "@/components/sections/sticky-contact-bar";
import { MultiStepLeadForm } from "@/components/sections/multi-step-lead-form";
import { ExamClubPageContent } from "@/components/sections/exam-club-page-content";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";
import { siteUrl } from "@/lib/content";

export const metadata: Metadata = {
  title: "Online Deneme Kulübü — odk.",
  description:
    "TYT, AYT ve LGS öğrencileri için haftalık deneme, canlı analiz seansı, kişisel hata haritası ve net artış koçluğu. Sadece soru değil, çözüm.",
  alternates: { canonical: "/deneme-kulubu/" },
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
      <main className="bg-[var(--od-cream)] text-[var(--od-ink)]">
        {/* Premium hero */}
        <section className="relative overflow-hidden border-b border-[var(--od-line)]">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <Image
              src="/v991-nt-35.jpg"
              alt=""
              fill
              sizes="100vw"
              priority
              className="object-cover opacity-[0.14] mix-blend-multiply"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,253,245,0.55) 0%, rgba(255,253,245,0.92) 70%, var(--od-cream) 100%)",
              }}
            />
          </div>

          <div className="mx-auto max-w-4xl px-5 pt-28 pb-16 sm:pt-36 sm:pb-20 text-center">
            <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--od-olive)]">
              Online Deneme Kulübü
            </span>
            <h1 className="mt-5 font-display text-[44px] font-normal leading-[1.02] tracking-tight text-[var(--od-ink)] sm:text-[68px]">
              Denemeyi sayıdan{" "}
              <em className="italic text-[var(--od-olive)]">karara</em> dönüştür.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[15.5px] leading-7 text-[var(--od-ink-soft)]">
              ODK haftada 1 denemeyi tek başına bırakmaz. Sonuçları derinlemesine
              analiz eder, eksik konuları işaretler, öğrenciyi bir sonraki
              haftaya net bir planla yönlendirir.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <LeadFunnelTrigger
                source="exam_club_hero_cta"
                eventName="landing_cta_click"
                analyticsId="exam_club_hero_cta"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--od-ink)] px-6 py-3 text-[14px] font-medium text-white transition hover:bg-black"
              >
                Ön kayıt bırak
                <ArrowRight size={15} strokeWidth={1.8} />
              </LeadFunnelTrigger>
              <a
                href="#paketler"
                className="inline-flex items-center rounded-full border border-[var(--od-ink)]/15 bg-white px-6 py-3 text-[14px] font-medium text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/40"
              >
                Paketleri gör
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
          <ExamClubPageContent />
        </section>
      </main>
      <MultiStepLeadForm />
      <Footer />
      <StickyContactBar />
    </>
  );
}
