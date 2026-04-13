import { ArrowRight, Clock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";

export function FinalConversionCTA() {
  return (
    <section id="basvuru" className="pb-20 pt-8 sm:pb-28">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-anchor p-8 shadow-[0_20px_60px_-12px_rgba(9,20,19,0.5)] sm:p-12 lg:p-14">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-pine/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-brand/30 blur-3xl" />

          <div className="relative">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/10 px-3.5 py-1.5 text-xs font-semibold text-mint">
              <ShieldCheck className="h-3.5 w-3.5" />
              Geleceğin İçin Final Adımı
            </div>

            {/* Headline */}
            <h2 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.6rem]">
              Başarı Yolculuğunu{" "}
              <span className="text-mint">Birlikte Planlayalım</span>
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-paper/70 sm:text-base">
              Sadece 30 saniyeni ayırıp formu doldur; eğitim danışmanımız seni arasın. Hedeflerini dinleyelim ve sana en hızlı net artışını sağlayacak stratejik programı birlikte kurgulayalım.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap gap-3">
              <LeadFunnelTrigger
                source="final_cta_primary"
                eventName="trial_cta_click"
                className="inline-flex items-center rounded-full bg-mint px-6 py-3 text-sm font-semibold text-pine shadow-[0_4px_14px_-4px_rgba(176,228,204,0.5)] transition hover:-translate-y-0.5 hover:bg-mint/90"
                analyticsId="final_cta_primary"
              >
                Formu Doldur, Seni Arayalım <ArrowRight className="ml-2 h-4 w-4" />
              </LeadFunnelTrigger>
              <Link
                href="https://drive.google.com/file/d/164x3itpg_6l1-piwnCrevWM5Hz-SVhW5/view?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Neden Buradayız?
              </Link>
            </div>

            {/* Reassurance row */}
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 text-xs font-medium text-paper/60">
                <Clock className="h-3.5 w-3.5" /> Başvuru 30 saniye sürer
              </span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-paper/60">
                <ShieldCheck className="h-3.5 w-3.5" /> Ücretsiz strateji görüşmesi
              </span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-paper/60">
                <ArrowRight className="h-3.5 w-3.5" /> 24 saat içinde dönüş
              </span>
            </div>

            <p className="mt-3 text-[11px] text-paper/40">
              Ücretsiz strateji görüşmesi için sınırlı kontenjan! Kaydın alındıktan sonra uzman ekibimiz tarafından 24 saat içinde dönüş sağlanacaktır.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
