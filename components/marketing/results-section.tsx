/**
 * Yalnızca YAPISAL ölçütler — bölümün kendi girişi tablonun piyasa/fiyat
 * karşılaştırması olmadığını söylüyor. Fiyat hero'da ve paket kartlarında
 * duruyor; buraya eklemek rakip sütunları "—" bırakır, hiçbir şey karşılaştırmaz.
 */
import { ComparisonRows, PublicSection, SectionIntro } from "@/components/public/primitives";

const rows = [
  { label: "Temel rol", values: ["Canlı öğrenme", "Plan ve takip", "Ölçme ve analiz"] },
  { label: "LGS", values: ["Uygun", "Uygun", "Uygun"] },
  { label: "YKS", values: ["Uygun", "Uygun", "TYT ve AYT odağı"] },
  { label: "Ana çıktı", values: ["Ders geri bildirimi", "Haftalık çalışma yönü", "Kazanım ve gelişim raporu"] },
];

export function ResultsSection() {
  return (
    <PublicSection tone="soft">
      <SectionIntro title="Her ürünün yolculuktaki işi belli." body="Ürünler birbirinin yerine geçmez; öğrencinin ihtiyacına göre tek başına veya birlikte kullanılabilir." />
      <ComparisonRows caption="Online Dershanem, Online Koçum ve Online Deneme Kulübüm karşılaştırması" columns={["Online Dershanem", "Online Koçum", "Online Deneme Kulübüm"]} rows={rows} highlightColumn={2} />
    </PublicSection>
  );
}
