# İşletme merkezi deployment checklist

- Yedek/restore kanıtı güncel; `0064_instagram_crm_finance` destructive değildir.
- Preview’da: `npx prisma migrate deploy`, `npx prisma generate`, typecheck, lint, unit test ve build.
- Backfill’i önce `--dry-run`, toplam kontrolünden sonra gerçek çalıştırın.
- Vercel env’de OpenAI, Meta, cron/job secret ve feature flag’leri preview/production için ayrı girin.
- İlk yayında CRM/finans açık; Instagram/AI/Ads kapalı. Meta callback, imzalı test, inbox yanıtı ve cron doğrulandıktan sonra Instagram’ı açın.
- Ledger toplamını OD/ODK ödenmiş siparişlerle karşılaştırın; farkı mutabakata alın.
- AI’ı `SUGGESTION`, ölçüm sonrası `AUTO_SAFE` yapın. `AUTO` ayrıca operasyon onayı ister.

