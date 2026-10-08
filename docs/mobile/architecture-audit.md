# Mobil Mimari Denetimi (M0)

| Alan | Değer |
| --- | --- |
| Durum | Analiz ve planlama — uygulama kodu değiştirilmedi |
| Denetlenen revizyon | `main` = `8438d4a` ("ui polish", 2026-10-08) |
| Mobil kodun son anlamlı değişikliği | `ba4213d` (2026-09-14) — mobil ekranlar bu commit ile eklendi; sonrasında yalnız `72fd8de` bağımlılık güncellemesi |
| `ba4213d` sonrası `main` commit sayısı | 65 |
| İlgili belgeler | [screen-gap-analysis](./screen-gap-analysis.md) · [api-contract-inventory](./api-contract-inventory.md) · [design-system-plan](./design-system-plan.md) · [role-permission-matrix](./role-permission-matrix.md) · [implementation-roadmap](./implementation-roadmap.md) · [migration-decisions](./migration-decisions.md) |

## 0. Yöntem ve sınırlar

**Yapılanlar (statik okuma):**

- `mobile/**` altındaki tüm kaynak dosyaları satır satır okundu (12 ekran/layout dosyası, 3 `lib` modülü, tema ve UI bileşenleri, `app.json`, `package.json`).
- Mobilin çağırdığı 14 uç noktanın sunucuda hâlâ var olduğu dosya bazında doğrulandı; her birinin guard'ı (`requireApi*`) ve feature flag kontrolü okundu.
- `app/api/panel/**`, `app/api/odk/**`, `app/api/auth/**` altındaki 152 route dosyası için HTTP metodu ve guard envanteri çıkarıldı (bkz. `api-contract-inventory.md`).
- `lib/auth/**` (session, bearer, api-guards, roles, products, product-panels, mfa-policy, session-policy), `lib/panel/navigation.ts`, `lib/panel/domain-vocabulary.ts`, `lib/panel-feature-flags.ts`, `lib/products/staff-permission-matrix.ts`, `lib/notification-producer.ts`, `lib/notification-delivery.ts`, `lib/security/origin.ts` okundu.
- `prisma/schema/system.prisma` bildirim modelleri; `app/globals.css` panel token katmanı (`.pn-scope`); `docs/panel-design-roadmap.md` (uygulama durumu tablosu dahil), `docs/api-contract.md`, ADR 0013 ve 0015 okundu.
- `git log` ile mobil kodun yaşı ve sonrasında gelen ürün/panel değişiklikleri karşılaştırıldı.

**Yapılmayanlar (açıkça):**

- Mobil uygulama **derlenmedi, çalıştırılmadı, test edilmedi**. `mobile/node_modules` kurulu değil; `tsc`, `expo lint` veya simülatör çalıştırılmadı.
- Mobil, kök `tsconfig.json` ve `eslint.config.mjs` tarafından **hariç tutuluyor**; CI'da mobil için bir iş yok. Dolayısıyla mobil kodun bugün derlendiğine dair bir kanıt yoktur.
- Canlı ortam feature flag değerleri, pilot kohort durumları veya veritabanı içeriği incelenmedi; flag değerlendirmeleri `panelFeatureDefaults` üzerinden yapıldı.
- Web sayfalarının tamamı satır satır okunmadı; navigasyon tek kaynağı (`lib/panel/navigation.ts`) ve sayfaların veri kaynağı importları üzerinden eşlendi.

## 1. Yönetici özeti

Mobil uygulama, 2026-09-14 tarihli **tek-panel, yalnız-öğrenci** ürün modelinin anlık görüntüsüdür. O tarihten sonra platform; ürün paneli seçicisi (OD / Yön / Deneme Ligi), ürün kapsamlı personel atamaları ve izinleri (`ProductStaffAssignment`), ayrıcalıklı personel için zorunlu MFA, marka adlarının değişmesi ve sekiz fazlık panel tasarım yenilemesi aldı. Mobil bunların hiçbirini yansıtmıyor.

En kritik beş bulgu:

1. **Çalışma alanı (workspace) modeli yok.** Mobil, her öğrenciye aynı 5 sekmeyi ve 4 alt ekranı gösteriyor. Bu ekranların çoğu sunucuda ürün kapılı (`requireApiOdRole`, `requireApiProductRole("OK")`). Yalnız Yön veya yalnız Deneme Ligi öğrencisi Dersler/Çalışmalar/Kaynaklar/Gelişim ekranlarında **404 "Bu ürün için aktif erişiminiz yok."** görür.
2. **Deneme Ligi mobilde yok; yerine yanlış ekran bağlı.** Ana sayfadaki "son deneme" kartı Deneme Ligi (`ODK`) verisini gösteriyor ama "Sonucu ve analizi aç →" bağlantısı `denemeler.tsx`'e gidiyor; o ekran OD/Yön'ün **dış deneme** uç noktasını (`/api/panel/mock-exams`) çağırıyor ve bu uç `mockExamAnalysis` flag'i kapalıyken (varsayılan **false**) 404 döner.
3. **Giriş akışı güvenlik durumlarını yok sayıyor.** Sunucu `postAuthenticationPath` ile `mustChangePassword` → `/panel/parola` ve ayrıcalıklı personel için MFA → `/giris/mfa` yönlendirmesi döndürüyor; mobil `redirect` alanını atıp token'ı saklıyor. Sonraki her istek `403` (parola değişikliği) veya `403 MFA_REQUIRED` alıyor ve kullanıcı genel bir hata görüyor.
4. **Push bildirimi altyapısı yok.** Veritabanında cihaz/token modeli, tercih alanı ve gönderim işi bulunmuyor. Bildirimler yalnız uygulama içi (`Notification`) ve e-posta (`EmailOutbox`) kanallarında. Ayrıca bildirimlerin önemli bir kısmı `produceNotification` üreticisini atlayarak (~24 dosyada doğrudan `prisma.notification.create*`) yazılıyor; push'u üreticiye bağlamak kapsamı kaçırır.
5. **Mobil için okuma modeli (read model) API'leri büyük ölçüde eksik.** Web panelinin okuma yolları React Server Component'lerde (birçoğu `page.tsx` içinde satır içi Prisma sorgusu). Öğrenci dışı her rol için (veli, öğretmen, koç) ve Yön Bugün, Deneme Ligi listesi/sonucu, Koçum, Plan için JSON `GET` uç noktası yok.

Mevcut mobil kodun **yeniden kullanılabilir** kısmı küçük ama kalitelidir: güvenli token saklama (`expo-secure-store`), ince API istemcisi fikri, kimlikli dosya indirme + paylaşım akışı (Kaynaklar), ödev kanıt gönderimi, bildirim listesi ve sign-in ekranının görsel/erişilebilirlik işi. Navigasyon kabuğu, ana sayfa, tema token'ları ve bildirim bağlantı eşlemesi **yeniden kurulmalıdır**.

## 2. Mevcut ürün mimarisi (kaynak: uygulama kodu)

### 2.1 Ürünler ve marka

| Kod | Kullanıcıya görünen ad (`productLabel`) | Panel ürünü mü? | Not |
| --- | --- | --- | --- |
| `OD` | `onlinedershanem.` | Evet | Canlı ders, çalışma (ödev), kaynak, tekrar/telafi, analiz |
| `OK` | `Yön Koçluk` | Evet | Haftalık plan, görevler, hedefler, koçluk görüşmeleri, check-in |
| `ODK` | `Deneme Ligi` | Evet | Online deneme, deneme denemesi (attempt), sonuç ve analiz; ayrı route ağacı `/panel/odk/**` |
| `KPSS` | `KPSS` | Hayır (`PANEL_PRODUCTS` dışında) | Registry ürünü; satış kilidi (`Product.isActive=false`) arkasında; uyarlanabilir plan motoru KPSS'ye özel uçlara sahip |

- İç kodlar (OD/OK/ODK) arayüze çıkmaz (`lib/auth/roles.ts` yorumu). Eski marka adları **"Online Koçum / Koçum"** ve **"Deneme Kulübü / onlinedenemekulübüm."** yalnız public marka satırlarında kalır; panelde kullanılmaz.
- Ürün vurgu renkleri `app/globals.css` `.pn-scope` katmanında: OD `#0C7C57`, Yön `#0754C9`, Deneme Ligi `#5B2599` (metin/AA), yumuşak zemin ve grafik işaret varyantlarıyla. Shell kökünde `data-product="od|yon|dl"`.

### 2.2 Roller ve ürün izinleri

Üç ayrı kavram vardır ve birbirine bağlanmaz (`lib/products/staff-permission-matrix.ts`):

1. **Platform rolü** (`UserRole`): `ADMIN`, `TEACHER`, `STUDENT`, `PARENT` — kimlik ve oturum politikası.
2. **Ürün üyeliği** (`ProductMembership`): öğrenci/velinin tüketim hakkı; `getAccessibleProducts` + pilot kapısı ile çözülür.
3. **Ürün personel ataması** (`ProductStaffAssignment`): `TEACHER` rolündeki bir kişinin OD öğretmeni (`TEACHER@OD`), Yön koçu (`COACH@OK`), Deneme Ligi personeli (`EXAM_EDITOR`, `EXAM_OPERATOR`, `RESULT_PUBLISHER`, `REPORT_VIEWER` @ODK) veya `PRODUCT_MANAGER` olması. İzin anahtarları `<ürün>:<kaynak>:<eylem>` (ör. `ok:coaching:write`, `odk:result:release`).

Kurallar:

- `ADMIN` tüm personel izinlerine kodda sahiptir (break-glass). `STUDENT`/`PARENT` hiçbir personel iznine sahip olamaz.
- `EXAM_EDITOR`, `EXAM_OPERATOR`, `RESULT_PUBLISHER`, `PRODUCT_MANAGER` **ayrıcalıklıdır**: girişte MFA zorunludur (`userRequiresLoginMfa`; ADMIN girişte MFA'dan muaf ama hassas işlemler için step-up ister).
- `odk:result:release`, `odk:key:revise`, `odk:grant:manage` için son 10 dakikada ikinci faktör (step-up) gerekir; API `428 STEP_UP_REQUIRED` döner.
- Personel atamaları `STAFF_PRODUCT_ASSIGNMENTS` ile `shadow` / `enforce` modunda çalışır (tasarım yol haritası: "Phase 1 has landed in shadow mode").

Ayrıntılı matris: [role-permission-matrix.md](./role-permission-matrix.md).

### 2.3 Çalışma alanı seçimi ve navigasyon

- Girişten sonra herkes `/panel/urun-sec`'e gelir (`postAuthenticationPath`). Kart durumları `loadProductPanelStates`: `ACTIVE`, `PILOT_CLOSED`, `PREPARING` (veli ödedi, çocuk hesabı açılmadı), `LOCKED`.
- Seçim `POST /api/panel/active-product` ile `Session.activeProduct`'a yazılır ve **yalnız menüyü daraltır**; yetki her uçta ayrıca doğrulanır. Yanıt `redirect` ile ürünün giriş yolunu döner (`resolveProductEntryPath`; ör. Yön'de öğrenci → `/panel/ogrenci/yon`, koç → `/panel/ogretmen/yon`, Deneme Ligi personeli → izinlerine göre ana sayfa).
- Menü tek kaynaktan üretilir: `panelNavSections(role, products, flags, root, scope, staffOdkPermissions)`; mobil alt çubuk için `mobilePrimaryNav(...)` (en fazla 4 öğe + "Menü"). Tasarım kararı: alt çubuk **yalnız öğrenci ve veli** için; personel alt çubuk almaz (`panel-design-roadmap.md` §6.5).
- Ayarlar menüde değil; `/panel/ayarlar` merkezinde (hesap, bildirim tercihleri, erişilebilirlik, veri kullanımı, güvenlik, oturumlar). Bildirimler global blokta.

### 2.4 Özellik durumu: uygulanmış / flag'li / planlı / eksik

| Kategori | Öğeler |
| --- | --- |
| **Uygulanmış (varsayılan açık)** | Ürün paneli seçici; OD Bugün, Dersler, Çalışmalar, Kaynaklar; Yön Bugün, Koçum, Hedeflerim; Deneme Ligi Bugün, Denemelerim, ön-başlangıç, sınav çözme, sonuç; veli sakin ana sayfa; öğretmen çalışma alanı; koç çalışma alanı; Deneme Ligi personel ana sayfası; bildirim kutusu ve tercihleri; oturum yönetimi; MFA (TOTP, kurtarma kodu, passkey); `progressInsights` (Analiz); `parentWeeklyDigest`; `accessibilityProfile`; `baselineMetrics` |
| **Flag arkasında (varsayılan kapalı)** | `mockExamAnalysis` (dış denemeler), `reviewQueue`, `recoveryPackage`, `adaptivePlan` (Plan + görev tamamlama ucu), `assignmentEvidence`, `studentCheckIn`, `interventionInbox`, `offlineMode`, `learningOutcomes`, `quickLessonClose`, `cohortQuality`, `teacherAiDrafts`, `dinoAi` |
| **Belgelenmiş plan (henüz uygulanmamış)** | ADR 0015 runtime feature snapshot ("Onay bekliyor"); `STAFF_PRODUCT_ASSIGNMENTS=enforce`; tasarım Faz 0 görsel regresyon tabanı; veli Yön için ayrı `/panel/veli/yon`; Deneme Ligi "Sonuçlarım/Gelişimim" ayrı görünümleri |
| **Gerçekten eksik (mobil için)** | Push bildirimi (model, kayıt, gönderim); mobil oturum önyükleme (bootstrap) uç noktası; rol/ürün okuma modeli JSON uçları; sınav çözme durumu için JSON okuma ucu; mobil sürüm uyumluluk kontrolü; derin bağlantı (universal/app link) yapılandırması |

> Not: `POST /api/panel/kocum/tasks/[id]/complete` `adaptivePlan` flag'i kapalıyken 404 döner, ancak Yön Bugün sayfası (`components/panel/yon/yon-task-check.tsx`) bu ucu kullanır. Web'de Yön Bugün'ün görev işaretlemesinin flag kapalıyken nasıl davrandığı bu denetimde doğrulanmadı; mobil uygulamadan önce kontrol edilmelidir (bkz. roadmap M3 ön koşulları).

### 2.5 Sunucu tarafı alan servisleri (yeniden kullanılacak)

| Alan | Modül | Mobil kullanım |
| --- | --- | --- |
| Öğrenci ana sayfa | `lib/panel/student-home-server.ts#getStudentHomeData`, `lib/student-success/unified-today-serializer.ts` | OD Bugün okuma modeli (zaten `/api/panel/student/home`) |
| Ortak takvim / bugün | `lib/student-success/server/calendar-server.ts`, `presenters.ts`, `calendar.ts` | `/api/panel/student-success/calendar` (veli/öğretmen kapsamı `resolveStudentScopeForViewer`) |
| İlerleme özeti | `lib/student-success/server/progress-server.ts` | `/api/panel/student-success/progress/[studentId]` |
| Yön Bugün | `lib/kocum/yon-today.ts#buildYonToday` (saf), `lib/panel/coaching.ts#getStudentCoaching`, `lib/panel/goals.ts#getStudentGoals` | **Yeni** okuma ucu; sorgular şu an `app/panel/ogrenci/yon/page.tsx` içinde |
| Koç çalışma alanı | `lib/kocum/coach-workspace.ts#buildCoachWorkspace` (saf) + sayfadaki `loadCoachWorkspace` | **Yeni** okuma ucu |
| Görev geçişleri | `lib/kocum` (`evaluateTaskTransition`, `validateTaskCompletion`), `lib/kocum/access-server.ts` | Mevcut tamamlama ucu |
| Deneme Ligi öğrenci | `lib/odk/student-exam-server.ts` (`listStudentExams`, `getStudentExam`, `getReleasedStudentResult`), `lib/odk/student-exam-state.ts#studentExamState` (saf), `lib/odk/result-next-step.ts` | **Yeni** okuma uçları |
| Deneme Ligi deneme (attempt) | `lib/odk/attempt-domain.ts`, `attempt-timings.ts`, `exam-sessions.ts`, `integrity.ts` | Mevcut yazma uçları; okuma ucu eksik |
| Deneme Ligi raporları | `lib/odk/reporting-server.ts`, `lib/odk/parent-report.ts` | Veli/öğretmen raporu — **yeni** okuma ucu |
| Veli | `lib/panel/parent-scope.ts#resolveParentScope`, `lib/panel/parent-calm-server.ts#loadParentCalmHome`, `lib/products/parent-visibility.ts` | **Yeni** okuma ucu |
| Öğretmen | `lib/panel/teacher-workspace-server.ts`, `teacher-home-server.ts` (10 dk cron ile anlık görüntü) | **Yeni** okuma ucu |
| Durum sözlüğü | `lib/panel/status-vocabulary.ts`, `lib/odk/presentation.ts` | Sunucu tarafında `{label, tone}` üretilip yanıtta taşınmalı |
| Navigasyon | `lib/panel/navigation.ts` (saf) | Bootstrap yanıtında sunucuda hesaplanıp taşınmalı |
| Bildirim | `lib/notification-producer.ts`, `lib/notification-delivery.ts` (sessiz saat, günlük özet) | Push dağıtıcısı bunları kullanmalı |

### 2.6 Kimlik doğrulama altyapısı

- Oturumlar opak, 256-bit, veritabanında hash'li (`Session.tokenHash`). `getSession()` önce **çerezi**, bulamazsa `Authorization: Bearer` başlığını okur (`lib/auth/session.ts#resolveToken`).
- `POST /api/auth/login` ve `POST /api/auth/invite/accept`, yalnız `X-Od-Client: mobile` başlığıyla gelen isteklerde ham token'ı gövdede döner. **Her iki uç da ayrıca httpOnly çerez set eder** (mobil istek için de).
- Rol bazlı oturum politikası (`SESSION_POLICIES`): STUDENT/PARENT 30 gün mutlak / 7 gün boşta; TEACHER 7 gün / 24 saat; ADMIN 12 saat / 30 dakika. Yenileme (refresh) token'ı yok; süre dolunca tekrar giriş gerekir.
- Hesap kilidi (5 hatalı deneme → 15 dk, `423`), davet tamamlanmadı (`403`), askıya alınmış hesap (`403`) ayrı mesajlarla döner; "hesap yok" ve "parola yanlış" aynı mesajı paylaşır (enumeration koruması).
- Mutasyon koruması `guardMutation` + `assertSameOrigin`: `Origin` ve `Referer` **ikisi de yoksa** istek kabul edilir (fail-open). Native istemciler bu başlıkları göndermediği için geçer; ancak Expo web önizlemesi (`http://localhost:8081`) `Origin` gönderir ve **reddedilir**.
- MFA uçları (`/api/auth/mfa/*`) JSON ve Bearer ile çalışır; TOTP/kurtarma kodu mobilde uygulanabilir. Passkey (WebAuthn) native için ilişkili alan (associated domains / asset links) kurulumu gerektirir.
- Admin önizleme (View-As) ve admin öğretmen modu oturuma bindirilir; okuma API'leri etkilenir. Mobil v1 bu modları desteklememelidir.

### 2.7 Bildirim altyapısı

- `Notification` (uygulama içi kutu; `href` web yolu, `category`, `preferenceKey`, `deliveryPending`, `availableAt`, `digestMode`), `NotificationPreference` (in-app, e-posta, WhatsApp bayrakları; kategori bayrakları; sessiz saat; günlük özet).
- Kanallar: uygulama içi + e-posta (`EmailOutbox`, `/api/cron/email-retry`). WhatsApp bayrağı var ama gönderici bu denetimde görülmedi. **Push kanalı yok.**
- `produceNotification` sessiz saat ve günlük özet uygular; ancak dersler, ödevler, materyaller, check-in, yardım istekleri, haftalık özet yayını, provisioning vb. ~24 yol bildirimi doğrudan yazar ve bu kuralları uygulamaz.
- Cron'lar `vercel.json`'da tanımlı (2–15 dakikalık aralıklar mevcut); yeni bir dağıtıcı için altyapı hazır.

### 2.8 API sözleşme durumu

- İki hata zarfı bir arada: eski `{ error: string, code?: string, redirect?: string }` (mobilin kullandığı uçların tamamı) ve yeni `{ success: false, error: { code, message, details? } }` (`docs/api-contract.md`, `lib/api/response.ts`). Mobil istemci yalnız eskiyi ayrıştırıyor.
- Kararlı makine kodları sınırlı: `MFA_REQUIRED`, `STEP_UP_REQUIRED`; geri kalan dallanma HTTP durumuna dayanıyor. Mobil "ürün erişimi yok" (404) ile "flag kapalı" (404) ile "kaynak yok" (404) ayrımını yapamaz.
- Idempotency: ADR 0013; koçluk görüşmeleri gibi bazı mutasyonlar `idempotencyKey` alır (5 route). Mobil yeniden deneme mantığı bunları kullanmalıdır.

## 3. Mevcut mobil uygulama

### 3.1 Teknoloji

Expo SDK 57, React Native 0.86, React 19.2, `expo-router` 57 (typed routes, `Stack.Protected`, `unstable-native-tabs`), React Compiler deneyi açık, `expo-secure-store`, `expo-file-system` + `expo-sharing`, `lucide-react-native`, `react-native-svg`. Test, durum yönetimi, veri önbellekleme veya i18n kütüphanesi yok.

### 3.2 Yapı

```text
mobile/src/app/_layout.tsx            Kök Stack; token var/yok korumalı
mobile/src/app/sign-in.tsx            E-posta + parola
mobile/src/app/(tabs)/_layout.tsx     5 sabit NativeTabs: Ana Sayfa · Dersler · Çalışmalar · Bildirimler · Profil
mobile/src/app/(tabs)/index.tsx       /api/panel/student/home
mobile/src/app/(tabs)/dersler.tsx     /api/panel/student/lessons
mobile/src/app/(tabs)/odevler.tsx     /api/panel/assignments (+ progress, submissions)
mobile/src/app/(tabs)/bildirimler.tsx /api/panel/notifications (+ read)
mobile/src/app/(tabs)/profil.tsx      /api/panel/student/profile
mobile/src/app/denemeler.tsx          /api/panel/mock-exams  (dış denemeler, flag'li)
mobile/src/app/gelisim.tsx            /api/panel/student/progress, /weekly-goal
mobile/src/app/hedefler.tsx           /api/panel/student/goals
mobile/src/app/materyaller.tsx        /api/panel/materials, /materials/[id]/file
mobile/src/lib/{api,auth-context,notification-links}.ts
mobile/src/components/{panel-ui,themed-text,themed-view}.tsx, ui/collapsible.tsx
mobile/src/constants/theme.ts         --dc-* değerlerinin elle kopyası
```

### 3.3 Kalite gözlemleri

**Güçlü yanlar**

- Token yalnız `expo-secure-store`'da; web'de kalıcı saklama bilinçli olarak yok.
- Giriş hatası sunucunun enumeration'a dayanıklı mesajını aynen gösteriyor.
- 401'de yerel oturumu temizleme; çıkışta sunucu iptali en iyi çaba.
- Kaynak dosyaları kimlikli indiriliyor (`File.downloadFileAsync` + Bearer) ve sistem paylaşım sayfasıyla açılıyor; URL'e token koyulmuyor.
- Mock veri yok; boş durumlar dürüst.
- Erişilebilirlik etiketleri (sign-in, parola göster/gizle) mevcut.

**Zayıf yanlar**

- Her ekran aynı `load` / `loading` / `error` / `refreshing` / 401 bloğunu tekrar ediyor (9 kopya). Önbellek, istek iptali, zaman aşımı, yeniden deneme, çevrimdışı algılama yok.
- `apiFetch` JSON olmayan yanıtta (`502` HTML gibi) `SyntaxError` fırlatır; yeni hata zarfını çözemez; `code` bilgisini kaybeder.
- `fetch` çerez kavanozunu kullanıyor; sunucu çerezi Bearer'dan **önce** okuduğu için iki kimlik çakışabilir (bkz. §4 R2).
- Ürün/rol/flag farkındalığı yok; 403/404'ler genel hata mesajı olarak görünüyor.
- Tema token'ları `--dc-*` (public site temeli) kopyası; panel artık `--pn-*` katmanını ve ürün vurgularını kullanıyor. Yazı tipi Manrope değil sistem fontu.
- Şablon artıkları: `ui/collapsible.tsx`, `use-color-scheme*`, `scripts/reset-project.js`, React/Expo logo görselleri, `tabIcons/*`, Expo şablon README'si.
- `app.json`: `scheme: "mobile"`, `slug: "mobile"`, iOS `bundleIdentifier` / Android `package` yok, EAS yapılandırması yok, bildirim eklentisi yok.
- Yorumlar mevcut olmayan bir "mobil inşa promptu §x" belgesine atıf yapıyor; repoda bu belge yok.

## 4. Kritik güvenlik ve API riskleri

| # | Risk | Etki | Öneri |
| --- | --- | --- | --- |
| R1 | Giriş sonrası `mustChangePassword` / MFA yönlendirmesi yok sayılıyor | Geçici parolalı kullanıcı veya ayrıcalıklı personel uygulamada kilitli kalır; her istek 403 | Bootstrap ucu oturum durumunu (`passwordChangeRequired`, `mfaRequired`) döndürmeli; mobil bu durumlara özel ekranlar sunmalı (M1) |
| R2 | Mobil istek hem çerez hem Bearer taşıyabilir; sunucu çerezi önceliklendirir | Çıkış ağ hatasıyla yarım kalırsa veya hesap değiştirilirse eski çerezin kimliği yeni Bearer'ı gölgeleyebilir (yanlış kullanıcı verisi) | Mobil `credentials: "omit"` kullanmalı; sunucu `X-Od-Client: mobile` isteklerinde login/invite yanıtında çerez set etmemeli **ve/veya** Bearer varken Bearer'ı tercih etmeli (M1, küçük sunucu değişikliği, test şart) |
| R3 | Expo web önizlemesi `Origin` gönderir; mutasyonlar 403 alır | Geliştiricinin yanlış teşhisi; web önizlemesi desteklenmiyor | Web hedefini resmi olarak kapsam dışı bırak; dokümante et |
| R4 | Mobil ekranlar ürün kapılı uçları ürün erişimi olmadan çağırıyor | Yanlış hata mesajı, gereksiz yük, kullanıcı güveni | Navigasyonu bootstrap'tan türet; yalnız erişilebilir ürünlerin ekranlarını kaydet |
| R5 | Deneme Ligi sınav çözme mobilde native yapılırsa bütünlük sinyalleri (`visibilitychange`, oturum kapatma, heartbeat) farklı semantik taşır | Bütünlük incelemesinde yanlış pozitif/negatif; sınav adaleti | Native runner'ı ayrı karar olarak ele al (BLOCKED); v1'de sınavı web'de başlat; olay sözlüğünü mobil için genişletmeden native runner yok |
| R6 | Push bildirim içeriğinde kişisel/akademik veri | KVKK; kilit ekranında görünür | Push yükünde yalnız genel başlık + gezinme hedefi; içerik uygulama içinde (M5) |
| R7 | Satın alma CTA'ları (`LOCKED` ürün kartları web ödeme sayfalarına gider) | App Store 3.1.1 / Google Play ödeme politikası ihlali, ret | Mobilde kilitli ürünler bilgi kartı olarak; satın alma bağlantısı yok (M1 kararı) |
| R8 | API sürümleme yok; mağazadaki eski uygulamalar zorla güncellenemez | Sunucu sözleşmesi değişince eski istemciler bozulur | Bootstrap yanıtında `minSupportedVersion`; mobil okuma modelleri ek alanlarla geriye uyumlu genişler |
| R9 | ADMIN oturumu 30 dk boşta kalınca düşer; hassas işlemler step-up ister | Mobilde yönetim deneyimi zayıf ve riskli | ADMIN ve Deneme Ligi personel yazma işlemleri mobil kapsam dışı (bkz. migration-decisions MD-07) |
| R10 | Admin önizleme / öğretmen modu mobil oturumda aktifse okuma API'leri başka kimlik döndürür | Yanlış veri gösterimi | Mobil bu modları desteklemez; bootstrap bu modlar aktifse uyarı/engel döndürmeli |
| R11 | Mobil kod CI ve typecheck dışında | Sessiz kırılma | M1'de mobil için ayrı CI işi (typecheck + lint + unit) |

## 5. Mimari bulgular (özet liste)

1. **Ürün = çalışma alanı.** Web artık "tek panel + ürün blokları" değil, `activeProduct` ile daraltılan üç çalışma alanıdır. Mobilin bilgi mimarisi bu modele göre yeniden kurulmalıdır.
2. **Yetki sunucuda, menü bilgilendirici.** Web'de olduğu gibi mobilde de navigasyon görünürlüğü güvenlik sınırı değildir; ancak ölü bağlantı üretmemek için bootstrap'tan beslenmelidir.
3. **Okuma tarafı RSC'de, yazma tarafı JSON API'de.** Yazma uçlarının çoğu mobilde olduğu gibi yeniden kullanılabilir. Okuma için sayfalardaki satır içi sorgular `lib/**/…-server.ts` fonksiyonlarına çıkarılmalı, ardından ince JSON uçları eklenmelidir. Bu, iş kurallarının tek yerde kalmasını sağlar.
4. **Sunum kuralları sunucuda.** Durum etiketi/tonu, sınav durumu, sonraki adım önerisi gibi kararlar saf modüllerde (`status-vocabulary`, `student-exam-state`, `yon-today`, `coach-workspace`). Mobil bunları yeniden yazmamalı; okuma modelleri hazır sunum alanları taşımalıdır.
5. **Mevcut `app/api/panel/student/*` uçları mobil için açılmış bir öncüdür** (yorumlarında "JSON karşılığı" deniyor). Aynı desen sürdürülmelidir; ayrı bir BFF servisine gerek yok.
6. **Push için tek şema değişikliği yeterli.** Cihaz kaydı + teslim günlüğü tabloları, tercih alanı ve bir cron dağıtıcısı; mevcut `Notification` tablosu kaynak kalır.
7. **Mobil bugün CI dışında ve derlendiği doğrulanmadı.** M1'in ilk işi derlenebilirliği ve CI'ı kurmaktır.
