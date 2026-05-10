import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";

export function FinalConversionCTA() {
  return (
    <section id="basvuru">
      <div className="pd-cta-band">
        <h2>Hedefine bugün başla.</h2>
        <p>Sana en uygun ders paketini birlikte belirleyelim; kontenjan dolmadan yerini ayır.</p>
        <div className="pd-hero-cta">
          <LeadFunnelTrigger
            source="final_cta_primary"
            eventName="trial_cta_click"
            className="pd-btn pd-btn-accent pd-btn-lg"
            analyticsId="final_cta_primary"
          >
            Paketleri İncele <ArrowRight size={16} />
          </LeadFunnelTrigger>
          <Link href="/iletisim/" className="pd-btn pd-btn-ghost pd-btn-lg">
            Bizimle İletişime Geç
          </Link>
        </div>
      </div>
    </section>
  );
}
