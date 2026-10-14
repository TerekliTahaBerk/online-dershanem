# ODK Deneme Deneyimi — Production-Grade Revizyon Yol Haritası

Durum: **Faz 1 (denetim) · Faz 2 (P0 doğruluk) · Faz 3 (şablon/alt test) · Faz 4 (yönetici deneyimi) · Faz 5 (öğrenci çözücü) tamam**
Kapsam: Deneme Ligi (ODK) çevrim içi sınav motoru — yönetici oluşturma, cevap
anahtarı/kazanım, öğrenci çözücü, puanlama, revizyon, yayın ve raporlama.

> Bu belge bir denetim kaydıdır. Her bulgu "hipotez → kanıt → hedef davranış"
> biçimindedir. Kodun zaten doğru çözdüğü noktalar **Doğrulandı (değişiklik
> yok)** olarak işaretlenmiştir; onlar yeniden yazılmayacak, testle korunacaktır.

---

## 1. Mimari harita

### 1.1 İki ayrı sistem (karıştırılmamalı)

| Sistem | Modeller | Giriş noktası | Not |
| --- | --- | --- | --- |
| **ODK çevrim içi sınav motoru** (bu revizyonun konusu) | `OdkExam`, `OdkExamVersion`, `OdkExamSection`, `OdkExamQuestion`, `OdkExamAttempt`, `OdkAttemptAnswer`, `OdkAttemptScore`, `OdkAnswerKeyRevision`, `OdkImportAudit` (`prisma/schema/odk.prisma`) | `/api/odk/**`, `/api/panel/odk/management/**` (mobil), `/panel/odk/**` | Sunucu saatli attempt, kilitli sürüm, puanlama, yayın |
| **Panelin harici deneme sonuç girişi** | `MockExam`, `MockExamSection`, `MockExamSectionError` | `lib/panel/*`, `lib/kocum/*`, `lib/progress-insights/*` | Öğretmenin/öğrencinin dışarıda çözülmüş denemenin netlerini elle girdiği akış. ODK motoruna **dokunulmaz**; yalnız ortak raporlama tüketicisidir. |

Bu revizyonda `MockExam*` modellerine, product grants (`lib/odk/product-contract*`),
commerce (`checkout`, `paytr`), Yön ve mobil sözleşme şemalarına
(`lib/mobile-contracts/odk-*`) davranış değişikliği yapılmaz. Yanıtlara yalnız
**eklemeli** alan eklenir.

### 1.2 Uçtan uca akış

```
Yönetici                               Sunucu servisleri                         Veri
────────                               ─────────────────                         ────
admin-exam-create.tsx ──POST /api/odk/admin/exams──▶ exam-create-server.createOdkExam ─▶ OdkExam + Version(1) + Section + Question (şablondan)
                                                     exam-templates.resolveTemplateForCreate
admin-exam-editor.tsx ──PUT  …/questions────────────▶ exam-commands-server.updateOdkExamQuestions (tam liste değiştirme)
admin-json-import-panel ─POST/PUT …/imports/{answer-key,outcomes}─▶ previewOdkImport / commitOdkImport ─▶ OdkImportAudit
                        ─POST …/files───────────────▶ BOOKLET_PDF / ANSWER_KEY_PDF (Vercel Blob, private)
                        ─POST …/ready───────────────▶ lockOdkExam  (exam-domain.validateVersionReadiness) DRAFT→READY, Version LOCKED
                        ─POST …/schedule────────────▶ scheduleOdkExam READY→SCHEDULED
                        ─POST …/assignments─────────▶ assignOdkExam
                        ─POST …/score───────────────▶ exam-results-commands.scoreOdkExamCommand ─▶ scoring-service.scoreOdkExam
                        ─POST …/rescore─────────────▶ rescoreOdkExamCommand (step-up `odk:key:revise`)
                        ─POST …/release(/preview)───▶ releaseOdkExam ─▶ publicationStatus=PUBLISHED
Mobil yönetim           ─POST /api/panel/odk/management/exams/[id]─▶ exam-command-runner (expectedRevision + idempotency) ─▶ aynı servisler

Öğrenci
student-exam-start.tsx ─POST /api/odk/student/exams/[id]/start─▶ attempt-domain.decideAttemptStart ─▶ OdkExamAttempt
coz/page.tsx (SSR) ─▶ student-exam-server.getStudentExam + attempt-sessions-server.loadAttemptSessionState
student-exam-runner.tsx ─PUT  …/attempts/[id]/answers (revision)──▶ decideAnswerRevision ─▶ OdkAttemptAnswer
                        ─POST …/heartbeat · …/events · …/timings · …/sessions/close · …/submit
                        ─GET  /api/odk/student/exams/[id]/booklet (yalnız IN_PROGRESS attempt varken)
Sonuç ─▶ student-result-server / reporting-server / parent-report (publicationStatus=PUBLISHED filtresi)
```

### 1.3 Durum makinesi (doğrulandı)

`DRAFT → READY → SCHEDULED → LIVE → ENDED → SCORED → RELEASED → ARCHIVED`
(`exam-domain.ts::TRANSITIONS`). İçerik yalnız `DRAFT` + sürüm `DRAFT` iken
yazılabilir (`updateOdkExamQuestions`, `commitOdkImport`, `updateOdkExamSessions`).
LIVE sonrası anahtar değişikliği için ayrı akış gerekir (bkz. P0-2).

### 1.4 Yetki modeli (doğrulandı, değişmeyecek)

- Yönetici uçları: `requireApiStaffPermission("odk:exam:edit")`, rescore
  `requireApiRecentStaffStepUp("odk:key:revise")`.
- Öğrenci uçları: `requireApiProductRole("ODK","STUDENT")` + her sorguda
  `studentUserId = session.userId` (başka öğrencinin attempt'ine erişim 404).
- Sonuç/rapor: `publicationStatus = PUBLISHED` + `exam.status = RELEASED` +
  sözleşme (`contractResultAvailable`). Veli/öğretmen `reporting-server.ts:82`.

---

## 2. Bulgular

Öncelik: **P0** = veri doğruluğu / sessiz veri kaybı / güvenlik; **P1** = ürün
gereksinimi veya ciddi UX açığı; **P2** = iyileştirme.

### P0 — Veri doğruluğu ve kayıp

#### P0-1 · Negatif bölüm netleri politika okunmadan sıfıra kırpılıyor
- **Dosya/fonksiyon:** `lib/odk/scoring.ts::scoreAttempt`, `lib/odk/scoring-service.ts::scoreOdkExam`
- **Kanıt:** `b.net = Math.max(0, …)` koşulsuz. `OdkScoringPolicy.minimumNetIsZero`
  alanı şemada var (`odk.prisma`, migration 0096) ama hiçbir yerde okunmuyor.
  Ham (kırpılmamış) net saklanmıyor; toplam net kırpılmış bölüm netlerinin
  toplamı.
- **Yeniden üretme:** TYT, Türkçe 10D/30Y (ham 2.5), Sosyal 0D/20Y (ham −5).
  Toplam: kırpılmış 2.5, ham −2.5. Politika `minimumNetIsZero=false` olsa bile
  2.5 döner.
- **Hedef:** Kırpma politikadan gelir (`minimumNetIsZero`), her bölüm için hem
  `rawNet` hem raporlanan `net` saklanır, toplam ve ham toplam ayrı tutulur.
  Mevcut politikaların hepsi `true` olduğundan tarihsel sonuçlar değişmez.

#### P0-2 · Cevap anahtarı revizyon + yeniden puanlama akışı uçtan uca YOK
- **Dosya/fonksiyon:** `OdkAnswerKeyRevision` modeli; `exam-results-commands.ts::rescoreOdkExamCommand`
- **Kanıt:** `odkAnswerKeyRevision.create` kod tabanında hiç çağrılmıyor (yalnız
  `findFirst/update` ve staff listesi). LIVE sonrası anahtarı değiştirecek
  ya da soru iptal edecek bir uç yok (`isActive:false` hiçbir yerde yazılmıyor).
  Rescore aynı anahtarla yeniden hesaplar; bu nedenle "düzeltme" fiilen
  yapılamaz ya da DB'ye elle müdahale ile yapılır (audit'siz).
- **Yeniden üretme:** RELEASED denemede yanlış anahtarlı soruyu düzeltmeye çalış
  → `commitOdkImport` 409, `updateOdkExamQuestions` 409; başka uç yok.
- **Hedef:** Yetkili (`odk:key:revise` + step-up) revizyon akışı: önceki/yeni
  cevap veya iptal, sebep, actor, **etki önizlemesi** (öğrenci başı net farkı),
  onay, revizyon kaydı, `rescoreRequestedAt`, yeniden puanlama, önceki
  skorların audit anlık görüntüsü ve yalnız neti değişen öğrenciye bildirim.

#### P0-3 · Yeniden puanlama etkisi sabit `changedQuestionCount: 1`
- **Dosya/fonksiyon:** `exam-results-commands.ts:76`
- **Kanıt:** `previewRescoreImpact({ …, changedQuestionCount: 1, … })`. Gerçek
  fark hesaplanmıyor; onay mesajı her zaman "değişecek" der.
- **Hedef:** Saklı `OdkAttemptQuestionResult.correctOption` ile güncel aktif
  anahtar karşılaştırılarak değişen/iptal edilen soru sayısı ve etkilenen
  öğrenci sayısı hesaplanır.

#### P0-4 · Import preview → commit arasında sürüm/hash/eşzamanlılık kontrolü yok
- **Dosya/fonksiyon:** `exam-commands-server.ts::previewOdkImport`, `::commitOdkImport`
- **Kanıt:**
  1. Commit, önizlemedeki `versionId`'yi güncel sürümle karşılaştırmıyor.
  2. Önizlemeden sonra editörden yapılan değişiklik (ya da başka bir importun
     commit'i) fark edilmeden ezilir (lost update).
  3. `PREVIEW → COMMITTED` geçişi koşulsuz `update`; iki eşzamanlı commit
     ikisi de geçer.
  4. `schemaVersion` serbest metin; desteklenmeyen sürüm reddedilmez.
- **Yeniden üretme:** Önizle (A) → editörde 3. soruyu C yap → (A)'yı commit et →
  3. soru sessizce eski değere döner.
- **Hedef:** Önizleme, hedef durumun hash'ini (`targetStateHash`: soru kimlikleri +
  anahtar/kazanım durumu) ve sürümü saklar; commit aynı transaction içinde
  yeniden hesaplar, uyuşmazlıkta 409 `IMPORT_STALE`; durum geçişi koşullu
  (`updateMany where status=PREVIEW`); aynı import tekrar commit edilirse
  idempotent yanıt; desteklenmeyen şema sürümü preview hatası.

#### P0-5 · Kazanım import'u başka sınav ailesinin / dersin kazanımını bağlayabiliyor
- **Dosya/fonksiyon:** `exam-commands-server.ts::previewOdkImport` (katalog), `outcome-import.ts::previewOutcomeImport`
- **Kanıt:** Katalog `learningOutcome.findMany({ where: { isActive: true }, take: 5000 })`
  — aile/ders filtresi yok. `LearningOutcome.code` yalnız ünite içinde benzersiz
  (`@@unique([unitId, code])`); aynı kod farklı aile/derslerde varsa `Map` son
  kaydı rastgele seçer. Editör yolu (`updateOdkExamQuestions`) aileyi kontrol
  ediyor ama ders/alt testi kontrol etmiyor.
- **Yeniden üretme:** TYT denemesine `MAT.8.1` (LGS kataloğu) kodlu JSON import et
  → önizleme hatasız, commit başarılı.
- **Hedef:** Katalog sınavın ailesine (aktif/taslak müfredat sürümü) daraltılır;
  sorunun bölümüyle aynı koda sahip müfredat dersi varsa kazanım o dersten
  olmalıdır; belirsiz kod (aynı kod birden çok ünitede) hata; commit'te
  savunma amaçlı yeniden doğrulama.

#### P0-6 · Öğrenci çözücüsünde revision conflict sonrası sessiz cevap kaybı
- **Dosya/fonksiyon:** `components/odk/student-exam-runner.tsx::sendAnswer`
- **Kanıt:** 409 `REVISION_CONFLICT` yanıtında yerel revizyon sunucudakinden
  büyükse yerel değer ekranda kalır, **ama** `pending` silinir. Sunucuda eski
  cevap durur; teslim kontrolü (`pending` boş) geçer → öğrencinin son cevabı
  kaybolur.
- **Yeniden üretme:** Cevap A (rev1 kaydedildi) → ağ kesik: B (rev2, 3 deneme
  başarısız) → C (rev3) → ağ gelir, rev3 gider → sunucu rev2 bekler → 409 →
  ekranda C, sunucuda A, teslim C'yi kaybeder. İki sekmede de aynı.
- **Hedef:** Çakışmada sunucu kaydı temel alınıp yerel niyet yeni revizyonla
  (server.revision + 1) yeniden gönderilir (rebase); yerel niyet sunucuyla
  aynıysa kabul edilir. Pending yalnız sunucu yerel niyeti onayladığında silinir.

#### P0-7 · Çevrimdışı cevaplar sayfa yenilenince kayboluyor
- **Dosya/fonksiyon:** `student-exam-runner.tsx` (`pending` yalnız `useRef`)
- **Kanıt:** Bekleyen cevaplar bellek içinde; yenileme/sekme kapanması/çökme
  sonrası kaybolur. SSR yalnız sunucudaki cevapları gönderir.
- **Hedef:** Bekleyen cevaplar `localStorage`'da attempt bazlı saklanır, açılışta
  sunucu kaydından yeni olanlar geri yüklenip gönderilir; teslimde temizlenir.
  Depolama hatası (gizli pencere) akışı bozmaz.

#### P0-9 · Yeniden puanlama yayından hariç tutulan sonucu yayınlıyor (denetim sırasında bulundu)
- **Dosya/fonksiyon:** `scoring-service.ts::scoreOdkExam` (`publicationStatus = exam.status === "RELEASED" || … ? "PUBLISHED"`)
- **Kanıt:** Yayın sırasında `excludeReviewRequired` ile gizli bırakılan (bütünlük
  incelemesindeki) sonuç, RELEASED denemede yapılan her yeniden puanlamada
  `PUBLISHED` olur → öğrenci/veli/öğretmen görür.
- **Hedef:** Puanlama yayın durumunu değiştirmez; yeniden puanlama önceki durumu
  korur, yeni puan `HIDDEN` başlar.

#### P0-10 · Negatif nete izin veren politika DB kısıtıyla çakışıyor (denetim sırasında bulundu)
- **Kanıt:** `odk_attempt_scores_net_check CHECK (total_net >= 0)` (migration 0062).
  `minimumNetIsZero=false` politika uygulanırsa puanlama transaction'ı yarıda çöker.
- **Hedef (Faz 2):** Puanlama bu politikayı açık hata mesajıyla reddeder (sessiz kesme yok).
  **Ürün kararı gerekir:** negatif toplam net istenirse kısıtı gevşeten migration
  (rollback: kısıtı yeniden ekle; negatif satır varsa önce raporla).

#### P0-11 · AYT "Benim alanım" görünümü bölümleri boş gösteriyor (Faz 3'te bulundu)
- **Dosya/fonksiyon:** `scoring-service.ts` (sectionBreakdown satırları `code` yazmıyordu),
  `sonuc/page.tsx` ve `lib/mobile/odk-views.ts` (`inTrack(section.code)`)
- **Kanıt:** Satırlar yalnız `sectionId/title` taşıdığı için alan filtresi hiçbir bölümü
  eşlemez; alan görünümü boş tablo ve 0 alan neti gösterir (web + mobil).
- **Hedef:** Puanlama `code` yazar; eski satırlarda kod okumada sürümün bölümlerinden tamamlanır.

#### P0-8 · `blur` listener temizlenmiyor
- **Dosya:** `student-exam-runner.tsx:481` — `window.removeEventListener("blur-sm", onBlur)`
  (Tailwind sınıf adı codemod'unun yanlışlıkla değiştirdiği string).
- **Etki:** Effect her `currentIndex` değişiminde yeniden çalıştığı için her
  soru geçişinde yeni bir `blur` dinleyicisi birikir; tek pencere kaybı N adet
  `WINDOW_BLUR` olayı üretir → bütünlük sinyalleri şişer, haksız
  `REVIEW_REQUIRED` riski.
- **Hedef:** `"blur"`; regresyon testi (kaynak taraması + birim).

### P1 — Ürün gereksinimi / ciddi UX açığı

| # | Bulgu | Dosya/fonksiyon | Yeniden üretme | Hedef |
| --- | --- | --- | --- | --- |
| P1-1 | LGS Sözel oturumunda Sayısal kitapçık erişilebilir | `api/odk/student/exams/[id]/booklet/route.ts`; `OdkExamFile @@unique([versionId,type])` | Sözel açıkken PDF'i sonuna kaydır → Sayısal sorular görünür; ara sırasında da PDF iner | Oturum bazlı kitapçık (`OdkExamFile.sessionKey`, additive migration) veya oturum sayfa aralığı; uç aktif oturum dışını 403 verir, aradayken hiç vermez |
| P1-2 | Tıklanan soru ile PDF sayfası eşleşmiyor | `coz/page.tsx` `bookletPage` göndermiyor; runner iframe `src` sabit | 35. soruya tıkla → PDF 1. sayfada kalır | Soru → `bookletPage` haritası; iframe `#page=N`; yönetici editöründe sayfa eşleme |
| P1-3 | Yönetici önizlemesi gerçek çözücüyü göstermiyor | `admin-preview-panel.tsx`, `lib/odk/admin-preview.ts` | Önizleme yalnız metin listesi | Runner'ın `preview` modu (attempt yok, yazma uçları kapalı) |
| P1-4 | AYT/TYT alt testler (Edebiyat, Tarih-1, Coğrafya-1, Fizik, Kimya, Biyoloji…) raporlanmıyor | `exam-templates.ts` (bölüm = 40 soruluk blok), `sectionBreakdown` | AYT sonucu yalnız 4 blok neti | Şablonda `subtests` (soru aralığı) + puanlamada alt test kırılımı; alan (SAY/EA/SÖZ) bazlı "beklenen bölümler" — çözülmesi beklenmeyen blok "eksik" sayılmaz (`student-exam-state.ts::aytTrackSections` zaten var, puanlamaya taşınacak) |
| P1-5 | Soru başı aktif süre kazanım raporlarına taşınmıyor | `scoring.ts::aggregateOutcomeScores`, `scoring-service.ts` | `OdkAttemptOutcomeScore.activeDurationMs` her zaman `null` | Kazanım bucket'ına soru sürelerinin toplamı yazılır |
| P1-6 | Yönetici editöründe eşzamanlı düzenleme çakışması (lost update) | `updateOdkExamQuestions` tam liste değiştirir; web isteği revizyon taşımaz (mobil `expectedRevision` taşır) | İki yönetici aynı anda kaydeder → ilk kaydın tamamı silinir | Web isteğine opsiyonel `expectedRevision` (mobilin `odkExamRevision`'ı), uyuşmazlıkta 409 + farkı gösteren UI |
| P1-7 | Sınav şablonu yıl/kaynak/sürüm/geçerlilik taşımıyor | `exam-templates.ts` | Resmî format değişirse geçmiş kayıtlar yeni şablonla yorumlanır | `templateVersion`, `validFrom/validTo`, `source`, `mode: OFFICIAL|CUSTOM`; sürüm ayarlarına şablon anlık görüntüsü yazılır |
| P1-8 | Attempt sürümü yerine `exam.currentVersion` kullanılıyor | `scoring-service.ts`, `student-exam-server.ts::getStudentExam` | (Şu an tek sürüm olduğu için gizli) — revizyon yeni sürüm üretirse eski attempt yanlış soru setiyle puanlanır | Puanlama ve çözücü `attempt.versionId`'yi kullanır |
| P1-9 | Çoklu kitapçık (A/B/C/D) canonical eşleme yok | `OdkExamQuestion.bookletCode/canonicalQuestionNumber` var, kullanılmıyor | Tüm attempt'ler "A" | Kitapçık başına soru sırası tablosu; puanlama canonical numaraya çevirir |
| P1-10 | Import arayüzü yalnız JSON yapıştırma | `admin-json-import-panel.tsx` | CSV/XLSX/optik grid yok | CSV/TSV/tablo yapıştırma → aynı preview/commit; satır bazlı hata; hızlı optik grid |
| P1-11 | Kazanım import'unda soru başına eksik kazanım yalnız uyarı | `outcome-import.ts` | Kısmi JSON commit edilir; hazırlık kontrolü yakalar | Resmî modda hata, özel modda uyarı (hazırlık kontrolüyle aynı kural) |
| P1-12 | LGS ek süre / muafiyet veri modeli yok | `OdkExamVersion.extraTimePolicy` yalnız genel dakika | Öğrenci bazlı ek süre verilemez | `OdkAttemptAccommodation` (öğrenci, ek dk, muaf bölümler, gerekçe, onaylayan) |
| P1-13 | İki sekmeden aynı attempt | Runner | İki sekmede farklı cevap → P0-6 düzeltmesiyle son tıklama kazanır; ancak kullanıcı uyarılmaz | `BroadcastChannel` ile sekme uyarısı |

### P2 — İyileştirme

- P2-1 Altı adımlı yönetici sihirbazı (tür/şablon → PDF+sayfa → anahtar → kazanım → atama/oturum → önizleme+yayın), adım bazlı taslak, kaydedilmemiş değişiklik uyarısı.
- P2-2 Soru tablosu: arama, branş sekmeleri, eksik anahtar/kazanım filtreleri, toplu işlem, hataya git.
- P2-3 Sonuç raporu: ham net / tahmini puan ayrımı ("tahmini" etiketi; standartlaştırma verisi yoksa resmî puan gösterilmez), veri güvenilirliği (kazanım başına soru sayısı < 3 → "düşük güven").
- P2-4 Erişilebilirlik: optik panelde ok tuşu navigasyonu, `A–E` kısayolları, WCAG AA kontrast denetimi.
- P2-5 Browser anti-cheat sinyalleri yalnız insan incelemesine işaret eder (mevcut `integrity.ts` bu ilkeye uygun — doğrulanacak).

### Doğrulandı (değişiklik yok, testle korunacak)

- Başka öğrencinin attempt'i: tüm öğrenci uçları `studentUserId` ile filtreliyor (e2e `odkForeignAttempt`).
- Çift teslim: `submit` koşullu `updateMany(status: IN_PROGRESS)` → idempotent.
- LGS oturum sınırları API'de: `answers` uçu `sectionWritable`, `submit` `canSubmitSessionAttempt`, `sessions/close` (birim + e2e `odk-lgs-sessions`).
- Kilitli sınav içeriği: `updateOdkExamQuestions`/`commitOdkImport` yalnız DRAFT sürüm.
- Yayınlanmamış sonuç sızıntısı: öğrenci/veli/öğretmen sorguları `PUBLISHED` filtreli; cevap anahtarı PDF'i `RELEASED` + sözleşme.
- LGS 3 yanlış/1 doğru, YKS 4 yanlış/1 doğru politika kodları şablonla eşleşiyor.
- İptal edilen soru (isActive=false) puanlamadan dışlanır — **politika kararı açıkça belgelenmeli** (P0-2 kapsamında `cancelledQuestionPolicy: "EXCLUDE"`).

---

## 3. Fazlar ve teslim dilimleri

| Faz | Dilim | İçerik | Durum |
| --- | --- | --- | --- |
| 1 | Audit | Bu belge | ✅ |
| 2 | P0-1/10, P1-5 | Net politikası + ham net + kazanım süresi | ✅ `73a66d1` |
| 2 | P0-3/9 | Gerçek rescore etkisi + yayın durumunu koruma | ✅ `7e09fa0` |
| 2 | P0-2 | Anahtar revizyonu + soru iptali + etki önizleme + rescore (sunucu + API; UI Faz 6) | ✅ `d7cee18` |
| 2 | P0-4/5 | Import sürüm/hash/eşzamanlılık + kazanım aile/ders uyumu | ✅ `b9839fc` |
| 2 | P0-6/7/8 | Runner: kalıcı bekleyen cevap, conflict rebase, blur | ✅ (bu dal) |
| 3 | P1-4/7, P0-11 | Şablon sürümü/modu/geçerliliği, anlık görüntü, alt testler, alan bazlı D/Y/B | ✅ `ca85472`, `ef3ffe8` |
| 4 | P1-6/10, P2-2 | Soru içerik revizyonu + çakışma UI, tablo/CSV/dosya import, optik giriş, bölüm sekmesi/arama/toplu işlem | ✅ `3cc7dac`, `e612b79`, `0aaa011` |
| 5 | P1-1/2/3/13 | Oturum kitapçığı (migration 0116), PDF sayfa navigasyonu, gerçek çözücü önizlemesi, iki sekme | ✅ `6dcacfb`, `a8ce5b9`, `4031d81` |
| 6 | P1-5/8/9, P2-3 | Rapor, attempt sürümüne bağlı puanlama, çoklu kitapçık | sonraki |
| 7 | — | E2E (mobil + masaüstü), erişilebilirlik, performans | sonraki |

### Migration ve geri alma ilkesi

- Yalnız **eklemeli** migration (yeni nullable kolon/tablo). Kolon silme/yeniden
  adlandırma yok. Geri alma: uygulama önceki sürüme döner; yeni kolonlar
  okunmaz, veri kaybı olmaz.
- Faz 2 hiçbir migration gerektirmez: ham net `sectionBreakdown` JSON'una,
  import hash'i `previewSummary` JSON'una, revizyon değişiklikleri mevcut
  `OdkAnswerKeyRevision.previousAnswers/nextAnswers` JSON'una yazılır.
- Üretimde yeniden puanlama / migration **otomatik çalıştırılmaz**; operatör
  komutu (`/rescore`, step-up) gerekir.

### Mobil uyumluluk

- `/api/panel/odk/management/**` yanıt şekilleri değişmez; `rescore` yanıtındaki
  `impact` nesnesine yalnız alan eklenir. Değişen her fazda
  `npm run lint:mobile-parity` ve `tests/integration/odk-*.integration.ts`
  çalıştırılır.

---

## 4. Faz kayıtları

Her faz sonunda: bulgu · dokunulan dosyalar · güvenlik gerekçesi · testler ·
komutlar ve gerçek sonuçlar · kalan riskler · sonraki faz.

### Faz 2 — P0 doğruluk (2026-10-14)

**Dokunulan dosyalar**
- Puanlama: `lib/odk/scoring.ts`, `lib/odk/scoring-service.ts`, `lib/odk/exam-results-commands.ts`
- Revizyon: `lib/odk/answer-key-revision.ts` (saf), `lib/odk/answer-key-revision-server.ts`,
  `app/api/odk/admin/exams/[id]/answer-key-revisions/route.ts`, `lib/odk/admin-schemas.ts`
- Import: `lib/odk/answer-key-import.ts`, `lib/odk/outcome-import.ts`, `lib/odk/exam-commands-server.ts`
- Runner: `lib/odk/runner-answer-sync.ts` (saf), `components/odk/student-exam-runner.tsx`

**Neden güvenli**
- Migration yok; yeni veriler mevcut JSON alanlarına (sectionBreakdown.rawNet,
  previewSummary.targetStateHash, revizyon previousAnswers/nextAnswers, audit payload) yazılır.
- Mevcut politikaların hepsi `minimumNetIsZero=true` → tarihsel netler değişmez.
- Yanıt sözleşmeleri yalnız genişler (`impact` yeni alanlar, import `code`/`idempotent`).
  Mobil komut ucu aynı servisleri kullanır; K03b/K03c integration testleri geçer.
- Yeni uçlar mevcut yetkileri kullanır: önizleme `odk:key:revise`, commit
  `requireApiRecentStaffStepUp("odk:key:revise")` (rescore ile aynı).
- Revizyon/import commit'leri aynı transaction'da durum hash'ini yeniden doğrular
  ve koşullu yazar; eşzamanlı iki işlemden yalnız biri uygulanır.

**Eklenen testler**
- Unit: `lib/odk/scoring-policy.test.ts`, `lib/odk/answer-key-revision.test.ts`,
  `lib/odk/import-integrity.test.ts`, `lib/odk/runner-answer-sync.test.ts`
  (bileşenlerde eşleşmeyen `removeEventListener` regresyon taraması dahil).
- Integration (gerçek Postgres): `tests/integration/odk-exam-correctness.integration.ts`
  — ham net, negatif politika reddi, kazanım süresi, P0-9 yayın koruması, kuru
  rescore farkı, revizyon uçtan uca (onay, iptal, rescore, audit), eşzamanlı revizyon,
  taslakta revizyon reddi, bayat import, idempotent/eşzamanlı import commit,
  şema sürümü, başka aile/ders kazanımı (import + editör).
- E2E: `tests/e2e/odk-exam-flow.spec.ts` — çevrimdışı çoklu cevap + yenileme +
  yeniden bağlanma + revizyon çakışması.
- Her yeni test önce eski kodda çalıştırılıp kırmızı olduğu doğrulandı.
- Güncellenen test: K03c (`odk-exam-commands.integration.ts`) "değişen sonuç onay
  ister" adımını eski sabit `changedQuestionCount: 1`'e dayanmadan, anahtarı
  gerçekten değiştirerek doğrular; değişmeyen rescore'un onaysız geçtiği eklendi.

**Çalıştırılan komutlar ve gerçek sonuçlar** (yerel Postgres 16, CI ile aynı env)
- `npm run typecheck` → temiz · `npx eslint lib/odk components/odk/student-exam-runner.tsx` → temiz
- `npm run test:unit` → 1052/1052 geçti
- `node --conditions react-server --import tsx --test --test-concurrency=1 tests/integration/odk-*.integration.ts` → 20/20 geçti
- `npm run lint:api-validation`, `lint:mobile-parity`, `lint:hygiene` → temiz
- `next build` + `CI=true playwright test tests/e2e/odk-exam-flow.spec.ts tests/e2e/odk-lgs-sessions.spec.ts` → 5/5 geçti
- `CI=true playwright test tests/e2e/mobile-odk-*.spec.ts tests/e2e/odk-product-quality.spec.ts tests/e2e/odk-runner-visual.spec.ts` → 17/17 geçti
- Yeni E2E senaryosu eski runner koduyla ayrıca derlenip koşulmadı; aynı davranışın
  saf mantığı (`runner-answer-sync`) unit testlerle önce kırmızı → sonra yeşil doğrulandı.

**Kalan riskler**
- Revizyon için yönetici arayüzü yok (yalnız API) → Faz 6.
- Puanlama ve çözücü hâlâ `exam.currentVersion` kullanıyor (P1-8); revizyon yeni
  sürüm üretmediği için şu an doğru, yeni sürüm akışı eklenmeden önce düzeltilmeli.
- İptal politikası yalnız `EXCLUDE`; resmî MEB/ÖSYM yıl kuralı farklıysa ürün
  sahibi onayıyla yeni değer eklenmeli.
- Eşzamanlı revizyon integration testi ~20 tekrarda bir kez kilit beklemesi
  nedeniyle kırmızı oldu; P2028/P2034 artık 409'a çevriliyor, sonraki 20+ koşu yeşil.
- Runner'da iki sekme uyarısı (P1-13) yok; uzlaşma son niyeti kaydeder.

**Sonraki faz:** Faz 3 — şablon sürümü (yıl/kaynak/geçerlilik, resmî/özel mod),
TYT/AYT alt testleri ve alan bazlı beklenen bölümler; ardından P1-8 (attempt sürümü).

### Faz 3 — Şablon / bölüm / alt test modeli (2026-10-14)

**Bulgu / gereksinim**
- Şablonlar sürüm, kaynak, geçerlilik ve resmî/özel ayrımı taşımıyordu; hazırlık
  kontrolü her zaman GÜNCEL şablonu okuyordu (tarihsel yeniden yorumlama riski).
- TYT/AYT alt testleri (Fizik/Kimya/Biyoloji, Edebiyat/Tarih-1/Coğrafya-1, …) yoktu.
- AYT alan görünümü boştu (P0-11) ve alan dışı bölümlerin boşları "boş" sayılıyordu.

**Dokunulan dosyalar**
- `lib/odk/exam-templates.ts` (sürüm/kaynak/geçerlilik/mod, alt testler, AYT alanları,
  `buildTemplateSnapshot`/`readTemplateSnapshot`, `templateIntegrityIssues`)
- `lib/odk/exam-domain.ts`, `lib/odk/admin-exam-server.ts` (hazırlık anlık görüntüyü okur;
  resmî modda standart dışı sayı = hata)
- `lib/odk/exam-create-server.ts` (geçerlilik kontrolü + görüntüyü sürüme yazma)
- `lib/odk/scoring.ts`, `lib/odk/scoring-service.ts` (bölüm kodu + `scoreSubtests`)
- `lib/odk/student-result-view.ts`, `lib/odk/student-exam-server.ts`,
  `lib/odk/student-exam-state.ts`, `app/panel/odk/ogrenci/denemeler/[id]/sonuc/page.tsx`,
  `components/odk/admin-exam-create.tsx`

**Neden güvenli**
- Migration yok: görüntü `OdkExamVersion.settings.template` JSON'una, alt testler
  `sectionBreakdown` satırına eklemeli yazılır. Eski denemelerin görüntüsü yoktur;
  onlar için davranış aynen eskisidir (güncel şablon + uyarı/hata kuralları, alt test yok).
- Şablon kodları (LGS_FULL, TYT_FULL, …) ve mobil sözleşmedeki `templates` biçimi değişmedi.
- AYT alan eşlemesi önceki sabitle birebir aynı sırada şablona taşındı.
- Alt test neti bilgi amaçlı ham nettir; resmî kesme yalnız bölüm (test) düzeyinde,
  toplam net hesabı değişmedi.

**Varsayımlar (ürün sahibinin doğrulaması gerekir)**
- Soru dağılımları ÖSYM YKS (2018+) ve MEB LGS (2018+) yayımlanmış dağılımlarıdır; alt
  testlerin bölüm içinde kitapçık sırasıyla ardışık olduğu varsayılır. TYT Matematik
  ve AYT Matematik içindeki geometri ÖSYM tarafından ayrı test olarak tanımlanmadığı
  için alt teste bölünmedi (uydurulmadı).
- Şablonlar 2018–2027 için doğrulandı (`REVIEWED_THROUGH_YEAR`); 2028 denemeleri için
  şablon gözden geçirilip yeni sürüm eklenmeden oluşturma reddedilir.

**Eklenen testler**
- Unit: `lib/odk/exam-template-model.test.ts` (sürüm/mod/geçerlilik, alt test toplamları,
  TYT/AYT/LGS sayı ve süreleri, alanlar, görüntü aralıkları, resmî mod engeli, görüntü
  önceliği), `lib/odk/scoring-policy.test.ts` (bölüm kodu, alt test puanı + iptal),
  `lib/odk/student-result-view.test.ts` (P0-11 kod tamamlama, alan D/Y/B).
- Integration: `tests/integration/odk-exam-templates.integration.ts` (AYT oluşturma →
  görüntü, 160 soru, resmî mod engeli, geçerlilik dışı yıl reddi; AYT puanı → bölüm
  kodları ve Fizik/Kimya/Biyoloji kırılımı).

**Komutlar ve gerçek sonuçlar**
- `npm run typecheck`, eslint → temiz · `npm run test:unit` → 1067/1067
- `tests/integration/odk-*.integration.ts` → 22/22
- `lint:api-validation`, `lint:mobile-parity`, `lint:hygiene` → temiz
- `next build` + E2E (ODK akışı, LGS oturumları, mobil ODK ×4, runner görsel) → 14/14 geçti;
  `odk-product-quality` aynı koşuda 2 test kırmızı oldu: önceki ODK akış testi seed
  attempt'ini teslim ettiği için `/coz` yönlendirmesi (test verisi sıra bağımlılığı,
  CI'da ayrı adımlarda koşuyor). Yeniden seed ile ayrı koşu → 8/8 geçti.

**Kalan riskler**
- AYT alan görünümü için tarayıcı (E2E) testi yok; mantık unit + integration ile kapsandı.
- Mobil sonuç sözleşmesi alt testleri henüz taşımıyor (yalnız P0-11 düzeltmesinden yararlanır);
  mobil sözleşme sürümü artırılarak eklenmeli.
- Öğretmen/veli/admin sonuç tabloları alt testleri göstermiyor (veri hazır).
- LGS ek süre / muafiyet modeli (P1-12) ve oturum bazlı kitapçık (P1-1) hâlâ açık.

**Sonraki faz:** Faz 4 — yönetici oluşturma/düzenleme deneyimi (adım bazlı akış, optik
grid ve CSV/tablo yapıştırma import'u, soru tablosu filtreleri, web editöründe
`expectedRevision` ile çakışma tespiti — P1-6, P1-10, P2-1, P2-2).

### Faz 4 — Yönetici oluşturma/düzenleme deneyimi (2026-10-14)

**Bulgu / gereksinim (doğrulandı)**
- Web soru editörü tam listeyi yazıyor ve revizyon taşımıyordu; soru yazmak sürümün
  `updatedAt`'ini değiştirmediği için mobilin `odkExamRevision`'ı da soru değişikliğini
  görmüyordu → iki yöneticinin kaydı birbirini sessizce eziyordu (P1-6).
- Soru tablosu bölümü göstermiyordu (TYT'de dört ayrı "1" satırı); arama, bölüm sekmesi,
  toplu işlem yoktu; erişilebilir etiketler ("Soru 1 doğru cevap") belirsizdi.
- İçe aktarma yalnız JSON yapıştırmaydı; önizleme yalnız özet sayı veriyordu (P1-10).

**Mevcut yapı korundu:** Çalışma alanı zaten sekmeli (Genel · İçerik · Sorular · Oturumlar ·
Zamanlama · Katılımcılar · Önizleme · …) ve hazırlık rayına sahip; yeni bir sihirbaz yerine
bu sekmeler güçlendirildi. Altı adımlı akışın eşlemesi: 1 tür/şablon = oluşturma ekranı,
2 PDF = İçerik, 3 cevap anahtarı = İçerik (içe aktarma) + Sorular (optik giriş), 4 kazanım =
İçerik + Sorular, 5 atama/oturum/güvenlik = Katılımcılar + Oturumlar + Zamanlama,
6 önizleme/yayın = Önizleme + hazırlık rayı.

**Dokunulan dosyalar**
- `lib/odk/question-revision.ts` (içerik hash'i), `lib/odk/exam-commands-server.ts`
  (`expectedRevision`, satır kilidi, 409 `QUESTIONS_STALE`), `lib/odk/admin-schemas.ts`,
  `app/api/odk/admin/exams/[id]/questions/route.ts`
- `lib/odk/table-import.ts` (CSV/TSV/optik satır → sürümlü JSON), `components/odk/admin-json-import-panel.tsx`
- `lib/odk/question-workbench.ts`, `components/odk/admin-exam-editor.tsx`,
  `lib/odk/exam-workspace-server.ts`, `app/panel/odk/yonetim/sinavlar/[id]/page.tsx`

**Neden güvenli**
- `expectedRevision` opsiyonel: mobil tek soru komutu ve eski istemciler aynen çalışır.
  Karşılaştırma soru satırları `FOR UPDATE` ile kilitlendikten sonra aynı transaction'da.
- Tablo içe aktarma yeni sunucu yazma yolu açmaz; Faz 2'de korunan önizle/onayla akışını kullanır.
- Tek bölümlü denemelerde erişilebilir etiketler değişmedi (mevcut E2E seçicileri korunur).
- XLSX dosyası doğrudan okunmuyor (yeni bağımlılık eklenmedi); Excel/Sheets'ten
  kopyala-yapıştır (TSV) ve CSV dışa aktarma destekleniyor.

**Eklenen testler**
- Unit: `question-revision.test.ts`, `table-import.test.ts` (ayırıcılar, tırnak, başlık,
  Türkçe bölüm adı, optik satır, satır numaralı hatalar, kazanım ana/yan, sunucu önizlemesiyle
  uyum), `question-workbench.test.ts` (bölüm + eksik filtre, arama, ilerleme, optik tuşlar,
  toplu sayfa).
- Integration: P1-6 — bayat revizyon 409, eşzamanlı iki kayıttan biri, revizyonsuz eski
  davranış (8 tekrar yeşil).
- E2E: `tests/e2e/odk-admin-editor.spec.ts` — optik klavye + kaydet + çakışma; tablo
  yapıştırma + satır hatası + "Soruya git" + yazma; iki ekranda axe WCAG AA taraması
  (ilk koşuda yeni sekme sayaçlarının kontrast hatasını yakaladı, düzeltildi).

**Komutlar ve gerçek sonuçlar**
- typecheck, eslint → temiz · `npm run test:unit` → 1081/1081
- `tests/integration/odk-*.integration.ts` → 23/23
- `lint:api-validation`, `lint:mobile-parity`, `lint:hygiene` → temiz
- `next build` + E2E: yönetici editörü + ODK kalite + mobil ODK ×4 → 14/14;
  ODK akışı + LGS oturumları + runner görsel → 10/10 (her grup taze seed ile)

**Kalan riskler**
- Mobil `odkExamRevision` soru değişikliğini hâlâ kapsamıyor (mobil `question.update`
  güncel listeyi okuyup tek soruyu yazdığı için kayıp riski düşük; revizyona soru hash'i
  eklenmesi mobil sözleşme değişikliği gerektirir).
- Kazanım seçimi hâlâ tek açılır liste (ana kazanım); yan kazanım ve ders bazlı daraltılmış
  arama yapılmadı. Kazanım tablosu içe aktarma yan kazanımı destekliyor.
- Değişiklik geçmişi (Geçmiş sekmesi) import/revizyon/durum olaylarını gösteriyor; soru
  bazlı alan farkı (diff) görünümü yok.
- Resmî modda "eksik soru/cevap/kazanım → yayın engeli" Faz 3'ten beri hazırlık kontrolünde.

**Sonraki faz:** Faz 5 — öğrenci çözücü güvenilirliği: oturum bazlı kitapçık erişimi (P1-1),
soru → PDF sayfası navigasyonu (P1-2), gerçek çözücü önizlemesi (P1-3), iki sekme uyarısı (P1-13).

### Faz 5 — Öğrenci çözücü güvenilirliği (2026-10-14)

**Bulgu / gereksinim (doğrulandı)**
- P1-1: `OdkExamFile @@unique([versionId, type])` sürüm başına tek kitapçığa izin veriyordu;
  öğrenci kitapçık ucu oturumdan bağımsız `take: 1` ile PDF veriyordu → LGS Sözel açıkken
  Sayısal sorular, ara sırasında da tüm kitapçık indirilebiliyordu.
- P1-2: çözücü iframe adresi sabitti; `bookletPage` öğrenciye hiç gönderilmiyordu.
- P1-3: yönetici "önizlemesi" yalnız metin özetiydi; gerçek çözücü görülemiyordu.
- P1-13: aynı deneme iki sekmede açıldığında uyarı yoktu.

**Dokunulan dosyalar**
- Veri: `prisma/schema/odk.prisma`, `prisma/migrations/0116_odk_session_booklets/migration.sql`,
  `docs/data-classification-inventory.md` (yeniden üretildi)
- Kitapçık: `lib/odk/booklet-access.ts` (saf karar + hazırlık kuralı), `lib/odk/student-booklet-server.ts`,
  `app/api/odk/student/exams/[id]/booklet/route.ts`, `app/api/odk/admin/exams/[id]/files/route.ts`,
  `lib/odk/exam-domain.ts`, `lib/odk/admin-exam-server.ts`, `components/odk/admin-exam-editor.tsx`
- Çözücü: `lib/odk/runner-booklet.ts`, `lib/odk/runner-preview.ts`, `components/odk/student-exam-runner.tsx`,
  `app/panel/odk/ogrenci/denemeler/[id]/coz/page.tsx`, `lib/odk/student-exam-server.ts`
- Önizleme: `app/panel/odk/yonetim/sinavlar/[id]/onizleme/cozucu/page.tsx`, çalışma alanı önizleme sekmesi,
  `docs/mobile/parity-matrix.md` (K09)

**Migration 0116 ve geri alma**
- Eklemeli: `session_key TEXT NOT NULL DEFAULT ''` ("" = tüm deneme); tekillik
  `(version_id, type)` → `(version_id, type, session_key)`. Mevcut satırlar `''` olur,
  davranış aynı kalır. NULL yerine `''` seçildi: Postgres'te NULL'lı unique çoklu satıra
  izin verirdi.
- Geri alma adımları migration dosyasının başında (oturum kitapçıklarını raporla → sil →
  eski indeksi geri kur → kolonu düşür). Üretimde otomatik çalıştırılmadı.
- `prisma migrate diff` (DB ↔ şema) boş; temiz kurulum (`db:bootstrap:fresh` + `migrate status`
  + `db:verify:fresh` + tekrar kurulum) yerelde geçti.

**Neden güvenli**
- Oturum planı olmayan denemelerde kitapçık kararı eskisiyle aynı. Oturumlu denemede yalnız
  birleşik kitapçık varsa açık oturumda o verilir (eski içerik çalışır) ve hazırlık uyarısı çıkar;
  oturum kitapçıkları yüklenmişse eksik oturum birleşik dosyaya düşmez.
- Önizleme hiçbir öğrenci ucunu çağırmaz (E2E istek dinleyicisiyle doğrulandı), attempt
  yaratmaz; `odk:exam:edit` ister ve PDF'i zaten aynı izni isteyen yönetici dosya ucundan alır.
- İki sekme kanalı yalnız aynı tarayıcıdaki aynı attempt arasında; sunucu kuralı değişmedi,
  uzlaşma Faz 2'deki revizyon mantığıyla.
- Mobil öğrenci ayrıntı yanıtı alanları açıkça eşlediği için `bookletPage` sözleşmeye sızmaz.

**Eklenen testler**
- Unit: `booklet-access.test.ts` (Sözel/Sayısal/ara/bitiş, eski birleşik kitapçık, hazırlık kuralı,
  `validateVersionReadiness` entegrasyonu), `runner-booklet.test.ts`, `runner-preview.test.ts`.
- Integration: `tests/integration/odk-session-booklets.integration.ts` — gerçek zaman çizelgesiyle
  Sözel (10. dk), ara (90. dk), Sayısal (130. dk) anlarında doğru dosya / 403; başka öğrenciye yok;
  eksik oturum kitapçığı hazırlık hatası.
- E2E: `odk-exam-flow.spec.ts` (soru → `#page=N`, "Kitapçıkta sayfa N", iki sekme uyarısı, diğer
  sekmede kaydedilen cevabın yansıması, sekme kapanınca uyarının kalkması);
  `odk-admin-runner-preview.spec.ts` (Sözel → Oturumu bitir → Sayısal → teslim; öğrenci isteği
  ve attempt yok; axe).

**Komutlar ve gerçek sonuçlar**
- typecheck, `npx eslint .` → temiz · `npm run test:unit` → 1092/1092
- `tests/integration/odk-*.integration.ts` → 24/24
- `lint:api-validation`, `lint:mobile-parity` (107 rota), `lint:hygiene`, `data:pii-inventory:check` → temiz
- `next build` + E2E: yönetici editörü + çözücü önizlemesi + ODK kalite + mobil ODK ×4 → 15/15;
  ODK akışı + LGS oturumları + runner görsel → 11/11 (her grup taze seed)

**Kalan riskler**
- Headless Chromium'da PDF görüntüleyicisi yok: `#page=N` adresi E2E'de doğrulanıyor, ancak
  görüntüleyicinin sayfayı gerçekten açtığı otomatik testle kanıtlanamadı (manuel kontrol önerilir;
  Safari/iOS'ta iframe içi PDF parçası desteği sınırlı, "PDF ayrı sekmede aç" sayfayla açılır).
- Oturum kitapçığı kuralı yeni yüklemelerde etkili; mevcut LGS denemelerinin birleşik PDF'i
  yeniden yüklenene kadar uyarı ile çalışır.
- Mobil parite matrisinde K09, onaylı E1 istisnasına (sınav çözme web'de) bağlandı; ürün
  sahibinin onayı gerekir.
- Erişilebilirlik / ek süre (P1-12) hâlâ açık.

**Sonraki faz:** Faz 6 — sonuç, rescore ve yayın: revizyon yönetici arayüzü, puanlama ve
çözücünün attempt sürümüne bağlanması (P1-8), çoklu kitapçık eşlemesi (P1-9), ham net /
tahmini puan ayrımı ve veri güvenilirliği (P2-3), öğretmen/veli raporlarında alt testler.
