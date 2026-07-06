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
      <section className="bg-white">
        <div className="site-container pb-6">
          <FeatureCard
            eyebrow="Çalışma takibi"
            title={
              <>
                Her şeyi <span className="site-hl">tek yerden</span> yönet.
              </>
            }
            body="Her dersin sonunda konu, ödev ve tekrar yönü netleşir. Öğrenci masaya oturduğunda nereden başlayacağını bilir."
            visual={<PlannerMockup />}
          />
        </div>
      </section>

      <section className="bg-white">
        <div className="site-container pb-20 sm:pb-28">
          <FeatureCard
            reverse
            eyebrow="Ders sonrası takip"
            title={
              <>
                Ders biter, yönlendirme <span className="site-hl">devam eder.</span>
              </>
            }
            body="Ne işlendi, öğrenci nerede zorlandı ve sırada ne var? Kısa öğretmen notuyla ders sonrası çalışma yönü açık kalır."
            visual={<ParentNoteMockup />}
            cta={{
              label: "Paketleri incele",
              node: (
                <Link href="/ders-paketleri/" className="site-btn site-btn-primary">
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
