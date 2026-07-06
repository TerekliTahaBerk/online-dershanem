import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FeatureCard } from "@/components/marketing/feature-card";
import { PlannerMockup, ParentNoteMockup } from "@/components/marketing/mockups";

/**
 * Ürün turu — "Çalışma takibi" ve "Veli bilgilendirme" feature satırları.
 * (Referanstaki çalışma takibi + telefon kartı ritmine karşılık gelir; ürün
 * gerçeği: haftalık plan + veliye gelişim notu. Var olmayan bir AI asistan
 * iddiası yapılmaz.)
 */
export function ProductTour() {
  return (
    <>
      <section className="bg-[var(--site-bg-warm)]">
        <div className="site-container py-14 sm:py-20">
          <FeatureCard
            eyebrow="Çalışma takibi"
            title={
              <>
                Her şeyi <span className="site-hl">tek yerden</span> yönet.
              </>
            }
            body="Konu takibi, günlük log ve haftalık plan — çalışmanı tek bir yerden kontrol et. Ne çalışacağını bilerek başla, düzenini koru."
            visual={<PlannerMockup />}
          />
        </div>
      </section>

      <section className="bg-white">
        <div className="site-container py-14 sm:py-20">
          <FeatureCard
            reverse
            eyebrow="Veli bilgilendirme"
            title={
              <>
                Sürecin her adımında <span className="site-hl">yanında</span>.
              </>
            }
            body="Her hafta kısa bir gelişim notu: ne işlendi, öğrenci nerede iyi gidiyor, neye dikkat etmeli. Süreci tahmin etmek yerine somut olarak görürsün."
            visual={<ParentNoteMockup />}
            cta={{
              label: "Paketleri incele",
              node: (
                <Link href="/paketler/" className="site-btn site-btn-primary">
                  Paketleri incele
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ),
            }}
          />
        </div>
      </section>
    </>
  );
}
