import { LegalPageTemplate } from "@/components/sections/legal-page-template";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  "title": "Gizlilik Politikası",
  "description": "Eğitim yolculuğunuzda paylaştığınız bilgiler; hangi amaçlarla kullanılır, kimlerle paylaşılır ve nasıl yönetilir?",
  "canonical": "/gizlilik",
  "imageAlt": "onlinedershanem. Gizlilik Politikası"
});

export default function PrivacyPolicyPage() {
  return <LegalPageTemplate {...{
  "pageTitle": "Gizlilik Politikası",
  "intro": "Eğitim yolculuğunuzda paylaştığınız bilgiler; hangi amaçlarla kullanılır, kimlerle paylaşılır ve nasıl yönetilir?",
  "effectiveDate": "9 Ekim 2026",
  "summary": [
    {
      "title": "Ürüne göre veri",
      "text": "Ders, koçluk ve deneme süreçlerini ayrı açıklıyoruz."
    },
    {
      "title": "Anlaşılır kullanım",
      "text": "Toplanan bilgilerin hangi amaca hizmet ettiğini görün."
    },
    {
      "title": "Size açık iletişim",
      "text": "Verileriniz hakkında soru sorun, talebinizi iletin."
    }
  ],
  "reviewNote": "Bu metin ürün akışlarına göre hazırlanmış bir inceleme taslağıdır. Veri sorumlusunun resmî kimliği, başvuru adresi, hizmet sağlayıcıları ve veri aktarımı koşulları doğrulanmadan nihai aydınlatma metni olarak kullanılmamalıdır.",
  "sections": [
    {
      "title": "Bu politika hangi hizmetleri kapsar?",
      "paragraphs": [
        "Bu sayfa; onlinedershanem. canlı dersleri, Yön Koçluk görüşmeleri ve çalışma planları ile Deneme Ligi online sınavları kapsamında kullanılan bilgiler hakkında genel açıklama sunar. Başvuru, hesap, ödeme ve destek süreçleri de bu kapsamdadır.",
        "Gizlilik politikası, KVKK aydınlatmasının veya açık rıza gereken işlemlerde ayrı rızanın yerine geçmez. Kullandığınız ürüne göre işlenen veriler değişir."
      ]
    },
    {
      "title": "Hangi bilgileri, neden kullanırız?",
      "paragraphs": [
        "Başvuru ve iletişim: Paylaştığınız ad, iletişim bilgileri, sınıf ve hedef sınav; talebinizi yanıtlamak ve uygun hizmeti değerlendirmek için kullanılır.",
        "Canlı ders: Ders programı, katılım, ödev, materyal ve ders özeti bilgileri eğitim sürecinin yürütülmesine yardımcı olur. Yön Koçluk: Hedefler, haftalık plan, görüşme ve çalışma takibi bilgileri koçluk sürecinde kullanılır.",
        "Deneme Ligi: Sınav yanıtları, süre, puan ve konu analizi kayıtları; denemeyi uygulamak, sonucu göstermek ve gelişimi değerlendirmek için işlenir.",
        "Sipariş, ödeme durumu, fatura ve iade kayıtları satın aldığınız hizmeti tanımlamak ve mali işlemleri yürütmek için kullanılır. Destek yazışmaları talebin çözümü için değerlendirilir."
      ]
    },
    {
      "title": "Öğrenci ve veli bilgileri",
      "paragraphs": [
        "Öğrenciye ait eğitim bilgileri ile veliye ait iletişim ve işlem bilgileri farklı amaçlara hizmet eder. Veli erişimi, doğrulanmış öğrenci bağlantısı ve ilgili rolün yetkileriyle sınırlandırılır.",
        "Başvurularda yalnızca talep edilen bilgileri paylaşın. Sağlık raporu, kimlik görüntüsü veya benzeri hassas belgeleri genel iletişim kanallarından göndermeyin. Gerekli bir işlem olduğunda uygun yöntem ayrıca belirlenmelidir."
      ]
    },
    {
      "title": "Çerezler ve site kullanım ölçümü",
      "paragraphs": [
        "Oturum ve güvenlik amacıyla kullanılan teknik bilgiler ile ziyaret ölçümü aynı amaçla işlenmez. Tarayıcınızdan çerezleri silebilir veya engelleyebilirsiniz; oturum için gerekli çerezlerin engellenmesi giriş işlevini etkileyebilir.",
        "Mevcut analitik entegrasyonu etkinleştirildiğinde PostHog ile sayfa görüntüleme, bağlantı tıklama ve kaydırma gibi kullanım olayları ölçülür. Ziyaretçi çerezi bir yıl süreyle tanımlanır; oturum videosu kaydı kapalıdır. Bu bilgiler çerez envanteri ve hukuki dayanak değerlendirmesiyle birlikte ele alınmalıdır.",
        "Analitik için gerekli tercih ve rıza mekanizmasının uygulamayla eşleştirilmesi yayın öncesi kontrol kapsamındadır. Tarayıcı ayarları tek başına açık rıza mekanizmasının yerine geçmez."
      ]
    },
    {
      "title": "Erişim, hizmet sağlayıcıları ve güvenlik",
      "paragraphs": [
        "Öğretmen, koç ve operasyon ekibinin erişimi, yürüttükleri görev ve ürün yetkileriyle ilişkilidir. Hesap şifrenizi paylaşmayın; hesabınızda şüpheli bir işlem fark ederseniz destek ekibine bildirin.",
        "Başvuru formu, barındırma, e-posta, ödeme ve analitik hizmetleri üçüncü taraf altyapılarından yararlanabilir. Haricî bir başvuru veya ödeme sayfasına geçtiğinizde ilgili hizmet sağlayıcının açıklamalarını da inceleyin.",
        "Alıcı grupları ve aktarım koşulları KVKK metninde ayrıca ele alınır. Sağlayıcıların ülke ve sözleşme bilgileri doğrulanmadan verilerin yalnızca Türkiye’de tutulduğu veya tüm aktarımların belirli bir güvenceye dayandığı ileri sürülmez."
      ]
    },
    {
      "title": "Saklama, talepler ve güncellemeler",
      "paragraphs": [
        "Tüm veri türleri için tek bir saklama süresi uygulanmaz. Eğitim kaydı, destek yazışması ve mali belge; amacı, ilgili mevzuat ve devam eden hak talepleri açısından ayrı değerlendirilir. İşleme şartları sona erdiğinde silme, yok etme veya anonimleştirme yükümlülükleri dikkate alınır.",
        "Verilerinizle ilgili haklarınızı ve başvuru yöntemini KVKK sayfasında bulabilirsiniz. Genel sorular için iletisim@onlinedershanem.com adresine yazabilirsiniz. Hizmet veya veri akışları değiştiğinde metin ve güncelleme tarihi birlikte gözden geçirilir."
      ]
    }
  ],
  "sources": [
    {
      "title": "KVKK · Aydınlatma yükümlülüğü",
      "href": "https://www.kvkk.gov.tr/Icerik/2033/Aydinlatma-Yukumlulugu-"
    },
    {
      "title": "KVKK · Çerez uygulamaları rehberi",
      "href": "https://www.kvkk.gov.tr/Icerik/7353/Cerez-Uygulamalari-Hakkinda-Rehber"
    }
  ]
}} />;
}
