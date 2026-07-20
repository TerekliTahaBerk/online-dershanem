# Panel operasyon kılavuzu

## Production ortamı

Zorunlu değişkenler: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_SECRET`, `CRON_SECRET`, PayTR anahtarları ve panel için `PANEL_ENABLED=true`. `NEXT_PUBLIC_PANEL_ENABLED=true` istemci tarafı görünürlüğünü eşitler. Bu değişkenler değiştiğinde yeniden deploy gerekir.

`EMAIL_MODE=receipts` yalnızca ödeme yapan müşteriye makbuz yollar ve önerilen varsayılandır. `all`, lead ve yönetici satış bildirimlerini de açar. `RESEND_API_KEY` yoksa makbuz outbox'ta `PENDING` kalır; anahtar düzeldiğinde cron gönderir. `MAIL_FROM` yoksa güvenli marka adresi kullanılır.

Upstash Redis opsiyoneldir. URL ve token birlikte verilirse dağıtık cache kullanılır; ikisi de yoksa uygulama in-memory fallback ile çalışır. Yalnızca birinin tanımlanması yapılandırma hatasıdır.

`ERROR_ALERT_WEBHOOK_URL`, merkezi request hatalarını üç saniyelik zaman aşımıyla JSON webhook'a yollar. Tanımlı değilse hatalar Vercel structured loglarında kalır.

### Ürün rollout bayrakları ve baz ölçüm

`PANEL_FEATURE_BASELINE_METRICS` varsayılan olarak açıktır. Öğretmenin ders kapanışında yalnız süre, grup büyüklüğü, doldurulan alan sayısı, taslak kayıt sayısı ve değişiklik sayısı gibi toplu ürün sinyallerini structured log'a yazar. Not metni, öğrenci adı, öğrenci/öğretmen kimliği veya ders kimliği event payload'ına alınmaz.

Gelecek öğrenme özellikleri `PANEL_FEATURE_LEARNING_OUTCOMES`, `PANEL_FEATURE_MOCK_EXAM_ANALYSIS`, `PANEL_FEATURE_REVIEW_QUEUE`, `PANEL_FEATURE_ADAPTIVE_PLAN`, `PANEL_FEATURE_PARENT_WEEKLY_DIGEST`, `PANEL_FEATURE_INTERVENTION_INBOX`, `PANEL_FEATURE_RECOVERY_PACKAGE`, `PANEL_FEATURE_ASSIGNMENT_EVIDENCE` ve `PANEL_FEATURE_TEACHER_AI_DRAFTS` bayraklarıyla yönetilir. Bunların güvenli varsayılanı kapalıdır. Bir bayrak yalnız tam olarak `true` değeriyle açılır; değişiklik deploy gerektirir.

İlk baz çizgi için en az iki hafta şu log event'lerini izleyin:

- `product.lesson_close_started`, `product.lesson_close_completed`, `product.lesson_close_reopened`
- `product.lesson_autosave_failed`
- `panel.lesson_notes.saved`

Hedefler: ders kapanışı p50 `<120 sn`, p90 `<240 sn`; not kaydı başarı oranı `≥%99,9`; tamamlanan dersin 24 saat içinde yeniden düzenlenme oranı `<%10`. Hedefler yeterli gerçek kullanım oluşunca yeniden kalibre edilmelidir.

### Panel oturum saklama işi

`/api/cron/panel-session-retention` her gün süresi dolmuş oturumları, 30 günden eski iptal edilmiş oturumları ve 90 günden eski kimliksiz ürün event'lerini temizler. Diğer cron'lar gibi `CRON_SECRET` bearer doğrulaması kullanır ve silinen toplamı PII içermeden döndürür.

Akademik kayıtlar, materyal Blob'ları, bildirimler ve audit kayıtları bu iş tarafından silinmez. Politika ve veri sahibi talep akışı [panel veri yönetişimi standardında](./panel-data-governance.md) tanımlıdır.

### İş SLO kontrolü

Admin “Raporlar” ekranındaki kritik yolculuk kartlarını günlük kontrol edin. Beşten az örnek için durum üretilmez. Hedef dışı kartlarda önce `outcome` dağılımını ve `product.event_persist_failed` loglarını inceleyin; güvenlik reddi ile sistem hatasını birbirine karıştırmayın. Event, hedef ve rollout kapıları [panel SLO kataloğunda](./panel-slo-catalog.md) tanımlıdır.

### Kazanım kataloğu rollout'u

`PANEL_FEATURE_LEARNING_OUTCOMES` açılmadan önce `0045_curriculum_outcome_evidence` migration'ını uygulayın, admin “Kazanımlar” ekranında resmî kaynaklı sürümü hazırlayın ve `ACTIVE` durumuna alın. Katalog yaşam döngüsü, erteleme kuyruğu ve kabul ölçütleri [kazanım işletim standardında](./curriculum-evidence-operations.md) tanımlıdır.

### Deneme analizi rollout'u

`0046_mock_exam_analysis` migration'ından sonra sunucu için `PANEL_FEATURE_MOCK_EXAM_ANALYSIS=true`, build-time menü için `NEXT_PUBLIC_PANEL_FEATURE_MOCK_EXAM_ANALYSIS=true` birlikte ayarlanır. Şablon doğrulaması, güvenli yapıştırma biçimi, rol sınırları ve pilot kapıları [deneme analizi standardında](./mock-exam-analysis-operations.md) tanımlıdır.

### Aralıklı tekrar kuyruğu rollout'u

`0047_spaced_review_queue` migration'ından sonra `PANEL_FEATURE_REVIEW_QUEUE=true` ve `NEXT_PUBLIC_PANEL_FEATURE_REVIEW_QUEUE=true` birlikte açılır. Günlük limit, erteleme hakkı, idempotency, öğretmen gözetim eşikleri ve telif sınırları [aralıklı tekrar standardında](./spaced-review-operations.md) tanımlıdır.

### İstisna odaklı ders kapanışı rollout'u

`0048_quick_lesson_close` migration'ından sonra `PANEL_FEATURE_QUICK_LESSON_CLOSE=true` açılır. İstemci ortam değişkeni yalnız build görünürlüğü için ayrılmıştır; sunucu bayrağının yerine geçmez. Önce 5–30 öğretmen kapanışında p50/p90, düzeltme, eksik kayıt ve conflict oranlarını gözleyin. Transaction, idempotency, geri alma ve seçili öğrenci ödevi ayrıntıları [hızlı ders kapanışı standardında](./quick-lesson-close-operations.md) tanımlıdır.

### Uyarlanabilir haftalık plan rollout'u

`0049_adaptive_weekly_plan` migration'ından sonra `PANEL_FEATURE_ADAPTIVE_PLAN=true` ve `NEXT_PUBLIC_PANEL_FEATURE_ADAPTIVE_PLAN=true` birlikte açılır. İlk dört hafta kabul, görev tamamlama, öğretmen inceleme süresi ve bunaltı pulse'u baz çizgi olarak izlenir. Kural sırası, kapasite sınırı ve geri alma adımları [uyarlanabilir plan standardında](./adaptive-weekly-plan-operations.md) tanımlıdır.

### Sakin haftalık özet rollout'u

`0050_calm_weekly_digest` migration'ından sonra `PANEL_FEATURE_PARENT_WEEKLY_DIGEST=true` ve `NEXT_PUBLIC_PANEL_FEATURE_PARENT_WEEKLY_DIGEST=true` birlikte açılır. İlk pilotta yayın, öğrenci/veli görüntüleme, kaygı pulse'u ve opt-out oranı izlenir; özel öğretmen notlarının özet içeriğine girmediği örneklemle doğrulanır. İçerik ve geri alma kuralları [sakin haftalık özet standardında](./calm-weekly-digest-operations.md) tanımlıdır.

### Açıklanabilir müdahale kutusu rollout'u

`0051_explainable_intervention_inbox` migration'ından sonra `PANEL_FEATURE_INTERVENTION_INBOX=true` ve `NEXT_PUBLIC_PANEL_FEATURE_INTERVENTION_INBOX=true` birlikte açılır. İlk pilotta kural bazında üretilen vaka, ilk aksiyon p50, sonuçla kapanma ve yanlış işaret oranı izlenir. Yanlış işaret guardrail'i aşılırsa ilgili kural durdurulur; eşik otomatik düşürülmez ve ML risk skoru eklenmez. Yetki, erteleme ve geri alma ayrıntıları [müdahale kutusu standardında](./explainable-intervention-inbox-operations.md) tanımlıdır.

### Ders kaçırma telafi paketi rollout'u

`0052_missed_lesson_recovery` migration'ından sonra `PANEL_FEATURE_RECOVERY_PACKAGE=true` ve `NEXT_PUBLIC_PANEL_FEATURE_RECOVERY_PACKAGE=true` birlikte açılır. İlk pilotta yayın gecikmesi p50, 72 saatte tamamlama, paket başına öğe sayısı, kaynak erişimi ve haftalık plan yeniden dengelemesi izlenir. Özel not/yoklama notu sızıntısı, yatay erişim veya kapasite sınırı ihlalinde bayrak kapatılır; veri korunur. Ayrıntılar [telafi paketi işletim standardında](./missed-lesson-recovery-operations.md) tanımlıdır.

### Kanıtlı ödev ve rubric rollout'u

`0053_assignment_evidence_rubric` migration'ından sonra `PANEL_FEATURE_ASSIGNMENT_EVIDENCE=true` ve `NEXT_PUBLIC_PANEL_FEATURE_ASSIGNMENT_EVIDENCE=true` birlikte açılır. İlk pilotta geri bildirim p50, yeniden deneme onayı, öğretmen değerlendirme süresi ve yatay erişim reddi izlenir. Dosya kanıtı bu bayrakla açılmaz; tarama ve metadata temizleme ayrı release gate'idir. Ayrıntılar [kanıtlı ödev standardında](./assignment-evidence-rubric-operations.md) tanımlıdır.

Panel materyal yüklemeleri private Vercel Blob deposunda tutulur. `BLOB_READ_WRITE_TOKEN` Vercel bağlantısı tarafından yönetilir; PDF/MP4 dosyaları doğrudan URL ile açılmaz, her indirmede rol ve aktif grup üyeliği yeniden doğrulanır. Sunucu yükleme sınırı nedeniyle dosya boyutu 4 MB ile sınırlıdır.

Öğrenci ve veli Bildirim Merkezi'nde e-posta kanalı açılırsa ders özeti, devamsızlık, ödev ve ödeme bildirimleri güvenli `EmailOutbox` üzerinden gönderilir. Geciken ödev işi her gün çalışır ve aynı kullanıcıya aynı kayıt için 24 saat içinde tekrar bildirim üretmez. WhatsApp tercihi hazırdır; gerçek teslimat için ayrıca kurumsal WhatsApp sağlayıcısı ve onaylı mesaj şablonları gerekir.

## Günlük kontroller

1. `/api/health` yanıtında `status=ok`, `db.ok=true`, `env.ok=true` olduğunu doğrulayın.
2. Yönetim panelindeki “İlginizi bekleyenler” ve “E-posta kuyruğu” bölümlerini kontrol edin.
3. Başarısız makbuzu “Yeniden dene” ile kuyruğa alın; cron en geç 15 dakika içinde yeniden dener.
4. Eşleşmemiş ödenmiş siparişleri doğru öğrenci hesabına bağlayın.

## Yedek ve geri yükleme tatbikatı

GitHub secrets: `PRODUCTION_DATABASE_DIRECT_URL`, `BACKUP_ENCRYPTION_PASSWORD`, `PRODUCTION_CRON_SECRET`.

1. `Encrypted Database Backup` workflow'unu manuel çalıştırın.
2. Workflow PostgreSQL 17 istemcisiyle üretim dump'ını AES-256 ile şifreler, tekrar açar ve geçici PostgreSQL 17 servisine gerçekten geri yükler.
3. Prisma Postgres'e özgü extension tanımları portable restore listesinden çıkarılır; uygulama tabloları ve veriler aynen korunur.
4. `users`, `lessons`, `od_orders` ve `email_outbox` tablolarını sorgulayarak geri yüklenen veriyi doğrular.
5. Şifreli artifact'i 14 gün saklar; geçici PostgreSQL job sonunda otomatik silinir.
6. Tatbikat sonucunu ve tarihini operasyon kaydına yazın.

Canlı veritabanına doğrulama amacıyla restore yapılmaz.

## Yeni ve mevcut veritabanı kurulumu

Eski migration geçmişi, ilk yıllarda şema `db push` ile yönetildiği için boş bir veritabanına doğrudan `prisma migrate deploy` ile uygulanamaz. Yeni ve tamamen boş bir ortam yalnızca korumalı `ALLOW_FRESH_DB_BOOTSTRAP=true npm run db:bootstrap:fresh` komutuyla hazırlanır; komut önce güncel şemayı kurar, ardından migration geçmişini uygulanmış olarak kaydeder ve boş olmayan veritabanında çalışmayı reddeder. Mevcut production/preview veritabanlarında normal `npm run release:migrate` kullanılmaya devam edilir.

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
