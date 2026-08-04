# İşletme merkezi deployment checklist

- Yedek/restore kanıtı güncel; `0064_instagram_crm_finance` ve eklemeli `0065_business_operations_completion` destructive değildir.
- Preview’da: `npx prisma migrate deploy`, `npx prisma generate`, typecheck, lint, unit test ve build.
- Backfill’i önce `--dry-run`, toplam kontrolünden sonra gerçek çalıştırın.
- Vercel env’de OpenAI, Meta, Meta Ads, encryption, cron/job secret ve feature flag’leri preview/production için ayrı girin. Preview’ın production veritabanını kullanmasına izin vermeyin.
- İlk yayında CRM/finans açık; Instagram/AI/Ads kapalı. Meta callback, imzalı test, inbox yanıtı ve cron doğrulandıktan sonra Instagram’ı açın.
- Ledger toplamını OD/ODK ödenmiş siparişlerle karşılaştırın; farkı mutabakata alın.
- AI’ı `SUGGESTION`, ölçüm sonrası `AUTO_SAFE` yapın. `AUTO` ayrıca operasyon onayı ister.
- Deploy sonrası `/api/health`, Instagram health, son başarılı cron, `DEAD` job, webhook/AI/send hata kayıtları ve son bir saat production error logları kontrol edilir.

Migration öncesi salt-okunur kontroller: `SELECT migration_name FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 5;`, OD/ODK ödenmiş sipariş adet/toplamları ve mevcut ledger adet/toplamları kaydedilir. Migration sonrası yeni kolonlar `information_schema.columns` üzerinden, foreign key `pg_constraint` üzerinden ve aynı adet/toplam sorgularıyla doğrulanır. Backfill öncesi/sonrası fark yalnız eksik ödenmiş sipariş sayısı kadar olmalıdır; fark açıklanamıyorsa deploy promote edilmez.
