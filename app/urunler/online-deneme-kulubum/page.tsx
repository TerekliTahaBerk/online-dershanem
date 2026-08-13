import DenemeKulubuPage from "@/app/deneme-kulubu/page";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMarketingMetadata({
  title: "Online Deneme Kulübüm | LGS, TYT ve AYT",
  description: "LGS, TYT ve AYT için planlı online denemeler, kazanım analizi ve gelişimi takip etmeye yardımcı raporlar.",
  canonical: "/urunler/online-deneme-kulubum",
  imagePath: "/deneme-kulubu/opengraph-image",
  imageAlt: "Online Deneme Kulübüm — LGS, TYT ve AYT",
});

export default DenemeKulubuPage;

