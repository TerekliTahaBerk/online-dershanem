import { valueProps } from "@/lib/site-content";
import { FeatureCard } from "@/components/marketing/feature-card";
import { ReportMockup, TeacherRosterMockup } from "@/components/marketing/mockups";

/**
 * "Başarı için her şey tek yerde." — bölüm başlığı + iki büyük feature kartı
 * (deneyimli öğretmen kadrosu + aylık gelişim raporu).
 */
export function ValueProps() {
  return (
    <section className="bg-white">
      <div className="site-container py-24 sm:py-36">
        <div className="mx-auto max-w-4xl text-center">
          <p className="site-eyebrow justify-center">{valueProps.eyebrow}</p>
          <h2 className="mt-4 font-display text-[clamp(2.8rem,6vw,5.5rem)] leading-[.98] tracking-[-0.04em] text-[var(--site-ink)]">
            Dersi anlatıp <span className="site-hl">bırakmıyoruz.</span>
          </h2>
          <p className="mx-auto mt-7 max-w-2xl text-[16px] leading-7 text-[var(--site-body)] sm:text-[18px]">
            {valueProps.subtitle}
          </p>
        </div>

        <div className="mt-14 flex flex-col gap-6">
          <FeatureCard
            eyebrow="Küçük grup"
            title={<>Öğrenci kalabalıkta <span className="site-hl">kaybolmaz.</span></>}
            body="En fazla 4 kişilik gruplarda öğretmen her öğrenciyi görür; öğrenci soru sorar, çözümünü gösterir ve doğrudan geri bildirim alır."
            visual={<TeacherRosterMockup />}
          />
          <FeatureCard
            reverse
            eyebrow="Sade gelişim özeti"
            title={<>İlerlemeyi <span className="site-hl">net</span> olarak gör.</>}
            body="İşlenen konu, verilen çalışma ve öğretmen gözlemi tek bir sade özette birleşir. Süreç tahmin edilmez, görünür olur."
            visual={<ReportMockup />}
          />
        </div>
      </div>
    </section>
  );
}
