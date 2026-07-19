# Sakin haftalık özet işletim standardı

Bu özellik öğrencinin haftasını veliye günlük alarm, sıralama veya utandırıcı dil üretmeden anlatır. Amaç aile içi konuşmayı denetimden desteğe çevirmektir; tıbbi, psikolojik veya kesin akademik değerlendirme üretmez.

## İçerik sözleşmesi

`calm-digest-v1` yalnız şu kontrollü verileri kullanır:

- mevcut ve önceki haftanın katılım sayıları;
- tamamlanan haftalık plan adımı sayısı;
- öğrencinin katıldığı tamamlanmış derslerdeki kazanım kanıtı;
- varsa aktif tekrar öğesinin kontrollü başlığı.

Çıktı iki iyi giden şey, bir destek alanı ve evde sorulabilecek bir sorudan oluşur. `IMPROVING`, `STEADY`, `BUILDING` ve `LIMITED_DATA` bantları yalnız cümle seçimini belirler; kullanıcıya puan veya etiket olarak gösterilmez. Özet veri kesim zamanını açıkça gösterir.

Şunlar hiçbir zaman girdi veya çıktı değildir: öğretmenin kişisel/özel notu, öğrenci bunaltı pulse'u, sınıf sırası, akran karşılaştırması, ham deneme puanı, ödeme bilgisi, serbest metin aile yorumu ve yapay zekâ çıkarımı.

## Taslak, önizleme ve yayın

1. Aktif grup öğretmeni öğrencinin haftalık taslağını üretir veya yayımdan önce yeniler.
2. Öğretmen, öğrenci ve velinin göreceği dört alanı birebir önizler; v1'de serbest metinle düzenleme yapmaz.
3. Yayın `expectedVersion` ile sürüm çakışmasına karşı korunur. Durum `DRAFT` iken tek transaction içinde `PUBLISHED` olur ve öğrenciyle tüm aktif bağlı velilere aynı sürüm açılır.
4. Yayımlanmış sürüm otomatik üretimle değiştirilmez. Düzeltme gerekiyorsa özellik bayrağı kapatılır ve olay operasyon kaydına alınır; sessiz içerik mutasyonu yapılmaz.
5. Uygulama içi bildirim transaction içindedir. E-posta kuyruğu transaction sonrasında, kullanıcının `weeklyDigest` ve e-posta tercihlerine göre çalışır.

Öğrenci ve veli içerik bakımından aynı snapshot'ı görür. Rol bazlı yardımcı açıklama değişebilir; akademik özet değişemez.

## Yetki ve çocuk güvenliği

- Öğretmen üretim/yayın sorgusu, öğrencinin öğretmene ait aktif bir grupta bulunduğunu aynı veritabanı koşulunda doğrular.
- Öğrenci yalnız kendi `PUBLISHED` kaydını; veli yalnız canlı `ParentStudent` ilişkisi bulunan öğrencinin `PUBLISHED` kaydını görür.
- Yetkisiz ve bulunmayan nesne aynı `404` yüzeyini kullanır. E2E kabulü başka öğrencinin URL'sini ve başka öğretmenin taslağını kapsar.
- Geri bildirimde serbest metin yoktur. “Yararlıydı” ve isteğe bağlı 1–5 kaygı pulse'u özet ve kullanıcı başına tek kayıttır.
- Bildirim tercihini kapatmak özet kaydını silmez; yalnız yeni teslimatı durdurur. Panelde yetkili görünüm korunur.

## Ölçüm ve rollout kapıları

Event payload'ları öğrenci, veli, öğretmen, grup veya özet kimliği; özet cümlesi; ders/kazanım başlığı içermez. Yalnız kural sürümü, eğilim bandı, yaş/alıcı bandı, yararlılık, kaygı pulse'u ve tercih durumu allowlist ile kaydedilir.

Pilot en az 30 yayın ve 30 gönüllü geri bildirim üretmeden genişletilmez. Hedefler:

- yayımlanan özetlerin en az %50'sinin öğrenci veya veli tarafından görüntülenmesi;
- 4–5 kaygı pulse'u oranının en fazla %10 olması;
- haftalık özet opt-out oranının en fazla %15 olması;
- özel not sızıntısı, yatay erişim veya sistem hatası bulunmaması.

Kaygı veya opt-out hedef dışına çıkarsa rollout büyütülmez. Önce cümle seti, veri tazeliği, bildirim beklentisi ve yayın sıklığı incelenir; daha fazla bildirim gönderilmez.

## Geri alma ve operasyon

Sunucu ve menü bayraklarını kapatmak üretim, yayın ve görünümü birlikte durdurur; migration geri alınmaz ve yayımlanmış kayıtlar korunur. Olay incelemesinde özet cümleleri telemetry/log'a kopyalanmaz. Gerekirse yetkili admin doğrudan veri düzeltmesi yerine sürümlü ürün düzeltmesi planlar.

Migration: `0050_calm_weekly_digest`. Yayından önce migration, unit test, dört rol E2E, yabancı öğrenci/öğretmen erişim testleri ve production build geçmelidir.
