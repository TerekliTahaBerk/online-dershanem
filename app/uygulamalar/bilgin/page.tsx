import { ProductLanding } from "@/components/applications/product-landing";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({ title: "Bilgin | Oyunlaştırılmış YKS ve LGS hazırlığı", description: "onlinedershanem’in Bilgin uygulamasıyla kısa egzersizleri, öğrenme yolunu ve günlük serileri keşfet. iOS ve Android için yakında.", canonical: "/uygulamalar/bilgin" });

export default function BilginAppPage() { return <ProductLanding product="bilgin" />; }
