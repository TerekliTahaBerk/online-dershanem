import { LegalPageTemplate } from "@/components/sections/legal-page-template";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "İade Politikası",
  description: "Online Dershanem ders paketleri için ödeme, iptal ve iade koşulları.",
  canonical: "/iade",
  imageAlt: "Online Dershanem İade Politikası",
});

export default function RefundPolicyPage() {
  return (
    <LegalPageTemplate
      pageTitle="İade Politikası"
      intro='Online Dershanem ("Platform"), ders bazlı Grup Özel Ders modeliyle hizmet vermektedir. İşbu politika, satın alınan paketlerin iptal, iade ve telafi süreçlerini; öğrenci mağduriyetini önlemek ve eğitim sürekliliğini korumak amacıyla düzenler.'
      effectiveDate="16 Mart 2026"
      sections={[
        {
          title: "1. Genel Prensipler",
          paragraphs: [
            'Platform, ders bazlı Grup Özel Ders modelinde şeffaflık, süreklilik ve ölçülülük ilkeleriyle hareket eder.',
            "Bu politika; iptal, iade ve telafi süreçlerinde hem öğrenci/veli haklarını hem de eğitim operasyonunun sürdürülebilirliğini korumayı amaçlar."
          ]
        },
        {
          title: "2. Satın Alım ve Hizmet Başlangıcı",
          paragraphs: [
            "Ödemeler, seçilen ders paketinin içeriğine ve ilan edilen güncel fiyatlara göre tahsil edilir.",
            "Satın alım öncesinde ders programı, eğitmen bilgisi ve grup seviyesi öğrenci/veli ile paylaşılır. Ödeme onayıyla birlikte hizmet süreci resmen başlar."
          ]
        },
        {
          title: "3. İptal ve İade Koşulları",
          paragraphs: [
            "Cayma Hakkı: Mesafeli Sözleşmeler Yönetmeliği uyarınca, eğitimin henüz başlamadığı durumlarda satın alım tarihinden itibaren 14 gün içinde cayma hakkı kullanılabilir.",
            "Eğitim Sürecinde İptal: Eğitimi devam eden paketlerde iptal talebi halinde; o tarihe kadar işlenen derslerin ücreti ve varsa paket indirim oranları mahsup edilerek kalan tutar iade edilir.",
            "Talebin İletilmesi: Tüm iptal ve iade talepleri, karışıklığı önlemek adına yazılı olarak iletisim@onlinedershanem.com adresine iletilmelidir."
          ]
        },
        {
          title: "4. İade Süreci ve Geri Ödemeler",
          paragraphs: [
            "Onaylanan iade tutarları, inceleme tamamlandıktan sonra en geç 10 iş günü içerisinde, ödemenin yapıldığı kredi kartına veya banka hesabına aktarılır.",
            "Banka süreçlerinden kaynaklı gecikmeler Platform sorumluluğunda değildir."
          ]
        },
        {
          title: "5. Telafi ve Teknik Aksaklıklar",
          paragraphs: [
            "Platformdan kaynaklı teknik aksaklıklar veya eğitmen bazlı zorunlu iptallerde, ders saati öğrenciye uygun başka bir tarihe kaydırılır veya ek ders tanımlanır.",
            "Öğrencinin önceden mazeret bildirmeksizin katılmadığı derslerin iadesi veya telafisi yapılmaz."
          ]
        },
        {
          title: "6. İletişim ve Destek",
          paragraphs: [
            "Ödeme ve iade süreçlerine dair tüm soru ve talepleriniz için bize aşağıdaki kanallardan ulaşabilirsiniz:",
            "E-posta: iletisim@onlinedershanem.com",
            "Müşteri Hattı: +90 537 795 44 34"
          ]
        }
      ]}
    />
  );
}
