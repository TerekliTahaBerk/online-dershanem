import { Quote } from "lucide-react";
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
    exam: "LGS - Veli görüşü",
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
    <section id="video-yorumlar" className="py-16 sm:py-20">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Video Yorumlar</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Başarıya Giden Yolda Bize Güvenenlerin Hikayeleri</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
              Sadece ders anlatmıyoruz; her öğrencimizin potansiyelini keşfediyor ve hedeflerine ulaşmalarına eşlik ediyoruz.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {videoTestimonials.map((item) => (
            <article key={item.title} className="rounded-3xl border border-line bg-white p-5 shadow-soft">
              <div>
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

        <div className="mt-6 rounded-2xl border border-mint/40 bg-mint/40 p-4">
          <p className="text-center text-sm font-semibold text-ink">
            <span className="mr-2 tracking-wide text-amber-500">★★★★★</span>
            Google üzerinden %98 Öğrenci Memnuniyet Oranı
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-soft p-4">
          <LeadFunnelTrigger
            source="video_testimonial_section"
            eventName="trial_cta_click"
            className="inline-flex rounded-full bg-anchor px-5 py-2.5 text-xs font-semibold text-white"
          >
            Başarı Hikayene Bugün Başla
          </LeadFunnelTrigger>
        </div>
      </Container>
    </section>
  );
}
