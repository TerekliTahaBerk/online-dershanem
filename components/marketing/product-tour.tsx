import { LearningDashboardShowcase } from "@/components/marketing/learning-dashboard-showcase";

export function ProductTour() {
  return (
    <section id="urun-deneyimi" className="bg-white">
      <div className="site-container site-section">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-[clamp(2.4rem,6vw,4rem)] font-semibold leading-[1.02] tracking-[-.045em] text-[var(--site-ink)]">
            Üç ürünün ortak noktası: sıradaki adımın net olması.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-8 text-[var(--site-body)]">
            Canlı dersten, koçluk planından veya deneme analizinden gelen bilgi öğrencinin haftalık yönüne dönüşür.
          </p>
        </div>
        <div className="mt-14 sm:mt-20">
          <LearningDashboardShowcase />
        </div>
      </div>
    </section>
  );
}
