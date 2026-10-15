import { ProductLanding } from "@/components/applications/product-landing";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({ title: "onlinedershanem Mobil | Dershanen cebinde", description: "onlinedershanem, Yön Koçluk ve Deneme Ligi tek mobil uygulamada. Derslerini, koçluk planını ve deneme sonuçlarını takip et. iOS ve Android için hazırlanıyor.", canonical: "/uygulamalar/mobil" });

export default function MobileAppPage() { return <ProductLanding product="mobil" />; }
