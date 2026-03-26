import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { StickyContactBar } from "@/components/sections/sticky-contact-bar";
import { MultiStepLeadForm } from "@/components/sections/multi-step-lead-form";
import { Container } from "@/components/ui/container";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";

export type ExamLandingData = {
  examKey: "TYT" | "AYT" | "TYT-AYT" | "LGS";
  heroTitle: string;
  heroText: string;
  heroOutcome: string;
  benefitTitle: string;
  benefitItems: string[];
  weeklyPlan: string[];
  dashboardItems: string[];
  testimonials: Array<{ name: string; result: string; quote: string }>;
  faq: Array<{ q: string; a: string }>;
};

export function ExamLandingTemplate({ data }: { data: ExamLandingData }) {
  return (
    <>
      <Navbar />
      <main>
        <section className="pb-10 pt-14 sm:pt-20">
          <Container>
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="inline-flex rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold tracking-[0.12em] text-brand">
                  {data.examKey} Özel Landing Sayfası
                </p>
                <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink sm:text-5xl">{data.heroTitle}</h1>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">{data.heroText}</p>
                <p className="mt-4 rounded-2xl border border-line bg-white p-3 text-sm font-semibold text-ink">{data.heroOutcome}</p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <LeadFunnelTrigger
                    source={`${data.examKey.toLowerCase()}_hero_primary`}
                    eventName="landing_cta_click"
                    className="inline-flex rounded-full bg-anchor px-6 py-3 text-sm font-semibold text-white"
                  >
                    Ücretsiz Denemeyi Başlat
                  </LeadFunnelTrigger>
                  <a
                    href="#exam-paket"
                    className="inline-flex rounded-full border border-line-strong bg-white px-6 py-3 text-sm font-semibold text-ink"
                  >
                    {data.examKey} Paketini Gör
                  </a>
                </div>
              </div>

              <div className="rounded-3xl border border-line bg-white p-6 shadow-soft">
                <h2 className="text-lg font-semibold text-ink">Bu sayfa kimin için?</h2>
                <ul className="mt-4 space-y-3 text-sm text-muted">
                  {data.benefitItems.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-brand" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Container>
        </section>

        <section className="py-14">
          <Container>
            <div className="rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8">
              <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{data.benefitTitle}</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {data.dashboardItems.map((item) => (
                  <article key={item} className="rounded-2xl border border-line bg-soft p-4 text-sm text-muted">
                    {item}
                  </article>
                ))}
              </div>
            </div>
          </Container>
        </section>

        <section className="py-14">
          <Container>
            <div className="grid gap-5 lg:grid-cols-2">
              <article className="rounded-3xl border border-line bg-white p-6 shadow-soft">
                <h3 className="text-xl font-semibold text-ink">Örnek Haftalık Plan</h3>
                <ul className="mt-4 space-y-2 text-sm text-muted">
                  {data.weeklyPlan.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </article>

              <article id="exam-paket" className="rounded-3xl border border-brand/30 bg-mint p-6 shadow-soft">
                <h3 className="text-xl font-semibold text-ink">{data.examKey} Dersine Uygun Paket</h3>
                <p className="mt-2 text-sm text-muted">
                  Ön görüşmede seviye ve hedefe göre doğru ders paketi ve grup temposunu belirliyoruz. Yanlış paketle vakit kaybetmezsin.
                </p>
                <LeadFunnelTrigger
                  source={`${data.examKey.toLowerCase()}_package_cta`}
                  eventName="landing_cta_click"
                  className="mt-4 inline-flex rounded-full bg-anchor px-5 py-2.5 text-xs font-semibold text-white"
                >
                  {data.examKey} Paketi İçin Başvur
                </LeadFunnelTrigger>
              </article>
            </div>
          </Container>
        </section>

        <section className="py-14">
          <Container>
            <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{data.examKey} Öğrenci ve Veli Yorumları</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {data.testimonials.map((item) => (
                <article key={item.name} className="rounded-3xl border border-line bg-white p-5 shadow-soft">
                  <p className="text-xs font-semibold text-brand">{item.result}</p>
                  <p className="mt-2 text-sm text-muted">“{item.quote}”</p>
                  <p className="mt-3 text-xs font-semibold text-ink">{item.name}</p>
                </article>
              ))}
            </div>
          </Container>
        </section>

        <section className="py-14">
          <Container>
            <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{data.examKey} Sık Sorulan Sorular</h2>
            <div className="mt-5 space-y-3">
              {data.faq.map((item) => (
                <details key={item.q} className="rounded-2xl border border-line bg-white p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-ink">{item.q}</summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </Container>
        </section>

        <section className="pb-20 pt-10">
          <Container>
            <div className="rounded-3xl border border-line bg-white p-7 shadow-soft sm:p-10">
              <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{data.examKey} için doğru ders paketini birlikte seçelim</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
                1 dakikalık başvuru ile ücretsiz deneme + sana uygun ders paketi yönü netleşsin.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <LeadFunnelTrigger
                  source={`${data.examKey.toLowerCase()}_final_cta`}
                  eventName="landing_cta_click"
                  className="inline-flex rounded-full bg-anchor px-6 py-3 text-sm font-semibold text-white"
                >
                  Ücretsiz Denemeyi Başlat
                </LeadFunnelTrigger>
                <Link href="/" className="inline-flex rounded-full border border-line-strong px-6 py-3 text-sm font-semibold text-ink">
                  Ana Sayfaya Dön
                </Link>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <MultiStepLeadForm />
      <Footer />
      <StickyContactBar />
    </>
  );
}
