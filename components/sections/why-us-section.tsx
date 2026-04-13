import { Coins, Users, BarChart3 } from "lucide-react";
import { whyUs } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { FadeIn } from "@/components/ui/fade-in";

const icons = [Coins, Users, BarChart3];
const accentColors = [
  "bg-amber-50 text-amber-600 border-amber-100",
  "bg-brand/10 text-brand border-brand/20",
  "bg-violet-50 text-violet-600 border-violet-100"
];
const topAccents = [
  "from-amber-400/20 to-transparent",
  "from-brand/20 to-transparent",
  "from-violet-400/20 to-transparent"
];

export function WhyUsSection() {
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <FadeIn>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Neden Biz?</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Eski Nesil Dershane Kalıplarını Yıkıyoruz
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Toplu paket dayatmasına son verdik. Sadece ihtiyacın olan derslerle, seviyene uygun butik bir grupta hedef odaklı ilerlemeni sağlıyoruz.
          </p>
        </FadeIn>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {whyUs.map((item, i) => {
            const Icon = icons[i];
            return (
              <FadeIn key={item.title} delay={i * 0.08}>
                <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_-12px_rgba(9,20,19,0.16)]">
                  {/* Top accent gradient strip */}
                  <div className={`h-1 w-full bg-gradient-to-r ${topAccents[i]}`} />

                  <div className="flex flex-1 flex-col p-6">
                    {/* Icon badge */}
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border ${accentColors[i]}`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <h3 className="mt-4 text-lg font-semibold text-ink">{item.title}</h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{item.content}</p>
                  </div>
                </article>
              </FadeIn>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
