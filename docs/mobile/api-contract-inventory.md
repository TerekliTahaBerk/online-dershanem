# API Sözleşme Envanteri (M0)

Revizyon: `main` `8438d4a`. Bu envanter, mobilin ihtiyaç duyduğu her işlem için mevcut uç noktayı, yetki kapısını, sözleşmeyi ve durumunu listeler. Kaynak: route dosyalarındaki `requireApi*` çağrıları, zod şemaları ve `NextResponse.json` gövdeleri (statik okuma; uçlar çağrılarak doğrulanmadı).

## 0. Sınıflar ve ortak kurallar

| Sınıf | Anlam |
| --- | --- |
| **REUSE** | Mevcut uç değiştirilmeden kullanılabilir |
| **ADAPT** | Uç var; küçük, geriye uyumlu bir değişiklik gerekir (ek alan, ek rol, şema genişletme) |
| **NEW** | Uç yok; mevcut alan servislerini çağıran yeni ince route gerekir |
| **BLOCKED** | Teknik değil karar/politika engeli var; karar verilmeden yapılmamalı |

**Ortak istek kuralları (tüm mobil çağrılar):**

- `Authorization: Bearer <token>`; `credentials: "omit"` (çerez kavanozu kullanılmaz — bkz. audit R2).
- `X-Od-Client: mobile`, `X-Od-Client-Version: <semver>` (yeni; sunucu şimdilik yok sayar, bootstrap minimum sürüm kontrolü için kullanılır).
- `Origin`/`Referer` gönderilmez (`assertSameOrigin` native istekleri ancak bu başlıklar yokken kabul eder).
- Mutasyonlarda sunucunun desteklediği `idempotencyKey` / `mutationKey` / `expectedVersion` alanları **her zaman** gönderilir; yeniden deneme yalnız bu anahtarla yapılır.

**Ortak yanıt işleme:**

| Durum | Gövde | Mobil davranış |
| --- | --- | --- |
| 401 | `{ error }` | Yerel token silinir, giriş ekranı |
| 403 `code: MFA_REQUIRED` | `{ error, code, redirect }` | MFA kapısı |
| 403 parola değişikliği | `{ error: "Devam etmeden önce parolanızı…" }` (kod yok) | Bootstrap'ı yenile → parola kapısı. **ADAPT önerisi:** `code: "PASSWORD_CHANGE_REQUIRED"` eklensin |
| 403 diğer | `{ error }` | Yetki yok ekranı |
| 404 | `{ error }` | Ürün erişimi yok / flag kapalı / kaynak yok ayrımı yapılamıyor → bootstrap'ı yenile. **ADAPT önerisi:** kararlı kodlar (`PRODUCT_ACCESS_REQUIRED`, `FEATURE_DISABLED`, `NOT_FOUND`) |
| 409 | `{ error, code? }` | Çakışma; yenile ve kullanıcıya bildir |
| 423 | `{ error }` | Hesap kilidi |
| 428 `STEP_UP_REQUIRED` | `{ error, code, redirect }` | Personel step-up (M7) |
| 429 | `{ error }` (+ `Retry-After` olabilir) | Bekle |
| 503 | `{ error }` | Panel kapalı / pilot durdu |
| Yeni zarf | `{ success:false, error:{ code, message } }` | `error.message` göster, `error.code` ile dallan |

## 1. M1 — Temel ve kimlik doğrulama

| İşlem | Uç | Yetki | İstek → Yanıt (özet) | Durum | Sınıf | Not |
| --- | --- | --- | --- | --- | --- | --- |
| Giriş | `POST /api/auth/login` | Herkese açık; rate limit (IP); same-origin (native'de fail-open) | `{email,password}` → `{redirect, token}` (yalnız `X-Od-Client: mobile`) | Var | **ADAPT** | Mobil isteğinde çerez set edilmemeli (R2). 401 genel, 423 kilit, 403 davet/askı, 503 panel kapalı |
| Oturum önyükleme | `GET /api/panel/me` (öneri) | `requireApiActiveUser` **ama MFA/parola kapısından önce** çalışmalı (kapı durumunu raporlamak için) | → bkz. §1.1 | Yok | **NEW** | M1'in merkezi ön koşulu |
| Çıkış | `POST /api/auth/logout` | Oturum (yoksa da 200) | `{}` → `{redirect}` | Var | **REUSE** | Bearer ile çalışır (`getSession`) |
| Parolamı unuttum | `POST /api/auth/forgot-password` | Herkese açık, rate limit | `{email}` → `{message}` (genel) | Var | **REUSE** | Sıfırlama bağlantısı web'de açılır (M1); uygulama içi derin bağlantı M8 |
| Zorunlu parola değişikliği | `POST /api/auth/change-password` | `getSession`; same-origin (native'de fail-open) | `{currentPassword,newPassword}` | Var | **REUSE** | `revokeAllUserSessions(user.id, session.sessionId)` mevcut oturumu hariç tutar; mobil token geçerli kalır. Değişiklik sonrası bootstrap yenilenir |
| MFA durumu | `GET /api/auth/mfa/status` | `requireApiPrimaryMfaUser` (ADMIN veya ayrıcalıklı TEACHER) | → `{enrolled,totpEnabled,passkeyCount,recoveryCodeCount,mfaVerified,stepUpFresh…}` | Var | **REUSE** | |
| MFA doğrulama | `POST /api/auth/mfa/code/verify` | aynı | `{code,purpose:"AUTHENTICATE"|"STEP_UP",method:"TOTP"|"RECOVERY"}` → `{verified,redirect}` | Var | **REUSE** | Oturum kaydı güncellenir; token aynı kalır |
| MFA kaydı (TOTP) | `POST/PUT /api/auth/mfa/totp/enroll` | aynı | — | Var | **REUSE** (M7) | v1'de kayıt web'de; mobil yalnız doğrulama |
| Passkey | `POST /api/auth/mfa/passkey/{options,verify}` | aynı | WebAuthn | Var | **BLOCKED** | Native passkey için `rpID` + associated domains / Digital Asset Links kararı |
| Davet kabulü | `POST /api/auth/invite/accept` | Davet token'ı | → `{redirect, token}` (mobil) | Var | **REUSE** (M8) | Derin bağlantı gerektirir |
| Çalışma alanı seç | `POST /api/panel/active-product` | `requireApiActiveUser`; ürün erişimi + pilot | `{product:"OD"|"OK"|"ODK"}` → `{redirect}` | Var | **REUSE** | `redirect` web yoludur; mobil kendi rota eşlemesini kullanır |
| Oturum listesi | — | — | — | Yok | **NEW** | `listActiveUserSessions` mevcut; ince GET ucu |
| Oturum iptal | `DELETE /api/auth/sessions/[id]`, `POST /api/auth/sessions/others` | `requireApiActiveUser` | — | Var | **REUSE** | |
| Bildirim listesi | `GET /api/panel/notifications?type&status&page` | `requireApiActiveUser` | → `{page,totalPages,unreadTotal,notifications:[{id,type,title,body,href,read,createdAt}]}` | Var | **REUSE** | Sayfa boyutu 20 |
| Okundu işaretle | `POST /api/panel/notifications/read` | `requireApiActiveUser` | `{id?}` → `{ok,count}` (id yoksa tümü) | Var | **REUSE** | |

### 1.1 `GET /api/panel/me` önerilen sözleşmesi (NEW)

Yalnız mevcut fonksiyonları birleştirir; yeni iş kuralı içermez.

```jsonc
{
  "user": { "id": "…", "fullName": "…", "email": "…", "role": "STUDENT" },
  "gates": {
    "passwordChangeRequired": false,        // session.mustChangePassword
    "mfaRequired": false,                   // !mfaVerifiedAt && userRequiresLoginMfa
    "previewActive": false,                 // admin preview / teacher mode (mobil desteklemez)
    "minSupportedVersion": "1.0.0"          // env ile yönetilir
  },
  "products": [                             // loadProductPanelStates + productLabel
    { "code": "OD",  "label": "onlinedershanem.", "state": "ACTIVE" },
    { "code": "OK",  "label": "Yön Koçluk",       "state": "LOCKED" },
    { "code": "ODK", "label": "Deneme Ligi",      "state": "PILOT_CLOSED" }
  ],
  "activeProduct": "OD",                    // resolveNavScope(role, products, session.activeProduct)
  "flags": { "assignmentEvidence": false, "adaptivePlan": false, "…": false }, // getPanelFeatureFlags (ADR 0015 sonrası snapshot)
  "navigation": {                           // panelNavSections + mobilePrimaryNav, sunucuda
    "primary": [{ "id": "today", "label": "Bugün", "href": "/panel/ogrenci" }],
    "sections": [{ "id": "dersler", "title": "DERSLER", "items": [ … ] }]
  },
  "staff": { "permissions": [] },           // effectiveStaffPermissions (yalnız TEACHER/ADMIN)
  "parent": { "children": [{ "studentId": "…", "name": "…" }] }, // resolveParentScope (yalnız PARENT)
  "unreadNotifications": 3
}
```

Mobil `navigation.*.id` değerlerini kendi ekran kayıt defterine eşler; `href` yalnız bildirim/derin bağlantı eşlemesi ve hata ayıklama içindir. Bilinmeyen `id`'ler gösterilmez (eski istemci koruması).

## 2. M2 — OD öğrenci

| İşlem | Uç | Yetki | Sözleşme (özet) | Durum | Sınıf | Not |
| --- | --- | --- | --- | --- | --- | --- |
| OD Bugün | `GET /api/panel/student/home` | `requireApiAccountRole("STUDENT")` (ürün bağımsız) | → `{products,profile,fullName,productData,unifiedToday,today,weeklyPlan,latestExam,trend,hasODK}` | Var | **ADAPT** | `productData` içindeki `Date` alanları JSON'da ISO dizgisi olarak gelir; mobil tipleri buna göre yazılmalı. Öneri: `?scope=OD|OK|ODK` ile yalnız ilgili blok; `today`/`weeklyPlan`/`latestExam` eski alanları en az bir mobil sürüm boyunca korunmalı |
| Dersler | `GET /api/panel/student/lessons?durum=yaklasan|tamamlanan` | `requireApiOdRole("STUDENT")` | → `{profile,groupNames,filter,lessons[]}` | Var | **REUSE** | |
| Ders detayı | — | OD öğrenci + kayıt kapsamı | ders, ders notu, materyaller, kayıt bağlantısı | Yok | **NEW** | `/panel/ogrenci/takvim/[id]` sorguları lib'e çıkarılmalı |
| Takvim (ortak) | `GET /api/panel/student-success/calendar?from&to&include` | `requireApiAnyProductRole([OD,OK,ODK], …)`; veli/öğretmen için `studentId` + `resolveStudentScopeForViewer` | → olaylar + bugün | Var | **REUSE** | Veli ve öğretmen için de kullanılabilir |
| Takvime ekle | `GET /api/panel/calendar/export` | OD rolleri | iCal | Var | **REUSE** (M8) | |
| Çalışmalar | `GET /api/panel/assignments` | `requireApiOdRole("STUDENT")` | → `{profile,evidenceEnabled,assignments[],planTasks[]}` | Var | **REUSE** | `planTasks` Yön içeriği; mobil OD ekranında göstermemeli |
| Çalışma durumu | `PATCH /api/panel/assignments/[id]/progress` | OD öğrenci; rate limit | `{status:"TODO"|"IN_PROGRESS"|"DONE", expectedVersion?, mutationKey?(uuid)}` → 409 `{error,code}` çakışmada | Var | **REUSE** | Mobil bugün yalnız `{status}` gönderiyor → `expectedVersion` + `mutationKey` eklenmeli |
| Kanıt gönder | `POST /api/panel/assignments/[id]/submissions` | OD öğrenci; flag `assignmentEvidence` | `{textEvidence(20–2000), idempotencyKey}` → `{id,attemptNumber,replayed?}` | Var | **REUSE** | |
| Kaynaklar | `GET /api/panel/materials` | `requireApiOdRole("STUDENT")` | → `{profile,lowDataMode,preferenceActive,materials[]}` | Var | **REUSE** | |
| Kaynak dosyası | `GET /api/panel/materials/[id]/file` | OD 4 rol + kapsam | binary | Var | **REUSE** | |
| Gidişatım / Analiz | — | OD öğrenci (+ diğer ürünler) | `loadStudentProgressInsight` çıktısı | Yok | **NEW** | `GET /api/panel/student/progress` yalnız mobil kullanıyor ve web Analiz'den farklı veri; yeni uç sonrası **deprecate** |
| İlerleme (çapraz ürün) | `GET /api/panel/student-success/progress/[studentId]` | 3 ürün, 4 rol + kapsam | — | Var | **REUSE** (değerlendir) | Analiz ucunun yerine geçip geçemeyeceği M2'de karşılaştırılmalı |
| Haftalık hedef | `PATCH /api/panel/student/weekly-goal` | OD öğrenci | `{goal(3–180)}` → `{goal}` | Var | **REUSE** | |
| Tekrar kuyruğu | `POST /api/panel/review-queue/[id]/{respond,defer}` | OD öğrenci; flag | — | Var (yazma) | **NEW** (okuma) | Flag kapalı; M2 sonrası |
| Telafi paketi | `POST /api/panel/recovery-packages/[id]/{checkpoint,items/[itemId]/complete}` | OD öğrenci; flag | — | Var (yazma) | **NEW** (okuma) | Flag kapalı |
| Dış denemeler | `GET/POST /api/panel/mock-exams`, `PATCH …/[id]` | OD veya OK; flag `mockExamAnalysis` | `?deneme=` → `{profile,exams,trend,current}` | Var | **REUSE** | Düşük öncelik |
| Profil | `GET /api/panel/student/profile` | `requireApiAccountRole("STUDENT")` | → `{fullName,email,targetGoal,classLevel,parents,activeProducts}` | Var | **ADAPT** | `activeProducts` pilot kapısını ve registry ürünlerini yansıtmıyor; ürün listesi bootstrap'tan alınmalı |

## 3. M3 — Yön Koçluk (öğrenci)

| İşlem | Uç | Yetki | Sözleşme | Durum | Sınıf | Not |
| --- | --- | --- | --- | --- | --- | --- |
| Yön Bugün | `GET /api/panel/student/yon` (öneri) | `requireApiProductRole("OK","STUDENT")` | `buildYonToday` çıktısı + sonraki görüşme + son öğrenciye görünür koç notu + hedef özeti + check-in durumu | Yok | **NEW** | Sorgular `app/panel/ogrenci/yon/page.tsx` içinde; önce `lib/kocum/yon-today-server.ts`'e çıkarılmalı. `privateNote` ve INTERNAL notlar asla seçilmemeli |
| Görev tamamla | `POST /api/panel/kocum/tasks/[id]/complete` | `requireApiProductRole("OK","STUDENT")`; **flag `adaptivePlan`** | `{status:"IN_PROGRESS"|"DONE"|"PARTIAL"|"COULD_NOT", actual*, studentNote?, difficultyFelt?, energyFelt?}` | Var | **REUSE** (doğrula) | Flag kapalıyken 404; web Yön Bugün davranışı doğrulanmalı (audit §2.4 notu) |
| Uyarlanabilir plan görevi | `POST /api/panel/adaptive-plan/tasks/[id]/complete` | OK öğrenci | — | Var | **REUSE** | |
| Plan değişiklik iste | `POST /api/panel/adaptive-plan/[id]/request-change` | OK öğrenci; flag | `{category:"TOO_MUCH"|"WRONG_DAYS"|"PRIORITY"|"OTHER", option?, …}` | Var | **REUSE** | |
| Plan tercihleri | `PATCH /api/panel/adaptive-plan/preferences` | OK öğrenci | — | Var | **REUSE** | |
| Planım (okuma) | — | OK (veya KPSS) öğrenci; flag | plan + görevler + açıklama | Yok | **NEW** | `app/panel/ogrenci/plan/page.tsx` sorguları |
| Hedeflerim | `GET /api/panel/student/goals` | `requireApiProductRole("OK","STUDENT")` | — | Var | **REUSE** | |
| Koçum (okuma) | — | OK öğrenci | `getStudentCoaching` + görüşmeler + paylaşılan notlar | Yok | **NEW** | |
| Görüşme işlemleri | `POST /api/panel/coaching-sessions/[id]` | `requireCoachingMutation` | `idempotencyKey` zorunlu | Var | **REUSE** | Öğrenci tarafı saat değişikliği talebi kapsamı doğrulanmalı |
| Check-in gönder | `POST /api/panel/student-check-ins` | OK (coachAssignmentId) veya OD (groupId); flag `studentCheckIn` | `{energy,confidence,barrier,shareWithTeacher,helpRequested, groupId|coachAssignmentId}` | Var | **REUSE** | |
| Check-in durumu (okuma) | — | aynı | bu haftanın gönderimi, limit | Yok | **NEW** | Yön Bugün ucuna gömülebilir |
| Yardım geri bildirimi | `POST /api/panel/student-help-requests/[id]/feedback` | STUDENT + ürün | — | Var | **REUSE** | |

## 4. M4 — Deneme Ligi (öğrenci)

| İşlem | Uç | Yetki | Sözleşme | Durum | Sınıf | Not |
| --- | --- | --- | --- | --- | --- | --- |
| Deneme Ligi Bugün | `GET /api/odk/student/home` (öneri) | `requireApiProductRole("ODK","STUDENT")` | sonraki deneme + `studentExamState` + son 3 sonuç (`releasedResultsWithDelta`) + odak kazanımlar | Yok | **NEW** | |
| Denemelerim | `GET /api/odk/student/exams?gorunum=tumu|yaklasan|acik|tamamlanan` (öneri) | aynı | `listStudentExams` + `studentExamState` → `{id,title,family,startsAt,state:{key,label,tone,tab,target}}` | Yok | **NEW** | Durum kararları sunucuda |
| Ön-başlangıç | `GET /api/odk/student/exams/[id]` (öneri) | aynı + grant | `getStudentExam` + kurallar + Meet zorunluluğu | Yok | **NEW** | |
| Başlat | `POST /api/odk/student/exams/[id]/start` | aynı + aktif grant + rate limit | `{meetAcknowledged}` → attempt | Var | **BLOCKED** (native runner kararına bağlı) | v1: başlatma web'de |
| Kitapçık | `GET /api/odk/student/exams/[id]/booklet` | aynı | PDF | Var | **BLOCKED** | Native PDF görüntüleme + ekran görüntüsü/paylaşım politikası |
| Cevap / heartbeat / süre / olay / oturum kapat / teslim | `PUT …/attempts/[id]/answers`, `POST …/{heartbeat,timings,events,sessions/close,submit}` | aynı | — | Var | **BLOCKED** | Bütünlük olay sözlüğü (`visibilitychange` vb.) mobil uygulama yaşam döngüsü için tanımlanmadı |
| Deneme durumu (okuma) | — | aynı | kalan süre, oturum planı, kayıtlı cevaplar | Yok | **NEW** + **BLOCKED** | Native runner için zorunlu |
| Sonuç | `GET /api/odk/student/exams/[id]/result` (öneri) | aynı; yalnız yayınlanmış | `getReleasedStudentResult` + `buildResultNextStepRecommendations` + AYT alan bölümleri | Yok | **NEW** | |
| Cevap anahtarı | `GET /api/odk/student/exams/[id]/answer-key` | aynı | — | Var | **REUSE** | Yayın kuralına bağlı |
| Paket satın alma | `POST /api/odk/checkout/start` | — | PayTR | Var | **BLOCKED** | Mağaza ödeme politikası (MD-09) |

## 5. M5 — Push bildirimleri ve senkronizasyon

| İşlem | Uç | Yetki | Sözleşme | Durum | Sınıf | Not |
| --- | --- | --- | --- | --- | --- | --- |
| Cihaz kaydı | `POST /api/panel/push-devices` (öneri) | `requireApiActiveUser` | `{expoPushToken, platform:"ios"|"android", appVersion, deviceName?}` → `{id}`; oturuma bağlı (`sessionId`) | Yok | **NEW** + şema | Upsert by token; aynı token başka kullanıcıya geçerse eski kayıt iptal |
| Cihaz kaydı sil | `DELETE /api/panel/push-devices/[id]` | sahibi | — | Yok | **NEW** | Çıkışta çağrılır; ayrıca `revokeSession` cihazı pasifler |
| Tercihleri oku | `GET /api/panel/notifications/preferences` (öneri) | STUDENT/PARENT (+ personel için genişletme kararı) | `NotificationPreference` | Yok | **NEW** | |
| Tercihleri yaz | `PATCH /api/panel/notifications/preferences` | `requireApiAccountRole("PARENT","STUDENT")` | `.strict()` şema; tüm alanlar zorunlu | Var | **ADAPT** | `pushEnabled` eklenmeli; personel rolleri için açılması ayrı karar |
| Okunmamış sayısı | bootstrap `unreadNotifications` veya `GET /api/panel/notifications?status=unread` | — | — | Var | **REUSE** | Rozet senkronu |
| Push gönderimi | `/api/cron/push-dispatch` (öneri) | `CRON_SECRET` (mevcut cron deseni) | Expo Push API | Yok | **NEW** | Ayrıntı: migration-decisions MD-10 |

## 6. M6 — Veli

| İşlem | Uç | Yetki | Durum | Sınıf | Not |
| --- | --- | --- | --- | --- | --- |
| Veli Bugün | `GET /api/panel/parent/home?studentId=` (öneri) | `requireApiAccountRole("PARENT")` + `resolveParentScope` | Yok | **NEW** | `loadParentCalmHome`; çocuk kimliği istekten doğrudan kullanılmaz |
| Takvim | `GET /api/panel/student-success/calendar?studentId=` | 3 ürün, PARENT + kapsam | Var | **REUSE** | |
| İlerleme | `GET /api/panel/student-success/progress/[studentId]` | aynı | Var | **REUSE** | |
| Akademik gelişim (Analiz) | — | PARENT + kapsam | Yok | **NEW** | progress-insights veli varyantı |
| Ödevler, Öğretmenler | — | PARENT + OD + `parent-visibility` | Yok | **NEW** | |
| Koçluk (veliye görünür) | — | PARENT + OK | Yok | **NEW** | Yalnız `parent-visible` notlar |
| Deneme Ligi raporu | — | PARENT + ODK | Yok | **NEW** | `getOdkAudienceStudentReport` |
| Haftalık özet (okuma) | — | PARENT/STUDENT + OD | Yok | **NEW** | |
| Haftalık özet geri bildirim | `POST /api/panel/weekly-digests/[id]/feedback` | `requireApiOdRole("STUDENT","PARENT")`; flag | Var | **REUSE** | `{helpful, anxietyPulse}` |
| Hesap ve paket | server action `app/panel/veli/hesap/actions.ts` | — | Yok (JSON) | **NEW** (salt okuma) / **BLOCKED** (ödeme) | |
| Dino | `POST /api/panel/dino` | STUDENT/PARENT/TEACHER; flag | Var | **REUSE** (M8) | |

## 7. M7 — Öğretmen ve koç

| İşlem | Uç | Yetki | Durum | Sınıf | Not |
| --- | --- | --- | --- | --- | --- |
| Öğretmen Bugün | `GET /api/panel/teacher/home` (öneri) | `requireApiOdRole("TEACHER")` (+ `od:lesson:teach` enforce'ta) | Yok | **NEW** | `getTeacherWorkspace` / snapshot |
| Ders listesi ve çalışma alanı | — | OD öğretmen + ders kapsamı | Yok | **NEW** | |
| Ders kapanışı (yoklama, not, kazanım) | `PUT /api/panel/lessons/[id]/notes` | `requireApiOdRole("TEACHER")` | Var | **REUSE** | Sürümlü, idempotent kapanış; çevrimdışı kuyruk (`LESSON_CLOSE`) web'de var |
| Ödev oluştur | `POST /api/panel/assignments` | OD ADMIN/TEACHER | Var | **REUSE** | Mobilde düşük öncelik |
| Teslim incele | `POST /api/panel/assignment-submissions/[id]/review` | OD TEACHER | Var | **REUSE** | Okuma ucu NEW |
| Yardım isteğine yanıt | `POST /api/panel/student-help-requests/[id]/respond` | OD TEACHER | Var | **REUSE** | Okuma ucu NEW |
| Koç Bugün | `GET /api/panel/coach/home` (öneri) | `requireApiStaffPermission("ok:coaching:write")` veya mevcut `requireTeacherStaffPermission` eşdeğeri | Yok | **NEW** | `buildCoachWorkspace` |
| Koç öğrenci / görüşme listeleri | — | aynı | Yok | **NEW** | |
| Görüşme oluştur/güncelle | `POST /api/panel/coaching-sessions[/id]` | `requireCoachingMutation` | Var | **REUSE** | |
| Koç notu | `POST /api/panel/kocum/notes` | `requireApiProductRole("OK","ADMIN","TEACHER")` | Var | **ADAPT** | Personel izni (`ok:coaching:write`) enforce modunda kontrol ediliyor mu doğrulanmalı |
| Görev ertele / ekle | `POST /api/panel/kocum/tasks[/id/reschedule]` | aynı | Var | **REUSE** | |
| Öneri incele | `POST /api/panel/kocum/suggestions/[id]/review` | aynı | Var | **REUSE** | |
| Plan onayla | `POST /api/panel/adaptive-plan/[id]/approve` | TEACHER + plan ürünü | Var | **REUSE** | |
| Deneme Ligi raporları | — | `odk:report:read_related` | Yok | **NEW** | `listOdkReportStudents` |
| Global arama | `GET /api/panel/admin-search` | ADMIN/TEACHER | Var | **REUSE** (M8) | |

## 8. Kapsam dışı (v1) ve gerekçe

- `app/api/odk/admin/**` (17 uç) — ayrıcalıklı personel, step-up, MFA; masaüstü iş akışları.
- `app/api/panel/users/**`, `groups/**`, `relationships/**`, `orders/**`, `signups/**`, `setup`, `pilot-cohorts/**`, `curriculum/**`, `analytics/export`, `reports/export`, `email-outbox/**`, `mfa-resets/**`, `admin-preview/**`, `admin-teacher-mode` — yönetim.
- `app/api/odk/checkout/start`, OD sipariş akışları — mağaza ödeme politikası.

## 9. Mobil için eklenecek NEW uçların özeti

| Öncelik | Uç (öneri) | Kaynak fonksiyon | Ön iş |
| --- | --- | --- | --- |
| P0 (M1) | `GET /api/panel/me` | `getSession`, `loadProductPanelStates`, `resolveNavScope`, `panelNavSections`, `mobilePrimaryNav`, `getPanelFeatureFlags`, `effectiveStaffPermissions`, `resolveParentScope` | Kapı durumları için guard varyantı (`requireApiAuthorizedRole(..., requireMfa=false)` + parola kapısını atlayan okuma) |
| P0 (M1) | `GET /api/auth/sessions` | `listActiveUserSessions` | — |
| P1 (M2) | `GET /api/panel/student/lessons/[id]` | ders detay sorguları | lib'e çıkarma |
| P1 (M2) | `GET /api/panel/student/insights` | `loadStudentProgressInsight` | — |
| P1 (M3) | `GET /api/panel/student/yon`, `…/plan`, `…/coaching` | `buildYonToday`, `getStudentCoaching`, `getStudentGoals` | page.tsx sorgularını lib'e çıkarma |
| P1 (M4) | `GET /api/odk/student/{home,exams,exams/[id],exams/[id]/result}` | `listStudentExams`, `getStudentExam`, `getReleasedStudentResult`, `studentExamState`, `result-next-step` | — |
| P1 (M5) | `POST/DELETE /api/panel/push-devices`, `GET /api/panel/notifications/preferences`, cron `push-dispatch` | `notification-delivery` | Prisma migration |
| P2 (M6) | `GET /api/panel/parent/{home,insights,assignments,teachers,coaching,digests}`, `GET /api/odk/parent/report` | `loadParentCalmHome`, `resolveParentScope`, `getOdkAudienceStudentReport` | — |
| P2 (M7) | `GET /api/panel/teacher/{home,lessons,lessons/[id],submissions,help-requests}`, `GET /api/panel/coach/{home,students,sessions}` | `getTeacherWorkspace`, `buildCoachWorkspace` | Sayfa sorgularını lib'e çıkarma |
| P3 (M4/M8) | `GET /api/odk/student/attempts/[id]` | attempt durum sorgusu | Native runner kararı |

**Kural:** Her NEW uç, ilgili web sayfasının kullandığı **aynı** sunucu fonksiyonunu çağırır; uç yazılmadan önce sayfa da o fonksiyona taşınır (davranış değişikliği olmadan). Böylece web ve mobil aynı iş kuralını paylaşır ve uç için yazılan entegrasyon testi sayfayı da korur.
