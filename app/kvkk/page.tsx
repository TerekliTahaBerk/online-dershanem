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
      intro="6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca, kişisel verileriniz veri sorumlusu sıfatıyla Online Dershanem (Platform) tarafından aşağıda açıklanan kapsamda işlenebilecektir."
      effectiveDate="16 Mart 2026"
      sections={[
        {
          title: "1. Veri Sorumlusu",
          paragraphs: [
            "KVKK uyarınca veri sorumlusu Online Dershanem'dir (Platform).",
            "Kişisel verilerinizin işlenmesine ilişkin tüm soru ve talepleriniz için iletisim@onlinedershanem.com adresinden bizimle iletişime geçebilirsiniz."
          ]
        },
        {
          title: "2. İşlenen Kişisel Veriler ve İşleme Amaçları",
          paragraphs: [
            "Platform tarafından kimlik (ad-soyad), iletişim (telefon, e-posta), eğitim verileri (öğrenci seviyesi, sınav türü, hedef verileri) ve işlem güvenliği bilgileri (IP adresi, çerez kayıtları) işlenebilmektedir.",
            "Bu veriler; eğitim danışmanlığı süreçlerinin yürütülmesi, öğrenciye uygun ders paketinin belirlenmesi, başvuru taleplerinin yanıtlanması, iletişim faaliyetlerinin sürdürülmesi, hizmetlerin iyileştirilmesi, analiz ve raporlama faaliyetlerinin yürütülmesi ile mevzuattan kaynaklanan yükümlülüklerin yerine getirilmesi amaçlarıyla işlenir."
          ]
        },
        {
          title: "3. Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi",
          paragraphs: [
            "Kişisel verileriniz; internet sitemizdeki başvuru formları, çerezler ve dijital iletişim kanalları aracılığıyla tamamen veya kısmen otomatik yollarla toplanmaktadır.",
            "Veri işleme faaliyetleri KVKK Madde 5/2 kapsamındaki hukuki sebeplere, özellikle bir sözleşmenin kurulması veya ifası, veri sorumlusunun hukuki yükümlülüğünün yerine getirilmesi ve ilgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla veri sorumlusunun meşru menfaatine dayanmaktadır.",
            "Özel nitelikli kişisel verilerin işlenmesi gereken hallerde KVKK Madde 6 hükümlerine uygun hareket edilir."
          ]
        },
        {
          title: "4. İşlenen Kişisel Verilerin Aktarımı",
          paragraphs: [
            "Kişisel verileriniz; yukarıda belirtilen amaçların gerçekleştirilmesi doğrultusunda, sınırlı ve ölçülü olmak kaydıyla iş ortaklarımıza (bulut bilişim ve altyapı sağlayıcıları), hizmet alınan tedarikçilere ve yasal zorunluluk halinde yetkili kamu kurum ve kuruluşlarına aktarılabilir.",
            "Aktarım faaliyetleri KVKK'nın 8. ve 9. maddelerine uygun olarak yürütülür."
          ]
        },
        {
          title: "5. Veri Saklama Süresi ve İmha",
          paragraphs: [
            "Kişisel verileriniz, işleme amacının gerektirdiği süre boyunca ve ilgili mevzuatta öngörülen zamanaşımı süreleri dikkate alınarak saklanır.",
            "Türk Borçlar Kanunu ve Türk Ticaret Kanunu kapsamında öngörülen saklama yükümlülükleri doğrultusunda veriler genel olarak 10 yıla kadar saklanabilmektedir.",
            "Saklama süresi sonunda kişisel verileriniz, Platform'un imha politikası doğrultusunda KVKK'ya uygun şekilde silinir, yok edilir veya anonim hale getirilir."
          ]
        },
        {
          title: "6. İlgili Kişinin Hakları (KVKK Madde 11)",
          paragraphs: [
            "Kişisel veri sahibi olarak; verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini talep etme, silinmesini veya yok edilmesini isteme ve işleme faaliyetlerine itiraz etme haklarına sahipsiniz.",
            "KVKK Madde 11 kapsamındaki tüm taleplerinizi kimlik doğrulamanıza imkan sağlayacak şekilde iletisim@onlinedershanem.com adresine iletebilirsiniz."
          ]
        }
      ]}
    />
  );
}
