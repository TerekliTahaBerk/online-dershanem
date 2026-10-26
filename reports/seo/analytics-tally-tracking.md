# Analitik ve Tally

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
