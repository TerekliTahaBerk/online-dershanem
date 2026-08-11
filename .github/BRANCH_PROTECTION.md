# `main` branch protection

`main` dalına doğrudan push kapatılmalı ve pull request birleşmeden önce aşağıdaki tek check zorunlu olmalıdır:

- `CI / Quality Gate`

Bu sonuç lint, TypeScript, unit, integration, production build, fresh database bootstrap ve üç shard Playwright sonuçlarının tamamını toplar. Alt job'lar gözlem ve hata ayıklama için görünür kalır; branch protection listesine ayrıca eklenmeleri gerekmez.

`Broken Link Scan`, `Lighthouse`, `Cross-browser Panel`, `Production Health`, `Production Smoke` ve `Encrypted Database Backup` periyodik/manuel operasyon kontrolleridir. Pull request olayında her zaman oluşmadıkları için required check yapılmamalıdır.

GitHub ayarlarında ayrıca şu seçenekler açılmalıdır:

- Require a pull request before merging
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Do not allow bypassing the above settings
