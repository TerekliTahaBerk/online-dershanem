# Backend Gaps — Mobil için yapılacaklar

> Bu doküman mobil uygulamanın production'a çıkması için **web/Next.js
> tarafında** açılması gereken yeni endpoint'leri ve **migration-safe**
> Prisma model eklerini listeler. Mevcut tablolar/sütunlar **DEĞİŞTİRİLMEZ**.

## 1. Yeni Mobil API Yüzeyi — `/api/v1/mobile/*`

Tüm endpoint'ler:
- JSON-only (cookie kullanmaz),
- `Authorization: Bearer <accessToken>` ister (auth uçları hariç),
- `{ data, meta?, error? }` zarfı döner,
- `RateLimitEntry` ile sınırlandırılır.

### Auth (NextAuth'tan bağımsız)
| Method | Path | Açıklama |
|---|---|---|
| POST | `/api/v1/mobile/auth/login` | email + password → `{ user, tokens }`. Mevcut `bcryptjs` + `User.passwordHash` kullanılır. |
| POST | `/api/v1/mobile/auth/refresh` | `{ refreshToken }` → yeni `{ accessToken, refreshToken, accessExpiresAt }`. Eski refresh `revokedAt` ile geçersiz. |
| POST | `/api/v1/mobile/auth/logout` | Şu anki refresh'i revoke eder. |
| POST | `/api/v1/mobile/auth/send-code` | Mevcut `app/api/auth/send-code` mantığını paylaşır. |
| POST | `/api/v1/mobile/auth/complete-registration` | Mevcut `complete-registration` mantığını paylaşır. |
| POST | `/api/v1/mobile/auth/reset-password` | Mevcut `reset-password` mantığını paylaşır. |
| GET  | `/api/v1/mobile/me` | Aktif kullanıcı (id, email, name, role, avatarUrl). |
| PATCH| `/api/v1/mobile/me` | İsim, avatar güncelleme. |

**JWT:** HS256, `JWT_SECRET` env. Access TTL 15 dk, refresh TTL 30 gün, **rotation** (her refresh'te eski revoke). Refresh `tokenHash` (sha256) DB'de — **plaintext yazılmaz**.

### Notifications / Inbox
| Method | Path | Açıklama |
|---|---|---|
| GET  | `/api/v1/mobile/notifications` | Sayfalı liste + `meta.unread`. Source: `InboxMessage` (yeni omurga). |
| POST | `/api/v1/mobile/notifications/:id` | Tekil okundu işaretle. |
| POST | `/api/v1/mobile/notifications/read-all` | Tümünü okundu işaretle. |

### Devices (push token kayıt)
| Method | Path | Açıklama |
|---|---|---|
| POST   | `/api/v1/mobile/devices` | Expo push token + cihaz bilgisi kayıt/upsert. |
| DELETE | `/api/v1/mobile/devices/:id` | Logout / kullanıcı kaldırması. |

### Student
| Method | Path | Kaynak |
|---|---|---|
| GET | `/api/v1/mobile/student/dashboard` | `Student`, `Lesson` (today), `Assignment`, `StudentDailyTask`, `StudentExamResult`, `Notification` (4 son), `StudentMetricSnapshot` |
| GET | `/api/v1/mobile/student/lessons` | `Lesson` (range filtreli) |
| GET | `/api/v1/mobile/student/assignments?status=` | `Assignment` + `AssignmentSubmission` |
| POST| `/api/v1/mobile/student/assignments/:id/submit` | `AssignmentSubmission` create/update |
| GET | `/api/v1/mobile/student/exam-results` | `StudentExamResult` + subject stats |
| GET | `/api/v1/mobile/student/exam-results/:id` | Tekil + `StudentExamSubjectStat` + `TopicStat` |
| GET | `/api/v1/mobile/student/daily-tasks` | `StudentDailyTask` (yeni model) |
| POST| `/api/v1/mobile/student/daily-tasks/:id/toggle` | `isDone` flip |
| GET | `/api/v1/mobile/student/schedule` | Haftalık takvim (Lesson + classroom sessions) |
| GET | `/api/v1/mobile/student/performance` | `StudentMetricSnapshot` aggregate |

### Teacher
- `GET /teacher/dashboard` — bugünkü dersler + bekleyen değerlendirmeler + son inbox
- `GET /teacher/lessons` — kendi `teacherId`'si
- `GET /teacher/classrooms` + `/:id` (öğrenci listesi)
- `POST /teacher/attendance` — `Attendance` toplu yazım
- `POST /teacher/assignments` + `PATCH /:id`
- `POST /teacher/assignments/:id/grade` — `AssignmentSubmission.score`

### Parent
- `GET /parent/dashboard`
- `GET /parent/children` — `ParentStudent` join
- `GET /parent/children/:id` — derslik + devam + son denemeler
- `GET /parent/bills` — `OdkOrder` + `AccountingEntry`

### Admin
- `GET /admin/dashboard` — KPI snapshot (gelir bugün, yeni kayıt, online)
- `GET /admin/search?q=` — `Student/Teacher/Classroom`
- `POST /admin/announcements` — `InboxMessage` toplu yazma + push fan-out

---

## 2. Yeni Prisma Modelleri (additive, migration-safe)

> Aşağıdaki blokları `prisma/schema.prisma` **sonuna** eklemek yeterlidir.
> Hiçbir mevcut model/sütun/ilişki değiştirilmemiştir.

```prisma
// ─── Mobile (Faz Mobile) ─────────────────────────────────────────────────────

enum MobilePlatform {
  IOS
  ANDROID
  WEB
}

enum NotificationChannel {
  PUSH
  INBOX
  EMAIL
}

enum NotificationCategoryKey {
  LESSON
  ASSIGNMENT
  EXAM
  ANNOUNCEMENT
  TEACHER_MESSAGE
  ATTENDANCE
  PAYMENT
  SYSTEM
}

/// Kullanıcının mobil cihazları — push token registry.
/// Bir kullanıcının birden çok cihazı olabilir (telefon + tablet).
model MobileDevice {
  id             String         @id @default(cuid())
  userId         String         @map("user_id")
  expoPushToken  String         @unique @map("expo_push_token")
  platform       MobilePlatform
  appVersion     String         @map("app_version")
  deviceModel    String?        @map("device_model")
  osVersion      String?        @map("os_version")
  locale         String?
  timezone       String?
  lastSeenAt     DateTime       @default(now()) @map("last_seen_at")
  revokedAt      DateTime?      @map("revoked_at")
  createdAt      DateTime       @default(now()) @map("created_at")
  updatedAt      DateTime       @updatedAt      @map("updated_at")
  user           User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, revokedAt])
  @@index([lastSeenAt])
  @@map("mobile_devices")
}

/// Kullanıcı bazında bildirim tercihleri (kategori × kanal).
/// Default: hepsi açık. Eksik satır = açık (defansif).
model NotificationPreference {
  id        String                  @id @default(cuid())
  userId    String                  @map("user_id")
  category  NotificationCategoryKey
  channel   NotificationChannel
  enabled   Boolean                 @default(true)
  createdAt DateTime                @default(now()) @map("created_at")
  updatedAt DateTime                @updatedAt      @map("updated_at")
  user      User                    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, category, channel])
  @@index([userId])
  @@map("notification_preferences")
}

enum DailyTaskSource {
  ASSIGNMENT
  LESSON
  EXAM
  GOAL
  MANUAL
}

/// Mobil-spesifik öğrenci todo. `Assignment/Lesson/Exam` referanslı veya
/// öğrencinin kendi eklediği manuel görev. Streak hesabı buradan beslenir.
model StudentDailyTask {
  id          String          @id @default(cuid())
  studentId   String          @map("student_id")
  title       String
  description String?
  sourceType  DailyTaskSource
  sourceId    String?         @map("source_id")
  dueAt       DateTime?       @map("due_at")
  isDone      Boolean         @default(false) @map("is_done")
  doneAt      DateTime?       @map("done_at")
  createdAt   DateTime        @default(now()) @map("created_at")
  updatedAt   DateTime        @updatedAt      @map("updated_at")

  @@index([studentId, dueAt])
  @@index([studentId, isDone])
  @@map("student_daily_tasks")
}

/// Mobil ekranı görüntüleme / app açılış telemetrisi (streak için).
model AppActivityLog {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  action    String   // "app_open" | "screen_view" | "task_done" | ...
  payload   Json?
  createdAt DateTime @default(now()) @map("created_at")

  @@index([userId, createdAt])
  @@map("app_activity_logs")
}
```

> `User` modeline ek ilişkiler de eklenmeli (cascade için):
>
> ```prisma
> // model User { ... mevcut alanlar ...
>   mobileDevices         MobileDevice[]
>   notificationPrefs     NotificationPreference[]
> // }
> ```

> `Student` modeline:
>
> ```prisma
> // model Student { ... mevcut alanlar ...
>   dailyTasks  StudentDailyTask[]
> // }
> ```

---

## 3. Push Pipeline (Server-side)

`lib/push.ts` — yeni dosya. Expo Push API client.

```ts
// kullanım:
// await sendPush({
//   userIds: [u.id],
//   title: "Yeni ödevin var",
//   body: "Matematik · Türev — son 17 Mayıs",
//   data: { href: "/assignments/abc" },
//   category: "ASSIGNMENT",
// });
```

İç akış:
1. Kullanıcı tercihlerini (`NotificationPreference`) kontrol et.
2. `MobileDevice` tablosundan aktif tokenları çek (`revokedAt: null`).
3. Expo Push API'ye 100'lü chunk halinde POST.
4. Receipt'i `RealtimeEvent` benzeri loga yaz (opsiyonel: yeni `PushDelivery` modeli).

**Tetiklenmesi gereken yerler (mevcut server action'ları içinden çağır):**
- `Lesson` create/update → öğrenciye + öğretmene
- `Assignment` create → hedef öğrencilere
- `AssignmentSubmission` graded → öğrenciye
- `StudentExamResult` create → öğrenciye + veliye
- `InboxMessage` create → recipient'a
- Cron: `Lesson.scheduledAt - 15dk` ve `Assignment.dueAt - 24h` hatırlatma

---

## 4. JWT Konfigürasyonu

`.env` dosyasına eklenecek:

```bash
JWT_SECRET=<en az 32 karakter, openssl rand -hex 32>
JWT_ACCESS_TTL_SEC=900            # 15 dk
JWT_REFRESH_TTL_DAYS=30
EXPO_ACCESS_TOKEN=<isteğe bağlı; receipt için>
```

Yardımcılar:
- `lib/mobile-jwt.ts` — sign/verify (jose veya jsonwebtoken).
- `lib/mobile-auth.ts` — `requireMobileUser(req)` → `{ userId, role }` veya `401`.

---

## 5. Mevcut Karşılığı Olanlar (Yeniden Kullanılır)

| İhtiyaç | Mevcut |
|---|---|
| `mobile_sessions` | **Gerek yok** — `RefreshToken` modeli `userAgent`, `ip`, `expiresAt`, `revokedAt` alanlarıyla yeterli. |
| `notifications` listesi | `InboxMessage` (yeni omurga, kategori + priority + polymorphic ref hazır). Legacy `Notification` da çalışır. |
| Auth | `User.passwordHash` + `bcryptjs` zaten var, sadece JWT katmanı eklenir. |
| Permission | `Permission` + `RolePermission` + `UserPermissionOverride` zaten var; mobil endpoint'lerinde aynı katman çağrılır. |
| Realtime | `Pusher` mevcut — mobil için `pusher-js/react-native` opsiyonel; v1'de polling + push ile yeterli. |

---

## 6. Sıralama (Önerilen)

1. **Schema migration** (yeni 4 model + ilişkiler) → `prisma migrate dev --name mobile_v1`.
2. `lib/mobile-jwt.ts` + `lib/mobile-auth.ts`.
3. `/api/v1/mobile/auth/*` + `/me`.
4. `/api/v1/mobile/devices` + `lib/push.ts`.
5. `/api/v1/mobile/student/*` (dashboard öncelikli).
6. Push tetikleyicileri (server action içlerine ekle).
7. `/api/v1/mobile/notifications/*`.
8. Teacher / Parent / Admin uçları.
