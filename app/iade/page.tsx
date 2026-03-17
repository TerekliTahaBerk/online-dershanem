import type { Metadata } from "next";
import { siteUrl } from "@/lib/content";
import { LegalPageTemplate } from "@/components/sections/legal-page-template";

export const metadata: Metadata = {
  title: "İade Politikası",
  description: "Online Dershanem ders paketleri için ödeme, iptal ve iade koşulları.",
  alternates: {
    canonical: "/iade"
  },
  openGraph: {
    title: "İade Politikası | Online Dershanem",
    description: "Ders bazlı paketlerde iptal, iade ve süreç yönetimi hakkında bilgilendirme.",
    url: `${siteUrl}/iade`
  }
};

export default function RefundPolicyPage() {
  return (
    <LegalPageTemplate
      pageTitle="İade Politikası"
      intro="Bu metin, Online Dershanem ders bazlı Grup Özel Ders paketleri için ödeme, iptal ve iade süreçlerine dair genel esasları açıklar."
      effectiveDate="16 Mart 2026"
      sections={[
        {
          title: "1. Paket ve Ödeme Yapısı",
          paragraphs: [
            "Dersler ders bazlı paketler halinde sunulur ve ücretlendirme ilgili paket sayfasında belirtilen koşullara göre yapılır.",
            "Satın alım öncesinde öğrenciye veya veliye paket içeriği, kapsamı ve ödeme planı açık şekilde aktarılır."
          ]
        },
        {
          title: "2. İptal Talebi",
          paragraphs: [
            "İptal talepleri yazılı olarak iletisim@onlinedershanem.com adresine iletilmelidir.",
            "İptal sürecinde, kullanılan ders hakkı ve varsa planlanmış oturumlar dikkate alınarak değerlendirme yapılır."
          ]
        },
        {
          title: "3. İade Koşulları",
          paragraphs: [
            "İade değerlendirmesi, paketin kullanım durumu, işlenen ders sayısı ve ödeme planı esas alınarak yapılır.",
            "İade uygunluğu bulunan durumlarda geri ödeme, onaydan sonra makul süre içinde ödeme aracına göre gerçekleştirilir."
          ]
        },
        {
          title: "4. İstisnai Durumlar",
          paragraphs: [
            "Teknik aksaklık, mücbir sebep veya plan değişikliği gibi özel durumlarda öğrenci lehine alternatif telafi veya paket düzenleme seçenekleri sunulabilir.",
            "Her özel durum ayrı değerlendirilir ve sonuç yazılı olarak paylaşılır."
          ]
        },
        {
          title: "5. İletişim ve Destek",
          paragraphs: [
            "İade veya ödeme süreçleriyle ilgili sorularınız için iletisim@onlinedershanem.com adresinden veya +90 537 795 44 34 numarasından bizimle iletişime geçebilirsiniz."
          ]
        }
      ]}
    />
  );
}
