import { howItWorks } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { FadeIn } from "@/components/ui/fade-in";

export function HowItWorks() {
  return (
    <section id="nasil-calisir" className="bg-soft/70 py-16 sm:py-20">
      <Container>
        <FadeIn>
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Başarıya Giden 5 Adımlı Yol Haritan</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
            Saman alevi gibi sönen motivasyonlara son! Her aşaması titizlikle planlanmış, ölçülebilir ve sürdürülebilir bir sistemle
            hedefine adım adım yürüyoruz.
          </p>
        </FadeIn>
        <div className="mt-10 grid gap-4 md:grid-cols-5">
          {howItWorks.map((step, i) => (
            <FadeIn key={step.title} delay={i * 0.06}>
              <div className="rounded-2xl bg-white p-5 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">Adım {i + 1}</p>
                <p className="mt-2 text-sm font-semibold text-ink">{step.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted">{step.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Container>
    </section>
  );
}
