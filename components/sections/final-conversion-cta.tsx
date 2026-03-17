import { ArrowRight, MessageCircleMore } from "lucide-react";
import { contact } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";
import { ContactLink } from "@/components/ui/contact-link";

export function FinalConversionCTA() {
  return (
    <section id="basvuru" className="pb-20 pt-8 sm:pb-24">
      <Container>
        <div className="rounded-3xl border border-line bg-gradient-to-br from-white via-paper to-mint p-8 shadow-soft sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Son Adım</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Sana en uygun ders paketini bugün netleştirelim</h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Kısa başvuru formunu doldur, danışmanımız seviyene göre hangi dersten başlaman gerektiğini netleştirsin. İlk görüşmede
            ders seçimi, grup seviyesi ve ders ritmi belirlenir.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <LeadFunnelTrigger
              source="final_cta_primary"
              eventName="trial_cta_click"
              className="inline-flex items-center rounded-full bg-anchor px-6 py-3 text-sm font-semibold text-white transition hover:bg-pine"
              analyticsId="final_cta_primary"
            >
              Ücretsiz Denemeyi Başlat <ArrowRight className="ml-2 h-4 w-4" />
            </LeadFunnelTrigger>
            <ContactLink
              href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}
              channel="whatsapp"
              placement="final_cta_whatsapp"
              className="inline-flex items-center rounded-full border border-line-strong bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:bg-soft"
            >
              <MessageCircleMore className="mr-2 h-4 w-4" /> WhatsApp'tan Hızlı Bilgi Al
            </ContactLink>
          </div>
          <p className="mt-3 text-xs text-muted">Kontenjanlar sınırlıdır. Yerleşim süreçleri seviyeye göre planlanır.</p>
        </div>
      </Container>
    </section>
  );
}
