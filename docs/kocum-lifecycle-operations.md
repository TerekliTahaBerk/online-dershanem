# Online Koçum lifecycle — operasyon standardı

## Ürün ayrımı

| Domain | Kaynak | Öğrenci yüzeyi |
|---|---|---|
| Online Dershanem Assignment | `Assignment` + `AssignmentProgress` | `/panel/ogrenci/odevler` |
| Online Koçum Plan Task | `WeeklyPlanTask` | `/panel/ogrenci/plan` |

Plan task bir Assignment’a `sourceType=ASSIGNMENT` + `sourceReferenceId` ile referans verebilir. Duplicate AssignmentProgress oluşturulmaz; tamamlanma senkronu tek source of truth’u korur.

## Lifecycle

```text
Hedefler → Haftalık plan → Günlük görevler → Uygulama → Gerçekleşen → Geri bildirim → Yeni plan
```

Kritik plan değişiklikleri sistem tarafından **öneri** (`WeeklyPlanSuggestion`) olarak üretilir; koç onayı olmadan öğrenciye publish edilmez.

Cron: `GET /api/cron/kocum-suggestions` (Pazar 18:00 UTC) sinyallerden PENDING öneri üretir.

## Migration / bayrak

- Migration: `0094_kocum_lifecycle_enums` + `0095_kocum_lifecycle`
- Plan CRUD / takvim / zengin tamamlama: `PANEL_FEATURE_ADAPTIVE_PLAN`
- Koç notu ve haftalık özet: Online Koçum (`OK`) ürün yetkisi
- Timezone: `Europe/Istanbul`

## Görev durumları

`PLANNED` · `IN_PROGRESS` · `DONE` · `PARTIAL` · `COULD_NOT` · `SKIPPED`

Tamamlarken task türüne göre isteğe bağlı alanlar: soru sayıları, süre, not, zorluk/enerji (1–5).

## API

| Uç | Rol | İş |
|---|---|---|
| `POST /api/panel/kocum/tasks` | ADMIN/TEACHER | Manuel görev |
| `POST /api/panel/kocum/tasks/:id/complete` | STUDENT | Zengin tamamlanma |
| `POST /api/panel/kocum/tasks/:id/reschedule` | ADMIN/TEACHER | Tarihi değiştir (hafta içi doğrulama) |
| `POST /api/panel/kocum/templates/:id/apply` | ADMIN/TEACHER | Şablon → haftalık plan |
| `POST /api/panel/kocum/plans/:id/copy` | ADMIN/TEACHER | Plan kopyala / eksik taşı |
| `POST /api/panel/kocum/notes` | ADMIN/TEACHER | Visibility’li koç notu (default INTERNAL) |
| `POST /api/panel/kocum/summaries` | ADMIN/TEACHER | Haftalık özet yayınla |
| `POST /api/panel/kocum/suggestions/:id/review` | ADMIN/TEACHER | Öneri kabul/ret |

## Hatırlatmalar

`/api/cron/panel-reminders` plan görevleri için:

- geciken görev
- yaklaşan görev (bugün / yarın)
- plan yayınlandı (approve yolu)

Tercih anahtarı: `weeklyDigest` (mevcut preference şeması).

## Görünürlük

- Parent: yalnız `PARENT_VISIBLE` notlar + yayınlanmış `parentVisibleText`
- Student: `STUDENT_VISIBLE` / `PARENT_VISIBLE` + yayınlanmış öğrenci özeti
- Internal notlar, ham check-in, risk metadata veliye gitmez
- Yatay erişim: student kendi; parent bağlı çocuk; teacher/coach atanan; admin tümü — sunucu tarafında

## Management sinyalleri

Mikro görev dashboard’a doldurulmaz. Admin `/panel/yonetim/kocluk` operasyon sinyalleri görür:

- koçu olmayan
- plansız
- planı yayınlanmamış
- düşük plan completion
- uzun süredir coach activity olmayan

## Metrikler (reuse)

`lib/kocum/metrics.ts`: weekly completion, planned/completed minutes, overdue, question target, subject distribution. Correlation causation gibi sunulmaz.

## Test

Unit: `lib/kocum/index.test.ts`, `lib/student-plan-view.test.ts`, product entitlement matrix (OK guard’ları).
