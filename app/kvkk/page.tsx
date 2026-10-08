import { LegalPageTemplate } from "@/components/sections/legal-page-template";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  "title": "KVKK Aydınlatma Metni",
  "description": "Kişisel verileriniz hakkında bilgi sahibi olun. İşleme amaçlarını, paylaşım kapsamını ve başvuru haklarınızı buradan inceleyin.",
  "canonical": "/kvkk",
  "imageAlt": "onlinedershanem. KVKK Aydınlatma Metni"
});

export default function KVKKPage() {
  return <LegalPageTemplate {...{
  "pageTitle": "KVKK Aydınlatma Metni",
  "intro": "Kişisel verileriniz hakkında bilgi sahibi olun. İşleme amaçlarını, paylaşım kapsamını ve başvuru haklarınızı buradan inceleyin.",
  "effectiveDate": "9 Ekim 2026",
  "summary": [
    {
      "title": "Bilgi edinme",
      "text": "Hangi verinizin neden işlendiğini öğrenin."
    },
    {
      "title": "Düzeltme ve silme",
      "text": "Kanuni şartlar kapsamında talepte bulunun."
    },
    {
      "title": "Başvuru hakkı",
      "text": "Başvuru yollarını ve yanıt sürecini inceleyin."
    }
  ],
  "reviewNote": "Bu metin ürün akışlarına göre hazırlanmış bir inceleme taslağıdır. Veri sorumlusunun resmî kimliği, başvuru adresi, hizmet sağlayıcıları ve veri aktarımı koşulları doğrulanmadan nihai aydınlatma metni olarak kullanılmamalıdır.",
  "sections": [
    {
      "title": "Veri sorumlusunun kimliği",
      "paragraphs": [
        "onlinedershanem., bu sitedeki eğitim hizmetlerinin marka adıdır. Marka adı tek başına veri sorumlusunun resmî kimliği yerine geçmez.",
        "Veri sorumlusunun resmî adı/unvanı ve tebligata elverişli başvuru adresi henüz doğrulanmamıştır. Bu alanlar tamamlanmadan metin nihai aydınlatma olarak kullanılamaz. Mevcut genel iletişim adresi: iletisim@onlinedershanem.com."
      ]
    },
    {
      "title": "Veriler ve işleme amaçları",
      "paragraphs": [
        "Kimlik ve iletişim bilgileri: Başvuru sahibini tanımak, öğrenci/veli ilişkisini doğrulamak, talepleri yanıtlamak ve hizmet hakkında iletişim kurmak.",
        "Eğitim bilgileri: Sınıf, sınav hedefi, ders katılımı, ödev ve ders özetleriyle canlı eğitimi; görüşme, haftalık plan ve takip kayıtlarıyla koçluğu yürütmek.",
        "Sınav bilgileri: Deneme yanıtları, sınav süresi, sonuçlar ve konu bazlı analizlerle online denemeyi sunmak ve öğrencinin kendi gelişimini takip etmesini sağlamak.",
        "İşlem ve güvenlik bilgileri: Sipariş, ödeme, fatura, iade ve destek kayıtlarıyla hizmet ve mali süreçleri yönetmek; oturum ve erişim kayıtlarıyla hesap güvenliğini sağlamak."
      ]
    },
    {
      "title": "Toplama yöntemleri ve hukuki sebepler",
      "paragraphs": [
        "Bilgiler; başvuru formları, kullanıcı panelleri, online denemeler, destek yazışmaları, ödeme bildirimleri ve hizmet sırasında oluşturulan eğitim kayıtları aracılığıyla elektronik ortamda, tamamen veya kısmen otomatik yollarla toplanır.",
        "Sözleşmenin tarafına ait gerekli başvuru ve hizmet verileri için KVKK 5/2-c kapsamındaki sözleşmenin kurulması veya ifası; zorunlu mali kayıtlar için ilgili yasal yükümlülük ve KVKK 5/2-ç; uyuşmazlık kayıtları için bir hakkın tesisi, kullanılması veya korunması kapsamında 5/2-e değerlendirilir.",
        "Hesap güvenliği işlemlerinde 5/2-f kapsamındaki meşru menfaat dayanağı, kişinin temel haklarıyla dengeleme yapılmasını gerektirir. Öğrenci sözleşmenin tarafı değilse veli sözleşmesi tek başına öğrencinin bütün verileri için dayanak sayılmaz; veri kategorisi ve işlem bazında ayrıca değerlendirme gerekir.",
        "Açık rızaya dayanan işlemler ayrı, belirli ve bilgilendirilmiş bir seçim gerektirir. Bu sayfanın okunması rıza verilmesi anlamına gelmez. Pazarlama ve zorunlu olmayan analitik işlemleri hizmet sözleşmesiyle topluca gerekçelendirilemez."
      ]
    },
    {
      "title": "Kimlerle paylaşılabilir?",
      "paragraphs": [
        "Eğitimin yürütülmesi için görevli öğretmen ve koçlar; ödeme ve mali süreçler için ilgili ödeme/muhasebe hizmetleri; iletişim ve teknik işletim için altyapı sağlayıcıları, işlem için gerekli bilgilerle sınırlı alıcı gruplarıdır. Yetkili kamu kurumlarıyla paylaşım, hukuki talep ve yükümlülük kapsamıyla sınırlıdır.",
        "Veliye sunulan bilgi, doğrulanmış veli ilişkisine ve ilgili ürünün erişim kapsamına göre belirlenir. Bu ilişki başka öğrencilerin verilerine erişim sağlamaz.",
        "Yurt dışı altyapı kullanımı varsa KVKK 9 kapsamındaki aktarım şartları ayrıca sağlanmalıdır. Mevcut sağlayıcıların konumu ve uygulanacak aktarım mekanizması doğrulanmayı beklemektedir; bu taslak onaylı bir aktarım düzenlemesi bulunduğunu beyan etmez."
      ]
    },
    {
      "title": "Saklama ve silme",
      "paragraphs": [
        "Kayıtlar işleme amacı ve ilgili yasal yükümlülükler bakımından ayrı değerlendirilmelidir. Bütün eğitim ve kullanıcı verileri için genel bir on yıllık süre öngörülmez.",
        "Kategori bazındaki saklama süreleri henüz nihai onay beklemektedir. Süreler, dayanakları ve silme süreçleri doğrulanarak bu metne yansıtılmalıdır. Silme talebi, devam eden yasal saklama zorunluluğunu kendiliğinden ortadan kaldırmaz."
      ]
    },
    {
      "title": "Kişisel verileriniz üzerindeki haklarınız",
      "paragraphs": [
        "KVKK 11 kapsamında; verilerinizin işlenip işlenmediğini öğrenebilir, işlenmişse bilgi isteyebilir, işleme amacını ve amaca uygun kullanımı öğrenebilir, yurt içi ve dışındaki alıcıları sorabilirsiniz.",
        "Eksik veya yanlış verilerin düzeltilmesini; kanuni şartları varsa silinmesini veya yok edilmesini ve bu işlemlerin verilerin aktarıldığı üçüncü kişilere bildirilmesini talep edebilirsiniz. Yalnızca otomatik analiz sonucunda aleyhinize oluşan sonuca itiraz edebilir, kanuna aykırı işleme nedeniyle zararınızın giderilmesini isteyebilirsiniz."
      ]
    },
    {
      "title": "Başvuru ve yanıt süreci",
      "paragraphs": [
        "Sistemde kayıtlı e-posta adresinizden iletisim@onlinedershanem.com adresine başvurabilirsiniz. Yazılı başvuru ve mevzuatta belirtilen diğer yöntemlere ilişkin haklarınız saklıdır; fiziksel başvuru adresi resmî kimlik bilgileriyle birlikte tamamlanmalıdır.",
        "Başvurunuzda ad-soyad, talebiniz, tebligat adresiniz ve başvuru mevzuatının gerektirdiği kimlik bilgileri bulunmalıdır; yazılı başvuruda imza gerekir. İlgili belgeleri yalnızca gerektiği ölçüde paylaşın. Veli veya temsilci başvurularında temsil yetkisi doğrulanır.",
        "Başvurular en geç 30 gün içinde sonuçlandırılmalıdır. Esas olan ücretsiz yanıttır; ayrıca maliyet gerektiren işlemlerde Kurulun belirlediği tarife uygulanabilir. Ret, yetersiz yanıt veya süresinde yanıt alamama hâlinde kanuni süreler içinde Kurula şikâyet hakkınız bulunur."
      ]
    }
  ],
  "sources": [
    {
      "title": "KVKK · İlgili kişinin hakları",
      "href": "https://www.kvkk.gov.tr/Icerik/2036/Ilgili-Kisinin-Haklari"
    },
    {
      "title": "KVKK · Başvuru usulü",
      "href": "https://www.kvkk.gov.tr/Icerik/6938/Kurumumuza-Yapilan-Sikayetlerin-Usul-Sartlarina-Iliskin-Kamuoyu-Duyurusu"
    },
    {
      "title": "KVKK · Yurt dışına aktarım",
      "href": "https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim"
    }
  ]
}} />;
}
