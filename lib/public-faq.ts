import { subjectPackageGroups } from "@/lib/content";
import { getDinoMarketingCopy } from "@/lib/dino-marketing";
import { getPublicPricingCopy } from "@/lib/commerce/public-pricing-copy";

/** Marketing answers only; pricing and access remain owned by commerce. */
export function getPublicFaqCategories(dinoAiEnabled: boolean) {
  const packages = subjectPackageGroups[0].packages;
  return [
    {
      category: "Ürünler",
      items: [
        { q: "Üç ürün arasındaki fark ne?", a: "onlinedershanem. öğretmenle canlı öğrenme içindir. onlinekoçum. × Yön Koçluk haftalık plan ve çalışma düzenine odaklanır. onlinedenemekulübüm. × Deneme Ligi denemelerle seviyeni ölçmene ve sonuçlarını değerlendirmene yardımcı olur." },
        { q: "Üçünü birlikte almak zorunda mıyım?", a: "Hayır. İhtiyacın olan ürünle başlayabilirsin. Birlikte kullanım seçenekleri ve güncel fiyatlar paket kurucuda gösterilir." },
        { q: "Hangisiyle başlamalıyım?", a: "Konuyu öğrenmek için canlı ders, çalışma düzeni kurmak için koçluk, seviyeni görmek için deneme desteğini değerlendirebilirsin. Kararsızsan ücretsiz ön görüşmede ihtiyacını konuşabiliriz." },
      ],
    },
    {
      category: "onlinedershanem. · Canlı öğrenme",
      items: [
        { q: "Hangi sınavlar ve dersler için destek var?", a: "LGS ve YKS öğrencileri için matematiğin yanında diğer derslerde de canlı öğrenme seçenekleri bulunur. Güncel ders listesini ve birebir ya da grup seçeneklerini paket kurucuda inceleyebilirsin." },
        { q: "Canlı dersler nasıl ilerliyor?", a: "Öğretmen ve öğrenci ders saatinde birlikte bağlanır. Öğrenci soru sorar, çözümünü gösterir ve ders sonrasında çalışacağı konular için öğretmen geri bildirimi alır." },
        { q: "Gruplar kaç kişilik?", a: "Küçük gruplar en fazla 4 öğrenciden oluşur. Birebir ders seçeneği de bulunur. Seviye, hedef ve uygun ders saatleri başlangıç öncesinde değerlendirilir." },
        { q: "Dersler kaç dakika ve haftada kaç ders var?", a: `Doğrudan satın alınabilen matematik seçenekleri ayda ${packages[0].lessonsPerMonth} × ${packages[0].lessonDurationMinutes} dakika canlı ders içerir. ${packages.map((pkg) => `${pkg.category}: ${pkg.discountedPrice}`).join("; ")}. Gün ve saatler uygun grup programına göre belirlenir; diğer ders ve formatların kapsamını paket kurucuda inceleyebilirsin.` },
        { q: "Derse katılamazsam ne olur?", a: "Ayrı bir canlı telafi dersi açılmıyor. Panelde konu özeti, aktif materyal ve küçük çalışma adımı içeren telafi paketi paylaşılır." },
      ],
    },
    {
      category: "onlinekoçum. × Yön Koçluk",
      items: [
        { q: "Koçluk ne yapar?", a: "İnsan koçunla hedefini ve haftalık çalışma kapasiteni değerlendirir, uygulanabilir bir plan kurar ve planın nasıl ilerlediğini takip edersin. Görüşme sıklığı ve başlangıç koşulları ekibimizle netleştirilir." },
        { q: "Koçluk ders yerine geçer mi?", a: "Hayır. Koçluk çalışma düzenini destekler; konu öğretimi için canlı ders ayrı bir seçenektir. Ders almadan da Yön Koçluk ile başlayabilirsin." },
      ],
    },
    {
      category: "onlinedenemekulübüm. × Deneme Ligi",
      items: [
        { q: "Deneme Ligi nasıl çalışıyor?", a: "LGS, TYT veya AYT denemelerine paketinin takvim ve erişim koşullarına göre katılırsın. Başvuru tek başına deneme erişimi sağlamaz; kapsam ve başlangıç ekibimizle netleştirilir." },
        { q: "Sonuçlar nasıl analiz ediliyor?", a: "Netlerini, ders dağılımını ve konu bazlı sonuçlarını değerlendirerek sonraki çalışmanın odağını belirleyebilirsin. Öğrenci, veli ve öğretmen raporlarına erişim seçilen paketin koşullarına bağlıdır." },
      ],
    },
    {
      category: "Dino AI · Ortak destek katmanı",
      items: [
        { q: "Dino AI ayrı bir ürün mü?", a: getDinoMarketingCopy(dinoAiEnabled).description },
        { q: "Dino AI öğretmen veya koç yerine geçer mi?", a: "Hayır. Veriyi açıklamaya ve önerileri anlamlandırmaya yardımcı olması için hazırlanıyor. Öğretmenin ve koçun kararını destekler; akademik kararları tek başına vermez." },
      ],
    },
    {
      category: "Satın alma ve başvuru",
      items: [
        { q: "Nasıl başlarım?", a: "Ürünleri inceleyip ihtiyacını seçebilirsin. Başvuru formunda hedef sınavını ve seçimini belirt; ekibimiz başlangıcını ve erişim koşullarını netleştirir. Form göndermek otomatik hesap veya ürün erişimi sağlamaz." },
        { q: "Online satın alma hangi ürünlerde açık?", a: "Ders seçenekleri sayfasındaki LGS ve YKS matematik paketleri doğrudan satın alınabilir. Deneme Ligi’nde katalogda yayınlanan paketlerin satış durumu detay sayfasında gösterilir; ödeme yalnız mevcut satış ve erişim koşulları uygunsa açılır. Diğer seçimlerin başlangıcını başvurunun ardından ekibimizle planlayabilirsin." },
        { q: "Güncel fiyatları nerede görebilirim?", a: `${getPublicPricingCopy().standalone} Birlikte alım tutarlarını paket kurucuda, satın alınabilir seçeneklerin fiyat ve koşullarını kendi katalog sayfalarında görebilirsin.` },
        { q: "Ön görüşme zorunlu mu?", a: "Karar vermeden ücretsiz ön görüşme yapabilirsin; satın alma zorunluluğu yoktur. Doğrudan satın alınabilen ders seçeneklerinde ödeme öncesi görüşme şartı bulunmaz. Başlangıç, uygun grup ve ders saatleri ekibimizle planlanır." },
        { q: "İptal ve iade koşulları nedir?", a: "İade Politikası sayfasını ve satın aldığın paketin sözleşmesini inceleyebilirsin. Ödeme öncesi sorularını ekibimizle netleştirebilirsin." },
      ],
    },
    {
      category: "Hesap ve panel",
      items: [
        { q: "Hesabıma nasıl girerim?", a: "Ekibimizin oluşturduğu hesabın bilgileriyle Giriş Yap sayfasından devam edebilirsin. Parolanı unuttuysan giriş ekranındaki parola yenileme bağlantısını kullanabilirsin." },
        { q: "Panelde hangi bilgileri görebilirim?", a: "Paneldeki ders, plan, deneme ve rapor alanları hesabına tanımlı ürünlere ve rolüne bağlıdır. Başvuru yapmak tüm ürünlere erişim açmaz; yalnız paketinin kapsamındaki alanları kullanırsın." },
      ],
    },
  ];
}
