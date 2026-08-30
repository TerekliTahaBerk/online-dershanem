# Öğretmen onaylı uyarlanabilir haftalık plan — v1 standardı

## Kapsam ve güvenli ürün davranışı

- Plan yapay zekâ kullanmaz. `adaptive-v2` sürümlü ve deterministik bir kural/kısıt çözücüdür.
- Her aday `adaptive-score-v2` ile kaynak, aciliyet, kanıt güncelliği, güven ve çelişki bileşenlerine ayrılır. Toplam skor, bileşenler ve kullanıcı açıklaması görev oluşturulurken snapshot olarak saklanır; böylece model değişse de geçmiş planın gerekçesi korunur.
- Güncel kanıt eski kanıttan daha fazla ağırlık alır. Son tekrar yanıtları güveni artırabilir veya azaltabilir; yakın tarihli başarılı ve başarısız kanıtların birlikte bulunması çelişki cezası üretir.
- Girdiler yalnız öğrencinin seçtiği uygun gün ve günlük süre, yaklaşan sınav, açık ödev, aktif tekrar öğesi ve öğretmenin `NEEDS_REVIEW` kanıtıdır.
- Bir günde en fazla üç görev ve öğrencinin seçtiği dakika kapasitesi kullanılır. Görev sığmıyorsa kapasite aşılmaz.
- Geçmiş günlere yeni görev yazılmaz. Yeniden dengeleme eski açık görevleri `SKIPPED` olarak korur ve yalnız kalan kapasiteye yeni öneri yerleştirir; “borç”, seri kaybı veya ceza dili kullanılmaz.
- Her görev kontrollü bir “neden bu sırada” açıklaması taşır. Tek bir belirsiz başarı/risk puanı üretilmez.
- Plan `DRAFT` başlar. Aktif grup öğretmeni onaylayınca `APPROVED` olur ve öğrenci görevleri tamamlayabilir. Öğrenci kontrollü kategoriyle değişiklik isteyebilir.
- Veliye ayrıntılı görev listesi gösterilmez. Sakin haftalık eğilim ancak sonraki veli özeti fazında üretilir.

## Yetki ve veri sınırları

- Öğrenci yalnız kendi tercih, plan ve görevlerini değiştirebilir.
- Öğretmen yalnız aktif, kendisine ait gruplardaki öğrencilerin planlarını görebilir ve sürüm kontrollü onaylayabilir.
- Plan onayı `expectedVersion` ile çoklu sekme/eski veri çatışmasını `409` olarak reddeder.
- Serbest metin değişiklik talebi yoktur; `TOO_MUCH`, `WRONG_DAYS`, `PRIORITY`, `OTHER` kategorileri kullanılır.
- Ürün event'leri öğrenci/plan/görev/ödev kimliği, görev başlığı, not veya sınav adı taşımaz.

## Öncelik kuralları

1. Son tarihi yaklaşan açık öğretmen ödevi
2. Bugün zamanı gelmiş tekrar
3. İki hafta içindeki yaklaşan sınav için kısa hazırlık
4. Öğretmenin tekrar gerekli gördüğü kazanım
5. Henüz zamanı gelmemiş açık tekrar ve daha ileri tarihli ödev

Eşit öncelikte yakın son tarih, ardından kararlı Türkçe başlık sırası kullanılır. İçerik önerisi veya soru üretimi yapılmaz.

## Ölçüm ve rollout

- `plan_generated`: kural sürümü, görev/kapasite/neden sayısı ve yeniden dengeleme
- `plan_review_completed`: öğretmen inceleme süresi, görev sayısı ve onay sonucu
- `plan_task_completed`: yalnız kaynak ve neden kategorisi
- `plan_change_requested`: kontrollü kategori
- `plan_preference_updated`: gün/süre, opt-in ve isteğe bağlı 1–5 yoğunluk pulse'u

Pilot kapıları:

- plan kabulü ≥ %65
- öğretmen inceleme p50 < 120 saniye
- haftalık görev tamamlama baz çizgisine göre en az +10 puan
- 4–5 “fazla geliyor” pulse oranı baz çizgiye göre artmıyor
- yatay erişim ihlali sıfır

En az 30 öneri ve dört haftalık karşılaştırma olmadan etki sonucu ilan edilmez. Pulse isteğe bağlıdır; yanıtlamamak plan kullanımını engellemez.

## Yayın ve geri alma

Migration: `0049_adaptive_weekly_plan`.

`PANEL_FEATURE_ADAPTIVE_PLAN=true` aynı server snapshot'ı üzerinden menü, sayfa ve API'yi açar. Bayrak kapalıyken API ve sayfalar 404 verir. Geri almada bayrak kapatılır; plan geçmişi ve akademik kaynak kayıtları silinmez.
