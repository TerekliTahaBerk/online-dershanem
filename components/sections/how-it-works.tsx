import { howItWorks } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { FadeIn } from "@/components/ui/fade-in";

export function HowItWorks() {
  return (
    <section id="nasil-calisir" className="bg-soft/60 py-16 sm:py-24">
      <Container>
        <FadeIn>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Nasıl Çalışır?</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Başarıya Giden 5 Adımlı Yol Haritan
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Saman alevi gibi sönen motivasyonlara son! Her aşaması titizlikle planlanmış, ölçülebilir ve sürdürülebilir bir sistemle hedefine adım adım yürüyoruz.
          </p>
        </FadeIn>

        {/* Desktop: horizontal flow */}
        <div className="mt-12 hidden md:block">
          <div className="relative">
            {/* Connector line */}
            <div className="absolute left-[calc(10%+24px)] right-[calc(10%+24px)] top-6 h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent" />

            <div className="grid grid-cols-5 gap-4">
              {howItWorks.map((step, i) => (
                <FadeIn key={step.title} delay={i * 0.07}>
                  <div className="flex flex-col items-center text-center">
                    {/* Step circle */}
                    <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-anchor shadow-[0_0_0_6px_#eaf4ef]">
                      <span className="text-sm font-bold text-mint">{i + 1}</span>
                    </div>

                    {/* Card */}
                    <div className="mt-5 w-full rounded-2xl border border-line bg-white p-4 shadow-soft">
                      <p className="text-sm font-semibold text-ink">{step.title}</p>
                      <p className="mt-2 text-xs leading-relaxed text-muted">{step.desc}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile: vertical stack */}
        <div className="mt-8 space-y-3 md:hidden">
          {howItWorks.map((step, i) => (
            <FadeIn key={step.title} delay={i * 0.06}>
              <div className="flex gap-4 rounded-2xl border border-line bg-white p-4 shadow-soft">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-anchor">
                  <span className="text-xs font-bold text-mint">{i + 1}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{step.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{step.desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </Container>
    </section>
  );
}
