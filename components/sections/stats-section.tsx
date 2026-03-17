import { stats } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { FadeIn } from "@/components/ui/fade-in";

export function StatsSection() {
  return (
    <section className="pb-10 pt-2 sm:pb-14">
      <Container>
        <div className="grid gap-4 rounded-3xl border border-line bg-white px-6 py-8 shadow-soft sm:grid-cols-3 sm:px-10">
          {stats.map((stat, i) => (
            <FadeIn key={stat.label} delay={i * 0.08}>
              <article className="rounded-2xl border border-line-soft bg-soft/70 p-5 text-left">
                <p className="text-3xl font-bold tracking-tight text-ink">{stat.value}</p>
                <p className="mt-1 text-sm font-semibold text-ink">{stat.label}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted">{stat.detail}</p>
              </article>
            </FadeIn>
          ))}
        </div>
      </Container>
    </section>
  );
}
