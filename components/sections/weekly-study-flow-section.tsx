import { weeklyStudyFlow } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { FadeIn } from "@/components/ui/fade-in";

export function WeeklyStudyFlowSection() {
  return (
    <section className="bg-soft/60 py-16 sm:py-20">
      <Container>
        <FadeIn>
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">7 Günlük Örnek Çalışma Akışı</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
            Öğrenciye her gün ne yapacağını net gösteren bir çalışma akışı, motivasyonu ve sürdürülebilirliği ciddi biçimde artırır.
            Aşağıdaki örnek plan, ders-analiz-tekrar döngüsünü dengeleyen pratik bir haftalık çerçeve sunar.
          </p>
        </FadeIn>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {weeklyStudyFlow.map((item, i) => (
            <FadeIn key={item.day} delay={i * 0.05}>
              <article className="h-full rounded-2xl border border-line bg-white p-5 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">{item.day}</p>
                <h3 className="mt-2 text-sm font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted">{item.detail}</p>
              </article>
            </FadeIn>
          ))}
        </div>
      </Container>
    </section>
  );
}
