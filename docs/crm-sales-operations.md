# CRM satış operasyonu

Business Panel CRM (`/panel/yonetim/isletme`) satış personelinin günlük takip işini unutmasın diye tasarlandı.

## Operasyon alanları (`BusinessLead`)

| Alan | Kaynak |
|---|---|
| owner | `assignedUserId` |
| stage | `LeadStage` |
| nextFollowUpAt | takip tarihi |
| lastContactAt | son temas |
| source | `LeadSource` |
| campaign | `campaignId` + Attribution |
| interest | `productInterest` |
| expectedValue | `estimatedValueCents` |
| lostReason | `lostReasonCode` + `lostReason` |
| wonAt / lostAt | timestamp |
| tags | `tags[]` |
| priority | `LeadPriority` |

Migration: `0091_crm_sales_operations` (additive).

## Aday listesi

Varsayılan odak: **Bugün ilgilenmem gereken adaylar** (`focus=today`).

Filtreler: stage, owner, source, campaign, interest, overdue, no activity, arama.

Her satır karar vermeyi kolaylaştırır: kim · ne istiyor · son temas · sıradaki aksiyon. Geciken takipler kırmızı vurgulanır.

## Detay

`?lead=` ile profil, kaynak, ürün, stage, owner, Instagram konuşması, notlar, görevler, teklif/ödeme, timeline ve olası duplicate’ler gösterilir. Otomatik merge yok.

## Satış hunisi

Kanban + her kartta klavye erişilebilir stage `<select>`. Stage değişimi:

1. server-side `validateStageTransition`
2. audit `LEAD_STAGE_CHANGED`
3. client optimistic UI; mutation response authoritative

`LOST` için `lostReasonCode` zorunlu.

## Won

WON olduğunda sipariş oluştur CTA, mevcut sipariş bağlama ve provisioning durumu (lifecycle paneli ile birlikte) gösterilir.

## Metrikler

`loadLeadAnalytics` — sayfalanmış listeden türetilmez:

- lead count, source/stage conversion, average time in stage
- follow-up overdue, owner performance, lost reasons

Genel bakış ve Raporlar bölümlerinde kullanılır.

## RBAC

`lead:read` / `lead:write` Business Role Assignment üzerinden; sorgular `scopedUnitIds` ile birim kapsamlıdır. Owner hard-isolation yoktur; owner filtresi operasyoneldir.
