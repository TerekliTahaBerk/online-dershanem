# Unified Notifications

Cross-product bildirim orchestration prensipleri.

## Duplicate önleme

Aynı olay için üç ayrı push **üretilmez**:

- Assignment create → tek ASSIGNMENT notification
- Koçum projection → ayrı notification yok (plan içinde görünür)

Event consumer'lar notification oluşturmaz; kaynak mutation notification üretir.

## Priority

| Seviye | Örnek |
| --- | --- |
| High | Sınav/ders başlıyor, kritik deadline |
| Normal | Ödev, plan publish |
| Low | Progress summary |

Mevcut: `NotificationPreference` kategorileri (`assignment`, `lessonSummary`, …).

## Orchestration roadmap

`notification-orchestrator` consumer slot reserved — central dedup key:

```text
{userId}:{sourceType}:{sourceId}:{category}
```

## Veli özeti

`WeeklyDigest` — üç ürün sinyallerini birleştirir (`calm-weekly-digest`).

Structured evidence'a dayanmalı; vanity score yok.

## Audit

Cross-product aksiyonlar audit log + event payload ile izlenebilir.
