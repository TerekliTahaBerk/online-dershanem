# İndeksleme ve tarama

GSC güncellemesi 23 Ekim 2026: 35 indeksli, 90 indeks dışı, 6 neden. Genel rapor ve tarandı/indekslenmedi detayı CSV olarak dışa aktarıldı.

| Neden | Adet | Yorum / eylem |
|---|---:|---|
| Yönlendirmeli sayfa | 46 | Eski yol/host alias'ları için beklenebilir. Mevcut LGS/YKS redirectleri korunur; query aktarımı HTTP ile kontrol edildi. |
| Doğru canonical'a sahip alternatif | 13 | Genellikle kasıtlı konsolidasyon; hepsi indekslenmeye zorlanmaz. |
| noindex | 10 | /giris, /parolami-unuttum, ödeme query URL'leri, /kariyer ve eski /panel-yenileniyor, /seni-arayalim örnekleri. Hesap/ödeme indexlenebilir yapılmadı. Kariyer kaynakta bilinçli noindex. |
| 404 | 6 | 2017 AÖF haberleri, /&, eski font dosyası, /universities/bogazici-logo.png-5 ve eski aile içerikleri. İlgisiz homepage redirect'i eklenmedi; bulunmayan içerikler için gerçek 404 doğru. |
| robots engeli | 1 | Private/API/checkout korumasını açma gerekçesi yok. Tek kaydın ayrıntısı bu oturumda ayrıca alınmadı. |
| Tarandı, henüz indekslenmedi | 14 | Liste OG image/font/WordPress ?p= URL'leri ve iki blog varyantı da içeriyor. 14 kaydın tamamı kayıp ticari HTML sayfası değildir. |

İndekslenmeyen gerçek içerik örneği `/blog/online-ozel-ders-mi-dershane-mi` (son tarama 14 Eki). İç linkler güçlendirildi; indeks garantisi verilemez. `blog/online-ders-calisma-programi/` apex varyantı ve `?p=3183`, `?p=3041` eski URL'ler için mevcut canonical/host konsolidasyonu korunur; içerik eşlemesi olmadan rastgele redirect üretilmedi. Soft 404, server error, discovered-not-indexed ve farklı Google canonical kategorileri genel raporda ayrı neden olarak listelenmiyordu; bu, tüm olası URL'lerde hiç hata yok anlamına gelmez.

## Beş URL Inspection sonucu

| URL | Google dizini | Son tarama | Google canonical |
|---|---|---|---|
| / | Mevcut | 26 Eki 03:26:03 | İncelenen URL |
| /urunler | Mevcut | 16 Eki 16:35:27 | İncelenen URL |
| /urunler/online-dershanem | Mevcut | 20 Eki 06:18:06 | İncelenen URL |
| /urunler/online-kocum | Mevcut | 14 Eki 16:15:50 | İncelenen URL |
| /urunler/online-deneme-kulubum | Mevcut | 19 Eki 06:54:35 | İncelenen URL |

Tümünde Googlebot akıllı telefon, başarılı getirme, tarama ve indeksleme izni; site beyanı aynı canonical. Dördünde sitemap bulma kısmında “Geçici işleme hatası”, ders sayfasında “Yönlendiren site haritası algılanmadı” vardı. Sitemap yeniden gönderimi bu nedenle anlamlı; sorun çözüldü denmiyor.

Beş önemli URL’nin canlı Google testi yapıldı; sonuçlar [işlem günlüğüne](google-search-console-actions.md) yazıldı. Canlı test, indeksleme/Google canonical seçimi garantisi değildir. Yerel kod değişiklikleri için indeksleme veya hata doğrulama isteği gönderilmedi.
