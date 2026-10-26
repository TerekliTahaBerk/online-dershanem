# Tally başvuru akışı

## Salt okunur doğrulama
26 Ekim 2026 bağlı Tally hesabında `list_forms` ve `load_form` kullanıldı. İşletmeyle ilgili üç mevcut form:

| Form | Durum | Kullanım | Doğrulanmış gizli alan |
|---|---|---|---|
| QK6MYp | Published, açık | Header/başvuru, üç ürünün ana CTA'sı | utm_source, utm_medium, utm_campaign, utm_content, utm_term, source, ref |
| 0QpdQB | Published, açık | /iletisim kısa ön görüşme iframe | Yok |
| vGRQ5X | Published, açık | Mevcut hesap/kayıt analizi entegrasyonu | Yok |

Ayrıca bir yeni ön görüşme taslağı var; yayına alınmadı ve sitede kullanılmadı. Üç formda pazarlama fiyat metni bulunmadı. Form/şema/logic/settings/submissions değiştirilmedi veya indirilmedi. Gerçek başvuru gönderilmedi.

## Uygulanan yol
Google/Instagram/TikTok → ilgili mevcut ürün URL'si → QK6MYp → mevcut insan takibi. Ürün source değerleri sırasıyla `website_online-dershanem`, `website_yon-kocluk`, `website_deneme-ligi`. Bu sabit değer ürün ve kaynak sayfa bağlamını temsil eder; tam URL ve serbest kaynak metni taşınmaz.

`marketingApplicationUrl` yalnız mevcut hidden field'ları kullanır. UTM değerleri küçük harfli kampanya slug'ları (`[a-z][a-z0-9_-]{0,63}`) ile sınırlıdır. Kampanya isimlerine kişisel veri koyulmamalı; regex anlamsal kişisel veri denetimi değildir. email/telefon/ref/name veya tüm query string iletilmez. `product`, `exam`, `source_page` alanları formda yok; eklenmez. Ürün ve sınav seçimi kullanıcı tarafından formda yapılır; otomatik ön seçim iddiası yok.

Yeni homepage ürün keşif bağlantıları, ürün kartları , desktop ürün satırı ve mobil ürün menüsü UTM'yi URL üzerinden korur. Çerez/localStorage yok. Mevcut diğer bağlantılar ve kısa ön görüşme akışı için bütün siteyi kapsayan attribution iddiası yok. JavaScript kapalıysa form ve ürün linkleri çalışır; UTM geliştirmesi uygulanmaz.

Aynı sekmede gerçek anchor kullanılır; popup ve yeni kayıt backend'i yok. Form açılışı lead sayılmaz. Mevcut webhook hesap kayıt bağlamına aittir; bu pazarlama akışında değiştirilmedi veya genel lead endpoint'ine dönüştürülmedi.

## Kalan bağımlılıklar
Ayrı product/exam alanları veya kısa form UTM takibi için Tally yapılandırması işletme onayıyla değiştirilmeli, yayımlanmalı ve test edilmeli. Dış form gönderim teyidi ve consent kurulmadan confirmed lead analitiği eklenmez. Kampanya form tamamlama testi gerçek veri üretmeden ayrı test ortamında yapılmalı.
