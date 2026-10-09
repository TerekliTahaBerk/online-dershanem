# M3 API sözleşmeleri — Yön Koçluk

- **Tipler ve doğrulayıcılar:** `lib/mobile-contracts/yon.ts` (bağımlılıksız; `validate.ts`).
- **Mobil uç fonksiyonları:** `mobile/src/lib/api/yon.ts`.
- **Kimlik ve sürüm kapısı:** Kimlik doğrulama, `X-Od-Client-Version` kapısı ve hata kodları M1/M2 ile aynı.
- **Önbellek başlığı:** Yeni okuma uçları `Cache-Control: private, no-store` döner.
- **Öğrenci kimliği:** Hiçbir istekte istemciden alınmaz; oturumdan çözülür.

## Uçlar

| Uç | Kapı | Bayrak | Yanıt | Not |
| --- | --- | --- | --- | --- |
| `GET /api/panel/student/yon` | OK + STUDENT | — (`adaptivePlan` yalnız `canComplete`) | `MobileYonToday` (`READY` \| `NO_PROFILE`) | YENİ; `loadYonToday` (web Yön Bugün) |
| `GET /api/panel/student/plan` | OK + STUDENT | `adaptivePlan` → 404 `FEATURE_DISABLED` | `MobileYonPlan` | YENİ; `loadStudentPlan` (web Planım). Taslak görev yok |
| `GET /api/panel/student/goals` | OK + STUDENT | — | `MobileGoals` | MEVCUT, değişmedi; artık sözleşmeyle doğrulanıyor |
| `GET /api/panel/student/coaching` | OK + STUDENT | (`adaptivePlan` → `coachTasks`) | `MobileYonCoaching` | YENİ; `loadStudentCoachingHub` + `loadUpcomingCoachingSessions` |
| `GET /api/panel/student/check-in` | OD veya OK + STUDENT | `studentCheckIn` → 404 `FEATURE_DISABLED` | `MobileCheckInState` | YENİ; `loadStudentCheckIn` (web check-in) |
| `POST /api/panel/kocum/tasks/[id]/complete` | OK + STUDENT | `adaptivePlan` | `{ completed, status, repeated }` | DEĞİŞMEDİ; web Planım / Bugün ile aynı uç |
| `POST /api/panel/adaptive-plan/[id]/request-change` | OK + STUDENT | `adaptivePlan` | `{ requested: true }` | DEĞİŞMEDİ; `expectedVersion` |
| `PATCH /api/panel/adaptive-plan/preferences` | OK + STUDENT | `adaptivePlan` | `{ saved: true }` | DEĞİŞMEDİ; tüm alanlar gönderilir |
| `POST /api/panel/coaching-sessions/[id]` | OK + STUDENT (koçluk kapsamı, pilot) | — | `{ id, version }` | DEĞİŞMEDİ; mobil yalnız `action: "REQUEST"` |
| `POST /api/panel/student-check-ins` | OD (grup) / OK (koç ataması) + STUDENT | `studentCheckIn` | `{ created, remaining, … }` | DEĞİŞMEDİ |
| `POST /api/panel/student-help-requests/[id]/feedback` | STUDENT + ürün (grup→OD, koç→OK) | `studentCheckIn` | `{ saved, status }` | DEĞİŞMEDİ; `expectedVersion` |
| `GET /api/panel/student/weekly-digest`, `POST …/weekly-digests/[id]/feedback` | OD + STUDENT | `parentWeeklyDigest` | M2 sözleşmesi | DEĞİŞMEDİ; Yön'de yalnız OD üyeliği varken çağrılır |

**Kullanılmayan alternatif:** `POST /api/panel/adaptive-plan/tasks/[id]/complete` (PLANNED→DONE) mobilde kullanılmaz. Web görev satırı ve Planım `kocum/tasks/[id]/complete` ucunu kullanıyor; mobil aynı eylemi aynı uca bağlar.

## Önemli tipler

### `MobileYonTask`

| Grup | Alanlar |
| --- | --- |
| Kimlik ve başlık | `id`, `title`, `subject`, `topic` |
| Durum | `status`: PLANNED \| IN_PROGRESS \| DONE \| PARTIAL \| COULD_NOT \| SKIPPED |
| Zaman | `scheduledFor`; `dayKey` (İstanbul günü); `isFlexible`; `durationMinutes` |
| Gerçekleşen | `actualMinutes`, `actualQuestions`, `studentNote` |
| Hedef | `targetType`, `targetValue`; `targetLabel` ("40 soru") |
| Öncelik | `priority` |
| Sunum etiketleri | `sourceLabel`, `kindLabel` |
| Bağlantı | `linkedAssignment`: OD ödevine bağlı; tek kayıt sunucuda |
| Tamamlama | `completionFields` (`completionFieldsForKind`) |

### `MobileYonToday` (`READY`)

- **Gün ve durum:**
  - `todayKey`.
  - `canComplete`: `adaptivePlan` açık ve onaylı plan var.
  - `hasPlan`.
  - `nowTaskId`: `buildStudentHomeActionPlan` Yön adaylarından seçer.
- **Görevler:**
  - `today[]`.
  - `overdue[]`: en eski 3.
  - `overdueTotal`, `openToday`, `remainingMinutesToday`.
- **`week`:** `done`, `total`, `remaining`, `doneMinutes`, `plannedMinutes`, `days[{key, done, total, isToday}]`.
- **Koç ve görüşme:**
  - `coach{name, overdue, focus}`.
  - `nextSession{id, scheduledAt, focus, meetingUrl (yalnız https), rescheduleRequested}`.
  - `coachNote{body, at}`: yalnız öğrenciye görünen not veya paylaşılan görüşme notu.
- **Hedefler:** `goals[≤3]{current: null → "ölçülmedi"}`, `goalsTotal`.
- **`checkIn`:** `studentCheckIn` kapalıysa `null`.

### `MobileYonPlan` (`READY`)

- **`plan`:**
  - **Kimlik ve durum:** `id`, `status`, `statusLabel` (`planStatusLabel`), `version`, `weekStart`, `weekEnd`, `autoApproved`, `changeRequestCategory`.
  - **Görevler:** `tasks[]` yalnız APPROVED / CHANGE_REQUESTED planda gelir. Taslak planda `[]` döner ve sayı `draftTaskCount`'ta verilir.
  - **Yetkiler:** `canComplete`, `canRequestChange`. İkisi de yalnız APPROVED planda açık.
  - **`progress`:** `buildWeeklyProgress`.
- **Diğer:** `requiresApproval`, `preference`, `coachSummary` (yalnız YAYINLANMIŞ ve öğrenciye görünen alanlar + `weekStart`).

### `MobileYonCoaching` (`READY`)

- **Koç:** `coach{name, cadenceDays, nextScheduledAt, lastCompletedAt, focus, overdue}`.
- **Yaklaşan görüşmeler:** `upcoming[{id, version, scheduledAt, meetingUrl, rescheduleRequestedAt, rescheduleReason, proposedAt}]`. Yeni saat önerisi varken `meetingUrl` boş döner (web ile aynı).
- **Geçmiş:** `past[{id, at, status, focus}]`.
- **Notlar:** `sharedNotes[]`.
- **Koç görevleri:** `coachTasks[] | null`; `adaptivePlan` kapalıysa `null`.

### `MobileCheckInState` (`READY`)

- **Hak:** `weeklyLimit`, `remaining`.
- **`targets[]`:** `GROUP{groupId, name, subject}` veya `COACH{coachAssignmentId, name}`. Seçim sunucu kuralıyla yapılır.
- **`history[]`:** `request{status, version, helpful, actionLabel}`.

## Eşzamanlılık / idempotency

| Yazma | Mekanizma |
| --- | --- |
| Görev durumu | Sunucu durum makinesi + koşullu `updateMany`; aynı istek `repeated: true` (NOOP); geçersiz / eşzamanlı → 409 |
| Değişiklik talebi | `expectedVersion`; plan değiştiyse 409 |
| Görüşme talebi | `expectedVersion` + `idempotencyKey` (gerçek UUID; aynı görüşme+neden+sürüm denemesinde korunur, sonucu belirsiz yazmada silinmez) |
| Check-in | Serializable işlem; haftalık hak ve açık yardım isteği 409; otomatik tekrar yok |
| Yardım geri bildirimi | `expectedVersion`; 409 |
