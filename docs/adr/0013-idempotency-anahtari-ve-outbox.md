# 0013 — Kritik yan etkiler benzersiz idempotency anahtarı ve outbox ile yazılır

| Durum | Tarih | Sahip |
| --- | --- | --- |
| Kabul Edildi | 2026-08-03 (finans), 2026-09-01 (öğrenci başarı outbox'ı) | Taha Berk |

## Bağlam

Ödeme bildirimi, webhook tekrarları, retry ve çift tıklama aynı mutasyonu birden çok kez tetikler.
Finans defterinde çift satış veya çift ters kayıt, ürünler arası olaylarda çift bildirim/projeksiyon
oluşması doğrudan veri hatasıdır.

## Karar

- Tekrarlanabilir yazımlar deterministik bir anahtar taşır ve kolon veritabanında `@unique`'tir
  (`idempotency_key`). Finans: `order:<ürün>:<sipariş>:sale`, `reversal:<işlem>`,
  `payment-automation:<ürün>:<sipariş>`; yazım `upsert(..., update: {})` ile yapılır.
- Ürünler arası olaylar mutasyonla aynı transaction içinde `CrossProductEventOutbox`'a yazılır.
  `deduplicationKey` benzersizdir; olay işlemcisi kaydı ayrıca tüketir, `attempts` ve
  `MAX_OUTBOX_ATTEMPTS` ile yeniden dener.
- Outbox'ta `create` öncesi okuma yapılır: transaction içindeki benzersizlik ihlali PostgreSQL
  transaction'ını abort edeceği için hatayı yakalamak çağıranın diğer yazımlarını bozar.

## Sonuçlar / Riskler

- Tekrarlar sessizce düşer; yan etkiler en az bir kez işlenir, kayıt tekildir.
- Tüketiciler (bildirim, projeksiyon) kendi içinde de idempotent olmalıdır; outbox tek başına
  "tam bir kez" garantisi vermez.
- Oku-sonra-yaz ile benzersiz kısıt arasında dar bir yarış penceresi kalır; kısıt son savunmadır.

## Kanıt

- `lib/business/finance.ts`; `prisma/schema/business.prisma` (`FinancialTransaction`,
  `InstagramWebhookEvent` ve diğer `idempotency_key` kolonları)
- `lib/student-success/server/outbox.ts`, `lib/student-success/server/event-processor.ts`;
  `prisma/schema/system.prisma` (`CrossProductEventOutbox`)
- `c536227` — feat: add business CRM and finance domain
- `f371961` — Birleşik Öğrenci Başarı Sistemi (#212); `15e1439` — Stability fixes: outbox
- İlgili: [panel-mutation-consistency.md](../panel-mutation-consistency.md),
  [cross-product-events.md](../cross-product-events.md)
