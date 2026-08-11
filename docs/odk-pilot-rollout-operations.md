# ODK kontrollü pilot ve üretim yayın standardı

Bu süreç Online Deneme Kulübü'nü küçük, adı konmuş bir katılımcı grubuyla açar. Ürün üyeliği satın alma hakkını; pilot üyeliği ise o yayın koşusuna katılımı temsil eder. İkisi birbirinin yerine geçmez.

## Fail-closed rollout sözleşmesi

`ODK_ROLLOUT_MODE` yalnız küçük harfle yazılmış `disabled`, `pilot` veya `general` değerlerinden birini kabul eder. Değişken eksikse, boşsa, büyük/küçük harfi farklıysa veya tanınmıyorsa effective mode `disabled` olur.

| Yapılandırma | Effective erişim |
| --- | --- |
| `disabled`, eksik veya geçersiz mode | Public satış ve admin dışındaki ODK panel/API erişimi kapalı |
| `pilot` | Yalnız aktif ODK pilot koşusundaki admin dışı üyeler; public satış kapalı |
| `general` + üç onay da tam olarak `true` | Admin dışındaki üyelik sahibi kullanıcılar genel erişime açık |
| `general` + eksik/false/geçersiz onay | Effective mode `disabled` |
| Herhangi bir mode + `ODK_PILOT_KILL_SWITCH=true` | Public ve admin dışındaki tüm ODK erişimi anında kapalı |

Admin erişimi olay müdahalesi ve geri alma için açık kalır. Public route, checkout API ve ODK panel/API guard'ları aynı server-side rollout kararını kullanır. Public checkout ayrıca bağımsız ürün kararıyla şu anda `410 Gone` dönmeye devam eder; rollout `general` olsa bile bu dokümanda ayrıca satış açılışı ilan edilmeden checkout açılmaz.

## Yayın öncesi kapılar

1. `0063_odk_pilot_rollout` migration'ını uygulayın ve deploy'u `ODK_ROLLOUT_MODE=pilot` ile alın.
2. `CRON_SECRET` ile `/api/cron/odk-exam-lifecycle` görevinin çalıştığını, `BLOB_READ_WRITE_TOKEN` ile kitapçıkların özel depoda tutulduğunu doğrulayın.
3. Son 90 gün içinde yalnız yedekten yeni ortama restore tatbikatı yapın; başarılı tarihi `ODK_LAST_RESTORE_DRILL_AT` olarak kaydedin.
4. Bir admin, bir öğretmen, en az bir öğrenci ve bağlı bir veliyle klavye, mobil, `%200` zoom, ağ kesme, süre sonu, sonuç açıklama ve yatay erişim kabulünü tamamlayın.
5. Çocuk verisi/KVKK, Meet oturum protokolü, PDF yetkisi ve olay yönetimi incelemesinden sonra üç manuel onayı açın: `ODK_PILOT_ACCEPTANCE_APPROVED`, `ODK_PILOT_SECURITY_REVIEW_APPROVED`, `ODK_PILOT_OPERATIONS_APPROVED`.
6. Admin ODK “Pilot yayını” ekranında katılımcıları açıkça seçer. Taslak oluşturmak erişim vermez; tüm bloke kapılar kalkınca aktive edilir.

Ortam değişkenlerini yükledikten sonra önce `npm run validate:deploy-env -- --target=production`, ardından `npm run inspect:odk-pilot` çalıştırılır. Deploy doğrulaması kritik production sözleşmesini bloke eder; restore drill gibi hizmeti düşürmeyen readiness eksiklerini redakte edilmiş structured warning olarak bildirir. Komutlar hiçbir secret değerini yazdırmaz ve veritabanına bağlanmaz. Hazır deneme, stale oturum, puanlama kuyruğu ve rol kapsamı gibi canlı veri kapıları ayrıca admin “Pilot yayını” ekranından doğrulanır.

Her koşu için [ODK iki aşamalı pilot kabul formu](./odk-pilot-acceptance-checklist.md) kopyalanır. Formda kişisel veri veya soru içeriği tutulmaz.

## Backup → restore prosedürü ve kanıt kaydı

Tekrarlanabilir üretim tatbikatı `.github/workflows/database-backup.yml` içindeki `Encrypted Database Backup` workflow'udur:

1. `PRODUCTION_DATABASE_DIRECT_URL` ile PostgreSQL 17 custom-format dump alınır. Dump üretim veritabanına yalnız okuma yapar.
2. Dump AES-256-CBC/PBKDF2 ile şifrelenir; açık dump kalıcı artifact olarak yüklenmez.
3. Şifreli dump tekrar açılarak job'a özel, production olmayan PostgreSQL 17 servisine restore edilir. Extension metadata'sı portable restore listesinden çıkarılır; canlı veritabanı restore hedefi olarak hiçbir zaman kullanılmaz.
4. `scripts/verify-restore-readiness.sql` kullanıcı, product membership, OD/ODK sipariş-ödeme ve ODK exam/version/attempt/answer/score ilişkilerini kontrol eder. Her orphan veya sınav-sürüm uyuşmazlığı job'ı başarısız yapar.
5. Başarılı job'ın GitHub Actions run URL'si, restore süresi, sorumlu ve UTC bitiş zamanı aşağıdaki kayda eklenir. Şifreli artifact 14 gün, bu özet kayıt kalıcı saklanır. Kişisel veri veya bağlantı dizesi kayda yazılmaz; dump yalnız SHA-256 özetiyle tanımlanır.
6. Yalnız `PASS` kaydından sonra bitiş zamanı production `ODK_LAST_RESTORE_DRILL_AT` değerine UTC ISO timestamp olarak yazılır ve production yeniden deploy edilir.

### Tatbikat kayıtları

| UTC bitiş | Sonuç | Sorumlu | Restore süresi | Kapsam ve kanıt |
| --- | --- | --- | --- | --- |
| `2026-08-11T14:07:17Z` | `PASS` | Taha Berk Terekli | `0.37s` | Vercel production `DIRECT_URL` kaynağından `pg_dump` 17.10; izole local PostgreSQL 17.10 restore; 110 public tablo; kritik ilişki smoke kontrolleri geçti. Dump SHA-256: `844011e9ad10e903c0db46e1c6bcf409d27c6bb438d7d9ad2a0b3b1b1d78515a`; takip: Linear `Y-56`. Production ODK exam/version/attempt/answer tabloları tatbikat anında boştu. |

## Zorunlu uygulama sırası

1. Üretim migration ve ortam yapılandırması doğrulanır; genel yayın modu açılmaz.
2. Restore, özel PDF, cron, yatay erişim, pause ve kill switch teknik provası yapılır.
3. Dört rol gerçek cihaz ve erişilebilirlik kabulünü tamamlar.
4. Admin tek bir dört rollü pilot koşusunu aktive eder.
5. Pilot deneme #1 gerçekleştirilir; P0 ve P1 bulgular kapanmadan yeni deneme planlanmaz.
6. Aynı kritik yollar pilot deneme #2'de yeniden doğrulanır.
7. Yalnız iki deneme de kabul edildiğinde `canExpand=true` koşulu değerlendirilir.
8. Ürün, güvenlik ve operasyon sahipleri birlikte onay vermeden `ODK_ROLLOUT_MODE=general` deploy edilmez. Production env doğrulaması bu üç onaydan biri eksikse deploy'u bloke eder; runtime kararı da yapılandırmayı `disabled` olarak uygular.

## Sınav günü görev dağılımı

- Sınav sorumlusu denemeyi ve Meet bağlantısını 30 dakika önce doğrular; sonuç açıklama yetkisi yalnız admindedir.
- Teknik sorumlu canlı operasyon ekranında heartbeat, cevap sayısı, otomatik teslim ve yaşam döngüsü cron'unu izler.
- Öğretmen yalnız akademik destek ve sonradan rapor yorumundan sorumludur; planı veya sonucu açıklayamaz.
- Meet'e katılım kullanıcı beyanı ve görevli protokolüyle takip edilir. Tarayıcı heartbeat'i Meet katılım kanıtı olarak yorumlanmaz.
- Öğrenciden ekran paylaşımı, oda görüntüsü veya sınav için gereksiz kişisel veri istenmez.

## Olay ve geri alma

Yetkisiz PDF/sonuç erişimi, başka öğrencinin cevabına erişim, yanlış cevap anahtarı, yaygın cevap kaybı veya zamanlayıcı sapması kritik olaydır. Yeni girişleri durdurmak için önce pilot koşusunu `PAUSED`, deploy seviyesinde acil kesme gerekiyorsa `ODK_PILOT_KILL_SWITCH=true` yapın. Admin erişimi olay müdahalesi için açık kalır.

Geri alma veri silmez. Koşu `ROLLED_BACK` durumuna alınır; aktif denemeler ve cevaplar korunur, sonuçlar açıklanmaz. Yanlış anahtarla puanlanan sonuçlar düzeltilmeden yeniden yayınlanmaz. Olay kaydı, etkilenen kullanıcı bandı, zaman aralığı, alınan karar ve geri dönüş doğrulamasını içerir; soru veya öğrenci içeriği loga kopyalanmaz.

## Genişleme ölçütü

Pilot en az iki planlı matematik denemesi ve dört rol kabulinden sonra değerlendirilir. Şunların tamamı sağlanmadan `ODK_ROLLOUT_MODE=general` yapılmaz:

- yetkisiz nesne erişimi ve sonuç sızıntısı sıfır;
- kaybolan onaylanmış cevap sıfır ve otomatik teslimler açıklanabilir;
- stale aktif oturum yok, bitmiş denemelerde puanlama kuyruğu temiz;
- öğrenci, veli ve öğretmen raporları aynı açıklanmış skordan türetiliyor;
- olay tatbikatında pause/kill switch ve geri dönüş doğrulanmış;
- mobil, erişilebilirlik, ağ kesme ve restore kabul kanıtları güncel.

Genel yayında da kill switch korunur. Pilot koşuları ve audit kayıtları silinmez; sonraki incelemeler için terminal durumda saklanır.
