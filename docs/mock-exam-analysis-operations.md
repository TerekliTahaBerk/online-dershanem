# Deneme analizi v1 — ürün ve operasyon standardı

## Kapsam ve bilinçli sınırlar

V1; LGS, TYT, AYT ve YDT için doğru–yanlış–boş, toplam/bölüm süresi, isteğe bağlı yayın/deneme adı ve kontrollü hata nedeni saklar. Optik okuma, soru fotoğrafı, telifli soru metni, sınıf sırası, yüzdelik dilim ve otomatik “hakimiyet” puanı kapsam dışıdır.

Şablonlar yayın öncesinde o yılın MEB/ÖSYM kılavuzuyla doğrulanmalıdır. Soru sayısı veya süre değişirse kod şablonu sürümlenmeden eski kayıtlar yeniden yorumlanmamalıdır. Net hesabı LGS için üç, TYT/AYT/YDT için dört yanlış götürme katsayısını kullanır; puan hesaplaması yapmaz.

## Veri girişi ve düzeltme

- Manuel mobil giriş sayısal klavye, bölüm toplamı doğrulaması ve son değişikliği geri alma sunar.
- CSV/hesap tablosu için dosya yüklemek yerine yalnız sayısal satırlar yapıştırılır: `doğru yanlış boş süre`. Böylece dosya metadata'sı ve formül içeriği tutulmaz.
- Bir denemede toplam en fazla üç hata nedeni seçilir: bilgi, işlem/yöntem, dikkat, süre ve boş bırakma/başlayamama.
- Öğrenci kendi nedenlerini seçip düzeltebilir. Güncel grup öğretmeni veya admin aynı nedenleri düzeltebilir; değişiklik `mock_exam.reasons_revised` audit kaydı üretir.
- Sistem en sık tekrarlanan neden için yalnız bir küçük öneri üretir. Öğrenci ve veli bunu ancak öğretmen/admin onayından sonra “öğretmen onaylı adım” olarak görür.

## Erişim ve çocuk güvenliği

- Öğrenci yalnız kendi `StudentProfile` kaydına deneme ekler ve okur.
- Öğretmen yalnız aktif olarak ders verdiği gruplardaki öğrencilerin kayıtlarını oluşturur/düzeltir.
- Veli yalnız canlı `ParentStudent` bağlantısındaki öğrenciyi okur; yabancı `studentId` 404 yüzeyi üretir.
- Isı haritası sadece kişinin kendi denemelerindeki neden sıklığını gösterir. Tek denemeden kesin hüküm, kırmızı başarısızlık etiketi veya akran karşılaştırması çıkarılmaz.

## Ölçüm ve rollout

PII içermeyen event'ler: `mock_exam_entry_started`, `mock_exam_entry_completed`, `error_reason_revised`, `mock_heatmap_viewed`. Soru, yayın adı, öğrenci/deneme/bölüm kimliği event'e alınmaz.

Rollout kapıları:

1. `0046_mock_exam_analysis` migration'ını uygulayın.
2. `PANEL_FEATURE_MOCK_EXAM_ANALYSIS=true` ve menü için `NEXT_PUBLIC_PANEL_FEATURE_MOCK_EXAM_ANALYSIS=true` değerlerini aynı deploy'da açın.
3. Önce küçük pilotta en az 30 kayıt toplayın.
4. Deneme girişi p50 ≤180 saniye, hata nedeni kapsaması ≥%50 ve sistem hatası sıfır olmadan rollout'u büyütmeyin.
5. En az beş öğretmene örnek ısı haritasını görev bazlı yorumlatın; doğru yorumlama hedefi ≥%70'tir. Bu nitel test otomatik event'ten çıkarılamaz.

## Saklama ve veri sahibi talepleri

Deneme sonuçları hassas akademik profildir ve ders/ödev kanıtıyla aynı onaylı sözleşme + hukuki süre boyunca tutulur. Otomatik retention bu tabloları silmez. Dışa aktarma/silme talebinde `mock_exams`, bölümler, hata nedenleri, onaylı eylem ve ilgili audit kayıtları birlikte ele alınır. Kesin hukuki süre KVKK danışmanı tarafından onaylanmalıdır.
