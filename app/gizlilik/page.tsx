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
      intro="Online Dershanem (Platform), kullanıcılarının gizliliğine en yüksek düzeyde önem verir. Bu metin, kişisel verilerin hangi ilkelere göre toplandığını, işlendiğini, korunduğunu ve hangi amaçlarla kullanıldığını açıklar."
      effectiveDate="16 Mart 2026"
      sections={[
        {
          title: "1. Veri Toplama ve İşleme İlkeleri",
          paragraphs: [
            "Platform, toplanan tüm kişisel ve teknik verileri dürüstlük kurallarına uygun, şeffaf, sınırlı ve ölçülü şekilde işler.",
            "Veri işleme süreçlerinde hukuka uygunluk, veri minimizasyonu, amaçla sınırlılık ve güncellik ilkeleri esas alınır."
          ]
        },
        {
          title: "2. Toplanan Bilgi Kategorileri",
          paragraphs: [
            "İletişim ve Eğitim Bilgileri: Başvuru formları aracılığıyla paylaşılan ad-soyad, e-posta, telefon numarası, sınıf seviyesi ve hedef sınav türü gibi bilgiler.",
            "Teknik ve Analitik Veriler: IP adresi, cihaz türü, tarayıcı bilgileri, site içi navigasyon hareketleri ve kullanıcı tercihlerini içeren çerez verileri."
          ]
        },
        {
          title: "3. Bilgilerin Kullanım Amaçları",
          paragraphs: [
            "Kişiselleştirilmiş eğitim planı ve ders paketi önerileri sunmak.",
            "Başvuru taleplerini yanıtlamak ve eğitim danışmanlığı süreçlerini başlatmak.",
            "Web sitesi performansını optimize etmek, kullanıcı deneyimini iyileştirmek ve platform güvenliğini sağlamak.",
            "Yasal yükümlülükleri yerine getirmek ve yetkili mercilerin taleplerini karşılamak."
          ]
        },
        {
          title: "4. Çerez (Cookie) ve İzleme Teknolojileri",
          paragraphs: [
            "Platform; temel işlevsellik, performans analizi ve kullanıcı tercihlerini hatırlamak amacıyla çerezler kullanır.",
            "Zorunlu Çerezler: Sitenin güvenli ve doğru çalışması için gereklidir.",
            "Performans ve Analiz Çerezleri: Kullanıcı trafiğini anlamamıza ve hizmet kalitesini artırmamıza yardımcı olur.",
            "Kullanıcılar, tarayıcı ayarları üzerinden çerez tercihlerini yönetebilir veya çerezleri devre dışı bırakabilir. Ancak bu durumda sitenin bazı özellikleri kısıtlı çalışabilir."
          ]
        },
        {
          title: "5. Veri Güvenliği ve Koruma Önlemleri",
          paragraphs: [
            "Veriler; yetkisiz erişim, kayıp, değişiklik veya ifşaya karşı SSL sertifikaları, şifreleme yöntemleri ve güvenli sunucu altyapıları dahil olmak üzere güncel teknik ve idari tedbirlerle korunur.",
            "Platform'un veri güvenliği politikaları düzenli olarak gözden geçirilir ve gerekli iyileştirmeler planlı olarak uygulanır."
          ]
        },
        {
          title: "6. Değişiklikler ve İletişim",
          paragraphs: [
            "Bu Gizlilik Politikası, hizmetlerdeki gelişmeler veya yasal düzenlemelerdeki değişiklikler doğrultusunda güncellenebilir. Güncel metin her zaman bu sayfada yayımlanır.",
            "Gizlilik uygulamalarımıza ilişkin tüm soru ve talepleriniz için iletisim@onlinedershanem.com adresinden Platform ile iletişime geçebilirsiniz."
          ]
        }
      ]}
    />
  );
}
