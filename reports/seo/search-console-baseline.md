# Gerçek organik başlangıç ölçümü

Mülk `sc-domain:onlinedershanem.com`; arama türü Web (metin tabanlı), tüm ülkeler/cihazlar. Dışa aktarım 26 Ekim 2026. Son tamamlanmış rapor günü 24 Ekim. Dönemler ve filtreler native ZIP içindeki Filtreler/Grafik CSV'lerinde korunur.

| Dönem | Gerçek veri aralığı | Tıklama | Gösterim | TO | Ortalama konum (UI) |
|---|---|---:|---:|---:|---:|
| Son 28 gün | 27 Eyl–24 Eki 2026 | 16 | 397 | %4,03 | 14,5 |
| Önceki 28 gün | 30 Ağu–26 Eyl 2026 | 22 | 448 | %4,91 | 10,9 |
| Son 3 ay | 25 Tem–24 Eki 2026 | 66 | 1.307 | %5,05 | 14,4 |
| Son 6 ay | 25 Nis–24 Eki 2026 | 117 | 2.569 | %4,55 | 14,8 |
| 12 ay seçimi: mevcut veri | 16 Mar–24 Eki 2026 | 224 | 2.910 | %7,70 | 14,1 |

12 aylık filtre seçilebildi; ancak CSV 16 Mart'tan başlıyor. Önceki aylara sıfır veri uydurulmadı. Son 28 günde tıklama %27,27, gösterim %11,38 düştü; TO 0,88 yüzde puan azaldı. Ortalama konum her kullanıcı için sabit sıra değildir; sorgu/cihaz karışımı değişir ve örneklem küçüktür.

## Üç aylık trafik ayrımı

| Cihaz | Tıklama | Gösterim | TO | Konum |
|---|---:|---:|---:|---:|
| Mobil | 46 | 772 | %5,96 | 11,61 |
| Masaüstü | 16 | 494 | %3,24 | 19,33 |
| Tablet | 4 | 41 | %9,76 | 7,00 |

Türkiye: 63 tıklama, 1.199 gösterim, %5,25 TO, 13,46 konum; tıklamaların %95,45'i. Mobil tıklama payı %69,70. Bunlar ülke/cihaz boyut satırlarıdır, filtreli sorgu listesi değildir.

## Öne çıkan sayfalar — 3 ay

| Sayfa | Tıklama | Gösterim | TO | Konum |
|---|---:|---:|---:|---:|
| / | 44 | 553 | %7,96 | 13,93 |
| /ders-paketleri (eski) | 8 | 200 | %4,00 | 6,79 |
| /yks (eski) | 7 | 178 | %3,93 | 8,87 |
| /blog/tyt-matematik-calisma-programi | 3 | 53 | %5,66 | 11,49 |
| /blog/online-dershane-fiyatlari-2026 | 2 | 186 | %1,08 | 18,13 |
| /lgs (eski) | 2 | 85 | %2,35 | 13,82 |

## Sorgular ve fırsatlar
Üç ayda “dershanem” 114 gösterim/1 tıklama (8,84), “online dershane” 42/1 (37,36), “online dershane fiyatları” 28/0 (11,18). 4–20 konum aralığında “yks matematik kursu” 11/0 (8,45), “online lgs matematik” 6/0 (18,83), “online yks matematik” 6/0 (19), “tyt matematik çalışma programı” 5/0 (17,8) görülüyor. Bunlar hacim tahmini değil gerçek, küçük GSC örnekleridir.

Branded ayrımı yaklaşık regex ile yalnız açık marka adları üzerinden yapıldı (`scripts/analyze-search-console.py`). “dershanem”, “dershanem net” ve “ev dershanem” gibi belirsiz/rakip olabilecek terimler marka başarısı diye sayılmadı. Üç aylık görünen “online dershanem” satırı 1 tıklama/2 gösterim; Yön/Deneme marka sorgusu raporlanmamış. Bu, toplam branded trafik sıfırdır demek değildir.

Önemli kapsam sınırı: 3 aylık 65 sorgu satırı yalnız 5 tıklama içerirken grafik toplamı 66'dır. 28 günlük 35 sorgu yalnız 3 tıklama içerirken toplam 16'dır. Gizlilik/sorgu anonimleştirmesi ve rapor boyutu kuralları nedeniyle sorgu satırları tam arama günlüğü değildir. Satır limitine ulaşılmış görünmüyor; yine de eksik satırlara sorgu tahmin edilmez. Sayfa boyutu ile property toplamları aynı toplama mantığına sahip olmayabilir.

Hesaplar: `python 3 scripts/analyze-search-console.py --exported-on 2026-10-26`; kalıcı çıktı `search-console/analysis-2026-10-26.json`. Konum günlük yuvarlanmış değerlerle yeniden ağırlıklandırılırsa yaklaşık sonuçtur; tabloda UI'nin gösterdiği değer kullanıldı.
