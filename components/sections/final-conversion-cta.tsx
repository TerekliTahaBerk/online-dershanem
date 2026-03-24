import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";

export function FinalConversionCTA() {
  return (
    <section id="basvuru" className="pb-20 pt-8 sm:pb-24">
      <Container>
        <div className="rounded-3xl border border-line bg-gradient-to-br from-white via-paper to-mint p-8 shadow-soft sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Geleceğin İçin Final Adımı</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Başarı Yolculuğunu Birlikte Planlayalım</h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Sadece 30 saniyeni ayırıp formu doldur; eğitim danışmanımız seni arasın. Hedeflerini dinleyelim ve sana en hızlı net
            artışını sağlayacak stratejik programı birlikte kurgulayalım.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3 sm:justify-start">
            <LeadFunnelTrigger
              source="final_cta_primary"
              eventName="trial_cta_click"
              className="inline-flex items-center rounded-full bg-anchor px-6 py-3 text-sm font-semibold text-white transition hover:bg-pine"
              analyticsId="final_cta_primary"
            >
              Formu Doldur, Seni Arayalım <ArrowRight className="ml-2 h-4 w-4" />
            </LeadFunnelTrigger>
            <Link
              href="https://drive.google.com/file/d/164x3itpg_6l1-piwnCrevWM5Hz-SVhW5/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full border border-line-strong bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:bg-soft"
            >
              Neden Buradayız?
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted">
            Ücretsiz strateji görüşmesi için sınırlı kontenjan! Kaydın alındıktan sonra uzman ekibimiz tarafından 24 saat içinde
            dönüş sağlanacaktır.
          </p>
        </div>
      </Container>
    </section>
  );
}
