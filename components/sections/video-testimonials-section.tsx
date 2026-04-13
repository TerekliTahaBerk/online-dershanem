import { Container } from "@/components/ui/container";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";

const videoTestimonials = [
  {
    title: "TYT'de 21 Netlik Dev Sıçrayış",
    person: "Ahmet, 12. sınıf",
    exam: "TYT",
    result: "3 ayda +21 net",
    quote: "Sınava 3 ay kala 58 netlerde takılmıştım. Haftalık analizler ve takip sistemi sayesinde neye çalışacağımı net gördüm. Sonuç: 79 net!"
  },
  {
    title: "Veli İçin Huzur, Öğrenci İçin Disiplin",
    person: "Elif'in annesi",
    exam: "LGS — Veli Görüşü",
    result: "Düzenli veli raporu",
    quote: "LGS süreci bizim için çok daha sakin geçti. Düzenli raporlama sayesinde çocuğumun eksiklerini her hafta şeffafça takip edebildim."
  },
  {
    title: "Branş Korkusunu Yenen Strateji",
    person: "Sena, mezun öğrenci",
    exam: "AYT",
    result: "Sıralama hedefi için toparlanma",
    quote: "Butik gruptaki soru tipi analizleri ve koçluk desteği ile branş korkumu yendim. Mezun senemde hedeflediğim sıralamaya ulaştım."
  }
];

export function VideoTestimonialsSection() {
  return (
    <section id="video-yorumlar" className="bg-soft/50 py-16 sm:py-24">
      <Container>
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Video Yorumlar</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Başarıya Giden Yolda Bize Güvenenlerin Hikayeleri
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Sadece ders anlatmıyoruz; her öğrencimizin potansiyelini keşfediyor ve hedeflerine ulaşmalarına eşlik ediyoruz.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {videoTestimonials.map((item) => (
            <article
              key={item.title}
              className="flex h-full flex-col rounded-3xl border border-line bg-white p-6 shadow-soft"
            >
              {/* Exam type + result row */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted/60">
                  {item.exam}
                </span>
                <span className="inline-flex shrink-0 rounded-full bg-mint/60 px-2.5 py-0.5 text-[11px] font-semibold text-pine">
                  {item.result}
                </span>
              </div>

              {/* Title */}
              <h3 className="mt-3 text-base font-semibold text-ink">{item.title}</h3>

              {/* Person */}
              <p className="mt-1 text-xs font-medium text-muted">{item.person}</p>

              {/* Quote block */}
              <div className="mt-4 flex-1 rounded-2xl border border-line-soft bg-soft/60 p-4">
                <p className="text-sm leading-relaxed text-muted">
                  <span className="mr-1 text-xl font-serif font-bold leading-none text-brand/40">"</span>
                  {item.quote}
                </p>
              </div>
            </article>
          ))}
        </div>

        {/* Rating strip */}
        <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 px-5 py-3.5">
          <span className="text-lg leading-none tracking-wide text-amber-400">★★★★★</span>
          <p className="text-sm font-semibold text-ink">
            Sosyal Medya Üzerinden{" "}
            <span className="text-brand">%98 Öğrenci Memnuniyet Oranı</span>
          </p>
        </div>

        {/* CTA */}
        <div className="mt-6 text-center">
          <LeadFunnelTrigger
            source="video_testimonial_section"
            eventName="trial_cta_click"
            className="inline-flex rounded-full bg-anchor px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_-4px_rgba(9,20,19,0.4)] transition hover:-translate-y-0.5 hover:bg-pine"
          >
            Başarı Hikayene Bugün Başla
          </LeadFunnelTrigger>
        </div>
      </Container>
    </section>
  );
}
