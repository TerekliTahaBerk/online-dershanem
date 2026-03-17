import { PlayCircle, Quote } from "lucide-react";
import { Container } from "@/components/ui/container";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";

const videoTestimonials = [
  {
    title: "TYT'de 58 netten 79 nete",
    person: "Ahmet, 12. sınıf",
    exam: "TYT",
    result: "3 ayda +21 net",
    quote: "Haftalık plan ve deneme analizi sayesinde neyi çalışacağımı net gördüm."
  },
  {
    title: "LGS sürecinde düzenli takip",
    person: "Elif'in annesi",
    exam: "LGS - Veli görüşü",
    result: "Düzenli veli raporu",
    quote: "Çocuğumun eksiklerini haftalık gördük, süreç çok daha sakin geçti."
  },
  {
    title: "AYT'de branş korkusunu kırdım",
    person: "Sena, mezun öğrenci",
    exam: "AYT",
    result: "Sıralama hedefi için toparlanma",
    quote: "Koç notları ve soru tipi analizi ile özgüvenim geri geldi."
  }
];

export function VideoTestimonialsSection() {
  return (
    <section id="video-yorumlar" className="py-16 sm:py-20">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Video Yorumlar</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Öğrenci ve velilerden gerçek süreç deneyimleri</h2>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {videoTestimonials.map((item) => (
            <article key={item.title} className="rounded-3xl border border-line bg-white p-5 shadow-soft">
              <button
                type="button"
                className="group relative flex h-44 w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-mint via-soft to-paper"
                aria-label={`${item.person} videosunu oynat`}
                data-analytics-id={`video_testimonial_${item.exam}`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(9,20,19,0.06),_transparent_62%)]" />
                <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-ink shadow-sm transition group-hover:scale-105">
                  <PlayCircle className="h-4 w-4 text-brand" /> Video Yakında
                </span>
              </button>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted/70">{item.exam}</p>
                <h3 className="mt-1 text-base font-semibold text-ink">{item.title}</h3>
                <p className="mt-1 text-xs font-semibold text-brand">{item.result}</p>
                <p className="mt-3 text-xs text-muted">{item.person}</p>
                <p className="mt-2 inline-flex items-start gap-2 text-sm leading-relaxed text-muted">
                  <Quote className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {item.quote}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-soft p-4">
          <LeadFunnelTrigger
            source="video_testimonial_section"
            eventName="trial_cta_click"
            className="inline-flex rounded-full bg-anchor px-5 py-2.5 text-xs font-semibold text-white"
          >
            Ben de Süreci Görmek İstiyorum
          </LeadFunnelTrigger>
        </div>
      </Container>
    </section>
  );
}
