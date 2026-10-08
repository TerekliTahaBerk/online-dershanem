# Ekran Bazlı Boşluk Analizi (M0)

Revizyon: `main` `8438d4a`. Kaynak: `mobile/src/app/**`, `app/panel/**` (106 sayfa), `lib/panel/navigation.ts`, ilgili API route'ları. Sınıflandırma: **KEEP** (küçük düzeltmeyle kalır) · **REFACTOR** (mantığı korunur, yapısı/kapsamı değişir) · **REBUILD** (yeniden yazılır; parçalar alınabilir) · **REMOVE** (kaldırılır) · **NEW** (mobilde karşılığı yok).

## 1. Mevcut mobil ekranların sınıflandırması

| Mobil dosya | Bugün ne yapıyor | Web karşılığı (güncel) | Veri kaynağı | Sınıf | Gerekçe |
| --- | --- | --- | --- | --- | --- |
| `app/_layout.tsx` | Token varsa sekmeler + 4 itilmiş ekran, yoksa giriş | `PanelShell` + `/panel/urun-sec` + rol kökleri | — | **REBUILD** | Rol, ürün çalışma alanı, parola değişikliği, MFA, sürüm kontrolü kapıları yok. Yeni kök: bootstrap → kapılar → rol/çalışma alanı navigatörü |
| `app/sign-in.tsx` | E-posta/parola, genel hata | `/giris` (`login-form.tsx`) | `POST /api/auth/login` | **REFACTOR** | Görsel ve erişilebilirlik işi iyi. Eksik: `redirect` değerlendirmesi, 423 kilit mesajı, davet bekliyor/askı durumları için yönlendirme, "Parolamı unuttum" (web `/api/auth/forgot-password`), marka (`onlinedershanem.`), `credentials: "omit"` |
| `app/(tabs)/_layout.tsx` | Sabit 5 sekme | `mobilePrimaryNav` (çalışma alanına göre ≤4 öğe + Menü) | — | **REBUILD** | Sekmeler ürün erişimine ve çalışma alanına göre türetilmeli. Bildirimler ve Profil web IA'da sekme değil (global blok + Ayarlar) |
| `app/(tabs)/index.tsx` "Ana Sayfa" | Üç ürünü tek ekranda karıştırıyor; eski etiketler "Koçum", "Deneme Kulübü", "Dershanem"; ODK sonucu → yanlış ekrana link; plan kartından OD-kapılı Gelişim'e link | OD Bugün `/panel/ogrenci`, Yön Bugün `/panel/ogrenci/yon`, Deneme Ligi Bugün `/panel/odk/ogrenci` | `GET /api/panel/student/home` | **REBUILD** | Web'de üç ayrı "Bugün" var. OD Bugün bu ucu kullanmaya devam edebilir (`productData`, `unifiedToday`, `today`); Yön ve Deneme Ligi Bugün ayrı ekranlar olmalı. `href` alanları yok sayılıyor; "Şimdi"/"sıradaki" bloğu (`whatNext`) gösterilmiyor |
| `app/(tabs)/dersler.tsx` | Yaklaşan/geçmiş ders listesi | `/panel/ogrenci/takvim` (+ `/takvim/[id]` belge sayfası) | `GET /api/panel/student/lessons?durum=` (OD) | **REFACTOR** | Uç ve liste mantığı geçerli. OD çalışma alanına taşınmalı; ders detay ekranı, durum rozetleri (`status-vocabulary`), "takvime ekle" eksik |
| `app/(tabs)/odevler.tsx` "Çalışmalar" | OD ödevleri + "Koçum plan görevleri"; durum değiştirme; kanıt gönderimi (`assignmentEvidence`) | OD `/panel/ogrenci/odevler`; plan görevleri Yön Bugün / Planım'da | `GET /api/panel/assignments`, `PATCH …/progress`, `POST …/submissions` (OD) | **REFACTOR** | OD ödev akışı korunur. "Koçum plan görevleri" bölümü kaldırılıp Yön çalışma alanına taşınmalı; terminoloji güncellenmeli; uç OD-kapılı olduğu için yalnız OD çalışma alanında görünmeli |
| `app/(tabs)/bildirimler.tsx` | Sayfalı liste, okundu işaretleme, `href` eşlemesi | `/panel/bildirimler` (+ veli `/panel/veli/bildirimler`) | `GET /api/panel/notifications`, `POST …/read` | **REFACTOR** | Uçlar rol-bağımsız ve doğru. Sekmeden global başlık simgesine taşınmalı; tür/okunmamış filtresi, "tümünü okundu say", çalışma alanı farkındalıklı yönlendirme ve push ile senkron rozet eklenmeli |
| `app/(tabs)/profil.tsx` | Ad, e-posta, hedef, sınıf, veliler, aktif ürünler, çıkış | `/panel/ogrenci/profil` + `/panel/ayarlar` merkezi | `GET /api/panel/student/profile` | **REFACTOR** | "Hesap ve ayarlar" merkezine dönüşmeli: profil, bildirim tercihleri, oturumlar, parola, erişilebilirlik, çıkış. Ürün listesi bootstrap'tan gelmeli (profil ucu pilot kapısını ve registry ürünlerini yansıtmıyor) |
| `app/denemeler.tsx` | OD/Yön **dış deneme** analizi | `/panel/ogrenci/denemeler` (flag `mockExamAnalysis`, varsayılan kapalı; ODK varken etiket "Okul ve kurum denemeleri") | `GET /api/panel/mock-exams` | **REFACTOR** (gecikmeli) | Ekran birincil "Denemeler" olarak konumlanmış ve Deneme Ligi kartından bağlanıyor — yanlış. "Dış denemelerim" olarak OD/Yön çalışma alanında, yalnız flag açıkken; M2/M3 kapsamında düşük öncelik |
| `app/gelisim.tsx` | `student/progress` + haftalık hedef düzenleme | Web `/panel/ogrenci/gelisim` artık **yalnız yönlendirme** (`progressInsights` açık → `/analiz`, değilse Bugün) | `GET /api/panel/student/progress` (repo içinde **yalnız mobil** kullanıyor), `PATCH /api/panel/student/weekly-goal` | **REBUILD** | Web karşılığı Analiz (`lib/progress-insights/server.ts#loadStudentProgressInsight`). Mobil "Gidişatım" ekranı yeni okuma ucuyla yeniden kurulmalı; haftalık hedef bileşeni (`student-weekly-goal.tsx` ile aynı uç) korunabilir |
| `app/hedefler.tsx` | Hedef listesi | `/panel/ogrenci/hedefler` (Yön "Hedeflerim", türe göre gruplu) | `GET /api/panel/student/goals` (OK) | **KEEP** | Uç doğru ürün kapısında. Yön çalışma alanına taşınır; başlık "Hedeflerim", tür gruplaması eklenir |
| `app/materyaller.tsx` | Kaynak listesi, transkript, kimlikli dosya açma | `/panel/ogrenci/materyaller` ("Kaynaklar") | `GET /api/panel/materials`, `GET …/[id]/file` (OD) | **KEEP** | En olgun ekran. Başlık "Kaynaklar", OD çalışma alanında; düşük veri modu (`offlineMode`) davranışı korunur |
| `components/panel-ui.tsx` | Kart, başlık, bar, çizgi grafik, filtre çipi | `components/panel/ui` + `primitives` | — | **REFACTOR** | Primitives katmanının çekirdeği olur; kart dili (14–16px radius, kutulu kartlar) web'in yeni "bölüm + satır" diline göre güncellenir |
| `components/themed-text.tsx`, `themed-view.tsx` | Şablon temalı bileşenler | — | — | **REFACTOR** | `Text`/`Surface` primitive'lerine dönüşür; `--pn-*` tipografi ölçeği |
| `constants/theme.ts` | `--dc-*` kopyası, koyu = açık | `.pn-scope` token katmanı | — | **REBUILD** | Ürün vurguları, semantik tonlar, tipografi ölçeği, yoğunluk eksik |
| `lib/api.ts` | `apiFetch`, `login`, `logout` | — | — | **REFACTOR** | İki hata zarfı, zaman aşımı, JSON dışı yanıt, `credentials: "omit"`, istemci başlıkları (`X-Od-Client`, sürüm), merkezi 401/403 kod işleme |
| `lib/auth-context.tsx` | Token durumu | — | — | **REFACTOR** | Bootstrap durumu (rol, ürünler, çalışma alanı, flag'ler, kapılar) ile birleşir |
| `lib/notification-links.ts` | 7 web yolu → mobil rota | — | — | **REBUILD** | Rol + çalışma alanı + parametreli rotalar (ders, deneme, sonuç) için genişletilmiş, test edilen eşleme |
| `components/ui/collapsible.tsx`, `hooks/use-color-scheme*`, `scripts/reset-project.js`, şablon görselleri (`react-logo*`, `expo-logo`, `expo-badge*`, `tutorial-web`, `tabIcons/*`), şablon `README.md` | Expo şablon artıkları | — | — | **REMOVE** | Kullanılmıyor veya şablon içeriği |
| `app.json` | `scheme: mobile`, `slug: mobile`, kimlik yok | — | — | **REFACTOR** | `scheme`, bundle id / package, EAS, `expo-notifications`, ilişkili alanlar, sürüm alanları |

## 2. Web → mobil eşlemesi (rol ve çalışma alanına göre)

Sütunlar: **Web ekranı → Mobil ekran → Backend/veri kaynağı → Eksik işlev → Gerekli aksiyon**. "Kapsam" sütunu hedef fazı gösterir.

### 2.1 Ortak (tüm roller)

| Web ekranı | Mobil ekran | Backend / veri | Eksik | Aksiyon | Faz |
| --- | --- | --- | --- | --- | --- |
| `/giris` | `sign-in` | `POST /api/auth/login` | redirect, kilit/davet/askı, parolamı unuttum | REFACTOR | M1 |
| `/giris/mfa` | yok | `POST /api/auth/mfa/code/verify`, `GET /api/auth/mfa/status` | TOTP + kurtarma kodu ekranı | NEW | M1 |
| `/panel/parola` | yok | `POST /api/auth/change-password` | Zorunlu parola değişikliği ekranı | NEW | M1 |
| Davet kabul (`/davet/...`) | yok | `POST /api/auth/invite/accept` (mobil token döndürür) | Derin bağlantıdan davet kabulü | NEW | M1 (opsiyonel M8) |
| `/panel/urun-sec` | yok | `loadProductPanelStates` (RSC), `POST /api/panel/active-product` | Çalışma alanı seçici + değiştirici | NEW (bootstrap ucu gerekir) | M1 |
| `/panel/bildirimler` | `bildirimler` sekmesi | `GET /api/panel/notifications`, `POST …/read` | Filtre, toplu okundu, global konum | REFACTOR | M1 (taşıma), M5 (push) |
| `/panel/ayarlar` (hesap) | `profil` (kısmen) | RSC + `app/panel/ayarlar/actions.ts` (**server action**) | Hesap düzenleme JSON ucu yok | NEW (gerekirse) | M1 salt okuma, düzenleme M8 |
| `/panel/ayarlar` (bildirim tercihleri) | yok | `PATCH /api/panel/notifications/preferences` (yalnız STUDENT/PARENT) | Okuma ucu yok; push alanı yok | ADAPT + NEW | M5 |
| `/panel/oturumlar` | yok | `DELETE /api/auth/sessions/[id]`, `POST …/others` | Liste okuma ucu yok | NEW (okuma) | M1 sonu / M8 |
| `/panel/erisilebilirlik` | yok | `PATCH /api/panel/accessibility/preferences` | Okuma ucu yok; RN'de karşılık (kontrast, hareket) | ADAPT | M8 |
| `/panel/veri-kullanimi` | yok | `PATCH /api/panel/network/preferences` | Düşük veri modu tercihi | ADAPT | M8 |
| `/panel/guvenlik` (step-up, MFA kayıt) | yok | `/api/auth/mfa/*` | Personel için step-up | NEW (yalnız gerekirse) | M7 |

### 2.2 Öğrenci — onlinedershanem. çalışma alanı

| Web ekranı | Mobil ekran | Backend / veri | Eksik | Aksiyon | Faz |
| --- | --- | --- | --- | --- | --- |
| Bugün `/panel/ogrenci` | `index` (karışık) | `GET /api/panel/student/home` | Şimdi/sıradaki, OD bloklarına göre ayrıştırma, `href` → rota, başlangıç kartı (`getCustomerOdStart`), Dino aksiyonları | REBUILD | M2 |
| Dersler `/takvim` | `dersler` | `GET /api/panel/student/lessons` | Görünüm sekmeleri, durum rozeti | REFACTOR | M2 |
| Ders detayı `/takvim/[id]` | yok | RSC | Okuma ucu (ders, ders notu, materyal, kayıt bağlantısı) | NEW | M2 |
| Çalışmalar `/odevler` | `odevler` | `GET/PATCH/POST /api/panel/assignments…` | Plan görevlerini ayırma; dosyalı kanıt (şu an metin/bağlantı) doğrulanmalı | REFACTOR | M2 |
| Kaynaklar `/materyaller` | `materyaller` | `GET /api/panel/materials`, `…/file` | Başlık, filtre | KEEP | M2 |
| Tekrar ve telafi `/tekrar`, `/telafi` | yok | `POST /api/panel/review-queue/[id]/{respond,defer}`, `POST /api/panel/recovery-packages/...` | Okuma ucu yok; flag'li | NEW (flag açıldığında) | M2-sonra |
| Gidişatım / Analiz `/analiz` | `gelisim` (eski veri) | `loadStudentProgressInsight` (RSC) | Okuma ucu | REBUILD | M2 |
| Dış denemelerim `/denemeler` | `denemeler` | `GET/POST /api/panel/mock-exams` | Konum, etiket, flag kapısı | REFACTOR | M2-sonra |
| Check-in `/check-in` | yok | `POST /api/panel/student-check-ins` (flag) | Okuma ucu (bu haftanın durumu) | NEW | M3 (Yön ile ortak) |
| Haftalık özet `/haftalik` | yok | `POST /api/panel/weekly-digests/[id]/feedback` | Okuma ucu | NEW | M6 ile birlikte |
| Dino `/dino` | yok | `POST /api/panel/dino` (flag `dinoAi`) | Sohbet arayüzü | NEW | M8 |
| Profil `/profil` | `profil` | `GET /api/panel/student/profile` | Bootstrap ile birleşme | REFACTOR | M1 |

### 2.3 Öğrenci — Yön Koçluk çalışma alanı

| Web ekranı | Mobil ekran | Backend / veri | Eksik | Aksiyon | Faz |
| --- | --- | --- | --- | --- | --- |
| Yön Bugün `/panel/ogrenci/yon` | yok (plan özeti OD ana sayfasında karışık) | Sayfa içi Prisma + `buildYonToday`, `getStudentCoaching`, `getStudentGoals` | Okuma ucu; görev işaretleme | NEW | M3 |
| Planım `/plan` (flag `adaptivePlan`) | yok | `POST /api/panel/adaptive-plan/{tasks/[id]/complete,[id]/request-change,preferences,generate}` | Okuma ucu | NEW | M3 |
| Hedeflerim `/hedefler` | `hedefler` | `GET /api/panel/student/goals` | Gruplama | KEEP | M3 |
| Koçum `/kocluk` | yok | `getStudentCoaching` (RSC); görüşme mutasyonları `POST /api/panel/coaching-sessions/[id]` | Okuma ucu; saat değişikliği talebi | NEW | M3 |
| Check-in `/check-in` | yok | `POST /api/panel/student-check-ins` (`coachAssignmentId` ile OK) | Okuma ucu | NEW | M3 |
| Haftalık özet `/haftalik` | yok | bkz. OD | — | NEW | M6 ile |

### 2.4 Öğrenci — Deneme Ligi çalışma alanı

| Web ekranı | Mobil ekran | Backend / veri | Eksik | Aksiyon | Faz |
| --- | --- | --- | --- | --- | --- |
| Deneme Ligi Bugün `/panel/odk/ogrenci` | `index` içinde "son deneme" kartı | `getStudentHomeData().productData.ODK` + `student-dl-home` | Sonraki deneme bloğu, son 3 sonuç, odak kazanımlar | NEW | M4 |
| Denemelerim `/odk/ogrenci/denemeler` | yok | `listStudentExams` + `studentExamState` (RSC) | Okuma ucu (sekme filtresi) | NEW | M4 |
| Ön-başlangıç `/denemeler/[id]` | yok | `getStudentExam` (RSC), `POST /api/odk/student/exams/[id]/start` | Okuma ucu; Meet onayı | NEW | M4 |
| Sınav çözme `/denemeler/[id]/coz` | yok | `PUT answers`, `POST heartbeat/timings/events/submit/sessions/close`, `GET booklet` (PDF) | Deneme durumu okuma ucu; PDF görüntüleme; bütünlük semantiği | **BLOCKED** (native) — v1'de web'e devret | M4 karar, M8 native |
| Sonuç `/denemeler/[id]/sonuc` | `denemeler` yanlış bağlı | `getReleasedStudentResult`, `buildResultNextStepRecommendations` (RSC); `GET answer-key` | Okuma ucu | NEW | M4 |

### 2.5 Veli

| Web ekranı | Mobil ekran | Backend / veri | Eksik | Aksiyon | Faz |
| --- | --- | --- | --- | --- | --- |
| Bugün `/panel/veli` | yok | `resolveParentScope`, `loadParentCalmHome` | Okuma ucu; çocuk seçimi (`?studentId=`) | NEW | M6 |
| Akademik gelişim `/veli/analiz` (veya `/takip`) | yok | progress-insights | Okuma ucu | NEW | M6 |
| Dersler `/veli/takvim` | yok | `GET /api/panel/student-success/calendar?studentId=` | Ekran | NEW (REUSE uç) | M6 |
| Ödev `/veli/odevler`, Öğretmenler `/veli/ogretmenler` | yok | RSC | Okuma ucu | NEW | M6 |
| Koçluk `/veli/kocluk` | yok | RSC (veliye görünür koç notları) | Okuma ucu | NEW | M6 |
| Deneme Ligi `/odk/veli`, `/odk/veli/raporlar` | yok | `getOdkAudienceStudentReport` | Okuma ucu | NEW | M6 |
| Haftalık özet `/veli/haftalik` | yok | `POST weekly-digests/[id]/feedback` | Okuma ucu | NEW | M6 |
| Hesap ve paket `/veli/hesap` | yok | `app/panel/veli/hesap/actions.ts` (server action) | Mağaza politikası: satın alma yok | NEW (salt okuma) | M6 |
| Bildirimler `/veli/bildirimler` | yok | ortak uç | — | REUSE | M1 |

### 2.6 Öğretmen (OD) ve koç (Yön)

| Web ekranı | Mobil ekran | Backend / veri | Eksik | Aksiyon | Faz |
| --- | --- | --- | --- | --- | --- |
| Öğretmen Bugün `/panel/ogretmen` | yok | `getTeacherWorkspace`, `getOrRefreshTeacherHomeSnapshot` | Okuma ucu | NEW | M7 |
| Dersler `/ogretmen/takvim`, ders çalışma alanı `/ogretmen/ders/[id]` | yok | `PUT /api/panel/lessons/[id]/notes` (yoklama + kapanış) | Okuma ucu; hızlı ders kapanışı mobil için en değerli öğretmen akışı | NEW | M7 |
| Çalışmalar `/ogretmen/odevler` | yok | `POST /api/panel/assignments`, `POST /api/panel/assignment-submissions/[id]/review` | İnceleme kuyruğu okuma ucu | NEW | M7 |
| Öğrenciler `/ogretmen/gruplar`, `/ogretmen/ogrenci/[id]` | yok | RSC | Okuma ucu | NEW | M7 |
| Yardım `/ogretmen/yardim` | yok | `POST /api/panel/student-help-requests/[id]/respond` | Okuma ucu | NEW | M7 |
| Koç Bugün `/panel/ogretmen/yon` | yok | `loadCoachWorkspace` + `buildCoachWorkspace` | Okuma ucu | NEW | M7 |
| Koç öğrencileri `/ogretmen/yon/ogrenciler`, görüşmeler `/ogretmen/yon/gorusmeler` | yok | `POST /api/panel/coaching-sessions[/id]`, `POST /api/panel/kocum/notes` | Okuma uçları | NEW | M7 |
| Öğrenci çalışma alanı `/ogretmen/hazirlik/[id]` | yok | server action (`hazirlik/[id]/actions.ts`) + kocum uçları | Okuma ucu; plan düzenleme masaüstünde kalmalı | NEW (salt okuma + not) | M7 |
| Deneme Ligi raporları `/odk/ogretmen/raporlar` | yok | `listOdkReportStudents`, `getOdkAudienceStudentReport` | Okuma ucu | NEW | M7 |

### 2.7 Yönetim ve Deneme Ligi personeli

| Web ekranı | Mobil ekran | Aksiyon | Gerekçe |
| --- | --- | --- | --- |
| `/panel/yonetim/**` (27 sayfa) | yok | **Kapsam dışı** (v1) | ADMIN oturumu 12 saat/30 dk boşta; hassas işlemler step-up ister; yoğun tablo iş akışları. En fazla M8'de salt okuma "Gelen kutusu" değerlendirilir |
| `/panel/odk/yonetim/**` (personel) | yok | **Kapsam dışı**; yalnız `odk:ops:live` için salt okuma canlı operasyon özeti M8'de değerlendirilir | Ayrıcalıklı roller, step-up, yanlış işlem maliyeti yüksek |

## 3. Eskimiş varsayımlar (tespit listesi)

| Tür | Mobilde | Güncel gerçek |
| --- | --- | --- |
| Terminoloji | "Koçum plan görevleri", `productLabel: 'Koçum'` | "Yön Koçluk"; plan görevleri Yön çalışma alanında |
| Terminoloji | `productLabel: 'Deneme Kulübü'` | "Deneme Ligi" |
| Terminoloji | "Dershanem" ürün etiketi, "Online Dershanem" başlığı | `onlinedershanem.` (küçük harf, noktalı) |
| Terminoloji | "Ana Sayfa", "Haftalık Plan", "Gelişim", "Materyaller", "Profil" | "Bugün", "Haftalık plan" / "Planım", "Gidişatım"/"Analiz", "Kaynaklar", "Ayarlar" (`PANEL_DOMAIN`) |
| Navigasyon | 5 sabit sekme, ürün bağımsız | Çalışma alanı başına ≤4 öğe + Menü; Bildirimler global; Ayarlar alt blok |
| Navigasyon | Ürün seçimi yok | `/panel/urun-sec` + `activeProduct` |
| API varsayımı | `/api/panel/mock-exams` = "Denemeler" | Dış deneme analizi; Deneme Ligi ayrı `/api/odk/**` |
| API varsayımı | `/api/panel/student/progress` ana gelişim kaynağı | Web artık `progress-insights` kullanıyor; uç yalnız mobil için yaşıyor |
| API varsayımı | Hata gövdesi her zaman `{ error: string }` | Yeni uçlar `{ success:false, error:{code,message} }` |
| API varsayımı | Login yanıtındaki token yeterli | `redirect` parola/MFA kapısını taşır |
| Yetki | Her öğrenci her ekranı görür | Ekranlar ürün üyeliği + pilot kapısı ile korunur |
| Tasarım token'ı | `--dc-*` kopyası, kutulu kartlar, sistem fontu | `--pn-*` katmanı, ürün vurgusu, bölüm+satır dili, Manrope |
| Bildirim | 7 statik yol eşlemesi | Bildirim `href`'leri rol/ürün ağaçlarına (`/panel/veli/...`, `/panel/odk/...`, parametreli yollar) yayıldı |

## 4. Eksik durum ekranları (tüm ekranlar için ortak)

| Durum | Bugün | Gerekli |
| --- | --- | --- |
| Yükleniyor | Tam ekran `ActivityIndicator` | İskelet satırlar (azaltılmış harekette animasyonsuz) |
| Ağ yok | Genel "Bağlantınızı kontrol edin" | Çevrimdışı şerit + son önbellek + yeniden dene |
| 401 | `signOut()` | Aynı + "Oturumunuz sona erdi" bilgisi |
| 403 `MFA_REQUIRED` / parola değişikliği | Genel hata | İlgili kapı ekranına yönlendirme |
| 403 / 404 ürün erişimi yok | Genel hata | Bootstrap'ı yenile, çalışma alanını kapat, bilgi kartı |
| 404 flag kapalı | Genel hata | Ekran hiç kaydedilmez (bootstrap flag'leri) |
| 423 hesap kilitli | Sunucu mesajı | Aynı + süre bilgisi |
| 428 `STEP_UP_REQUIRED` | — | Personel için step-up (M7) veya web'e yönlendirme |
| 429 | Genel hata | `Retry-After`'a saygı |
| 503 panel kapalı / pilot durduruldu | Genel hata | Bakım ekranı |
| Boş | Çoğu ekranda var | `PANEL_DOMAIN` diliyle tutarlı boş durumlar |
| Pilot kapalı (`PILOT_CLOSED`) / hazırlanıyor (`PREPARING`) | — | Çalışma alanı seçicide bilgi kartı |
