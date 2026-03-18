import type { Metadata } from "next";
import { siteUrl } from "@/lib/content";
import { LegalPageTemplate } from "@/components/sections/legal-page-template";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description: "Online Dershanem gizlilik politikası, veri güvenliği ve kullanıcı hakları.",
  alternates: {
    canonical: "/gizlilik/"
  },
  openGraph: {
    title: "Gizlilik Politikası | Online Dershanem",
    description: "Site kullanımında toplanan veriler, çerezler ve güvenlik yaklaşımı hakkında bilgi.",
    url: `${siteUrl}/gizlilik/`
  }
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageTemplate
      pageTitle="Gizlilik Politikası"
      intro="Bu politika, Online Dershanem web sitesi ve başvuru akışları sırasında toplanan bilgilerin hangi amaçlarla kullanıldığını ve nasıl korunduğunu açıklar."
      effectiveDate="16 Mart 2026"
      sections={[
        {
          title: "1. Toplanan Bilgiler",
          paragraphs: [
            "Başvuru formlarında paylaştığınız iletişim ve eğitim süreci bilgileri toplanabilir.",
            "Performans ve kullanıcı deneyimi takibi için sınırlı teknik kullanım verileri ve çerez verileri işlenebilir."
          ]
        },
        {
          title: "2. Bilgilerin Kullanım Amaçları",
          paragraphs: [
            "Sizinle iletişime geçmek, talep ettiğiniz ders paketleri hakkında bilgi sağlamak ve uygun yönlendirme yapmak.",
            "Hizmetlerin güvenliğini sağlamak, site performansını iyileştirmek ve kullanıcı deneyimini geliştirmek."
          ]
        },
        {
          title: "3. Çerez Kullanımı",
          paragraphs: [
            "Web sitemizde temel işlevsellik, analiz ve performans ölçümü amacıyla çerezler kullanılabilir.",
            "Tarayıcı ayarlarınızdan çerez tercihlerinizi yönetebilir, bazı çerezleri devre dışı bırakabilirsiniz."
          ]
        },
        {
          title: "4. Güvenlik",
          paragraphs: [
            "Kişisel verilerinizin yetkisiz erişim, kayıp veya kötüye kullanım riskine karşı uygun teknik ve idari önlemler uygulanır.",
            "Yine de internet üzerinden yapılan veri iletimlerinde mutlak güvenlik garanti edilemeyeceğini önemle belirtiriz."
          ]
        },
        {
          title: "5. İletişim",
          paragraphs: [
            "Gizlilik uygulamalarımızla ilgili tüm sorularınız için iletisim@onlinedershanem.com adresinden bizimle iletişime geçebilirsiniz."
          ]
        }
      ]}
    />
  );
}
