# Sprint 6 — Canlı Ders Backbone (FAZ 2 / S2)

> **Source of truth**: `docs/state-analysis-2026-05-26.md` (FAZ 2).  
> **Önceki sprint**: `docs/sprint-5-changelog.md` (OD-PayTR tamamlama).  
> **Mimari karar**: D.C — Mevcut N-öğrenci fan-out (sessionGroupId) korunur,
> `Lesson.studentId` **NOT NULL** kalır. Yaşam döngüsü ek alanlarla katılır.
> Gelecek bir sprintte `LessonSession` + `LessonAttendee` modeline geçiş için
> kapı açık (yeni `LessonJoinEvent` polymorphic: `lessonId` + opsiyonel
> `sessionGroupId`).

---

## 1. Kapsam (in scope)

### Şema (additive — destructive YOK)
- `LessonStatus` enum'una `LIVE`, `ENDED`, `MISSED` eklendi.
  - `COMPLETED` korunur (geriye dönük uyum). Yeni akış `ENDED` kullanır;
    `recordAttendance(...)` ile manuel "tamamlandı" işaretlemeler `COMPLETED`
    olarak kalabilir. UI'da iki değer "Bitti" başlığı altında gösterilir.
- `Lesson` modeline opsiyonel: `startedAt`, `endedAt`, `meetingProvider`,
  `meetingRoomId`, `meetingJoinUrl`, `meetingHostUrl`.
- Yeni model: `LessonJoinEvent` (id, lessonId, sessionGroupId?, studentId?,
  userId, kind: `JoinEventKind`, ts, ip?, ua?). `JoinEventKind` =
  `JOIN | LEAVE | HEARTBEAT`.
- `Attendance` modeline opsiyonel: `source` (`AttendanceSource` = `MANUAL | AUTO`),
  `firstJoinedAt`, `durationSec`.

### Kod
- `lib/lessons/meeting-provider.ts` — sağlayıcı arayüzü + `ManualMeetingProvider`
  (öğretmenin admin formunda girdiği link). Google Meet API entegrasyonu **YOK**
  (sonraki sprint).
- `lib/lessons/lifecycle.ts` — saf state machine (`canTransition`, hedef
  durum guard'ları).
- `lib/lessons/auto-attendance.ts` — `JOIN`/`LEAVE` event'lerinden otomatik
  yoklama. `source==="MANUAL"` olan kayıtlara dokunulmaz (öğretmen önceliği).
- Öğretmen server actions (mevcut `app/panel/ogretmen/_actions.ts` içine):
  `startLessonAction`, `endLessonAction`, `cancelLessonByTeacherAction`.
- 8 API endpoint: `app/api/v1/panel/lessons/[id]/{start,end,cancel,meet-link,
  join,leave,heartbeat,status}/route.ts`.
- Yeni cron: `app/api/cron/lesson-lifecycle-tick/route.ts` (5 dk).
- `app/api/cron/lesson-reminders/route.ts` — `sessionGroupId` dedup (yalnız
  öğretmen push tekilleştirilir; öğrenci push'u değişmez — geriye uyumlu).
- UI:
  - Öğretmen `/panel/ogretmen/ders-programi` — "Başlat / Bitir" butonları.
  - Öğrenci `/panel/ogrenci/ders-programi` — akıllı "Katıl" butonu.
  - Veli `/panel/veli/ders-programi` — "Canlı" rozetli durum.
  - **Yeni sayfa**: `/panel/ogretmen/canli-ders/[id]` (odak modu).
- Mobil API'a geriye uyumlu alanlar: `status`, `startedAt`, `endedAt`,
  `meetingJoinUrl` (eski `meetLink` korunur).
- `audit-retention` PROTECTED_ACTIONS += `LESSON_START`, `LESSON_END`,
  `LESSON_CANCEL_BY_TEACHER`, `LESSON_AUTO_MISSED`.

### Test
- `scripts/test-lesson-lifecycle.ts` — state machine + meeting-provider
  saf unit testler (DB gerektirmez).

---

## 2. Kapsam DIŞI (out of scope — sonraki sprint)

- Google Meet (Calendar/Meet) API entegrasyonu (`GoogleMeetingProvider`).
- `LessonSession` + `LessonAttendee` modeline geçiş (fan-out kaldırma).
- WebSocket tabanlı canlı katılımcı sayacı (şu an heartbeat polling).
- Öğretmen "tek tıkla devam et" tekrarı serileri toplu start/end.
- Recording artifact alanı (`recordingUrl`, `recordingExpiresAt`).

---

## 3. Yaşam döngüsü

```
SCHEDULED ──(teacher Start)──► LIVE ──(teacher End | auto-end past+grace)──► ENDED
   │                            │
   │                            └──(rare admin)──► CANCELLED
   ├──(no-join past+grace)──► MISSED
   ├──(teacher Cancel)──► CANCELLED
   └──(manual recordAttendance complete)──► COMPLETED (legacy yol)
```

Geçiş guard'ları:
- `Start`: yalnız `SCHEDULED`; `scheduledAt - 30dk` ile `scheduledAt + 90dk`
  penceresinde. `meetingJoinUrl` zorunlu (yoksa `meeting-link` action ile
  set edilmeli).
- `End`: yalnız `LIVE`.
- `Cancel (teacher)`: yalnız `SCHEDULED` veya `LIVE`. Audit'le.
- `Auto-end`: cron — `LIVE` ve `now > scheduledAt + duration + 30dk`.
- `Auto-missed`: cron — `SCHEDULED` ve `now > scheduledAt + 30dk` ve hiç
  `JOIN` event'i yok.

---

## 4. Kritik korumalar

- **ODK exam pipeline**: dokunulmadı.
- **Payment akışı (Sprint 5)**: dokunulmadı.
- **`prisma.lesson.findMany({ where: { studentId } })` kullanan ~15 path**:
  dokunulmadı (`studentId` NOT NULL kaldı).
- **`recordAttendanceAction` (öğretmen quick attendance)**: dokunulmadı. Auto
  attendance, `source==="MANUAL"` olan satırlara dokunmaz.
- **`lesson-reminders` cron öğrenci push'u**: değişmedi (fan-out per-Lesson).
  Sadece öğretmen tarafı `sessionGroupId` ile tekilleştirildi.
- **Mobil API geriye uyumluluğu**: `meetLink` alanı korundu, yenileri ek alan
  olarak geldi.

---

## 5. Risk & azaltım

| # | Risk | Azaltım |
|---|------|---------|
| 1 | Aynı seansta birden çok `LIVE` satırı (fan-out) | UI/Cron `sessionGroupId` ile gruplar; state machine bağımsız çalışır |
| 2 | Otomatik yoklama manuel girişi ezer | `source` alanı; AUTO sadece kayıt yokken oluşur |
| 3 | Eski `Lesson` satırları `meetingProvider` boş | Provider default `MANUAL` davranır (yeni alan opsiyonel) |
| 4 | Mobil eski sürüm yeni alanları görmez | Ek alanlar opsiyonel, eski `meetLink` korunur |
| 5 | `ALTER TYPE ADD VALUE` aynı txn içinde kullanılamaz | Migration sadece ekler, default değiştirmez |
| 6 | LessonJoinEvent büyür | Cron'a entegre temizlik **yok** bu sprint; ileride 90gün TTL |
| 7 | Cron-time clock skew | 30dk grace pencereleri (start/end/missed) |

---

## 6. Kabul kriterleri

- [ ] `npx tsc --noEmit` → EXIT 0
- [ ] `npx prisma generate` → success
- [ ] `npx tsx scripts/test-lesson-lifecycle.ts` → tüm test PASS
- [ ] Yeni 8 endpoint manuel curl ile test edilebilir (auth + 200/4xx)
- [ ] Öğretmen panelinden bir dersi Başlat → LIVE; öğrencinin programında
  "Katıl" aktif; öğretmen Bitir → ENDED; cron çalışırsa LIVE expired
  dersler otomatik ENDED olur.
- [ ] `recordAttendanceAction` davranışı bozulmadı.
- [ ] `lesson-reminders` çıktısı eski format ile uyumlu (sadece dedup metrikleri eklendi).
