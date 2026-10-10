# M7 API sözleşmeleri — Personel

Kaynak: `lib/mobile-contracts/staff.ts` (`MOBILE_STAFF_CONTRACT_VERSION = 1`). Bağımlılıksız `v.*` doğrulayıcılar; mobil `@contracts/staff` ile içe aktarır ve her yanıtı `parse*` ile doğrular.

Ortak kurallar:

- Tüm yanıtlar `Cache-Control: private, no-store`.
- Girdiler Zod ile doğrulanır (`idParamsSchema`, sorgu şemaları). Hata 400; kaynak bulunamaz / kapsam dışı 404; izin yok 403; bayrak kapalı 404 `FEATURE_DISABLED`.
- Kimlikler: öğrenci kimliği daima `StudentProfile.id`. `User.id` dönüşümü yalnız sunucuda (ODK).
- Web yolu hedefleri `staffTargetForHref` ile native hedefe çevrilir: `lesson | submissions | help | coach-plans | coach-student | web(path) | none`.

## Öğretmen (OD)

| Uç | Ayrıştırıcı | İçerik |
| --- | --- | --- |
| `GET /api/panel/staff/teacher/home` | `parseTeacherHome` | bayraklar, bugünkü dersler (hazırlık durumu), bekleyen işler (+hedef), dikkat (skor yok), yaklaşanlar |
| `GET /api/panel/staff/teacher/lessons?aralik=yaklasan\|gecmis` | `parseTeacherLessons` | ders satırları |
| `GET /api/panel/staff/teacher/lessons/[id]` | `parseTeacherLessonDetail` | `closeVersion`, bayraklar, ortak alanlar, önceki ders, öğrenciler (yoklama `null` olabilir, ders notu, destek etiketleri), kazanımlar (bağlı / atlama nedeni / katalog) |
| `GET /api/panel/staff/teacher/assignments` | `parseTeacherAssignments` | ödev özeti; `evidenceEnabled` |
| `GET /api/panel/staff/teacher/submissions` | `parseSubmissionQueue` | SUBMITTED teslimler |
| `GET /api/panel/staff/teacher/submissions/[id]` | `parseSubmissionDetail` | `version`, kanıt metni, rubric ölçütleri, önceki denemeler |
| `GET /api/panel/staff/teacher/help` | `parseHelpInbox` | `canRespond`, izinli eylemler, istekler (engel etiketi; enerji / özgüven yok) |

Yazma (MEVCUT uçlar):

- `PUT /api/panel/lessons/[id]/notes`: `{topic, note, nextGoal, homework, complete, students[{studentId, note, attendance}], outcomes[≤3], outcomeSkipReason, expectedVersion?, idempotencyKey?(uuid)}` → `parseLessonSaveResult {savedAt, version, replayed, assignmentCreated}`. `quickLessonClose` açıkken kapanış `expectedVersion` + `idempotencyKey` ister; uyuşmazlık 409 `LESSON_CLOSE_CONFLICT`. `learningOutcomes` açıkken kapanış kazanım veya atlama nedeni ister. Ödev taslağı mobilde gönderilmez (web).
- `POST /api/panel/assignment-submissions/[id]/review`: `{expectedVersion, decision: APPROVE|REQUEST_CHANGES, feedback 2–1000, interactionDurationMs, scores[her ölçüt tam bir kez: NEEDS_WORK|DEVELOPING|MEETS]}` → `parseReviewResult`.
- `POST /api/panel/student-help-requests/[id]/respond`: `{expectedVersion, action}` → `parseHelpResult`.

## Koç (Yön)

| Uç | Ayrıştırıcı | İçerik |
| --- | --- | --- |
| `GET /api/panel/staff/coach/home` | `parseCoachHome` | öğrenci / dikkat sayısı, bugünkü görüşmeler, sıradaki, nedene göre gruplar (`COACH_REASONS`) |
| `GET /api/panel/staff/coach/students` | `parseCoachStudents` | aktif atamalar; birincil neden, sıradaki görüşme, plan durumu |
| `GET /api/panel/staff/coach/students/[id]` | `parseCoachStudentDetail` | sıradaki görüşme, bu haftanın OK planı, son görüşmeler (özel not yok), `canReadInternal`, notlar |
| `GET /api/panel/staff/coach/sessions` | `parseCoachSessions` | yaklaşan / son 30 gün; not ve bağlantı **yok** |
| `GET /api/panel/staff/coach/sessions/[id]` | `parseCoachSessionDetail` | `version`, yalnız HTTPS `meetingUrl`, paylaşılan not, `privateNote` (yalnız `read_private`), saat talebi, `decisionWeekStart`, `decisionsEnabled` |
| `GET /api/panel/staff/coach/plans` | `parseCoachPlans` | planlama haftası planları + bekleyen öneriler |
| `GET /api/panel/staff/coach/plans/[id]` | `parseCoachPlanDetail` | `version`, hafta aralığı, `canApprove` (ipucu), görevler (öğrenci görev notu yok) |

Yazma (MEVCUT uçlar):

- `POST /api/panel/coaching-sessions`: `{studentId, scheduledAt (ofsetli), meetingUrl (https|null), idempotencyKey 8–100}` → `{id, version}`.
- `POST /api/panel/coaching-sessions/[id]`:
  - SAVE: `{action, expectedVersion, idempotencyKey, scheduledAt, meetingUrl}`. Bekleyen saat talebi varsa sunucu saati değiştirmez; `proposedAt` olarak önerir.
  - COMPLETE: `{…, focus ≤300, sharedNote ≤4000, privateNote ≤4000, decisions ≤3 {title, scheduledFor (bu İstanbul haftası), durationMinutes 5–480}}`.
- `POST /api/panel/kocum/notes`: `{studentId, body 2–2000, visibility}` → `parseNoteResult`. Mobil varsayılanı INTERNAL.
- `POST /api/panel/kocum/tasks/[id]/reschedule`: `{scheduledFor, expectedPlanVersion}` → `{ok, scheduledFor, version}`; tarih plan haftasında olmalı.
- `POST /api/panel/kocum/suggestions/[id]/review`: `{decision: ACCEPTED|REJECTED, applyTasks: true}`.
- `POST /api/panel/adaptive-plan/[id]/approve`: `{expectedVersion}` → `{approved: true}`.

## Deneme Ligi (salt okunur)

- `GET /api/odk/staff/related-reports` → `parseOdkStaffStudents {students[{studentId, name, context}]}`.
- `GET /api/odk/staff/related-reports?studentId=<StudentProfile.id>` → `parseOdkStaffReport {available, summary, exams, outcomes, weakThreshold}`. Bütünlük etiketi, e-posta ve doğru cevap yok. İlişkisiz / tahmin edilen kimlik 404.
