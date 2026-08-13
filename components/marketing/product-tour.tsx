import { LearningDashboardShowcase } from "@/components/marketing/learning-dashboard-showcase";
import { FeatureStory, PublicSection } from "@/components/public/primitives";

export function ProductTour() {
  return (
    <PublicSection id="urun-deneyimi">
      <FeatureStory
        eyebrow="Ortak ürün deneyimi"
        title="Üç ürünün ortak noktası: sıradaki adımın net olması."
        body="Canlı dersten, koçluk planından veya deneme analizinden gelen bilgi öğrencinin haftalık yönüne dönüşür."
        visual={<LearningDashboardShowcase />}
      />
    </PublicSection>
  );
}
