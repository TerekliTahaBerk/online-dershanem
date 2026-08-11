# Offline-first ve düşük veri modu işletim standardı

## Güvenli kapsam

- Çevrimdışı yazma varsayılan olarak kapalıdır. Kullanıcı yalnız kişisel cihazında açıkça etkinleştirir.
- V1 allowlist'i yalnız öğretmen ders taslağı/kapanışı ile öğrencinin kontrollü ödev durumunu kapsar.
- Ödeme, kullanıcı/veli ilişkisi, admin işlemi, erişilebilirlik düzenlemesi, kanıt metni, check-in, sağlık niteliği taşıyabilecek veri ve dosya yükleme çevrimdışı kuyruğa alınmaz.
- Kuyruk kaydı opak oturum kapsamıyla ayrılır. Başka giriş aynı kuyruğu göremez; çıkış işlemi mevcut oturum kuyruğunu cihazdan siler.
- Kayıt başına üst sınır `64 KB`, yaşam süresi 24 saattir. Aynı ders veya ödev için yeni bekleyen işlem eskisiyle birleşir.
- Kuyruk ekranı içerik, kullanıcı, öğrenci, ders veya ödev adını göstermez; yalnız bekleyen ve kontrol isteyen sayısını gösterir.

## Cache politikası

- Service worker yalnız `/_next/static` uygulama dosyalarını, ikonları, manifesti ve kimliksiz `/offline` ekranını cache'ler.
- `/panel`, `/api`, private materyal ve kimliği doğrulanmış HTML/JSON yanıtları hiçbir zaman Cache Storage'a yazılmaz.
- Çevrimdışı yeni panel navigasyonu özel veriyi göstermeye çalışmaz. Kullanıcıya kimliksiz bağlantı ekranı sunulur; açık sekmedeki izinli yazmalar IndexedDB outbox üzerinden çalışır.
- Service worker mutasyonları yakalamaz veya yeniden yazmaz. Kuyruk yalnız açık allowlist kullanan uygulama katmanından beslenir.

## Idempotency ve çatışma

- Ders kapanışı mevcut `expectedVersion + idempotencyKey + requestHash` sözleşmesini kullanır. Aynı anahtar aynı içerikle güvenle tekrar oynatılır; farklı içerik veya eski sürüm `409` üretir.
- Ödev durumu `expectedVersion + mutationKey` taşır. Son anahtarın tekrarı mevcut sonucu döndürür; eski sürüm sunucudaki güncel değeri ezmez.
- `409` alan kayıt otomatik yeniden denenmez ve “insan kontrolü istiyor” durumuna geçer. Kullanıcı son sunucu durumunu açıp seçimini yeniden yapar veya cihaz kaydını siler.
- `400/401/403/404` güvenlik ya da doğrulama reddi bloklanır; farklı hesap altında yeniden oynatılmaz. `5xx` ve ağ hatası kuyrukta kalır.

## Düşük veri davranışı

- Düşük veri modu video veya PDF'yi otomatik yüklemez; bağlantı tıklanmadan ağ isteği başlatılmaz.
- Materyal listesinde transkript ve normal web bağlantısı öne çıkar. Video/PDF düğmesi veri kullanacağını açıkça söyler.
- Dekoratif blur ve zorunlu olmayan yükleme animasyonları azaltılır. Eğitim içeriği, erişilebilirlik metni veya güvenlik uyarısı gizlenmez.

## Rollout ve gözlem

1. `0056_offline_low_data` migration'ını uygulayın.
2. `PANEL_FEATURE_OFFLINE_MODE=true` ayarlayın; menü ve sunucu aynı snapshot'tan açılır.
3. Önce kişisel cihaz kullanan küçük öğretmen/öğrenci pilotunda eşitleme başarısı, çatışma, bloklanma, 24 saat sona erme ve kuyruk yaşı bantlarını izleyin.
4. Hedefler: eşitleme başarısı `≥%99`, çatışma `<%2`, süresi dolan kayıt `<%0,5`; hiçbir özel panel/API kaydı Cache Storage'da bulunmamalıdır.
5. Özel cache sızıntısı, farklı oturumda replay veya çift ders kapanışı görülürse bayrağı kapatın ve service worker cache sürümünü yükselterek eski cache'i silin. Sunucu verisini geri almayın; audit ve idempotency izini inceleyin.
6. Pilot kabulünde Chromium ağ kesme testi yanında gerçek Android düşük bellek, iOS Safari depolama tahliyesi ve 2G/3G throttle testi manuel yapılır. Tarayıcı depolaması kalıcı garanti olarak sunulmaz.
