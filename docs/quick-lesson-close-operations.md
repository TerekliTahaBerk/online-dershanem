# İstisna odaklı ders kapanışı — ürün ve operasyon standardı

## Ürün ilkeleri

- Kapanış ekranı bütün öğrencileri `PRESENT` varsayar; öğretmen yalnız farklı katılımı veya özel gözlemi açar.
- Önceki dersin küçük hedefi bağlam olarak gösterilir, fakat öğretmen onayı olmadan yeni kayda yazılmaz.
- Ortak not; işlenen konu, gözlem ve sonraki küçük adımı ayrı alanlarda tutar. Kazanım bağlantısı en fazla üçtür; kontrollü erteleme nedeni geçerliliğini korur.
- Ödev, kapanış içinde bir taslaktır. Öğretmen içeriği ve alıcıları görür; yalnız seçili öğrenciler için ilerleme kaydı ve bildirim üretilir.
- Arayüz öğretmene kronometre göstermez, hız sıralaması veya performans baskısı üretmez.

## Kayıt güvenliği

- Alan değişiklikleri mevcut otomatik kayıt mekanizmasıyla sunucu taslağına yazılır. Ayrılma koruması kaydetme hatasında öğretmeni uyarır.
- Tamamlama isteği `expectedVersion` ve UUID `idempotencyKey` taşır.
- Aynı anahtar ve aynı içerik yeniden gönderildiğinde mevcut sonuç döner; ikinci ödev, bildirim veya tekrar öğesi oluşmaz.
- Aynı anahtar farklı içerikle kullanılırsa veya kapanış sürümü başka sekmede ilerlemişse `409 LESSON_CLOSE_CONFLICT` döner.
- Ders kaydı, notlar, katılım, kazanımlar, seçili alıcı ödevi ve uygulama içi bildirimler tek veritabanı transaction'ında yazılır.

## Ölçüm ve yayın kapıları

Kimliksiz event'ler içerik, öğrenci/ders/grup kimliği veya alıcı listesi taşımaz:

- `lesson_close_completed`: p50/p90 süre, etkileşim, istisna ve alıcı sayısı
- `lesson_close_quality`: eksik yapılandırılmış alan, istisna ve ödev alıcı sayısı
- `lesson_close_revised`: yalnız `0-24H`, `25H-7D`, `8D+` yaş bandı
- `lesson_close_conflict`: yalnız sürüm veya idempotency yeniden kullanım gerekçesi

Rollout büyütme kapıları en az 5 kapanış örneğinden sonra değerlendirilir:

- p50 < 120 saniye
- p90 < 240 saniye
- 24 saat içinde düzenleme < %10
- eksik konu/gözlem/sonraki adım kaydı < %2
- ders notu kayıt başarısı ≥ %99,5

Bayraklar: sunucu `PANEL_FEATURE_QUICK_LESSON_CLOSE`, istemci görünürlüğü için ayrılmış `NEXT_PUBLIC_PANEL_FEATURE_QUICK_LESSON_CLOSE`. Ekran sunucu bayrağını prop olarak kullandığından istemci ortam değişkeni tek başına yetki veya özellik açmaz.

## Geri alma ve müdahale

- Kayıt çakışması artarsa hızlı kapanış bayrağını kapatın; eski not ve tamamlama akışı çalışmaya devam eder.
- `lesson_close_conflict` artışında aynı öğretmenin çoklu sekme davranışı ve istemci retry kayıtları incelenir; ham öğrenci verisi loglanmaz.
- Transaction hatasında kısmi ödev/bildirim beklenmez. E-posta kuyruğu transaction sonrasında operasyon kuyruğuyla işlenir.
