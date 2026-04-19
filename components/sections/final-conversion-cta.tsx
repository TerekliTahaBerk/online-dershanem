import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";

export function FinalConversionCTA() {
  return (
    <section id="basvuru">
      <div className="pd-cta-band">
        <h2>Hedefine bugün başla.</h2>
        <p>Ücretsiz strateji analizinde seviyeni ölçelim, sana özel ders planını birlikte belirleyelim.</p>
        <div className="pd-hero-cta">
          <LeadFunnelTrigger
            source="final_cta_primary"
            eventName="trial_cta_click"
            className="pd-btn pd-btn-accent pd-btn-lg"
            analyticsId="final_cta_primary"
          >
            Ücretsiz Dene <ArrowRight size={16} />
          </LeadFunnelTrigger>
          <Link href="/paketler/" className="pd-btn pd-btn-ghost pd-btn-lg">
            Paketleri Gör
          </Link>
        </div>
      </div>
    </section>
  );
}
