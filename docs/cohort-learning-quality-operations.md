# Kohort öğrenme kazancı ve kalite panosu işletim standardı

## Amaç ve sınır

Admin kalite panosu, kurumun akademik kanıt üretme düzenini ve aynı öğrencilerde zaman içinde gözlenen deneme değişimini güvenli biçimde izler. Öğretmen performans puanı, nedensel etki tahmini, öğrenci sıralaması veya prim girdisi değildir. Arayüzde “gözlenen değişim” dili kullanılır.

## `cohort-gain-v1` sözleşmesi

- Pencere son 180 gündür; LGS, TYT, AYT ve YDT ayrı kohortlardır.
- Her öğrenci için aynı sınav türündeki ilk uygun ölçüm baseline olur. Baseline'dan en az 14 gün sonraki son ölçüm takip ölçümüdür.
- LGS'de net `doğru - yanlış / 3`, YKS oturumlarında `doğru - yanlış / 4` olarak hesaplanır. Toplam net toplam soru sayısına bölünüp yüzde puana çevrilir.
- Aynı öğrenci yalnız bir kez katkı verir. Tek ölçümlü veya 14 gün aralığı bulunmayan öğrenci değişim hesabına girmez; kapsama paydasında görünür.
- En az 10 eşleşmiş öğrenci yoksa değişim medyanı, çeyrekler, pozitif değişim oranı ve zaman aralığı yayınlanmaz.
- Yeterli örneklemde medyan değişimle birlikte `%25–%75` aralığı, pozitif değişim payı, medyan ölçüm aralığı, eşleşme kapsamı ve veri tazeliği gösterilir.

Bu hesap öğrencinin hangi grupta veya hangi öğretmenle ne kadar süre çalıştığını kontrol etmez. Bu nedenle öğretmen, grup veya program kaynaklı nedensellik kurulamaz.

## Süreç kalitesi sinyalleri

- Son 30 günde tamamlanan dersler ile aktif ödevlerin en az bir kazanıma bağlı olma oranı gösterilir.
- Son 30 günde incelenmiş kanıtlı ödevlerin gönderimden incelemeye medyan süresi gösterilir.
- Kontrollü deneme hata nedeni en az 10 farklı öğrencide görülmedikçe ortak sinyal olarak açılmaz.

Bu sinyaller birbirine eklenerek tek bir skor oluşturulmaz. Düşük etiketleme kapsamı veri kalitesi sorunudur; düşük öğrenme veya kötü öğretmen anlamına gelmez.

## Gizlilik ve erişim

- Ekran yalnız `ADMIN` rolündedir. Öğretmen, öğrenci ve veli rotaya erişemez.
- Öğrenci adı, öğretmen adı, grup adı ve küçük hücre ayrıntısı yoktur.
- Minimum örneklem hem değerleri hem değişim yönünü bastırır; yalnız kaç uygun öğrenci gerektiği gösterilir.
- `cohort_quality_viewed` eventi kural sürümü, hazır/bastırılmış kohort sayısı ve eşleşmiş öğrenci bandı taşır. Kimlik ve serbest metin yasaktır.

## Rollout ve kabul

1. `PANEL_FEATURE_MOCK_EXAM_ANALYSIS` ve `PANEL_FEATURE_LEARNING_OUTCOMES` pilotlarının veri giriş kalitesini doğrulayın.
2. `PANEL_FEATURE_COHORT_QUALITY=true` ayarlayın; menü ve sunucu aynı snapshot'tan açılır.
3. İlk dört hafta sınav türü bazında eşleşme kapsamını ve veri tazeliğini haftalık inceleyin. Yetersiz örneklemi hedef baskısıyla doldurmak için gereksiz sınav yaptırmayın.
4. Hazır bir kohortta en az iki kişi arayüzdeki medyan ve çeyrekleri bağımsız sorguyla yeniden hesaplasın.
5. Öğretmen adı/grup kırılımı istenirse veri koruma ve ölçme-değerlendirme incelemesi olmadan eklemeyin.

Kabul koşulları: minimum örneklem bastırması unit ve E2E testinde çalışır; dört sınav türü karışmaz; normalizasyon katsayıları doğrulanır; küçük hücre veya kimlik event'e sızmaz; mobil ve WCAG A/AA kontrolü geçer.

## Alarm ve geri alma

Şu durumlarda `PANEL_FEATURE_COHORT_QUALITY=false` yapın:

- 10 kişiden küçük bir hücrenin istatistiği veya değişim yönü görünüyorsa,
- öğrenci/öğretmen/grup kimliği arayüze ya da ürünü event'ine sızıyorsa,
- farklı sınav türleri veya yanlış götürme katsayıları karışıyorsa,
- ekran personel sıralaması, ücret, prim veya otomatik yaptırım kararında kullanılıyorsa.

Bayrağı kapatmak kaynak akademik kayıtları silmez. Hatalı hesap kuralı değiştirilirse yeni sürüm adıyla yayınlanır; eski ve yeni sonuçlar aynı etiketle karşılaştırılmaz.
