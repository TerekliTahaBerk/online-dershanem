import { faq } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { FadeIn } from "@/components/ui/fade-in";

export function FAQSection() {
  return (
    <section id="sss" className="py-16 sm:py-20">
      <Container>
        <FadeIn>
          <h2 className="text-center text-3xl font-bold tracking-tight text-ink sm:text-4xl">Sık Sorulan Sorular</h2>
          <p className="mx-auto mt-3 max-w-3xl text-center text-sm leading-relaxed text-muted">
            Ders bazlı Grup Özel Ders modeli, küçük grup yapısı, seviye yerleşimi ve ders seçimi hakkında en çok sorulan başlıkları
            net şekilde yanıtladık.
          </p>
        </FadeIn>
        <div className="mx-auto mt-10 max-w-5xl space-y-4">
          {faq.map((item, i) => (
            <FadeIn key={item.q} delay={i * 0.06}>
              <details className="rounded-2xl border border-line bg-white p-5 shadow-soft">
                <summary className="cursor-pointer list-none text-sm font-semibold text-ink">{item.q}</summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
              </details>
            </FadeIn>
          ))}
        </div>
      </Container>
    </section>
  );
}
