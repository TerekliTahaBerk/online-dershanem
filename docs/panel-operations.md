# Panel operasyon kılavuzu

## Production ortamı

Zorunlu değişkenler: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_SECRET`, `CRON_SECRET`, PayTR anahtarları ve panel için `PANEL_ENABLED=true`. `NEXT_PUBLIC_PANEL_ENABLED=true` istemci tarafı görünürlüğünü eşitler. Bu değişkenler değiştiğinde yeniden deploy gerekir.

`EMAIL_MODE=receipts` yalnızca ödeme yapan müşteriye makbuz yollar ve önerilen varsayılandır. `all`, lead ve yönetici satış bildirimlerini de açar. `RESEND_API_KEY` yoksa makbuz outbox'ta `PENDING` kalır; anahtar düzeldiğinde cron gönderir. `MAIL_FROM` yoksa güvenli marka adresi kullanılır.

Upstash Redis opsiyoneldir. URL ve token birlikte verilirse dağıtık cache kullanılır; ikisi de yoksa uygulama in-memory fallback ile çalışır. Yalnızca birinin tanımlanması yapılandırma hatasıdır.

`ERROR_ALERT_WEBHOOK_URL`, merkezi request hatalarını üç saniyelik zaman aşımıyla JSON webhook'a yollar. Tanımlı değilse hatalar Vercel structured loglarında kalır.

## Günlük kontroller

1. `/api/health` yanıtında `status=ok`, `db.ok=true`, `env.ok=true` olduğunu doğrulayın.
2. Yönetim panelindeki “İlginizi bekleyenler” ve “E-posta kuyruğu” bölümlerini kontrol edin.
3. Başarısız makbuzu “Yeniden dene” ile kuyruğa alın; cron en geç 15 dakika içinde yeniden dener.
4. Eşleşmemiş ödenmiş siparişleri doğru öğrenci hesabına bağlayın.

## Yedek ve geri yükleme tatbikatı

GitHub secrets: `PRODUCTION_DATABASE_DIRECT_URL`, `BACKUP_ENCRYPTION_PASSWORD`, `PRODUCTION_CRON_SECRET`.

1. `Encrypted Database Backup` workflow'unu manuel çalıştırın.
2. Şifreli artifact'i indirin ve geçici, boş PostgreSQL veritabanı oluşturun.
3. `openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000` ile dump'ı açın.
4. `pg_restore --list` ile arşivi doğrulayın, ardından yalnızca geçici veritabanına `pg_restore --no-owner --no-acl` uygulayın.
5. `users`, `lessons`, `od_orders` ve `email_outbox` sayımlarını kaynakla karşılaştırın.
6. Geçici veritabanını silin; sonuç ve tarihi operasyon kaydına yazın.

Canlı veritabanına doğrulama amacıyla restore yapılmaz.

## Dört rol canlı kabul listesi

- Admin: kullanıcı oluşturur; öğrenci–veli bağlantısı, grup ve dört haftalık ders planı kurar.
- Öğretmen: yalnızca kendi grubunu görür; yoklama ve dört öğrenci notunu tek ekranda kaydeder; ödev/materyal yayınlar.
- Öğrenci: sıradaki dersi, geri sayımı, ödevi, materyali ve gelişimini görür; ödev durumunu günceller.
- Veli: yalnızca bağlı öğrenciyi görür; başka `studentId` isteği 404 olur; ödev, katılım ve ödeme görünür.
- Tüm roller: bildirim filtreleri ve `.ics` takvim indirme çalışır; öğrenci/veli takvim dosyasında toplantı URL'si bulunmaz.

## Yayın sonrası

1. Migration gerekiyorsa `npm run release:migrate` çalıştırın.
2. Production deploy tamamlandıktan sonra `/api/health` içindeki commit'i doğrulayın.
3. Oturumsuz panel API isteğinin 401, yanlış rol isteğinin 403/404 verdiğini kontrol edin.
4. `Production Health`, `Production Smoke` ve E2E GitHub Actions sonuçlarını inceleyin.
