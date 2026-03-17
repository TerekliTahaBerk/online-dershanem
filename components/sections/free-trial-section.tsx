import { CheckCircle2 } from "lucide-react";
import { Container } from "@/components/ui/container";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";

const trialItems = [
  "Sınav türüne göre seviye analizi ve hedef net planı",
  "7 günlük örnek çalışma akışı + ders bazlı öneri",
  "Koçluk görüşmesi ile sürdürülebilir tempo kurulumu",
  "Hangi ders paketiyle daha hızlı sonuç alacağını net öneri"
];

export function FreeTrialSection() {
  return (
    <section id="ucretsiz-deneme" className="py-16 sm:py-20">
      <Container>
        <div className="grid gap-6 rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Ücretsiz Deneme / Demo Akışı</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Önce sistemi dene, sonra karar ver</h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
              Uzun formlar veya belirsiz kayıt süreçleri yok. Kısa bir başvuru ile seviyene göre hangi ders paketinden başlaman
              gerektiğini, örnek haftalık akışı ve demo adımlarını ücretsiz gör.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <LeadFunnelTrigger
                source="trial_section_primary"
                eventName="trial_cta_click"
                className="inline-flex items-center justify-center rounded-full bg-anchor px-6 py-3 text-sm font-semibold text-white transition hover:bg-pine"
                analyticsId="trial_section_start"
              >
                Ücretsiz Denemeyi Başlat
              </LeadFunnelTrigger>
              <LeadFunnelTrigger
                source="trial_section_demo"
                eventName="trial_cta_click"
                className="inline-flex items-center justify-center rounded-full border border-line-strong px-6 py-3 text-sm font-semibold text-ink transition hover:bg-soft"
                analyticsId="trial_section_demo"
              >
                Demo Ders Talep Et
              </LeadFunnelTrigger>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-soft p-5 sm:p-6">
            <p className="text-sm font-semibold text-ink">Başvuru sonrası ne olur?</p>
            <ul className="mt-4 space-y-3 text-sm text-muted">
              {trialItems.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-brand" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-muted/80">
              Gizli ücret yok • 1 dakikada tamamlanır • Sana uygun ders paketini birlikte seçiyoruz
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
