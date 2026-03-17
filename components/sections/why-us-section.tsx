import { whyUs } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { FadeIn } from "@/components/ui/fade-in";

export function WhyUsSection() {
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <FadeIn>
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Neden Online Dershanem?</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
            Öğrencinin dikkatini yakalayan, motive eden ve sonuç üreten bir sistem için yalnızca kaliteli içerik yetmez. Süreç
            tasarımı, öğretmen disiplini ve düzenli performans takibi birlikte çalışmalıdır.
          </p>
        </FadeIn>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {whyUs.map((item, i) => (
            <FadeIn key={item.title} delay={i * 0.08}>
              <article className="h-full rounded-3xl border border-line bg-white p-6 shadow-soft">
                <h3 className="text-lg font-semibold text-ink">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.content}</p>
              </article>
            </FadeIn>
          ))}
        </div>
      </Container>
    </section>
  );
}
