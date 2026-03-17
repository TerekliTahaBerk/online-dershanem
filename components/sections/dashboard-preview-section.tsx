import { CalendarClock, ClipboardList, Gauge, NotebookPen, ShieldCheck, Target } from "lucide-react";
import { Container } from "@/components/ui/container";

const panelCards = [
  {
    icon: CalendarClock,
    title: "Canlı Ders Takvimi",
    text: "Haftalık canlı derslerin saatleri, ders tekrarları ve sınıf notları tek ekranda."
  },
  {
    icon: ClipboardList,
    title: "Eksik Konu Listesi",
    text: "Deneme ve soru çözüm sonuçlarına göre eksik konu başlıkları otomatik güncellenir."
  },
  {
    icon: NotebookPen,
    title: "Koç Notları",
    text: "Koçun her hafta kişisel not bırakır: neyi artırmalı, nerede süre kaybı var, bir sonraki adım ne."
  },
  {
    icon: Gauge,
    title: "Net ve Süre Takibi",
    text: "Sadece doğru sayısı değil, soruya harcanan süre ve hata türleri de görünür hale gelir."
  }
];

export function DashboardPreviewSection() {
  return (
    <section id="ogrenci-paneli" className="py-16 sm:py-20">
      <Container>
        <div className="rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Öğrenci Paneli</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Seçtiğin ders paketlerini tek panelde takip et</h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
                Panelde ders bazlı haftalık plan, canlı ders akışı, konu-kazanım takibi ve koç notları birlikte görünür. Böylece
                öğrenci toplu paket karmaşası yaşamadan, seçtiği derslerde net ve odaklı ilerler.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-mint px-3 py-1 text-xs font-semibold text-pine">
              <ShieldCheck className="h-3.5 w-3.5" /> Öğrenci + Veli görünümü
            </span>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {panelCards.map((card) => (
              <article key={card.title} className="rounded-2xl border border-line bg-soft p-4">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                  <card.icon className="h-4 w-4 text-brand" /> {card.title}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted">{card.text}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#nasil-calisir"
              className="inline-flex items-center rounded-full border border-line-strong px-6 py-3 text-sm font-semibold text-ink transition hover:bg-soft"
              data-analytics-id="dashboard_how_it_works"
            >
              <Target className="mr-2 h-4 w-4" /> Sistem Nasıl İşliyor?
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
