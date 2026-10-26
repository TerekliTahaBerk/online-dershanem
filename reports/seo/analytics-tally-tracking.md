# Analitik ve Tally

## 27 Ekim 2026 güncellemesi — işletme GA4 mülkü
Tercih arayüzü: Evet/Hayır seçimi kaydedildikten sonra kutu tamamen kapanır; site genelinde sabit tercih düğmesi gösterilmez. Tercihi yeniden açma düğmesi yalnız gizlilik sayfasının çerez/site kullanım ölçümü bölümündedir. Yenileme ve sayfa geçişlerinde kaydedilmiş karar korunur.

Kullanıcı Chrome'da işletme hesabıyla yeni mülkü oluşturdu. Bu oturum yeni hesap/mülk oluşturmadı. Etkin hedef: `tahaberk@onlinedershanem.com`, hesap `413540900`, mülk `560870730`, web akışı `16209176153`, public ölçüm kimliği `G-M8XHNBR1E6`. Önceki kişisel Gmail mülkü `560720190 / G-38E8B93402` bu sitenin yeni entegrasyon hedefi değildir. İki mülke birden veri gönderilmeyecek; eski mülk silinmedi. Onaylanan erişim verme işlemi, kullanıcının işletme mülkünü oluşturması üzerine gereksiz kaldı ve uygulanmadı.

İşletme mülkü oluşturulmadan önce kişisel mülkte de canonical URL, 24 anahtar maskelemesi ve otomatik form/site araması ölçümünü kapatma ayarları kaydedilmişti. Bu eski mülke site etiketi bağlanmadı; kod yalnız yukarıdaki işletme mülkünü hedefler.

Chrome'da tamamlananlar:
- Web akışı URL'si `https://www.onlinedershanem.com` yapıldı; Türkiye / GMT+03 ve TRY zaten doğruydu.
- `sc-domain:onlinedershanem.com` bu web akışına bağlandı. “BAĞLANTI OLUŞTURULDU” görüldü. GA4 Raporlar → Search Console → Sorgular raporunda gerçek sorgu satırları açıldı. Bu rapordaki sorgu toplamları anonim sorgular nedeniyle tüm site toplamları gibi yorumlanmaz.
- Raporlar anlık görüntüsü için Pazarlama performansı şablonu seçildi.
- E-posta maskelemesi açık bırakıldı; 24 URL anahtarı için maskeleme etkinleştirildi: email, eposta, phone, telefon, name, firstname, lastname, first_name, last_name, full_name, ad, soyad, student_name, parent_name, address, user_id, userid, token, access_token, code, ref, q, query, search.
- Otomatik form, site araması, dış bağlantı, video, dosya ve kaydırma olayları kapatıldı. Tarayıcı geçmişinden otomatik pageview kapatıldı. Böylece aşağıdaki kontrollü olaylar, hesap URL'leri veya doğrulanmamış form sonuçlarıyla genişletilmez.

Site bağlantısı kodda hazırlanmıştır; bu kayıt üretimde veri toplamanın başladığı anlamına gelmez. Son canlı kontrolünde Google etiketi yoktu. Yeni `GoogleAnalytics` bileşeni ziyaretçinin açık izninden önce Google SDK'sını yüklemez; ret ve geri çekme destekler, tercih 180 gün tutulur. Yalnız bilinen public sayfa ve yayınlanmış blog slug'ları izin listesindedir. Query/hash ve referrer yolları temizlenir. `page_view` ve QK6MYp için `application_click` gönderilir; tıklama `generate_lead` veya key event yapılmaz. Meta, TikTok, PostHog, ödeme ve Tally form ayarları değiştirilmedi. Tercih arayüzü yalnız Google Analytics kapsamını açıkça belirtir.

Üretim yayını ve gerçek SDK → Realtime doğrulaması henüz yapılmadı. Yerel testlerde Google SDK'sı taklit edilir; QA trafiği gerçek mülke gönderilmez. URL query'sindeki UTM'ler GA olaylarına taşınmaz; Tally'nin mevcut doğrulanmış UTM aktarımı sürer. Dağıtımda `NEXT_PUBLIC_GA_ID` varsa işletme mülkü kimliğiyle eşleşmelidir; yoksa doğrulanmış işletme kimliği kullanılır. Boş değer GA'yı kapatır.

Kaynaklar: [Google Search Console bağlantısı](https://support.google.com/analytics/answer/10737381?hl=en), [Basic consent mode](https://developers.google.com/tag-platform/security/concepts/consent-mode), [gtag consent kurulumu](https://developers.google.com/tag-platform/security/guides/consent).

## 26 Ekim denetiminin tarihsel kaydı

## Doğrulanan mevcut durum
`components/analytics/pixels.tsx` GA4/Meta/TikTok'u public env değerleri varsa yükler. Yerel konfigürasyonda GA/Meta/TikTok yok, PostHog var (yalnız var/yok okundu; tokenlar gösterilmedi). Canlı HTML'de GA/Meta/TikTok script etiketleri ayrıca kontrol edildi; sonuç raw JSON'da. Analytics'e yetkili Chrome oturumundan gidildi; welcome/provision ekranı açıldı, mevcut GA4 mülkü ve stream doğrulanamadı. Yeni hesap, mülk veya duplicate takip oluşturulmadı.

Mevcut PostHog ürün kodları ve CTA hedef sınıflandırması önceki işten korunur. Sorgu/hash temizleme, autocapture ve replay sınırları değiştirilmedi. Bu oturum PostHog hesabına veya ayarlarına müdahale etmedi. Consent kapısının mevcut pixel yüklemesini yönettiği doğrulanmadı; ölçümü genişletmeden çözülmeli.

| İstenen olay | Uygulama / eksik önkoşul |
|---|---|
| product_view | Mevcut pageview + sabit product_code üzerinden raporlanabilir; yeni duplicate olay eklenmedi |
| product_cta_click | Mevcut cta_clicked + application hedefi; dönüşüm yerine eylem göstergesi |
| tally_form_open | Dış sayfanın gerçekten açıldığına bağımsız teyit yok; tıklama bu adla lead sayılmaz |
| confirmed_lead_submission | Güvenilir Tally teyidi/izinli webhook veya sıkı origin+source+formId kontrolü gerekir; eklenmedi |

## Korunan yol
Google → mevcut ürün URL → mevcut QK6MYp Tally başvurusu → insan takibi. Ürün source ve doğrulanmış UTM slug alanları önceki uygulamadan korunuyor. Product/exam hidden field formda doğrulanmadığından eklenmedi. Kısa 0QpdQB formu ve hesap/kayıt entegrasyonu değiştirilmedi. Form gönderimi veya test müşteri kaydı yapılmadı.

Gerekli sonraki işlem: işletmenin erişebildiği mevcut GA4 hesabı varsa property/stream kimliğini yetkili UI'de doğrula; consent tasarımını netleştir; aynı kodu iki kez yüklemeden mevcut entegrasyona bağla; yalnız teyitli form gönderimini keyevent yap. Öğrenci adı/telefon/e-posta, form yanıtları, hesap ref veya URL'deki serbest metin analitiğe taşınmaz. Search Console zaten gerçek organik başlangıç verisini sağlıyor; GA yokluğunu organik sıfır diye yorumlama.
