import { LegalPageTemplate } from "@/components/sections/legal-page-template";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  "title": "İade Politikası",
  "description": "Planlarınız değişebilir. Ders, koçluk ve deneme paketlerinde iptal, cayma ve geri ödeme sürecini açıkça öğrenin.",
  "canonical": "/iade",
  "imageAlt": "onlinedershanem. İade Politikası"
});

export default function RefundPolicyPage() {
  return <LegalPageTemplate {...{
  "pageTitle": "İade Politikası",
  "intro": "Planlarınız değişebilir. Ders, koçluk ve deneme paketlerinde iptal, cayma ve geri ödeme sürecini açıkça öğrenin.",
  "effectiveDate": "9 Ekim 2026",
  "summary": [
    {
      "title": "14 günlük cayma",
      "text": "Genel kuralı ve kanuni istisnaları inceleyin."
    },
    {
      "title": "Ürüne özel inceleme",
      "text": "Ders, görüşme ve deneme hakları ayrı ele alınır."
    },
    {
      "title": "Takip edilebilir talep",
      "text": "Sipariş bilginizle başvurun, süreci takip edin."
    }
  ],
  "reviewNote": "Bu metin ürün akışlarına göre hazırlanmış bir inceleme taslağıdır. Paket bazındaki iptal koşulları ve satın alma sırasında alınan onaylarla eşleştirilerek yayın öncesinde hukuki incelemeden geçirilmelidir.",
  "sections": [
    {
      "title": "Hangi ürünler için geçerli?",
      "paragraphs": [
        "Bu açıklamalar; onlinedershanem. birebir ve en fazla 4 kişilik canlı dersleri, Yön Koçluk hizmetleri ve Deneme Ligi online deneme paketleri için hazırlanmıştır. Birlikte alınan ürünlerin kapsamı ve kullanım durumu ayrı değerlendirilir.",
        "Satın alma öncesinde sunulan paket içeriği, ön bilgilendirme ve sözleşme işlem bazında esas alınır. Bu sayfa, tüketicinin emredici mevzuattan doğan haklarını sınırlandırmaz."
      ]
    },
    {
      "title": "Satın alma ve hizmetin başlangıcı",
      "paragraphs": [
        "Canlı derste seçilen paket, ders süresi, grup büyüklüğü ve fiyat satın alma sırasında gösterilir. Belirtilen kapasite, uygun saat ve başlangıç tarihi tahmin olabilir; ödeme tek başına belirli bir eğitmeni, grubu veya saati garanti etmez.",
        "Canlı ders ödemesinden sonra ekibimiz 24 saat içinde iletişime geçer; 48 saat içinde grup, alternatif, bekleme listesi veya talep hâlinde iade süreci netleştirilir. Dersin fiilî başlangıcı programın kesinleşmesine bağlıdır.",
        "Koçlukta görüşme ve takip kapsamı; denemede sınav türü, erişim dönemi ve kullanım hakları ilgili teklif veya pakette açıklanır. Ön görüşme veya başvuru formu doldurmak tek başına ücretli hizmet satın almak anlamına gelmez."
      ]
    },
    {
      "title": "14 günlük cayma hakkı",
      "paragraphs": [
        "Mesafeli hizmet sözleşmelerinde genel kural, sözleşmenin kurulduğu tarihten itibaren 14 gün içinde gerekçe göstermeden ve cezai şart ödemeden cayabilmenizdir. Kanuni istisnalar ayrıca değerlendirilir.",
        "Cayma süresi dolmadan tüketicinin onayıyla ifasına başlanan hizmetlerde veya elektronik ortamda anında ifa edilen hizmet ve anında teslim edilen gayrimaddi ürünlerde ilgili istisnalar gündeme gelebilir. Her online eğitim ya da hesap açılışı otomatik olarak cayma hakkını ortadan kaldırmaz.",
        "Uygulanacak istisna, hizmetin niteliği, ön bilgilendirme ve gerekli onay kayıtlarıyla değerlendirilmelidir. Ayıplı veya hiç sunulmayan hizmete ilişkin haklarınız bu istisnalardan ayrı olarak korunur."
      ]
    },
    {
      "title": "Ürüne göre iptal değerlendirmesi",
      "paragraphs": [
        "Canlı ders: Fiilen sunulan dersler, kalan ders hakları ve program durumu incelenir. Eğitmen veya platform kaynaklı aksaklıklarda yeniden planlama seçenekleri ile ilgili yasal haklar birlikte değerlendirilir.",
        "Yön Koçluk: Gerçekleşen görüşmeler, sunulan takip hizmeti ve kalan dönem dikkate alınır. Paketinizde yazılı olarak açıklanmamış bir iptal cezası veya sonradan belirlenen indirim geri alma koşulu uygulanmamalıdır.",
        "Deneme Ligi: Erişim dönemi, tanımlanan sınav hakları, başlatılan ve tamamlanan denemeler ayrı incelenir. Yalnızca hesaba giriş yapılması bütün paketin tüketildiği anlamına gelmez.",
        "Cayma dışındaki iptal taleplerinde iade hakkı ve tutarı, satın alma sırasında açıklanan koşullar ve uygulanabilir mevzuat esas alınarak belirlenir. Her paket için koşulsuz veya tek oranlı bir iade taahhüdü verilmez."
      ]
    },
    {
      "title": "Talebinizi nasıl iletirsiniz?",
      "paragraphs": [
        "iletisim@onlinedershanem.com adresine ad-soyad, sipariş numarası, ilgili ürün ve talebinizi yazabilirsiniz. Cayma talebinde gerekçe belirtmeniz gerekmez. Kart numarası, güvenlik kodu veya hesap şifresi göndermeyin.",
        "Kanunun izin verdiği diğer bildirim yolları saklıdır. E-postanızı ve gönderim kaydını saklamanız takibi kolaylaştırır. Destek için +90 537 795 44 34 numarasından da ulaşabilirsiniz; telefon görüşmesinin yanında yazılı bildirim kullanın."
      ]
    },
    {
      "title": "Geri ödeme ve birlikte alınan ürünler",
      "paragraphs": [
        "Geçerli cayma bildiriminde hizmet bedeli, bildirimin iletildiği tarihten itibaren en geç 14 gün içinde, kullanılan ödeme aracına uygun biçimde, masrafsız ve tek seferde iade edilmelidir. İnceleme süreci yasal süreyi uzatmaz.",
        "Birden fazla ürün içeren siparişte iade, ilgili ürünün siparişteki ödenmiş tutarı üzerinden izlenir. Başka ürünlerdeki devam eden haklar, yalnızca bir ürünün iadesi nedeniyle kendiliğinden sona erdirilmez.",
        "Cayma dışındaki taleplerde değerlendirme sonucu, varsa hesaplama ve geri ödeme bilgisi paylaşılır. Banka yansıma süresi farklılaşırsa işlem kaydı üzerinden takip sağlanır; bu durum yasal yükümlülükleri ortadan kaldırmaz."
      ]
    },
    {
      "title": "Derse katılamama ve teknik sorunlar",
      "paragraphs": [
        "Katılamayacağınız ders veya görüşme için mümkün olduğunca erken haber verin. Yeni bir canlı telafi hakkı olup olmadığı paket ve program koşullarına bağlıdır; ders özeti ve materyal desteği canlı telafi dersiyle aynı şey değildir.",
        "Derse veya denemeye erişemiyorsanız ürün adı, tarih, saat ve hata açıklamasıyla destek ekibine yazın. Kişisel bilgiler görünmeyecek şekilde ekran görüntüsü ekleyebilirsiniz. Sorunun kaynağı ve hizmetin sunulma durumu incelenerek uygun çözüm belirlenir.",
        "Uyuşmazlıklarda ilgili şartlara göre tüketici hakem heyetine veya tüketici mahkemesine başvuru haklarınız saklıdır."
      ]
    }
  ],
  "sources": [
    {
      "title": "Ticaret Bakanlığı · Mesafeli sözleşmeler rehberi",
      "href": "https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/mesafeli-sozlesmeler-hakkinda-bilgilendirme"
    }
  ]
}} />;
}
