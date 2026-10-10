# M4 API sözleşmeleri — Deneme Ligi (ODK)

- **Tipler ve doğrulayıcılar:** `lib/mobile-contracts/odk.ts` (bağımlılıksız).
- **Mobil uç fonksiyonları:** `mobile/src/lib/api/odk.ts`.
- **Önbellek başlığı:** Tüm yeni uçlar `Cache-Control: private, no-store` döner.
- **Öğrenci kimliği:** Hiçbir istekte istemciden alınmaz.
- **Ham veri:** Hiçbir uç ham Prisma nesnesi veya `getStudentExam` çıktısı döndürmez. Projeksiyon izin listelidir: `lib/mobile/odk-views.ts`.

## Uçlar

| Uç | Kapı | Yanıt | Not |
| --- | --- | --- | --- |
| `GET /api/odk/student/home` | `requireApiProductRole("ODK","STUDENT")` (pilot + ürün) | `MobileOdkHome` | YENİ; `loadOdkStudentHome` (web Bugün) |
| `GET /api/odk/student/exams?gorunum=tumu\|yaklasan\|acik\|tamamlanan` | aynı | `MobileOdkExamList` | YENİ. Geçersiz `gorunum` 400 döner. En yeni 50 deneme; `truncated` |
| `GET /api/odk/student/exams/[id]` | aynı + **aktif sözleşme hakkı** (`getActiveOdkExamGrant`) + yayınlanmış deneme | `MobileOdkExamDetail` | YENİ. Salt okunur (`finalizeExpired: false`). Yoksa 404 |
| `GET /api/odk/student/exams/[id]/result` | aynı + `studentReports` + RELEASED + sözleşmeye göre yayın zamanı + kendi `PUBLISHED` skoru | `MobileOdkResult` | YENİ; `loadOdkStudentResult`. Biri eksikse nedeni söylemeyen 404 |
| `GET /api/odk/student/exams/[id]/answer-key` | aynı + **bağımsız** `contractAnswerKeyAvailable` + dosya | PDF | DEĞİŞMEDİ. Mobil yalnız Bearer başlıkla indirir |

**Mobilin çağırmadığı uçlar:** `start`, `booklet`, `attempts/*/answers`, `heartbeat`, `events`, `timings`, `sessions/close`, `submit`.

## Durum eşlemesi (sunucu `studentExamState`)

| Anahtar | Etiket | Ton | Sekme | Mobil eylem |
| --- | --- | --- | --- | --- |
| `IN_PROGRESS` | Devam ediyor | warning | açık | Açıklama + "Web'de denemeye devam et" (token yok) |
| `AVAILABLE` | Başlayabilirsin | critical | açık | Açıklama + "Web sınav ekranında aç"; mobil başlatmaz |
| `UPCOMING` | Yaklaşan | info | yaklaşan | Program; erken başlatma yok |
| `WAITING_RESULT` | Sonuç bekleniyor | neutral | tamamlanan | Teslim edildi / süre doldu bilgisi |
| `RESULT_RELEASED` | Sonuç açıklandı | success | tamamlanan | Native sonuç ekranı |
| `MISSED` | Kaçırıldı | neutral | tamamlanan | Sunucu nedeni (`attemptStartError`); yeniden deneme hakkı uydurulmaz |
| `CLOSED` | Kapandı | neutral | tamamlanan | Sunucu nedeni |

**Süresi dolmuş açık deneme:** Ayrıntı ucu deneme kaydını değiştirmez. Projeksiyonda deneme teslim edilmiş sayılır (`AUTO_SUBMITTED`) ve `attempt.expired: true` döner.

## Önemli tipler

### `MobileOdkExamRow`

| Alan | Açıklama |
| --- | --- |
| `id`, `title` | Deneme kimliği ve adı |
| `family` | Aile kayıt defteri kodu; bilinmeyen kod metin olarak gösterilir |
| `startsAt`, `endsAt` | Deneme penceresi |
| `durationMinutes` | Süre |
| `state{key,label,tone,actionLabel,tab}` | Sunucu durumu |
| `net` | Yalnız `RESULT_RELEASED` + yayınlanmış skor |
| `deadlineAt` | Yalnız `IN_PROGRESS` |

### `MobileOdkHome`

| Alan | İçerik |
| --- | --- |
| `next` | Sırasıyla devam eden → başlanabilir → yaklaşan |
| `results[≤3]` | Her biri `delta` taşır: aynı aileden bir önceki sonuca göre |
| `resultsTotal` | Toplam açıklanmış sonuç sayısı |
| `trend{family, points}` | Yalnız en son sonucun ailesi; en az 2 nokta |
| `focus{examId, examTitle, items[≤3]}` | Odak konular |

### `MobileOdkExamDetail`

- **Deneme bilgisi:** `exam{lateEntryMinutes, attemptLimit, durationMinutes, questionCount}`.
- **Bölümler:** `sections[{code,title,questionCount}]`.
- **Oturum planı:** `sessionPlan[{key,title,durationMinutes,breakAfterMinutes,sectionTitles}] | null`. Gerçek sürüm ayarından okunur (`readSessionPlan`); yanında `sessionTotalMinutes`.
- **Gözetim:** `meetRequired`. Meet bağlantısı yanıtta **yok**.
- **Durum ve deneme:**
  - `state`.
  - `startBlockedReason`.
  - `attempt{inProgress,deadlineAt,submittedAt,expired}`.
  - `resultAvailable`.
- **Web yolu:** `webPath` (web sınav ekranının `/panel/...` yolu).

### `MobileOdkResult`

- **Özet:** `summary{totalNet,correct,wrong,blank,activeDurationMs,delta,previousTitle}`. Puanlar sunucu skorudur; resmi olmayan puan yoktur.
- **Alan görünümü:**
  - `track{code,label,trackNet} | null`: yalnız AYT ve bilinen alanda (`aytTrackSections`).
  - `sections[].inTrack`, `questions[].inTrack`, `time.sections[].inTrack` alanlarını sunucu hesaplar.
- **Soru dökümü:** `questions[{number, sectionCode, sectionTitle, selectedOption, result, marked, outcomes, activeDurationMs, correctOption}]`.
  - **`correctOption` yalnız `answerKey.available` iken doludur.**
- **Cevap anahtarı:** `answerKey{available, hasFile}`. Yalnız düğme görünürlüğü içindir; dosya ucu kendi yetkisini ayrıca doğrular.
- **Kazanımlar:** `outcomes[{accuracy, evidenceCount, lowEvidence, group: strong|improve}]`. Eşik `classifyOutcome` (%70 + tekrar sinyali).
- **Zaman:** `time{sections, fastWrongCount, longWrongCount}`. Geçerli süre kanıtı yoksa `sections: []`.
- **Karşılaştırma:** `comparison[]`. Yalnız aynı aileden kendi yayınlanmış sonuçları.
- **Öneriler:** `recommendations[{title, detail, actionLabel, primary, target}]`.
  - `target` değerleri: `yon-plan` · `od-review` · `od-recovery{lessonId}` · `answer-key` · `none`.
  - Kaynak `buildResultNextStepRecommendations`; yalnız erişilen ürünlerle.
- **Koç önerileri:** `coachSuggestions[]`. Yalnız OK erişimi varken; bilgi amaçlıdır.
