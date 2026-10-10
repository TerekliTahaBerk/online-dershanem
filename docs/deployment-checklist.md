# İşletme merkezi deployment checklist

- Yedek/restore kanıtı güncel; `0064_instagram_crm_finance` ve eklemeli `0065_business_operations_completion` destructive değildir.
- Preview’da: `npx prisma migrate deploy`, `npx prisma generate`, typecheck, lint, unit test ve build.
- Backfill’i önce `--dry-run`, toplam kontrolünden sonra gerçek çalıştırın.
- Vercel env’de OpenAI, Meta, Meta Ads, encryption, cron/job secret ve feature flag’leri preview/production için ayrı girin. Preview’ın production veritabanını kullanmasına izin vermeyin.
- İlk yayında CRM/finans açık; Instagram/AI/Ads kapalı. Meta callback, imzalı test, inbox yanıtı ve cron doğrulandıktan sonra Instagram’ı açın.
- Ledger toplamını OD/ODK ödenmiş siparişlerle karşılaştırın; farkı mutabakata alın.
- AI’ı `SUGGESTION`, ölçüm sonrası `AUTO_SAFE` yapın. `AUTO` ayrıca operasyon onayı ister.
- Deploy sonrası `/api/health`, Instagram health, son başarılı cron, `DEAD` job, webhook/AI/send hata kayıtları ve son bir saat production error logları kontrol edilir.
- Deploy sonrası sürüm eşleşmesi doğrulanır: `npm run verify:production-version` yayındaki commit'i `main`'in ucuyla karşılaştırır. Sağlıklı ama eski bir deploy da yeşil görünür; eşleşme ayrı bir kontroldür ([build provenance](build-provenance.md)).

Migration öncesi salt-okunur kontroller: `SELECT migration_name FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 5;`, OD/ODK ödenmiş sipariş adet/toplamları ve mevcut ledger adet/toplamları kaydedilir. Migration sonrası yeni kolonlar `information_schema.columns` üzerinden, foreign key `pg_constraint` üzerinden ve aynı adet/toplam sorgularıyla doğrulanır. Backfill öncesi/sonrası fark yalnız eksik ödenmiş sipariş sayısı kadar olmalıdır; fark açıklanamıyorsa deploy promote edilmez.

## Mobil V1.0 (M9) — ayrı release kapısı

- [ ] [Mobil release checklist](mobile/m9-release-checklist.md) Gate A/B/C ve approval ticket'ı tamam.
- [ ] Uyumluluk sırası: onaylı backend → health/API/session/role smoke → signed mobile pilot → physical evidence → geniş dağıtım.
- [ ] M1–M7 main'de; production deployment SHA ve push migration gerçek ortamda ayrıca doğrulanır.
- [ ] Staging DB production'dan izole; native profile origin/identity/remote build numarası kaydı mevcut.
- [ ] Privacy/controller/retention/child-data/commerce ve self-service deletion engelleri kapalı.
- [ ] Push DISABLED; yalnız ayrı gerçek cihaz kanıtı ve onayla açılır.
- [ ] EAS build metadata ve backend SHA birlikte saklanır; auto submit/OTA/publish yok.
- [ ] TestFlight upload, App Review ve Play yayın için ayrı açık insan onayları kaydedilir.
