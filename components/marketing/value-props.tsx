import { valueProps } from "@/lib/site-content";
import { FeatureCard } from "@/components/marketing/feature-card";
import { TeacherRosterMockup, ReportMockup } from "@/components/marketing/mockups";

/**
 * "Başarı için her şey tek yerde." — bölüm başlığı + iki büyük feature kartı
 * (deneyimli öğretmen kadrosu + aylık gelişim raporu).
 */
export function ValueProps() {
  return (
    <section className="bg-white">
      <div className="site-container py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="site-eyebrow justify-center">{valueProps.eyebrow}</p>
          <h2 className="mt-4 font-display text-[clamp(2rem,4.6vw,3.4rem)] leading-[1.08] tracking-[-0.02em] text-[var(--site-ink)]">
            Başarı için <span className="site-hl">her şey</span> tek yerde.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[15.5px] leading-7 text-[var(--site-body)]">
            {valueProps.subtitle}
          </p>
        </div>

        <div className="mt-12 flex flex-col gap-5">
          <FeatureCard
            eyebrow="Deneyimli öğretmen kadrosu"
            title={
              <>
                Küçük grupta <span className="site-hl">birebir</span> ilgi.
              </>
            }
            body="Alanında deneyimli öğretmenlerle en fazla 4 kişilik grupta çalış. Yolunu bilen biriyle ilerle; herkes görünür, herkes soru sorar."
            visual={<TeacherRosterMockup />}
          />
          <FeatureCard
            reverse
            tone="warm"
            eyebrow="Aylık performans raporu"
            title={
              <>
                Gelişimini <span className="site-hl">net</span> olarak gör.
              </>
            }
            body="Deneme, konu ve çalışma verilerini tek raporda takip et. Nerede güçlüsün, nerede eksik var — her ay somut verilerle görünür olur."
            visual={<ReportMockup />}
          />
        </div>
      </div>
    </section>
  );
}
