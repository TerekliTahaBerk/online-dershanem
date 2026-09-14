# 0014 — Prisma şeması alan bazında bölünür; boş veritabanı migration SQL'i ile kurulur

| Durum | Tarih | Sahip |
| --- | --- | --- |
| Kabul Edildi | 2026-09-13 | Taha Berk |

## Bağlam

Tek `prisma/schema.prisma` 4.267 satıra ulaşmıştı ve alan sahipliği okunamıyordu. Boş veritabanı
kurulumu `db push` ile yapılıyordu; `db push` Prisma DSL'in ifade edemediği partial index, CHECK
constraint ve trigger'ları oluşturmaz, bu yüzden fresh ortam üretimden farklı bir şemaya sahip oluyordu.

## Karar

- Şema `prisma/schema/` altında alan dosyalarına bölünür (`auth`, `base`, `business`, `commerce`,
  `education`, `kocum`, `odk`, `system`); `prisma.config.ts` klasörü yükler.
- `scripts/bootstrap-fresh-db.mjs` `prisma migrate deploy` ile bütün migration SQL'ini çalıştırır;
  `ALLOW_FRESH_DB_BOOTSTRAP=true` olmadan ve migration geçmişi olmayan dolu veritabanında durur.
- `scripts/verify-fresh-db-integrity.mjs` kritik benzersiz/partial index'leri doğrular; CI'daki
  `Fresh database bootstrap` işi bunu ve ikinci bootstrap ile idempotency'yi `main`/`test` PR'larında denetler.

## Sonuçlar / Riskler

- Fresh ve üretim şeması aynı SQL zincirinden gelir.
- Doğrulama adıyla listelenen index'lerle sınırlıdır; CHECK constraint'ler tek tek denetlenmez.
  Yeni kritik partial index eklendiğinde listeye eklenmelidir.
## Kanıt

- `b46b615` — Split Prisma schema & add DB bootstrap tools
- `prisma.config.ts`, `prisma/schema/*.prisma`, `.github/workflows/ci.yml` (`Fresh database bootstrap`)
- [data-model-ownership.md](../data-model-ownership.md)
