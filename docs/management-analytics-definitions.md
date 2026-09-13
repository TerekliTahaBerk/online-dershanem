# Management analytics tanımları (Part 11)

Yönetim paneli analitikleri vanity metrik değil, **karar destek** üretmek içindir.
Dashboard’dan önce reusable servis katmanı gelir: saf hesap (`lib/analytics/*`) +
aggregate yükleyici (`lib/analytics/server.ts`).

Kural sürümü: `management-analytics-v1`  
Timezone: **Europe/Istanbul** (`resolveIstanbulDateRange`)

## Non-goals

- Öğretmen / öğrenci leaderboard veya performans puanı
- Resmî muhasebe / vergi beyannamesi
- Sayfalanmış listelerden KPI türetmek
- Küçük kohortlarda bireysel kimlik veya hücre ayrıntısı
- Premature materialized warehouse

## Mimari

| Katman | Dosya | Görev |
| --- | --- | --- |
| Tanımlar | `lib/analytics/definitions.ts` | Her metrik: definition · query source · date semantics · timezone · denominator |
| Filtre | `lib/analytics/filters.ts` | sınav · sınıf · ürün · grup · öğretmen · tarih |
| Gizlilik | `lib/analytics/privacy.ts` | n &lt; 10 suppress |
| Saf hesap | `commercial` / `education` / `success` / `teacher-ops` / `dashboard` | Prisma yok |
| Sunucu | `lib/analytics/server.ts` | `count` / `groupBy` / `aggregate` |
| UI | `/panel/yonetim/analitik` (+ `/[metric]`) | ≤10 KPI · trend/drill-down |
| Export | `/api/panel/analytics/export` | ADMIN · CSV · PII yok |

## Aktif öğrenci (net tanım)

**Active student** = `User.role=STUDENT` ∧ `status=ACTIVE` ∧ en az bir
`ProductMembership` (`revokedAt` null ∧ (`expiresAt` null ∨ `expiresAt` > now)).

Ops Center’daki “ACTIVE student user” sayımından daha dardır; paket/membership
şartı yönetim kararları için bağlayıcıdır. Point-in-time (tarih aralığından
bağımsız anlık sayı).

## Cohort filtreleri

| Filtre | Etki |
| --- | --- |
| `from` / `to` | İstanbul gün başlangıç/bitiş (dahil) |
| `examType` | MockExam / kohort başarı |
| `classLevel` | StudentProfile.classLevel |
| `product` | Membership + sipariş tarafı (OD/OK/ODK/ALL) |
| `groupId` | Enrollment / Lesson / Assignment kapsamı |
| `teacherId` | Grup öğretmeni / ders öğretmeni |

## Metrik katalogu

Tam tablo kodda: `METRIC_DEFINITIONS`. Özet:

### Ticari

| Key | Payda / semantik |
| --- | --- |
| `lead_count` | Aralıkta oluşan lead (created) |
| `lead_to_won` | WON / lead_count |
| `won_to_paid` | PAID sipariş / WON lead (yaklaşık funnel) |
| `paid_to_provisioned` | SUCCEEDED / PAID |
| `sales_by_product` | PAID groupBy paket |
| `avg_sales_cycle_days` | createdAt→wonAt ortalama gün |
| `collections` | FinancialTransaction netCents (PAID, ≠EXPENSE), transactionAt |
| `refunds` | REFUNDED sipariş + refundedCents |
| `package_renewals_upcoming` | Membership expiresAt önümüzdeki 30 gün |

### Eğitim

| Key | Not |
| --- | --- |
| `active_students` | Yukarıdaki tanım |
| `active_groups` | isActive groups |
| `lesson_attendance_rate` | PRESENT+LATE / tüm Attendance |
| `assignment_completion` | DONE / progress (due in range) |
| `weekly_plan_completion` | DONE tasks / tasks (weekStart in range) |
| `mock_exam_participation` | Distinct exam students / active |
| `student_risk_distribution` | Açık müdahale: geciken=kritik, diğer=izleme |
| `intervention_rate` | Açılan vaka / active students |

### Öğrenci başarısı (suppress n&lt;10)

| Key | Kaynak |
| --- | --- |
| `cohort_mock_exam_trend` | `calculateCohortGains` (cohort-gain-v1) |
| `cohort_subject_progress` | Subject net değişim medyanı |
| `cohort_outcome_progress` | LessonOutcome kapsama oranı |
| `plan_alignment_vs_outcome` | Plan tamamlama vs deneme katılımı (yan yana; korelasyon iddiası yok) |

### Öğretmen operasyonu

Sıralama **yok**. Gösterilenler:

- ders kapanış tamamlama (aggregate %)
- açık işler (müdahale + gecikmiş ödev + kapanmamış geçmiş ders)
- müdahale çözüm oranı
- ortalama öğrenci yükü

Agresif performans yorumu UI’da yapılmaz.

## Performans

1. KPI’lar listeden türetilmez — yalnız aggregate.
2. Ağır deneme başarı sorgusu `take` ile üst sınırlıdır.
3. İleride ihtiyaç olursa kısa TTL `cacheWrap` veya gece rollup değerlendirilir;
   v1’de premature warehouse yok (`MANAGEMENT_ANALYTICS_CACHE_TTL_SECONDS` rezerv).

## RBAC / KVKK

- Sayfa ve export: `requireRole("ADMIN")` / `requireApiOdRole("ADMIN")`
- CSV: metrik anahtarı, değer, tanım, filtre özeti — **email / ad / telefon / studentId yok**
- Audit: `MANAGEMENT_ANALYTICS_CSV_EXPORTED` (filtre bayrakları; kimlik yok)

## UI

- `/panel/yonetim/analitik` — en fazla 10 birincil KPI, her kart detaya gider
- `/panel/yonetim/analitik/[metric]` — tanım sözleşmesi + değer + kırılım
- Nav: SİSTEM → Yönetim analitikleri

## Testler

`lib/analytics/analytics.test.ts`:

- date range / timezone
- empty data → null oranlar
- product filter
- cohort suppression
- export PII yok
- KPI ≤10 + drill-down href
- active_students tanımı

## Kabul

1. Admin menüde “Yönetim analitikleri” görünür; öğretmen/öğrenci 404.
2. Boş DB’de tüm birincil KPI’lar “—” veya 0; hata yok.
3. `from=to` tek İstanbul günü doğru sınırlarla sorgulanır.
4. `product=ODK` sipariş kırılımını daraltır.
5. n=9 kohortta deneme trend değeri bastırılır.
6. CSV’de PII başlığı yok; audit yazılır.
