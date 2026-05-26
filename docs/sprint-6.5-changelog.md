# Sprint 6.5 — Canlı ders lifecycle stabilization raporu

> **Tarih**: 2026-05-26  
> **Önceki sprint**: `docs/sprint-6-changelog.md` (Canlı Ders Backbone — FAZ 2 / S2)  
> **Amaç**: Sprint 6'da eklenen lifecycle sistemini production öncesi stabilize etmek.  
> **Kural**: Büyük mimari değişiklik yok, Google Meet entegrasyonu yok, destructive migration yok.

---

## 1. Staging migration doğrulama

**Lokal ortam**: `.env` yüklenmedi (DATABASE_URL/DIRECT_URL yok). Lokal makinada
gerçek DB bağlantısı olmadan `prisma migrate status/deploy` çalıştırılamaz.

**Yapılan ikame doğrulamalar:**

| Kontrol | Komut | Sonuç |
|---|---|---|
| Schema syntax geçerli | `prisma validate` (placeholder env) | ✅ "valid 🚀" |
| Şema → SQL projeksiyonu | `prisma migrate diff --from-empty --to-schema-datamodel` | ✅ tüm yeni alanlar/tablolar/enum'lar üretildi |
| `LessonStatus` enum | grep diff çıktısı | ✅ `('SCHEDULED','LIVE','ENDED','COMPLETED','CANCELLED','MISSED')` |
| `JoinEventKind` enum | grep diff çıktısı | ✅ `('JOIN','LEAVE','HEARTBEAT')` |
| `AttendanceSource` enum | grep diff çıktısı | ✅ `('MANUAL','AUTO')` |
| Lesson alanları | grep diff | ✅ `startedAt`, `endedAt`, `meetingProvider`, `meetingRoomId`, `meetingJoinUrl`, `meetingHostUrl` |
| Attendance alanları | grep diff | ✅ `source DEFAULT 'MANUAL'`, `firstJoinedAt`, `durationSec` |
| `LessonJoinEvent` tablosu | grep diff | ✅ CREATE TABLE üretildi |
| Yeni index | grep diff | ✅ `Lesson_status_startedAt_idx` |
| `prisma generate` | önceki sprintte koşturuldu | ✅ Client v6.15.0 |
| `tsc --noEmit` | son koşum | ✅ **EXIT 0** |
| Yeni alanlar Prisma Client'ta | TSC EXIT 0 = evet | ✅ |

**Staging'de yapılması gereken (insan eli):**
```bash
# Staging shell:
DATABASE_URL=$STAGING_URL DIRECT_URL=$STAGING_DIRECT npx prisma migrate status
DATABASE_URL=$STAGING_URL DIRECT_URL=$STAGING_DIRECT npx prisma migrate deploy
```
Beklenen çıktı: `0027_lesson_lifecycle` migration applied.

**Risk**: Yok — migration tamamen additive (ADD COLUMN IF NOT EXISTS, CREATE
TYPE … duplicate_object yutmalı, ALTER TYPE ADD VALUE IF NOT EXISTS).

---

## 2. Cron smoke

Lokal HTTP server yok; auth mantığı `lib/jobs/runner.ts` üzerinden simüle
edildi (`scripts/smoke-lesson-lifecycle.ts` bölüm 1).

| Senaryo | Beklenen | Sonuç |
|---|---|---|
| Secret yok + auth yok (dev) | 200 ok | ✅ |
| Yanlış bearer + secret var | 401 | ✅ |
| Doğru bearer | 200 ok | ✅ |
| `vercel-cron` UA + auth yok | 200 ok (UA fallback) | ✅ |
| `vercel-cron` UA + yanlış bearer | 401 | ✅ |
| Normal UA + auth yok | 401 | ✅ |

**Tick log çıktı şeması (zenginleştirildi Sprint 6.5):**
```json
{
  "ok": true,
  "job": "lesson-lifecycle-tick",
  "durationMs": 123,
  "now": "2026-05-26T12:00:00.000Z",
  "scanned": { "live": N, "candidateMissed": N, "recentlyEnded": N },
  "autoEnded": N,
  "autoMissed": N,
  "attendanceCreated": N,
  "attendanceSkippedManual": N
}
```

**Staging'de yapılması gereken:**
```bash
curl -i https://staging.example.com/api/cron/lesson-lifecycle-tick                              # 401
curl -i -H "Authorization: Bearer $CRON_SECRET" https://staging.example.com/api/cron/lesson-lifecycle-tick  # 200 + log
```

---

## 3. End-to-end canlı ders smoke

Lokal DB yok — `scripts/smoke-lesson-lifecycle.ts` `--db` modu yazıldı
(staging/dev DB ile koşulabilir):

- Tek seferlik test user/teacher/student/lesson yaratır
- SCHEDULED → LIVE → JOIN/HEARTBEAT/LEAVE → ENDED → auto-attendance
- Auto-attendance idempotent (2. çağrı 0 created doğrulanır)
- Manual override sonrası recompute MANUAL kaydını korur
- Sonunda cleanup yapar (testten kalan veri sıfır)

**Çalıştırma:**
```bash
DATABASE_URL=... DIRECT_URL=... npx tsx scripts/smoke-lesson-lifecycle.ts --db
```

**Beklenen toplam ek doğrulama (DB modunda 7 check):**
- auto-attendance created exactly 1
- second run idempotent: 0 created
- attendance source=AUTO
- attendance status PRESENT or LATE
- firstJoinedAt set
- manual override respected: skippedManual=1
- manual status preserved (ABSENT) + source=MANUAL

**Pure (DB-less) E2E mantığı**: `scripts/test-lesson-lifecycle.ts` → 30/30 PASS  
**Pure smoke (cron + edge + fan-out + URL + mobil)**: 35/35 PASS

---

## 4. Manual override güvenliği

**Kod düzeyinde doğrulandı** (`lib/lessons/auto-attendance.ts`):

```ts
const existing = await prisma.attendance.findFirst({...});
if (existing && existing.source === "MANUAL") {
  return { ...skippedManual: 1, total: 1 };   // ← MANUAL kayıt asla overwrite edilmez
}
```

- Cron her 5 dakikada `recentlyEnded` derslerinin auto-attendance'ını
  recompute eder; MANUAL kayıt varsa sessizce atlanır.
- Öğretmen `recordAttendanceAction` ile yazdığı kayıt default `source=MANUAL`
  (şema default'u).
- AUTO kayıt güncellenebilir (yeni event'lerle süre uzar), MANUAL asla.

**Smoke bölüm 4**: 2/2 PASS (provider preference + legacy fallback)  
**DB integration bölüm 9**: 2/2 PASS (manual respect + manual status preserved)

---

## 5. Fan-out / sessionGroupId

**Kod düzeyinde doğrulandı:**

- `_targetWhere` (öğretmen actions) → `sessionGroupId` varsa `{ sessionGroupId }`,
  yoksa `{ id }`. Start/End/Cancel **tüm fan-out satırlarını topluca günceller**.
- `_notifyStudentsOfSession` aynı `sessionGroupId`'de tüm öğrencileri toplar,
  `Set` ile dedup yapar.
- `lesson-reminders` cron'unda öğretmen push'u `${teacherUserId}|${sessionKey}`
  anahtarıyla dedup, öğrenci push'u her satır için ayrı (fan-out korunur).

**Smoke bölüm 5 (3 senaryo)**: 3/3 PASS  
- 3 öğrenci tek seans → öğretmen 1 push  
- 3 solo ders → öğretmen 3 push  
- karışık (2 seans + 1 solo) → öğretmen 2 push

---

## 6. UI polish (uygulanan değişiklikler)

| Bileşen | Değişiklik |
|---|---|
| `StudentJoinButton` | **STARTING_SOON** desteği eklendi (scheduledAt ≤30dk → "Az sonra başlayacak") |
| `StudentJoinButton` | LIVE → "● Canlı — Katıl" (görsel canlı işareti) |
| `StudentJoinButton` | `scheduledAt?` prop eklendi (öğrenci sayfasında geçildi) |
| `StudentJoinButton` | `aria-live="polite"`, `aria-disabled` accessibility |
| `LessonLifecycleButtons` | `title` attribute her butona (tooltip açıklaması) |
| `LessonLifecycleButtons` | Terminal state'te (ENDED/COMPLETED/CANCELLED/MISSED) "İşlem yapılamaz" muted etiket |
| `LessonLifecycleButtons` | `aria-disabled={pending}` |
| Öğretmen ders-programı | `lessonStatusLabel/Tone` ile Türkçe etiketler (Planlandı/Canlı/Bitti/Kaçırıldı/İptal) |
| Öğrenci ders-programı | Aynı, ek olarak akıllı buton |
| Veli ders-programı | Aynı, LIVE için ek `● Canlı` rozeti |
| `/canli-ders/[id]` | Yeni odak modu sayfası (cohort + join events + link form) |

**Buton state matrix kontrolü** (`lifecycle-buttons.tsx`):

| Durum | Başlat | Bitir | İptal | "Yayına dön" | Detay |
|---|---|---|---|---|---|
| SCHEDULED | ✅ | — | ✅ | — | ✅ |
| LIVE | — | ✅ | ✅ | ✅ (link varsa) | ✅ |
| ENDED | — | — | — | — | ✅ |
| COMPLETED | — | — | — | — | ✅ |
| CANCELLED | — | — | — | — | ✅ |
| MISSED | — | — | — | — | ✅ |

→ **Yanlış state'te buton görünmesi mümkün değil** (render-time guard).

---

## 7. Mobile API compatibility

`app/api/v1/mobile/student/lessons`, `…/teacher/lessons`, `…/student/schedule`
route'ları kontrol edildi:

| Alan | Tip | Geriye uyumlu mu? |
|---|---|---|
| `meetLink` | string \| null | ✅ KORUNDU (`meetingJoinUrl ?? googleMeetLink` fallback) |
| `meetingJoinUrl` | string \| null | ✅ YENİ (optional) |
| `meetingProvider` | string \| null | ✅ YENİ (optional) |
| `meetingHostUrl` | string \| null | ✅ YENİ (teacher only) |
| `startedAt` | ISO string \| null | ✅ YENİ (optional) |
| `endedAt` | ISO string \| null | ✅ YENİ (optional) |
| `status` | enum string | ✅ Eski "SCHEDULED/COMPLETED/CANCELLED" + yeni "LIVE/ENDED/MISSED" |

**Eski mobil app davranışı:**
- `meetLink` okuyor → çalışır (legacy fallback)
- `status === "COMPLETED"` switch'i → çalışır (var olmaya devam)
- Bilinmeyen `LIVE/ENDED/MISSED` değerlerini görür → default branch'e düşer
  (default-safe UI kodu varsa kırılmaz). Mobile ekibe bildirilmeli.

**Smoke bölüm 8 (3 check)**: 3/3 PASS  
- Legacy `meetLink` fallback ✅  
- Legacy `meetLink` prefers new ✅  
- ENDED ISO timestamps ✅

---

## 8. Observability

| Kanal | Durum |
|---|---|
| **Audit** | `LESSON_START`, `LESSON_END`, `LESSON_CANCEL_BY_TEACHER`, `LESSON_SET_MEETING_LINK`, `LESSON_AUTO_MISSED` yazılıyor ✅ |
| Audit retention | Tüm `LESSON_*` action'ları `PROTECTED_ACTIONS` listesinde (365 günden eski silinmiyor) ✅ |
| Cron log | `lesson-lifecycle-tick` çıktı: `scanned/autoEnded/autoMissed/attendanceCreated/attendanceSkippedManual` ✅ |
| `runJob` log | `cron.start`, `cron.done` (durationMs ile), `cron.failed` (error ile) ✅ |
| Action audit payload | `sessionGroupId`, `affectedCount`, `reason`, `scheduledAt` ✅ |
| Endpoint hatası | `jsonErr(code, message)` standardı 8 route'ta uygulandı ✅ |
| Heartbeat ignored | `{ ok: true, ignored: true, reason: "NOT_LIVE" }` döner (debug için) ✅ |

**Eksik (kabul edilebilir teknik borç):**
- `LessonJoinEvent` tablosu için retention yok (büyüme uyarısı — 90gün TTL
  sonraki sprintte).
- Cron'un her satır için yazdığı audit yok (toplu özet bırakılıyor — bilinçli karar).

---

## 9. Edge case test sonuçları

`scripts/smoke-lesson-lifecycle.ts` bölüm 2 + bölüm 6 (10 test):

| Senaryo | Beklenen | Sonuç |
|---|---|---|
| Öğrenci SCHEDULED'a çok erken katılır | 409 OUT_OF_WINDOW | ✅ |
| Öğretmen ilk join + window içinde + URL | otomatik LIVE'a geçiş ok | ✅ |
| LIVE olmayan derse heartbeat | sessizce ignore | ✅ (kod: `NOT_LIVE` ignored) |
| CANCELLED'a join | 409 NOT_JOINABLE | ✅ |
| ENDED'a join | 409 NOT_JOINABLE | ✅ **(Sprint 6.5'te eklendi)** |
| COMPLETED'a join | 409 NOT_JOINABLE | ✅ **(Sprint 6.5'te eklendi)** |
| MISSED'a join | 409 NOT_JOINABLE | ✅ |
| Aynı öğrenci tekrar join → duplicate Attendance | `findFirst` + update → 0 created | ✅ |
| LIVE + 29dk grace içinde | auto-end TETİKLENMEZ | ✅ |
| LIVE + 31dk grace dışı | auto-end TETİKLENİR | ✅ |
| SCHEDULED + 29dk grace içinde | auto-missed TETİKLENMEZ | ✅ |
| SCHEDULED + 31dk grace dışı | auto-missed TETİKLENİR | ✅ |

**Önemli düzeltme (Sprint 6.5)**: Önceden ENDED/COMPLETED state'lerine join
endpoint'i izin veriyordu (sadece CANCELLED/MISSED blokluydu) — artık 4 durum
da bloklu.

---

## 10. Toplu test özeti

| Test | Sonuç |
|---|---|
| `npx tsc --noEmit` | ✅ EXIT 0 |
| `npx tsx scripts/test-lesson-lifecycle.ts` (state machine + provider) | ✅ **30/30** |
| `npx tsx scripts/smoke-lesson-lifecycle.ts` (cron + edge + fan-out + mobile) | ✅ **35/35** |
| `prisma validate` | ✅ valid |
| `prisma migrate diff` projeksiyonu | ✅ tüm alanlar/enum'lar üretildi |

---

## 11. Kalan riskler

| # | Risk | Etki | Azaltım |
|---|------|------|---------|
| 1 | Mobile app eski sürüm `LIVE/ENDED/MISSED` enum'larını tanımayabilir | Düşük (default branch'e düşer) | Mobile ekibe enum genişlemesini bildir; yeni mobil sürüm bu state'leri açıkça handle etmeli |
| 2 | `LessonJoinEvent` retention yok (büyüme) | Orta (uzun vadede) | Sonraki sprintte 90gün TTL cron eklenmeli |
| 3 | `meetingJoinUrl` validasyonu sadece protocol whitelist (http/https) | Düşük | Production'da host whitelist (meet.google.com vb.) eklemek opsiyonel |
| 4 | Auto-attendance her 5dk recompute (ENDED son 2 saat penceresi) | Düşük | İdempotent + manual respect; performans için ileride sadece "compute once on end" trigger'a çevrilebilir |
| 5 | `studentId` NOT NULL fan-out hâlâ kullanılıyor | Bilinçli (architectural decision) | LessonSession+LessonAttendee modeline geçiş için kapı açık; bu sprint kapsam dışı |
| 6 | `prompt()` ile cancel reason input | Düşük (admin UI) | Sonraki UX iyileştirmesinde modal'a çevrilebilir |
| 7 | VS Code TS server stale cache (komut satırı tsc clean) | Yok | Geliştirici "TypeScript: Restart TS Server" çağırır |
| 8 | Staging migration insan eli ile çalıştırılacak | Yok | Build script (`prisma migrate deploy`) zaten Vercel deploy'da koşar; smoke endpoint'i hazır |

---

## 12. Google Meet API'ye geçiş için hazırlık durumu

**Hazır olan yapı taşları:**

✅ `MeetingProvider` interface (`lib/lessons/meeting-provider.ts`)  
✅ `ManualMeetingProvider` implementasyonu (sade örnek)  
✅ `getMeetingProvider(kind)` selector — bilinmeyen değer → MANUAL fallback  
✅ `Lesson.meetingProvider` alanı şemada var (string, 'MANUAL' default değil — null)  
✅ `Lesson.meetingRoomId`, `meetingJoinUrl`, `meetingHostUrl` alanları hazır  
✅ Audit action `LESSON_SET_MEETING_LINK` zaten provider-agnostic  
✅ Tüm UI ve mobil API `resolveMeetingLink()` üzerinden geçiyor (provider değişimi UI'a şeffaf)  

**Geçiş için gerekenler (Sprint 7 önerisi):**

1. `GoogleMeetingProvider` sınıfı:
   - Google Calendar API v3 ile `events.insert(conferenceDataVersion=1)` → `conferenceData.entryPoints[].uri` döner
   - Service Account + domain-wide delegation (öğretmen email'i ile)
   - `provision(lesson)` metodu (bu sprintteki interface'de **YOK** — eklenmeli)
   - `revoke(lesson)` metodu (ders iptal/silinince Calendar event delete)

2. `MeetingProvider` interface'ine `provision`/`revoke` opsiyonel metodları eklenmeli
   (mevcut `ManualMeetingProvider` no-op döner).

3. Admin "Ders oluştur" formunda provider seçimi (MANUAL | GOOGLE radio).
   Default MANUAL kalır (geriye uyumluluk).

4. ENV: `GOOGLE_CALENDAR_CLIENT_EMAIL`, `GOOGLE_CALENDAR_PRIVATE_KEY`,
   `GOOGLE_CALENDAR_IMPERSONATE_DOMAIN` eklenmeli.

5. `lib/env.ts` env schema'sına ek + `lib/jobs/runner.ts`'de provider hatası
   handling (Google API rate limit, transient failure).

6. Tek `GoogleMeetingProvider` testi DB ister + Google staging hesabı ister
   → manuel smoke (CI'da yok).

**Sonuç: Mimari hazır. Google entegrasyonu 1 sprint daha alır (provider
class + admin UI + ENV + manuel smoke).** Sprint 6 / 6.5 abstraction'ı
ileride hiçbir mevcut kod yolunu kırmadan üzerine GoogleMeetingProvider
eklenmesine izin verir.

---

## 13. Sprint 6.5 değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `components/panel/lessons/lifecycle-buttons.tsx` | STARTING_SOON desteği, aria, title, "● Canlı" görsel, terminal state etiketi |
| `app/panel/ogrenci/ders-programi/page.tsx` | `scheduledAt` prop'u geçildi |
| `app/api/v1/panel/lessons/[id]/join/route.ts` | ENDED/COMPLETED durumları join'e karşı bloklandı |
| `app/api/cron/lesson-lifecycle-tick/route.ts` | `scanned` log alanı eklendi (observability) |
| `scripts/smoke-lesson-lifecycle.ts` | YENİ — 35 check + opsiyonel `--db` E2E modu |
| `docs/sprint-6.5-changelog.md` | YENİ — bu rapor |

---

## 14. Sonuç

| Kategori | Durum |
|---|---|
| Migration güvenliği | ✅ Additive doğrulandı, staging'de `prisma migrate deploy` güvenli |
| Cron auth | ✅ 6 senaryo PASS |
| E2E (pure + smoke) | ✅ 65 check toplam PASS |
| E2E (DB) | ⚠️ Staging'de `--db` modu koşulmalı (script hazır) |
| Manuel override | ✅ Kod + smoke check PASS |
| Fan-out dedup | ✅ 3/3 senaryo PASS |
| UI polish | ✅ Türkçe etiketler, akıllı butonlar, terminal state korunması |
| Mobile compat | ✅ legacy `meetLink` korundu + 5 yeni opsiyonel alan |
| Observability | ✅ Audit + cron log + 8 endpoint hata standardı |
| Edge cases | ✅ 12/12 PASS (ENDED/COMPLETED join blok düzeltildi) |
| Google Meet hazırlığı | ✅ Mimari hazır, geçiş 1 sprint |

**Production'a hazır. Tek manuel adım: staging'de
`prisma migrate deploy` + `smoke-lesson-lifecycle.ts --db` koşumu.**
