# Dönüşüm denetimi

## Doğrulanmış durum
Mevcut form envanteri Tally bağlı hesap üzerinden salt okunur alındı. `QK6MYp` başvuru, `0QpdQB` kısa ön görüşme ve `vGRQ5X` öğrenci analiz/kayıt formları PUBLISHED ve açık. Formlar ve gönderimler değiştirilmedi; gerçek başvuru gönderilmedi.

| Öncelik / bulgu | Kanıt / etkilenen alan | Etki | Çözüm | Risk | Kabul |
|---|---|---|---|---|---|
| P0 Eski teklif, devam ücreti belirsiz | Koçlukta 3.000 TL, yeni işletme onayı 1.500/2.000 | Yanlış fiyat beklentisi | Merkezi marketing-offers; ilk aya özel indirim | Orta | Üç tutar ve indirim dönemi açık; ödeme değişmez |
| P1 Başvuru ve görüşme iki ayrı form | Header QK6MYp, iletişim 0QpdQB | Ölçüm ve bağlam bölünebilir | Ürün ana CTA'ları mevcut QK6MYp'ye; kısa form korunur | Düşük | Üç ürün kendi source değeriyle aynı açık forma gider |
| P1 Kampanya parametreleri taşınmıyor | Önce sabit application.href | Kampanya kaynağı kaybolur | Doğrulanmış UTM slug'ları ve source | Düşük | İzinli alanlar gider; email/ref/serbest metin gitmez |
| P1 Formda ayrı product/exam gizli alanı yok | QK6MYp hidden fields ledger | Otomatik ürün/sınav ön seçimi doğrulanamaz | source ürün bağlamını taşır; kullanıcı ürün/sınavı formda belirtir | Yok | Desteklenmeyen parametre eklenmez |
| P2 Bağlantı açmak lead değildir | PostHog CTA olayları; dış alan adı | Tıklamayı başarı sayma riski | Olay sözlüğünde ayrım ve gönderim sınırlaması | Yok | Başarı olayı yalnız güvenilir teyitle |

## Test edilmesi gereken hipotezler
Ürün kısayolları, doğrudan Tally CTA ve açık ilk ay fiyatı daha nitelikli başvuru sağlayabilir. Dönüşüm artışı ölçülmedi. Organik, Instagram ve TikTok kampanyalarını ürün sayfalarına yönlendir; form tamamlama/nitelikli görüşme oranını izinli toplu raporlarla karşılaştır. Kullanıcı adı/telefon/e-posta analitiğe gönderilmemeli.
