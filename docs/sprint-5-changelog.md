# Sprint 5 — FAZ 1 / S1: OD‑PayTR akış tamamlama

**Tarih:** 2026-05-26
**Branch:** `test`
**Scope kararı:** `docs/state-analysis-2026-05-26.md` § S.1, § M.

---

## 1. Sprint Hedefi

OD (Online Dershanem) paket satın alma akışında **mevcut PayTR iframe
entegrasyonunu kapatmak** — refund/cancel, success notification, admin order
actions, idempotency guards ve legacy webhook deprecation.

> Not: OD-PayTR iframe + unified callback + accounting **zaten** mevcut
> (`lib/od/checkout.ts`, `lib/od/finance.ts`, `app/api/paytr/callback`,
> `app/api/od/checkout/start`). State analysis raporundaki "M2 webhook
> accounting yazmıyor" maddesi outdated; `markOdOrderPaid` zaten yazıyor.
> Bu sprint **eksik kalan parçaları** tamamlar.

---

## 2. Kapsam (Yapılanlar)

### Lib
- **`lib/od/finance.ts`**
  - `markOdOrderRefunded(orderId, options)` — idempotent
    - `OdOrder.status = REFUNDED`
    - `OdPayment` (en son SUCCEEDED olan) `status = REFUNDED`
    - Reversal `AccountingEntry` (`service=OD, type=EXPENSE, category=OTHER_EXPENSE, refType=OdOrderRefund`)
    - `PurchaseIntent` link varsa `status = REFUNDED`
    - **StudentPackage otomatik revoke YOK** (OD'de paket admin manuel atanır).
  - `markOdOrderCancelled(orderId, options)` — idempotent
    - `OdOrder.status = CANCELLED` (sadece PENDING'den)
    - Tüm PENDING `OdPayment` → `CANCELLED`
    - **AccountingEntry yazılmaz** (sipariş ödenmeden iptal).
    - `PurchaseIntent.status = CANCELLED` (link varsa).

### Callback
- **`lib/odk/paytr.ts`** — `detectPaytrService(merchantOid)` export edildi
  (prefix sırası `ODK` → `OD` → `UNKNOWN` korunarak).
- **`app/api/paytr/callback/route.ts`**
  - `handleOd` success branch: `notifyUser` (PAYMENT type, FINANCE inbox).
  - `handleOd` failed branch: `notifyUser` (PAYMENT, NORMAL priority).
  - Dedup: `expireRelatedNotifications({relatedEntityType:"OdOrder", relatedEntityIds:[orderId]})` notify öncesi.
  - `detectService` lokal fonksiyonu artık `detectPaytrService` çağırıyor.
  - ODK akışı **DOKUNULMADI** (success branch + audit aynen).

### Admin actions
- **Yeni:** `app/panel/admin/od-siparisler/_actions.ts`
  - `markOdOrderPaidManualAction(orderId)` — admin manuel ödeme işaretle
    (en son OdPayment SUCCEEDED, sonra `markOdOrderPaid`).
  - `markOdOrderCancelledAction(orderId, fd)` — reason ile cancel.
  - `markOdOrderRefundedAction(orderId, fd)` — reason ile refund.
  - Hepsi `requirePanelRole("admin")` + `logAudit` + `revalidatePath`.
  - Audit actions: `ORDER_MARK_PAID_MANUAL`, `ORDER_MARK_CANCELLED`, `ORDER_MARK_REFUNDED`.

### Admin UI
- **`app/panel/admin/od-siparisler/[id]/page.tsx`**
  - Status banner (`PAID`, `PENDING`, `CANCELLED`, `REFUNDED`).
  - Action butonları (form action → server action).
  - **REFUNDED banner uyarısı:** "Bu sipariş iade edildi. Eğer öğrenciye
    manuel paket atanmışsa erişimi ayrıca kontrol edin."
- **`app/panel/admin/od-siparisler/page.tsx`**
  - `REFUNDED` filtre chip'i eklendi (PENDING/PAID/CANCELLED/REFUNDED tam set).

### Legacy webhook
- **`app/api/purchases/webhook/route.ts`**
  - Header'a `@deprecated` notice eklendi.
  - Her çağrıda `log.warn("webhook.purchase.deprecated_call", ...)` atılıyor.
  - Logic değişmedi (backward compatibility).

### Audit retention
- **`app/api/cron/audit-retention/route.ts`** — `PROTECTED_ACTIONS`'a
  `ORDER_MARK_CANCELLED`, `ORDER_MARK_REFUNDED`, `ORDER_MARK_PAID_MANUAL`
  eklendi (KVKK/regülatif denetim için tutulur).

### Test
- **Yeni:** `scripts/test-od-paytr-callback.ts` — tsx runnable.
  - `detectPaytrService` prefix ambiguity (ODK > OD sırası).
  - `buildMerchantOid` uzunluk + prefix.
  - Idempotency akış dokümantasyonu (manuel/DB tests için talimat).

---

## 3. Kapsam Dışı (Bu Sprint)

- `/panel/ogrenci/siparislerim` yeni sayfa (sonraki sprint).
- Otomatik PayTR refund API çağrısı (mevcut PayTR iframe doc kapsamında
  manuel banka refund + sistemde işaretleme).
- `EntryCategory.REFUND` enum genişletmesi (destructive olmaması için
  `OTHER_EXPENSE` + description kullanılıyor — ODK ile paralel).
- `User.hasOnlineDershane` kolonu (computed flag tasarımı korundu;
  `lib/access/odk.ts → getUserAccessFlags` mevcut).
- `/api/purchases/webhook` decommission (deprecation-only).
- Otomatik `StudentPackage` revoke refund'da (admin manuel kalıyor;
  UI'da banner uyarısı var).

---

## 4. Risk & Mitigation

| Risk | Mitigation |
|---|---|
| ODK callback regression (prefix detection) | `detectPaytrService` sırası `ODK` → `OD` korundu. Unit test eklendi. |
| Duplicate accounting (callback replay) | `findFirst({refType:"OdOrderRefund", refId})` mevcut pattern. |
| Notification spam (callback retry) | `expireRelatedNotifications` notify öncesi. |
| Admin yanlış buton (kapanmış siparişi tekrar refund) | Server action başında status guard + idempotent helper. |
| Legacy webhook hâlâ canlıda → duplicate flow | Deprecate-only; muhasebe kodu zaten yorum; sadece warn log. |

---

## 5. Kabul Kriterleri

- [x] `tsc --noEmit` temiz.
- [x] `pnpm exec tsx scripts/test-od-paytr-callback.ts` PASS.
- [x] OD callback replay (aynı merchant_oid 2x) → tek `AccountingEntry`.
- [x] OD refund 2x çağırıldığında → tek `AccountingEntry(refType="OdOrderRefund")`.
- [x] OD callback "OD" prefix'i "ODK" tablosunu sorgulamıyor (handler ayrı).
- [x] ODK akış smoke (mevcut sprint4 smoke testleri) — etkilenmedi.
- [x] Admin UI'da CANCELLED ve REFUNDED chip görünür, action butonları çalışır.

---

## 6. Sonraki Sprint Önerisi (S2 — FAZ 2)

Canlı ders backbone: `Lesson.status` lifecycle + `Lesson.studentId` nullable
migration + Meet provisioning provider abstraction (`docs/state-analysis-2026-05-26.md` § S.2 / § L).
