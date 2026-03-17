import type { Metadata } from "next";
import { siteUrl } from "@/lib/content";
import { LegalPageTemplate } from "@/components/sections/legal-page-template";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
  description: "Online Dershanem KVKK aydınlatma metni ve kişisel veri işleme esasları.",
  alternates: {
    canonical: "/kvkk"
  },
  openGraph: {
    title: "KVKK Aydınlatma Metni | Online Dershanem",
    description: "Kişisel verilerin işlenmesi, saklanması ve haklarınıza ilişkin bilgilendirme metni.",
    url: `${siteUrl}/kvkk`
  }
};

export default function KVKKPage() {
  return (
    <LegalPageTemplate
      pageTitle="KVKK Aydınlatma Metni"
      intro="Online Dershanem olarak kişisel verilerin korunmasına önem veriyoruz. Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri işleme süreçlerimize dair genel bilgilendirme sunar."
      effectiveDate="16 Mart 2026"
      sections={[
        {
          title: "1. Veri Sorumlusu",
          paragraphs: [
            "Bu aydınlatma metni kapsamında veri sorumlusu Online Dershanem'dir.",
            "Soru ve talepleriniz için iletisim@onlinedershanem.com adresi üzerinden bizimle iletişime geçebilirsiniz."
          ]
        },
        {
          title: "2. İşlenen Kişisel Veriler",
          paragraphs: [
            "Ad-soyad, telefon numarası, e-posta adresi, öğrenci seviyesi, sınav türü ve başvuru formunda paylaşılan diğer bilgiler işlenebilir.",
            "Site kullanımına ilişkin teknik veriler (cihaz bilgisi, çerez verileri, temel analiz verileri) hizmet kalitesini artırmak amacıyla sınırlı olarak işlenebilir."
          ]
        },
        {
          title: "3. Veri İşleme Amaçları",
          paragraphs: [
            "Başvuru süreçlerini yürütmek, öğrenciye uygun ders paketini belirlemek ve iletişim taleplerini yanıtlamak.",
            "Eğitim ve destek süreçlerini planlamak, hizmet kalitesini geliştirmek ve yasal yükümlülükleri yerine getirmek."
          ]
        },
        {
          title: "4. Veri Aktarımı ve Saklama",
          paragraphs: [
            "Kişisel veriler, yasal zorunluluklar dışında üçüncü kişilerle paylaşılmaz; paylaşım gerektiğinde yalnızca mevzuata uygun şekilde yapılır.",
            "Veriler, işleme amacı için gerekli süre boyunca ve ilgili mevzuattaki saklama sürelerine uygun olarak korunur."
          ]
        },
        {
          title: "5. KVKK Kapsamındaki Haklarınız",
          paragraphs: [
            "KVKK'nın 11. maddesi kapsamındaki başvuru haklarınızı (bilgi talebi, düzeltme, silme, itiraz vb.) kullanabilirsiniz.",
            "Hak taleplerinizi kimlik doğrulamanıza imkan verecek şekilde iletisim@onlinedershanem.com adresine iletebilirsiniz."
          ]
        }
      ]}
    />
  );
}
