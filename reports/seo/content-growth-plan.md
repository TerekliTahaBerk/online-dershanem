# 30 / 60 / 90 gün organik büyüme planı

Hacim tahmini yapılmadı. Öncelik gerçek GSC gösterimi, niyet, mevcut içerik ve uygulanabilir eğitim değeriyle belirlendi. Yeni toplu makale yayınlanmadı.

| Zaman / öncelik | İş | Neden / ölçüm |
|---|---|---|
| 0–30 gün P0 | İşlenen 38 URL sitemap sonrası Google indeks kapsamını izle | Eski 2019 kaydı bu oturumda yeniden işlendi; GSC 26 Ekim / Başarılı / 38 gösteriyor. Keşif sayısı indeks sayısı değildir |
| 0–30 gün P1 | Bu dalın fiyat rehberi/bağlantı/lastmod/404 düzeltmelerini onaylı deploy et | Fiyat yazısı 186 gösterim/2 tıklama, konum 18,13; aynı URL'de yararlı cevap |
| 0–30 gün P1 | Mobil render darboğazı ve üçüncü taraf iş yükünü üretim profiliyle incele | Canlı LighthouseLCP 4,07 s; performans hedefi henüz sağlanmadı |
| 0–30 gün P1 | Consent ve güvenilir Tally gönderim ölçümü için yetkili yapılandırma | Tıklama başarı değildir; kişisel veri analitiğe gitmez |
| 31–60 gün P1 | TYT programı ve fiyat rehberinin sorgu/sayfa değişimini karşılaştır | TYTsayfası 53 gösterim/3 tıklama, konum 11,49; 28 gün eşit dönemler |
| 31–60 gün P1 | İki analiz yazısını örnek/hata sınıflandırması açısından eğitimciyle geliştir | Deneme sayfasına ilgiyi mevcut makalelerle taşı; duplicate makale üretme |
| 31–60 gün P2 | Yön için özgün “Öğrenci koçluğu nedir?” taslağı | Kapsamı doğrulanmış soru/cevap; GSCtalebi henüz kanıtlı değil |
| 61–90 gün P2 | LGS/TYT/AYT alt niyetlerini sorgu bazında değerlendir | Yeni sayfa ancak ayrı niyet, yeterli özgün içerik ve kanıt olduğunda |
| 61–90 gün P2 | Kurum/öğretmen kanıtlarını izinle güçlendir | Gerçek kimlik/deneyim; sahte yorum, skor ve başarı oranı yok |

Takip: organic clicks/impressions/CTR, indexable canonical sayfalar, ilk 20 konum sorguları, mobil/desktop ayrımı, izinli product CTA, güvenilir confirmed submission, insan görüşmesiyle nitelikli başvuru. Küçük örneklemde yalnız CTR yüzdesine göre hüküm verme; pay ve paydayı birlikte tut.

Tekrarlanabilir rapor: mevcut GSC domain mülkünde Web, son 28 gün/önceki 28 gün ve 3 ay native CSV ZIP indir; dosyaadını dönem/indirilen tarihle ayır; Filtreler ve Grafik'i koru; `python 3 scripts/analyze-search-console.py --exported-on YYYY-MM-DD --output reports/seo/search-console/analysis-YYYY-MM-DD.json` ile analiz et. Script önceki dönemin tarihlerini 28 günlük dışa aktarımın gerçek başlangıcından hesaplar; tam aralığı kapsayan daha uzun bir grafik dışa aktarımı da bulunmalıdır. Sonraki çalıştırmada raw-dir/output ve gerçek export tarihi belirtilmelidir. Otomasyon/schedule oluşturulmadı; yeni hesap veya altyapı gerekmiyor.
