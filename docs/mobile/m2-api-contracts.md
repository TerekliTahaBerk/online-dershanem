# M2 API sözleşmeleri

Tipler ve çalışma zamanı doğrulayıcıları: `lib/mobile-contracts/student.ts` (bağımlılıksız; `validate.ts` yardımcıları). Mobil uç fonksiyonları: `mobile/src/lib/api/student.ts`. Tüm uçlar Bearer veya çerezle kimlik doğrular, `X-Od-Client-Version` kapısı M1'deki gibidir. Yeni okuma uçları `Cache-Control: private, no-store` döner.

Geriye uyum (MD-12): yol sürümlemesi yok; yalnız **eklemeli** alanlar ve isteğe bağlı sorgu parametreleri. Mobil doğrulayıcı eklemeli alanlar yoksa varsayılan kullanır (`v.optional`).

## Hata kodları

M1 kodlarına ek: **`FEATURE_DISABLED`** (404) — özellik bayrağı kapalı. Mobil `feature_disabled` sınıfına çevirir ve açıklama gösterir. Ürün yoksa 404 `PRODUCT_ACCESS_REQUIRED` (M1). İlerleme çakışması: 409 `ASSIGNMENT_PROGRESS_CONFLICT` (mevcut kod).

## Uçlar

| Uç | Kapı | Bayrak | Yanıt (sözleşme) | Not |
| --- | --- | --- | --- | --- |
| `GET /api/panel/student/home?scope=OD` | OD + STUDENT | — | `MobileOdHome` | YENİ dal; parametresiz istek eski yanıt; geçersiz `scope` 400 |
| `GET /api/panel/assignments?scope=OD` | OD + STUDENT | — | `MobileAssignmentList` | `planTasks: []`, Yön sorgusu yok. Eklemeli: `teacherName`, `submissions[].submittedAt/reviewedAt` |
| `PATCH /api/panel/assignments/[id]/progress` | OD + STUDENT | — | `{ ok, version, replayed }` | DEĞİŞMEDİ; mobil `expectedVersion` + UUID `mutationKey` gönderir |
| `POST /api/panel/assignments/[id]/submissions` | OD + STUDENT | `assignmentEvidence` | `{ id, attemptNumber, replayed }` | DEĞİŞMEDİ; `idempotencyKey` = UUID, aynı metinde yeniden kullanılır |
| `GET /api/panel/student/lessons?durum=` | OD + STUDENT | — | `MobileLessonList` | Eklemeli: `endsAt`, `status`, `attendance` |
| `GET /api/panel/student/lessons/[id]` | OD + STUDENT | (`recoveryPackage` → `recovery`) | `MobileLessonDetail` | YENİ; kayıt dışı / yok / profil yok → 404 |
| `GET /api/panel/materials` | OD + STUDENT | — | `MobileMaterialList` | DEĞİŞMEDİ |
| `GET /api/panel/materials/[id]/file` | OD | — | ikili | DEĞİŞMEDİ; Bearer başlığıyla |
| `GET /api/panel/student/insights` | OD / OK / ODK aktif ürün + STUDENT | `progressInsights` | `MobileInsights` (`READY` \| `NO_PROFILE`) | YENİ; `loadStudentProgressInsight` (web Analiz) |
| `PATCH /api/panel/student/weekly-goal` | OD / OK / ODK aktif ürün + STUDENT | — | `{ goal }` | DEĞİŞMEDİ (3–180) |
| `GET /api/panel/mock-exams[?deneme=]` | OD veya OK + STUDENT | `mockExamAnalysis` | `MobileMockExams` | DEĞİŞMEDİ; Deneme Ligi DEĞİL |
| `GET /api/panel/student/review-queue` | OD + STUDENT | `reviewQueue` | `MobileReviewQueue` | YENİ; web `tekrar` ile ortak yükleyici |
| `POST /api/panel/review-queue/[id]/respond` | OD + STUDENT | `reviewQueue` | `{ nextDueAt, stage, status, replayed }` | DEĞİŞMEDİ; `idempotencyKey` |
| `POST /api/panel/review-queue/[id]/defer` | OD + STUDENT | `reviewQueue` | 204 | DEĞİŞMEDİ; aynı gün tekrarı etkisiz |
| `GET /api/panel/student/recovery` | OD + STUDENT | `recoveryPackage` | `MobileRecovery` | YENİ; web `telafi` ile ortak yükleyici, ilk görüntüleme kaydı |
| `POST /api/panel/recovery-packages/[id]/items/[itemId]/complete` | OD + STUDENT | `recoveryPackage` | `{ completed, replayed }` | DEĞİŞMEDİ (idempotent) |
| `POST /api/panel/recovery-packages/[id]/checkpoint` | OD + STUDENT | `recoveryPackage` | `{ completed }` | DEĞİŞMEDİ |
| `GET /api/panel/student/weekly-digest` | OD + STUDENT | `parentWeeklyDigest` | `MobileWeeklyDigest` (`READY` \| `NONE`) | YENİ; web `haftalik` ile ortak; görüntüleme olayı |
| `POST /api/panel/weekly-digests/[id]/feedback` | OD + STUDENT/PARENT | `parentWeeklyDigest` | `{ saved: true }` | DEĞİŞMEDİ (upsert) |

## Önemli tipler

### `MobileOdTarget`

Sunucunun önerdiği native hedef; web `href`'i native yol olarak kullanılmaz:
`lesson{lessonId}` · `lessons` · `assignment{assignmentId}` · `assignments` · `review` · `recovery{lessonId|null}` · `none`.

Mobil `hrefForOdTarget` bunu yalnız yetkili menü öğesi varsa rotaya çevirir.

### `MobileOdHome`

- **Üst alanlar:** `contractVersion`, `scope: "OD"`, `generatedAt`, `state: READY | NO_PROFILE`, `firstName`.
- **`now`:** Tek eylem ya da `null`. Alanları: `kind`, `reasonCode`, `title`, `description`, `reason`, `ctaLabel`, `joinable`, `target`, `webPath`.
- **`today[]`:** Kronolojik; varlık başına tek satır; "Şimdi" eyleminin varlığı listede tekrar edilmez. Alanları: `kind`, zaman, `isFlexible`, `target`.
- **`week`:** Sayılar:
  - Haftalık ders sayısı ve bugün kalan dersler.
  - Bu hafta teslimi olan ve bunlardan tamamlanan ödevler.
  - Bekleyen ve süresi geçmiş ödevler.
  - `dueReviews`: tekrar bayrağı kapalıysa `null`.
- **`insight`:** `{ sentence, isEmpty }` ya da `null`.

### `MobileLessonDetail`

- **Ders bilgisi:** `lesson`, `attendance{status,label,tone}`.
- **Ortak not:** `topic`, `homework`, `nextGoal`.
- **`personalNote`:** Yalnız bu öğrencinin notu.
- **`assignments[]`:** Grubun son 3 aktif ödevi (web ile aynı).
- **`join{state: OPEN | NOT_YET | ENDED | UNAVAILABLE, url, opensAt}`:** `url` yalnız `OPEN` iken dolu.
- **Diğer:** `recovery{status} | null`, `enrollmentActive`.

### `MobileInsights` (`READY`)

- **Dönem ve anlatı:** `periodLabel`, `periodRange`, `narrative[]`, `isEmpty`.
- **`academic`:** `examCount`, `netDelta`, `netTrend[]`, `subjects[]`, `strengths[]`, `supportAreas[]`, `subjectCaption`.
- **`behavioral`:** `attendance`, `assignments`. **Plan oranı yok.**
- **Diğer:** `weeklyGoal`, `weeklyGoalUpdatedAt`, `mockExamAnalysis`.
