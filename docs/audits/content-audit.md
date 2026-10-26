# İçerik denetimi

Canlı blogda 21 yazı listeleniyor. `lib/blog-content.ts` eski `lib/content.ts` yazılarını yeni rehberlerle birleştiriyor; tarihler/yazarlar `lib/blog-meta.ts` içinde. Mevcut URL'ler ve yazılar korunur. Sahte uzman, öğrenci yorumu, sonuç veya kota eklenmedi.

| Öncelik / bulgu | Kanıt / sayfa | Etki | Çözüm | Risk | Kabul |
|---|---|---|---|---|---|
| P0 Eski koçluk fiyatı | Ürün/karşılaştırma/SSS/kurucu | Teklif tutarsızlığı | Merkezi teklif ve ilk ay kapsamı; ortak SSS metni güncel | Orta | Public yüzeyde 3.000 TL koçluk reklamı yok |
| P1 Ders seçimleri hero altında ayrışmıyor | Ders ürün sayfası | LGS/YKS ve birebir/grup farkı belirsiz | Dört açıklayıcı kart; doğrulanmış format fiyatları | Düşük | Desteklenmeyen ders saatleri uydurulmaz |
| P1 Başvuru sonrası beklenti parçalı | Üç ürün | Ödeme/kayıt sanılabilir | Form → ekip görüşmesi → koşullar ortak bölümü | Düşük | Ücretsiz görüşme ve ücretli hizmet açık |
| P2 Plan ve analiz örnekleri | Koçluk ve Deneme Ligi | Örnek gerçek veri sanılabilir | Her örnekte temsili veri açıklaması | Düşük | Garanti/gerçek öğrenci iddiası yok |
| P2 Koçluk ve deneme içerik kümeleri | Blog ağırlıkla ders/matematik | Ürün ilgisi blogdan az taşınabilir | Mevcut yazıları ürün bağlarıyla zenginleştir; editör takvimi | Düşük | İnce/tekrarlı sayfa üretme |

Deneme kataloğu `listPublicOdkPackages` kaynağına bağlı; canlıda gösterilebilir ürün yok. Bu, tüm veritabanının boş olduğunu kanıtlamaz. Paket yoksa mevcut dürüst durum korunur. İnceleme veri kaynağına üretim sorgusu veya değişiklik yapmadı. Konu bazlı analiz kapsamı seçilen paket ve içerik etiketlerine bağlıdır; takvim ve ayrı paketler uydurulmaz.
