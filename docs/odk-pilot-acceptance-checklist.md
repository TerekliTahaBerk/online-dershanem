# ODK iki aşamalı pilot kabul formu

Bu form her pilot koşusu için kopyalanır. Onaylar isim, tarih ve kanıt bağlantısıyla doldurulmadan ilgili ortam değişkeni `true` yapılmaz. Form öğrenci adı, e-posta, soru içeriği veya Meet görüntüsü içermez.

## Koşu bilgisi

- Pilot koşusu:
- Sınav ailesi ve deneme:
- Tarih / saat:
- Admin:
- Sınav sorumlusu:
- Teknik sorumlu:
- Katılımcı kapsamı: Admin __ · Öğretmen __ · Öğrenci __ (en az 2) · Veli __
- Öğrenci A anonim kodu / gerçek cihaz-browser:
- Öğrenci B anonim kodu / gerçek cihaz-browser:
- Kanıt dizini veya erişimi kısıtlı kayıt bağlantısı:

## 1. Teknik prova

- [ ] Üretim migration durumu doğrulandı.
- [ ] `npm run inspect:odk-pilot` bloke kontrol olmadan tamamlandı; canlı kabul onayları `BEKLİYOR` olabilir.
- [ ] Özel kitapçık ve cevap anahtarı yetkili/ yetkisiz hesaplarla kontrol edildi.
- [ ] Yaşam döngüsü cron'u başlangıç, bitiş ve otomatik teslimi doğru işledi.
- [ ] Pause, kill switch ve geri dönüş tatbikatı yapıldı.
- [ ] Kill switch açılış, erişim kesilme, kapanış ve geri dönüş UTC zamanları kaydedildi.
- [ ] Yaşam döngüsü cron gecikme/failure tatbikatı ve toparlanma süresi kaydedildi.
- [ ] Gerçek yedekten yeni ortama restore tatbikatı son 90 gün içinde tamamlandı.
- [ ] Meet bağlantısı, görevli iletişim kanalı ve olay kaydı yeri doğrulandı.

## 2. Dört rol kabulü

- [ ] Admin taslak → kilit → planlama → puanlama → sonuç açıklama akışını tamamladı.
- [ ] Öğrenci Meet onayı → başlangıç → cevap → bağlantı kesme/geri gelme → teslim akışını tamamladı.
- [ ] Öğretmen yalnız yetkili öğrencilerin açıklanmış raporlarını gördü; yönetim işlemlerine erişemedi.
- [ ] Veli yalnız bağlı öğrencinin açıklanmış raporunu gördü.
- [ ] Pilot dışındaki ODK üyeliği pilot paneline alınmadı.
- [ ] Başka öğrencinin sınav oturumu, PDF'i ve sonucu erişilemez kaldı.

Yatay yetki kanıtı (endpoint/nesne türü, beklenen ve gerçekleşen HTTP sonucu; kullanıcı veya içerik yazmayın):

## 3. Cihaz ve erişilebilirlik kabulü

- [ ] 320 px ve 375 px telefon görünümü.
- [ ] Gerçek iOS Safari ve Android Chrome.
- [ ] Masaüstü Chromium ve WebKit/Safari.
- [ ] Yalnız klavye ile kritik akış.
- [ ] `%200` yakınlaştırma ve büyük metin.
- [ ] Yüksek kontrast ve azaltılmış hareket tercihleri.
- [ ] Düşük veri/kararsız ağ ve PDF ayrı sekme alternatifi.
- [ ] Form etiketleri, odak sırası ve durum mesajları ekran okuyucuyla anlaşılır.

Gerçek cihaz kanıtı (anonim öğrenci kodu, OS/browser sürümü, UTC saat, PASS/FAIL ve kısıtlı kanıt bağlantısı):

## 4. Pilot deneme #1

- [ ] Tüm cevap kayıtları açıklanabilir; kaybolan onaylanmış cevap yok.
- [ ] Süre sonu ve otomatik teslim beklenen şekilde çalıştı.
- [ ] Eski heartbeat taşıyan oturumlar görevli tarafından ele alındı.
- [ ] Sonuçlar admin açıkça yayınlayana kadar kapalı kaldı.
- [ ] Öğrenci, veli ve öğretmen aynı açıklanmış skordan türeyen veriyi gördü.
- [ ] Bulgular P0, P1 ve P2 olarak sınıflandırıldı.

Karar: [ ] Devam  [ ] Duraklat  [ ] Geri al

P0/P1 düzeltme kanıtı:

Deneme #1 anonim öğrenci sonuçları (A/B için teslim türü, sonuç açıklama doğrulaması ve kanıt bağlantısı):

## 5. Pilot deneme #2

- [ ] İlk pilotun P0 ve P1 bulguları tekrar etmedi.
- [ ] Yetkisiz erişim ve sonuç sızıntısı sıfır.
- [ ] Kaybolan onaylanmış cevap sıfır.
- [ ] Stale aktif oturum ve puanlama kuyruğu temiz.
- [ ] Destek ve operasyon sorumluları olayları zamanında kapattı.
- [ ] Dört rol kabulü yeniden doğrulandı.

Karar: [ ] Pilot tamamlandı  [ ] Bir pilot daha gerekli  [ ] Geri al

Deneme #2 anonim öğrenci sonuçları (A/B için teslim türü, sonuç açıklama doğrulaması ve kanıt bağlantısı):

## 6. Genel yayın kararı

- [ ] Admin Pilot yayını ekranında tüm kapılar `Hazır`.
- [ ] İki planlı gerçek deneme tamamlandı.
- [ ] Ürün sahibi onayı kaydedildi.
- [ ] Güvenlik/KVKK onayı kaydedildi.
- [ ] Operasyon sahibi onayı kaydedildi.
- [ ] Kill switch ve olay müdahale yolu korunuyor.

Onay kayıtları (rol, ad, UTC tarih, erişimi kısıtlı kanıt bağlantısı):

Genel yayın kararı ve tarih:
