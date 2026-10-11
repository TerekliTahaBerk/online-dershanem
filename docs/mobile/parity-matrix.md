# Web ↔ Mobil İşlev Eşliği Matrisi (Faz 0, v1)

Tarih: 11 Ekim 2026 · Dayanak: `main` @ `11316c7` · Üst belge: [full-parity-roadmap](./full-parity-roadmap.md)

Bu belge, [full-parity-roadmap](./full-parity-roadmap.md) Faz 1–6'nın **kabul belgesidir**. Bir satır yalnız okuma **ve** yazma alt işlemleri mobilde kanıtlandığında `Tam` olur. Her PR değiştirdiği satırları günceller.

## Yöntem

- **Kapsam:** `app/panel/**/page.tsx` — 106 rota. Her satır bir web sayfasıdır; "Alt işlemler" sütunu sayfanın yaptığı okuma (O) ve yazma (Y) işlemlerini listeler.
- **Web işlemleri:** sayfa ve içe aktardığı `components/**` + `app/**` dosyaları (4 seviye) taranarak bulunan `/api/**` çağrıları, `actions.ts` Server Action içe aktarmaları ve RSC'nin doğrudan çağırdığı `lib/**-server.ts` projeksiyonları. Kabuk ortak uçları (`logout`, `active-product`, `admin-preview*`, `admin-search`, `admin-teacher-mode`) satırlara yazılmadı; bunlar "Ortak kabuk" satırındadır.
- **Mobil karşılık:** `mobile/src/navigation/native-screens.ts` eşlemesi, `mobile/src/app/**` rotaları ve `mobile/src/lib/api/*.ts` istemci fonksiyonları.
- **Doğrulama düzeyi:** statik kod analizi. Üretim verisiyle çalıştığı **doğrulanmadı**; bu Faz 6'nın işidir.

### Durum kodları

| Kod | Anlam |
| --- | --- |
| **Tam** | Sayfanın tüm O ve Y işlemleri mobilde native |
| **Kısmi** | Ekran var; bazı O/Y alt işlemleri eksik ("Eksik alt işlemler" sütunu) |
| **Eksik** | Native ekran yok (placeholder veya web devam yolu) |
| **İstisna** | Bilinçli olarak mobil dışında (yalnız deneme/sınav çözme) |
| **Yönl.** | Sayfa yalnız `redirect()`; ayrı işlev yok, eşlik hedefi sayfasına bağlı |

### Sunucu hazırlığı kodları ("API" sütunu)

| Kod | Anlam |
| --- | --- |
| **Hazır** | Gereken O ve Y JSON uçları var; yalnız mobil sözleşme + ekran gerekir |
| **Y var, O yok** | Yazma uçları var; okuma RSC içinde doğrudan Prisma / `lib/*-server.ts` ile — mobil için GET projeksiyonu gerekir |
| **O yok** | Salt-okuma sayfa; veri yalnız RSC'de — GET ucu gerekir |
| **SA** | Yazma yalnız Server Action ile — `lib/` servisine çıkarma + route gerekir |
| **Yetki** | Uç var ama mobil rol/ürün kapsamı yetersiz (sunucu yetki düzeltmesi) |

---

## Özet

| Alan | Rota | Tam | Kısmi | Eksik | İstisna | Yönl. |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1. Yönetim (`/panel/yonetim`) | 28 | 12 | 0 | 15 | 0 | 1 |
| 2. Deneme Ligi yönetimi (`/panel/odk/yonetim`) | 8 | 0 | 0 | 8 | 0 | 0 |
| 3. Öğretmen + Yön koçu (`/panel/ogretmen`) | 20 | 7 | 3 | 10 | 0 | 0 |
| 4. Deneme Ligi öğretmen (`/panel/odk/ogretmen`) | 2 | 2 | 0 | 0 | 0 | 0 |
| 5. Öğrenci (`/panel/ogrenci`) | 18 | 11 | 4 | 2 | 0 | 1 |
| 6. Deneme Ligi öğrenci (`/panel/odk/ogrenci`) | 5 | 3 | 1 | 0 | 1 | 0 |
| 7. Veli (`/panel/veli`) | 12 | 5 | 4 | 1 | 0 | 2 |
| 8. Deneme Ligi veli (`/panel/odk/veli`) | 2 | 2 | 0 | 0 | 0 | 0 |
| 9. Ortak / hesap / yönlendirme | 11 | 4 | 3 | 2 | 0 | 2 |
| **Toplam** | **106** | **46** | **15** | **38** | **1** | **6** |

Hedef (Faz 6 çıkışı): Eksik = 0, Kısmi = 0; İstisna yalnız onaylı satırlar.

### Ana bulgular

1. **Yönetim tarafında yazma uçlarının çoğu zaten var, okuma uçları yok.** `users/*`, `groups/*`, `lessons/*`, `materials/*`, `interventions/*`, `relationships/*`, `signups/*`, `orders/[id]/*`, `curriculum/*`, `pilot-cohorts/*` yazma uçları mevcut; sayfaların listesi/detayı ise RSC'de doğrudan Prisma ile okunuyor. Faz 2'nin sunucu işinin büyük kısmı **GET projeksiyonları**dır, iş kuralı yazımı değil.
2. **Deneme Ligi yönetimi neredeyse tamamen API hazır** (`/api/odk/admin/**`, 20 uç). Eksik olan liste/özet okumaları (`sinavlar`, `sonuclar`, `paketler`, `operasyon`, `raporlar`) — bunlar `lib/odk/admin-exam-server.ts`, `reporting-server.ts`, `pilot-readiness-server.ts` üzerinden GET'e açılmalı.
3. **Server Action'a bağlı 6 dosya / 48 eylem** (İşletme 36, ayarlar 7, koç hazırlık 2, `assignCoach`, `retryOrderProvisioning`, `requestPackageMeeting`) mobil için servis + route çıkarımı gerektirir.
4. **Yetki boşluğu (kesin):** `POST /api/panel/weekly-digests/[id]/feedback` `requireApiOdRole("STUDENT","PARENT")` kullanıyor; OD üyeliği olmayan (yalnız Yön/Deneme Ligi) veli ve öğrenci haftalık geri bildirim gönderemez.
5. **Salt-okuma web sayfaları** (`yonetim/ozellikler`, `kayitlar`, `egitmenler`, `kalite`, `siparisler` listesi, `analitik`; `odk/yonetim/paketler`, `raporlar`) mobilde yalnız GET ucu + ekran ister; `ogrenci/profil` için GET ucu zaten var; yazma riski yok — erken kazanım.

---

## 1. Yönetim — `/panel/yonetim` (ADMIN; İşletme ayrıca `BusinessPermission`)

Mobil karşılık: `native-screens.ts` ADMIN eşlemesi + `(app)/admin/*` yığın ekranları (Faz 1 → P2.2). Eşlenmemiş yönetim öğeleri faz etiketli yer tutucudur.

| # | Web rotası | Nav id | Alt işlemler (O / Y) | Web kaynağı | API | Mobil | Durum | Faz | Not |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Y01 | `/panel/yonetim` | `today` | O: operasyon merkezi göstergeleri, iş listeleri, alan süzgeci | `lib/panel/admin-operations-center-server.ts` | Hazır (`GET /api/panel/admin/operations-center`) | `admin-operations-center` | Tam | P1 | Faz 1. Satırlar yetkili menüdeki bölüme açılır; önizleme girişi E2/P2.9 |
| Y02 | `/panel/yonetim/mudahale` | `operations` (flag `interventionInbox`) | O: müdahale kutusu, durum süzgeci, geçmiş · Y: elle kayıt, üstlen, başlat, not, beklet (1/3/7 gün), çöz (sonuç), yanlış işaret (neden), yeniden aç, kuralları çalıştır | `getInterventionInbox`, `listInterventionStudentOptions`; yazma: `interventions` POST, `interventions/[id]` PATCH (`expectedVersion`), `interventions/generate` POST | Hazır (`GET /api/panel/admin/interventions`) | `admin-interventions` | Tam | P2.1 | 409 → yenile + açık mesaj; bayrak kapalı → 404 `FEATURE_DISABLED`. Etiketler tek sözlük (`lib/panel/intervention-vocabulary.ts`) |
| Y03 | `/panel/yonetim/isler` | `provisioning` | O: ilk ders göstergeleri, yerleştirme ölçüleri, aktivasyon kuyruğu (checklist, tercih, geçmiş), birleşik iş kutusu, hazırlık kontrolü, siparişler, talepler, cron, e-posta kuyruğu · Y: onboarding geçişi (sorumlu, bloker, not), siparişi hesaba bağla, talep durumu, e-posta tekrarı | `loadActivationDesk` (`lib/panel/activation-desk-server.ts`, sayfadan taşındı); yazma: `orders/[id]/onboarding` POST + `orders/[id]/user` POST (taze step-up), `leads/[id]` PATCH, `email-outbox/[id]/retry` PATCH | Hazır (`GET /api/panel/admin/activation-desk`) | `admin-activation-desk` | Tam | P2.1 | İzinli geçişler sunucudan (`allowedTransitions`); 428 → native step-up → aynı gövdeyle tek tekrar |
| Y04 | `/panel/yonetim/raporlar` | `reports` (+ `operations` bayrak kapalıyken) | O: son 30 gün özet, tekrar / plan / AI (bayrağa bağlı), SLO'lar, öğretmen ve grup ilerlemesi | `loadAdminReports` + saf `buildAdminReports` (sayfadan taşındı) | Hazır (`GET /api/panel/admin/reports`) | `admin-reports` | Tam | P2.1 | CSV dışa aktarımı E5 ile kapsam dışı |
| Y05 | `/panel/yonetim/basvurular` | `signups` | O: yeni kayıtlar (süzgeç, sayfa, kayıt ayrıntıları), hesap bekleyen çocuklar · Y: iletişim durumu + not, çocuk hesabı oluştur (davet + sipariş erişimi) | `loadSignupCounts` / `loadSignupList` / `loadPendingChildren` (`lib/panel/signups-server.ts`, sayfadan taşındı); yazma: `signups/[userId]/contact` PATCH, `signups/children/[id]/account` POST (taze step-up) | Hazır (`GET /api/panel/admin/signups`) | `admin-signups` | Tam | P2.2 | İletişim takibi erişim açmaz; çocuk hesabında davet bağlantısı yalnız yöneticiye bir kez gösterilir |
| Y06 | `/panel/yonetim/kisiler` | `people` | O: birleşik kişi dizini (6 görünüm), arama, rol / ürün / durum süzgeci, sayfalama, sorumluluk rozetleri, bekleyen MFA sıfırlama kuyruğu · Y: kişi oluştur (davet bağlantısı), MFA sıfırlamayı onayla | `loadPeopleDirectory` (`lib/panel/people-directory-server.ts`, sayfadan taşındı), `listPendingMfaResets`; yazma: `users` POST, `mfa-resets/[id]/approve` POST (taze step-up) | Hazır (`GET /api/panel/admin/people`) | `admin-people` | Tam | P2.2 | Toplu işlem E4 ile kapsam dışı |
| Y07 | `/panel/yonetim/kullanicilar` | (Kişiler alt) | O: kullanıcı listesi · Y: oluştur, durum, parola/davet yenile, MFA sıfırla | `users*` | Hazır (Kişiler dizini + kişi detayı) | `admin-people`, `admin/person/[id]` | Tam | P2.2 | Web'de `kisiler`'e yönlendirilen eski liste; tüm satır işlemleri kişi detayında. Toplu işlem E4 |
| Y08 | `/panel/yonetim/kullanicilar/[id]` | — | O: profil, kayıt profili kartı, ürün erişim nesneleri + siparişler, sorumluluk geçmişi, ilişkiler, öğretmen özeti, MFA durumu + bekleyen sıfırlamalar, işlem geçmişi · Y: profil düzenle, akademik düzenleme (ek süre / mola, sürümlü), manuel ürün erişimi, sorumluluk ver / iptal et (gerekçeli), koç kapasitesi, durum (aktif / askı), arşiv (etki önizlemesiyle), öğretmen güvenli devri (offboarding), kalıcı silme (ön koşullu), öğretmen–öğrenci branş bağlantısı, daveti yenile, MFA sıfırlama iste / onayla | `loadPersonDetail` (`lib/panel/person-detail-server.ts`), `loadSignupProfileSummary` (`lib/panel/signup-profile-server.ts`; web kartı da kullanır); yazma: mevcut `users/[id]/*`, `student-teachers` (taze step-up) | Hazır (`GET /api/panel/admin/people/[id]`) | `admin/person/[id]` | Tam | P2.2 | Önizleme (View As) girişi ortak kabukta E2/P2.9 |
| Y09 | `/panel/yonetim/ogrenciler` | — | O: öğrenci listesi, erişim bekleyen öğrenci sayısı · Y: durum, parola sıfırla | `loadPeopleDirectory` (Öğrenciler görünümü), `countStudentsAwaitingAccess` (`lib/panel/people-directory-server.ts`); yazma: `users/[id]/{status,reset-password}` | Hazır (`GET /api/panel/admin/people?sekme=ogrenciler`) | `admin-people` (Öğrenciler görünümü) | Tam | P2.2 | Satır Öğrenci 360'a açılır; durum / parola işlemleri kişi detayında |
| Y10 | `/panel/yonetim/ogrenciler/[id]` | — | O: öğrenci 360 (üst sekmeler + Öğrenme alt görünümleri, tüm bölümler) · Y: veli bağla / kaldır, branş öğretmeni bağla / kaldır, koç ata / devret (kapasite gerekçesi), sipariş erişim açmayı yeniden dene | `loadStudent360Bundle` (`lib/panel/student-360*`); yazma: `relationships*`, `student-teachers`, `assignCoachService` (`lib/panel/coach-assignment-service.ts`, SA'dan çıkarıldı), `retryOrderProvisioningService` (`lib/panel/order-provisioning-service.ts`, SA'dan çıkarıldı) | Hazır (`GET /api/panel/admin/students/[id]`, `POST /api/panel/admin/coach-assignments`, `POST /api/panel/admin/orders/[id]/provisioning-retry`) | `admin/student/[id]` | Tam | P2.2 | Bölümler sunucuda karta çevrilir (`lib/mobile/student-360-views.ts`). Dino özeti web'de yalnız öğretmen görünümünde; önizleme girişi E2/P2.9 |
| Y11 | `/panel/yonetim/veliler` | — | O: veli listesi (süzgeç, sayfa), bağlantısız veli sayısı, aktif bağlantılar, bağlantı geçmişi · Y: bağlantı kur (izinlerle), yakınlık düzenle, bağlantı kaldır; durum / parola kişi detayında | `loadParentsPage` (`lib/panel/parents-server.ts`, sayfadan taşındı); yazma: `relationships` POST, `relationships/[id]` PATCH / DELETE (taze step-up) | Hazır (`GET /api/panel/admin/parents`) | `admin/parents` | Tam | P2.2 | Kişiler ekranından açılır |
| Y12 | `/panel/yonetim/egitmenler` | — | O: öğretmen listesi, branş / seviye, grup doluluğu, kapasite aşımı | `loadEducators` (`lib/panel/educators-server.ts`, sayfadan taşındı) | Hazır (`GET /api/panel/admin/educators`) | `admin/educators` | Tam | P2.2 | Salt okuma; satır kişi detayına açılır |
| Y13 | `/panel/yonetim/egitim` | `groups` | O: ders/grup/ödev/materyal yönetim görünümü · Y: grup oluştur/düzenle, ders oluştur + seri önizleme, ders düzenle, ödev oluştur/düzenle, teslim değerlendir, materyal yükle/düzenle, ilk kurulum (`setup`), kullanıcı oluştur, ilişki | `groups` POST, `groups/[id]` PATCH, `lessons` POST, `lessons/preview-series` POST, `lessons/[id]` PATCH, `assignments*`, `assignment-submissions/[id]/review`, `materials*`, `materials/upload`, `setup`, `users`, `relationships`, `curriculum/outcomes/search`, `teacher/outcome-favorites` | Y var, O yok | — | Eksik | P2.3 | En geniş yazma yüzeyi; dosya yükleme |
| Y14 | `/panel/yonetim/gruplar/[id]` | — | O: grup 360 · Y: grup güncelle, üye ekle, öğrenci listesi | `groups/[id]` PATCH, `groups/[id]/members` POST, `groups/[id]/students` GET; `group-360-server.ts` | Y var, O kısmi | — | Eksik | P2.3 | |
| Y15 | `/panel/yonetim/takvim` | `calendar` | O: kurum takvimi · Y: .ics dışa aktar | `calendar/export` GET; Prisma | O yok | — | Eksik | P2.3 | |
| Y16 | `/panel/yonetim/kazanimlar` | `outcomes` (flag `learningOutcomes`) | O: kazanım sürümleri · Y: kazanım oluştur, sürüm oluştur/güncelle | `curriculum/outcomes` POST, `curriculum/versions` POST, `curriculum/versions/[id]` PATCH | Y var, O yok | — | Eksik | P2.3 | |
| Y17 | `/panel/yonetim/kocluk` | `coaching` | O: koç kapasitesi, atamalar · Y: koç ata | `assignCoachService` (SA'dan çıkarıldı, P2.2); `kocum/server.ts` | Y var, O yok | — | Eksik | P2.4 | Yazma ucu hazır: `POST /api/panel/admin/coach-assignments`; kuyruk okuması GET gerekir |
| Y18 | `/panel/yonetim/denemeler` | `mock-analysis` (flag `mockExamAnalysis`) | O: dış deneme sonuç analizi · Y: deneme kaydı ekle/düzenle | `mock-exams` GET/POST, `mock-exams/[id]` PATCH | Hazır (GET öğrenci kapsamlı → ADMIN projeksiyonu kontrol) | — | Eksik | P2.8 | |
| Y19 | `/panel/yonetim/siparisler` | `orders` | O: sipariş listesi + filtre | Prisma (RSC) | O yok | — | Eksik | P2.6 | Müşteri satın alma akışı DEĞİL |
| Y20 | `/panel/yonetim/siparisler/[id]` | — | O: sipariş detayı · Y: provizyon tekrarı | `retryOrderProvisioningService` (SA'dan çıkarıldı, P2.2) | Y var, O yok | — | Eksik | P2.6 | Yazma ucu hazır: `POST /api/panel/admin/orders/[id]/provisioning-retry`; detay okuması GET gerekir |
| Y21 | `/panel/yonetim/analitik` | `analytics` | O: yönetim metrikleri · Y: dışa aktar | `analytics/export` GET; `lib/analytics/server.ts` | O yok | — | Eksik | P2.8 | Grafikler |
| Y22 | `/panel/yonetim/analitik/[metric]` | — | O: metrik detayı | `lib/analytics/server.ts` | O yok | — | Eksik | P2.8 | |
| Y23 | `/panel/yonetim/ozellikler` | `features` | O: özellik bayrakları kaydı/durumu | Prisma + `panel-feature-registry` | O yok | — | Eksik | P2.8 | Web'de de salt okuma; yazma eklenirse step-up |
| Y24 | `/panel/yonetim/kayitlar` | `audit` | O: işlem geçmişi | Prisma (RSC) | O yok | — | Eksik | P2.8 | |
| Y25 | `/panel/yonetim/pilot` | `pilot` | O: kontrollü yayın hazırlığı · Y: kohort oluştur/güncelle | `pilot-cohorts` POST, `pilot-cohorts/[id]` PATCH; `pilot-readiness-server.ts` | Y var, O yok | — | Eksik | P2.8 | |
| Y26 | `/panel/yonetim/kalite` | `quality` (flag `cohortQuality`) | O: öğrenme kalitesi | `lib/cohort-quality` (RSC) | O yok | — | Eksik | P2.8 | Salt okuma |
| Y27 | `/panel/yonetim/isletme/[section]` | `business-*` (16 bölüm) | O: genel bakış, mesaj kutusu, adaylar, satış hunisi, reklamlar, kampanyalar, gelirler, giderler, vergiler, mutabakat, raporlar, AI bilgi merkezi, otomasyon, entegrasyonlar, sistem kayıtları, ayarlar · Y: **36 eylem** — konuşma ata/etiketle/okundu/kontrol; aday oluştur/aşama/not/görev/takip/sahip/öncelik/birleştir/sipariş bağla/yaşam döngüsü; kampanya/reklam oluştur; finans işlemi oluştur/ters kayıt; dönem kilidi; mutabakat çalıştır/çöz; Meta senkron; manuel atıf; bilgi kaydı oluştur/sürümle; prompt sürümü; AI öneri; otomasyon oluştur/aç-kapa/dry-run; saklama ayarı; işletme rolü ver/al; Instagram mesaj gönder | SA `app/panel/yonetim/isletme/actions.ts`; `admin/business/reports.csv`, `integrations/instagram/{health,send}`; `lifecycle/lead-detail-server.ts` | SA + O yok | — | Eksik | P2.7 | `BusinessPermission` (ADR-0011); dönem kilidi/rol/ters kayıt → step-up; E3 (bağlantı kurulumu) ve E5 (rapor CSV) kapsam dışı |
| Y28 | `/panel/yonetim/isletme` | — | — | `redirect → genel-bakis` | — | — | Yönl. | — | |

## 2. Deneme Ligi yönetimi — `/panel/odk/yonetim` (ADMIN + izinli Deneme Ligi personeli)

Mobil karşılık: **yok** (öğretmen ODK alanında yalnız `teacher-odk-reports`).

| # | Web rotası | Nav id | Alt işlemler (O / Y) | Web kaynağı | API | Mobil | Durum | Faz | Not |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| K01 | `/panel/odk/yonetim` | — | O: personel çalışma alanı özeti, pilot hazırlığı | `odk/admin-exam-server.ts`, `odk/pilot-readiness-server.ts` | O yok | — | Eksik | P4 | |
| K02 | `/panel/odk/yonetim/sinavlar` | `odk-exams` | O: sınav listesi · Y: sınav oluştur, seri oluştur | `odk/admin/exams` POST, `odk/admin/exam-series` POST | Y var, O yok | — | Eksik | P4 | |
| K03 | `/panel/odk/yonetim/sinavlar/[id]` | — | O: sınav detayı, önizleme, sonuçlar, dosya, girişim · Y: düzenle, sorular, cevap anahtarı içe aktar (doğrula/uygula), kazanım içe aktar, dosya yükle, hazır işaretle, takvim, oturumlar, atamalar, puanla, yeniden puanla, yayın önizleme, yayınla, girişim düzelt | `odk/admin/exams/[id]` PATCH + `{questions,imports/answer-key,imports/outcomes,files,preview,ready,schedule,sessions,assignments,score,rescore,results,release/preview,release}`, `odk/admin/files/[fileId]`, `odk/admin/attempts/[id]` | Hazır (detay okuma RSC → GET eklenmeli) | — | Eksik | P4 | Yayın/yeniden puanlama/anahtar → step-up. "Önizleme" çözme değildir |
| K04 | `/panel/odk/yonetim/operasyon` | `odk-ops` | O: canlı oturumlar, ihlal/bağlantı sayaçları · Y: girişim müdahalesi | `odk/admin/attempts/[id]` GET/PATCH | Y var, O yok | — | Eksik | P4 | Aralıklı yenileme |
| K05 | `/panel/odk/yonetim/sonuclar` | `odk-results` | O: puanlama/yayın kuyruğu + filtre | `odk/admin-exam-server.ts` | O yok | — | Eksik | P4 | Eylemler K03 üzerinden |
| K06 | `/panel/odk/yonetim/raporlar` | `odk-reports` | O: kitle bazlı sonuç raporları | `odk/reporting-server.ts` | O yok | — | Eksik | P4 | |
| K07 | `/panel/odk/yonetim/paketler` | `odk-packages` | O: ticari paket sözleşmesi | `odk/product-contract` (RSC) | O yok | — | Eksik | P4 | Salt okuma |
| K08 | `/panel/odk/yonetim/pilot` | `odk-pilot` | O: pilot koşuları · Y: koşu oluştur/güncelle | `odk/admin/pilot-runs` POST, `pilot-runs/[id]` PATCH | Y var, O yok | — | Eksik | P4 | |

## 3. Öğretmen ve Yön koçu — `/panel/ogretmen` (TEACHER; OD / Yön çalışma alanı)

| # | Web rotası | Nav id | Alt işlemler (O / Y) | Web kaynağı | API | Mobil | Durum | Faz | Eksik alt işlemler / not |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T01 | `/panel/ogretmen` | `today` (OD) | O: Bugün | `teacher-workspace-server.ts`; `staff/teacher/home` | Hazır | `teacher-home` | Tam | — | Dino kısa yolu P5'te (S18) |
| T02 | `/panel/ogretmen/takvim` | `lessons` | O: ders takvimi | Prisma (RSC); mobil `staff/teacher/lessons` | Hazır | `teacher-lessons` | Tam | — | |
| T03 | `/panel/ogretmen/ders/[id]` | — | O: ders detayı · Y: yoklama/kapanış, ders notları, dersten ödev oluştur, şablon oluştur/düzenle, kazanım arama/favori | `lessons/[id]/notes` PUT, `assignments` POST, `teacher/templates*`, `curriculum/outcomes/search`, `teacher/outcome-favorites`; `teacher-lesson-server.ts` | Hazır | `teacher/lesson/[id]` | Kısmi | P3 | Dersten ödev oluşturma, şablonlar, kazanım favorileri |
| T04 | `/panel/ogretmen/odevler` | `assignments` | O: ödev listesi, teslim kuyruğu · Y: teslim değerlendir, ödev oluştur/düzenle, kazanım arama | `assignments` POST, `assignments/[id]` PATCH, `assignment-submissions/[id]/review`; `teacher-assignments-server.ts` | Hazır | `teacher-assignments`, `teacher/submission/[id]` | Kısmi | P3 | Oluşturma/düzenleme (ekranda "web panelinde" banner'ı) |
| T05 | `/panel/ogretmen/yardim` | `help` | O: yardım kutusu · Y: yanıtla | `student-help-requests/[id]/respond` | Hazır | `teacher-help` | Tam | — | |
| T06 | `/panel/ogretmen/gruplar` | `students` | O: grup + öğrenci listesi | `teacher-roster-server.ts` | O yok | — | Eksik | P3 | |
| T07 | `/panel/ogretmen/ogrenci/[id]` | — | O: öğrenci profili · Y: ilişki ekle/güncelle, öğretmen atama, Dino bağlamı | `relationships*`, `student-teachers` | Y var, O yok | — | Eksik | P3 | Öğretmen kapsamlı öğrenci 360 |
| T08 | `/panel/ogretmen/materyaller` | `materials` | O: materyaller · Y: yükle, oluştur, düzenle, dosya | `materials` GET/POST, `materials/[id]` PATCH, `materials/upload`, `materials/[id]/file` | Hazır | — | Eksik | P3 | Dosya seçici |
| T09 | `/panel/ogretmen/tekrar` | `review` | O: tekrar gerekenler · Y: tekrar kaydı oluştur | `review-queue` POST | Y var, O yok | — | Eksik | P3 | |
| T10 | `/panel/ogretmen/telafi` | `recovery` | O: telafi paketleri · Y: paket üret, yayınla | `recovery-packages/generate`, `recovery-packages/[id]/publish` | Y var, O yok | — | Eksik | P3 | |
| T11 | `/panel/ogretmen/mudahale` | `interventions` | O: müdahale kutusu · Y: oluştur, güncelle, üret | `interventions*`; `intervention-inbox-server.ts` | Y var, O yok | — | Eksik | P3 | |
| T12 | `/panel/ogretmen/ozetler` | `digests` | O: haftalık özetler · Y: üret, yayınla | `weekly-digests/generate`, `weekly-digests/[id]/publish` | Y var, O yok | — | Eksik | P3 | |
| T13 | `/panel/ogretmen/analiz` | `analiz` | O: sınıf gidişatı | `progress-insights/server.ts` | O yok | — | Eksik | P3 | |
| T14 | `/panel/ogretmen/ai-yardimci` | `ai-drafts` | O: taslaklar · Y: taslak oluştur, onayla/düzenle | `ai-drafts` POST, `ai-drafts/[id]` PATCH | Y var, O yok | — | Eksik | P3 | `safe-teacher-ai-operations` + bayrak |
| T15 | `/panel/ogretmen/denemeler` | `mock-exams` | O: dış deneme analizi · Y: kayıt ekle/düzenle | `mock-exams` GET/POST, `mock-exams/[id]` PATCH | Yetki | — | Eksik | P3 | `mock-exams` GET yalnız STUDENT; öğretmen kapsamlı GET gerekli |
| T16 | `/panel/ogretmen/plan` | `plan` | O: haftalık plan / öneriler · Y: planı onayla, öneri incele | `adaptive-plan/[id]/approve`, `kocum/suggestions/[id]/review` | Hazır | `coach-plans`, `coach/plan/[id]` | Tam | — | Yön alanında |
| T17 | `/panel/ogretmen/yon` | `today` (OK) | O: koç Bugün | `kocum/coach-workspace-server.ts`; `staff/coach/home` | Hazır | `coach-home` | Tam | — | |
| T18 | `/panel/ogretmen/yon/ogrenciler` | `coach-students` | O: koçluk öğrencileri | `staff/coach/students` | Hazır | `coach-students` | Tam | — | |
| T19 | `/panel/ogretmen/yon/gorusmeler` | `coach-sessions` | O: görüşmeler | `staff/coach/sessions` | Hazır | `coach-sessions`, `coach/session/[id]` | Tam | — | |
| T20 | `/panel/ogretmen/hazirlik/[id]` | — | O: öğrenci hazırlık çalışma alanı · Y: görüşme oluştur/güncelle, not, görev oluştur, görev ertele, öneri incele, plan onayla/kopyala, şablon uygula, özet oluştur, görüşme kaydet (SA `recordCoachingSession`), öğrenci hedefi koy (SA `setStudentGoal`) | `coaching-sessions*`, `kocum/{notes,tasks,tasks/[id]/reschedule,suggestions/[id]/review,plans/[id]/copy,templates/[id]/apply,summaries}`, `adaptive-plan/[id]/approve`, SA `recordCoachingSession`, `setStudentGoal` | SA | `coach/student/[id]` | Kısmi | P3 | Görev oluşturma, plan kopyalama, şablon uygulama, özet, görüşme kaydı + hedef (SA) |

## 4. Deneme Ligi öğretmen — `/panel/odk/ogretmen`

| # | Web rotası | Nav id | Alt işlemler (O / Y) | API | Mobil | Durum | Faz | Not |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D01 | `/panel/odk/ogretmen` | `today` (ODK) | O: ilişkili öğrenci özetleri | Hazır (`odk/staff/related-reports`) | `teacher-odk-reports` | Tam | — | |
| D02 | `/panel/odk/ogretmen/raporlar` | `odk-teacher-reports` | O: ilişkili Deneme Ligi raporları | Hazır | `teacher-odk-reports` | Tam | — | |

## 5. Öğrenci — `/panel/ogrenci`

| # | Web rotası | Nav id | Alt işlemler (O / Y) | API | Mobil | Durum | Faz | Eksik alt işlemler / not |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S01 | `/panel/ogrenci` | `today` (OD) | O: Bugün, onboarding · Y: plan görevi tamamla | Hazır | `od-home` | Tam | — | Dino kısa yolu P5'te (S18) |
| S02 | `/panel/ogrenci/odevler` | `assignments` | O · Y: ilerleme, teslim (kanıt) | Hazır | `od-assignments`, `od/assignment/[id]` | Tam | — | |
| S03 | `/panel/ogrenci/takvim` | `lessons` | O: dersler · Y: .ics dışa aktar | Hazır | `od-lessons` | Kısmi | P5 | Takvime ekle |
| S04 | `/panel/ogrenci/takvim/[id]` | — | O: ders detayı, katılım | Hazır | `od/lesson/[id]` | Tam | — | |
| S05 | `/panel/ogrenci/materyaller` | `materials` | O + dosya aç | Hazır | `od-materials` | Tam | — | |
| S06 | `/panel/ogrenci/tekrar` | `review-recovery` | O · Y: yanıtla, ertele | Hazır | `od-review-recovery` | Tam | — | |
| S07 | `/panel/ogrenci/telafi` | `review-recovery` | O · Y: madde tamamla, kontrol noktası | Hazır | `od/review-recovery` | Tam | — | |
| S08 | `/panel/ogrenci/analiz` | `analiz` | O · Y: haftalık hedef | Hazır | `od-progress` | Tam | — | |
| S09 | `/panel/ogrenci/gelisim` | `progress` | — | — | — | Yönl. | — | `redirect → analiz` / ana sayfa |
| S10 | `/panel/ogrenci/denemeler` | `mock-exams` | O: dış denemeler · Y: sonuç ekle, düzenle | Hazır | `external-mock-exams` | Kısmi | P5 | Ekleme/düzenleme (POST/PATCH) |
| S11 | `/panel/ogrenci/check-in` | `check-in` | O · Y: check-in, yardım geri bildirimi | Hazır | `check-in` | Tam | — | |
| S12 | `/panel/ogrenci/haftalik` | `weekly-digest` | O · Y: geri bildirim | Yetki | `od-weekly-digest`, `yon-weekly` | Kısmi | P5 | Feedback ucu OD-only → yalnız Yön üyesi öğrenci gönderemez |
| S13 | `/panel/ogrenci/yon` | `today` (OK) | O · Y: görev tamamla | Hazır | `yon-today` | Tam | — | |
| S14 | `/panel/ogrenci/plan` | `plan` | O · Y: görev tamamla, değişiklik iste, tercihler, plan üret | Hazır | `yon-plan`, `yon/task/[id]` | Kısmi | P5 | `adaptive-plan/generate` |
| S15 | `/panel/ogrenci/hedefler` | `goals` | O | Hazır | `yon-goals` | Tam | — | |
| S16 | `/panel/ogrenci/kocluk` | `coaching` | O · Y: görüşme saat değişikliği iste, öneriyi kabul et | Hazır | `yon-coaching` | Tam | — | |
| S17 | `/panel/ogrenci/profil` | — | O: profil | Hazır (`student/profile` GET) | — | Eksik | P5 | Yalnız ekran |
| S18 | `/panel/ogrenci/dino` | `dino` (flag `dinoAi`) | O · Y: Dino sohbet | Hazır (`dino`) | web devam (`OD_WEB_ONLY`) | Eksik | P5 | Çocuk verisi incelemesi onayı |

## 6. Deneme Ligi öğrenci — `/panel/odk/ogrenci`

| # | Web rotası | Nav id | Alt işlemler (O / Y) | API | Mobil | Durum | Faz | Not |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S19 | `/panel/odk/ogrenci` | `today` (ODK) | O: Deneme Ligi Bugün | Hazır | `odk-home` | Tam | — | |
| S20 | `/panel/odk/ogrenci/denemeler` | `odk-exams` | O: deneme listesi | Hazır | `odk-exams` | Kısmi | P5 | Eski kayıtlar web'e yönlendiriyor |
| S21 | `/panel/odk/ogrenci/denemeler/[id]` | — | O: deneme detayı · Y: başlat | Hazır | `odk/exam/[id]` | Tam | — | "Başlat" çözme akışıdır → E1 kapsamında web'e devam |
| S22 | `/panel/odk/ogrenci/denemeler/[id]/sonuc` | — | O: sonuç, cevap anahtarı, Dino açıklaması | Hazır | `odk/exam/[id]/result` | Tam | — | Dino açıklaması S18'e bağlı |
| S23 | `/panel/odk/ogrenci/denemeler/[id]/coz` | — | Y: cevaplar, olaylar, heartbeat, süre, teslim | Hazır | — | İstisna | — | E1: sınav çözme mobil kapsam dışı |

## 7. Veli — `/panel/veli`

| # | Web rotası | Nav id | Alt işlemler (O / Y) | API | Mobil | Durum | Faz | Eksik alt işlemler / not |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| V01 | `/panel/veli` | `today` | O: sakin özet, çocuk seçimi | Hazır | `parent-home` | Tam | — | |
| V02 | `/panel/veli/analiz` | `analiz` | O | Hazır | `parent-insights` | Tam | — | |
| V03 | `/panel/veli/takip` | `progress` | — | — | — | Yönl. | — | `redirect → analiz` |
| V04 | `/panel/veli/takvim` | `lessons` | O · Y: .ics dışa aktar | Hazır | `parent-lessons` | Kısmi | P5 | Takvime ekle |
| V05 | `/panel/veli/odevler` | `assignments` | O | Hazır | `parent-assignments` | Tam | — | |
| V06 | `/panel/veli/ogretmenler` | `teachers` | O | Hazır | `parent-teachers` | Tam | — | |
| V07 | `/panel/veli/kocluk` | `coaching` | O · Y: görüşme saat değişikliği talebi, katılım bağlantısı | Yetki | `parent-coaching` | Kısmi | P5 | `coaching-sessions/[id]` veli kapsamı doğrulanmalı |
| V08 | `/panel/veli/denemeler` | `mock-exams` | O | Hazır | `parent-external-exams` | Tam | — | |
| V09 | `/panel/veli/haftalik` | `weekly-digest` | O · Y: geri bildirim | Yetki | `parent-weekly` | Kısmi | P5 | Feedback ucu OD-only (`requireApiOdRole`) |
| V10 | `/panel/veli/hesap` | `account` | O: hesap ve paket · Y: paket görüşmesi iste | SA | `parent-account` | Kısmi | P5 | SA `requestPackageMeeting` → route |
| V11 | `/panel/veli/dino` | `dino` | O · Y: Dino | Hazır | web devam (`PARENT_WEB_ONLY`) | Eksik | P5 | |
| V12 | `/panel/veli/bildirimler` | — | — | — | — | Yönl. | — | `redirect → /panel/bildirimler` |

## 8. Deneme Ligi veli — `/panel/odk/veli`

| # | Web rotası | Nav id | Alt işlemler (O / Y) | API | Mobil | Durum | Faz | Not |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| V13 | `/panel/odk/veli` | `today` (ODK) | O: çocuğun Deneme Ligi özeti | Hazır (`odk/parent/report`) | `parent-odk-reports` | Tam | — | |
| V14 | `/panel/odk/veli/raporlar` | `odk-reports` | O: çocuğun Deneme Ligi raporu | Hazır | `parent-odk-reports` | Tam | — | |

## 9. Ortak / hesap / yönlendirme

| # | Web rotası | Alt işlemler (O / Y) | API | Mobil | Durum | Faz | Eksik alt işlemler / not |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C01 | `/panel` | — | — | `workspace-select` | Yönl. | — | Rol/ürün giriş yönlendirmesi |
| C02 | `/panel/odk` | — | — | — | Yönl. | — | Deneme Ligi rol girişi yönlendirmesi |
| C03 | `/panel/urun-sec` | Y: aktif ürün seç | Hazır | `workspace-select`, `WorkspaceSwitcher` | Tam | — | |
| C04 | `/panel/bildirimler` | O · Y: okundu, tercihler | Hazır | `notifications`, `account/notifications` | Tam | — | |
| C05 | `/panel/oturumlar` | O · Y: oturum kapat, diğerlerini kapat | Hazır | `account/sessions` | Tam | — | |
| C06 | `/panel/parola` | Y: parola değiştir | Hazır | `account/password`, `change-password` | Tam | — | |
| C07 | `/panel/ayarlar` | O: ayar bölümleri | SA | `account/index` | Kısmi | P5 | Bölüm listesi; düzenleme C08'de |
| C08 | `/panel/ayarlar/[section]` | Y: profil, iletişim, eğitim, fatura, onaylar, bekleyen çocuk ekle/iptal (7 SA) | SA | `account/privacy` | Kısmi | P5 | 7 Server Action → route |
| C09 | `/panel/guvenlik` | O: MFA durumu · Y: TOTP kaydı, passkey, kod doğrulama (step-up) | Hazır | `mfa` (giriş kapısı), `StepUpProvider` (step-up) | Kısmi | P5 | Faz 1: native TOTP step-up + bootstrap `capabilities.security`. Kalan: MFA kaydı ve passkey yönetimi (P5) |
| C10 | `/panel/erisilebilirlik` | Y: erişilebilirlik tercihleri | Hazır (PATCH; O → `me`) | — | Eksik | P5 | |
| C11 | `/panel/veri-kullanimi` | Y: düşük veri tercihleri | Hazır (PATCH) | — | Eksik | P5 | `offline-low-data-operations` |

**Ortak kabuk (rota değil, sayıma girmez):** çıkış ve ürün değiştirme mobilde var. ADMIN kabuğu `admin-search` (global arama, P1), `admin-preview*` (önizleme — E2, native, salt okuma, P2.9) ve `admin-teacher-mode` (öğretmen modu — E6, native, P2.9) kullanır.

---

## Bilinçli istisnalar ve kapsam kararları

Karar tarihi: 11 Ekim 2026 (ürün sahibi).

| Kimlik | Konu | Karar | Gerekçe / uygulama | Etkilenen satırlar |
| --- | --- | --- | --- | --- |
| E1 | Deneme/sınav çözme | **İstisna (onaylı)** | Ürün kararı; bütünlük izleme web'de | S23, S21 "Başlat" |
| E2 | Yönetici önizlemesi (View As) | **Kapsamda — native** | ADMIN, öğrenci/veli/öğretmen panelini mobilde görüntüler. Önizleme salt okumadır: sunucu önizleme açıkken mutasyonu reddeder (`docs/admin-panel-preview.md`), mobil yazma düğmelerini gizler. Çerez yerine Bearer oturumuna bağlı imzalı önizleme belirteci gerekir (P2.9) | Ortak kabuk; Y08, Y10 giriş noktaları |
| E3 | Meta/Instagram hesap bağlantısının kurulumu | **İstisna (onaylı)** — mobilde yok | Bağlantı kurulumu webde kalır; mobilde entegrasyon **durumu** (salt okuma) ve Instagram mesaj gönderme kapsamda | Y27 (entegrasyonlar bölümü) |
| E4 | Toplu kullanıcı içe aktarma | **İstisna (onaylı)** — mobilde yok | `users/bulk` webde kalır; tekil kullanıcı oluşturma/düzenleme kapsamda | Y06, Y07 |
| E5 | Büyük finans raporları ve CSV dışa aktarımları | **İstisna (onaylı)** — mobilde yok | `admin/business/reports.csv`, `reports/export`, `analytics/export` mobilde sunulmaz; ekrandaki özet/metrik görünümleri kapsamda | Y04, Y21, Y27 (raporlar bölümü) |
| E6 | Yönetici öğretmen çalışma modu (`admin-teacher-mode`) | **Kapsamda — native** | Yönetici aynı hesapla öğretmen paneline geçer; yazma açıktır ve denetim kaydı yöneticinin kimliğiyle tutulur (`docs/admin-teacher-mode.md`). Önizlemeyle birbirini dışlar. Çerezsiz taşıma P2.9 ile aynı belirteç modeliyle yapılır | Ortak kabuk |

Onaylı istisnalar **alt işlem** düzeyindedir; etkilenen satırlar kalan alt işlemleri tamamlandığında `Tam` olur. Bu istisnalar için mobil "web'de aç" bağlantısı göstermez — işlem mobil kapsamında değildir.

## Sunucu iş listesi (matristen türetilen)

| Tür | Satırlar | Adet |
| --- | --- | ---: |
| GET projeksiyonu (O yok / Y var, O yok) | Y01–Y07, Y09–Y17, Y19–Y27; K01–K08; T06, T07, T09–T14 | 41 |
| Server Action → `lib/` servisi + route | Y27 (36 eylem), T20 (2 eylem), V10 (1), C07–C08 (7) — `assignCoach` ve `retryOrderProvisioning` P2.2'de çıkarıldı | 4 dosya / 46 eylem |
| Yetki düzeltmesi | S12 + V09 (haftalık geri bildirim OD-only), V07 (veli görüşme işlemleri), T15 (dış deneme öğretmen GET) | 3 |
| Yalnız mobil sözleşme + ekran (API hazır) | Y08, K03 (+ detay GET), T03, T04, T08, S03, S10, S14, S17, S18, S20, V04, V11, C09–C11 | 16 |

## Bakım

- Satır durumunu değiştiren PR, kanıt olarak test dosyasını veya `p6-validation-results.md` referansını "Not" sütununa ekler.
- Yeni web sayfası eklendiğinde bu matrise satır eklenmeden PR tamamlanmış sayılmaz.
- `node scripts/check-mobile-parity-matrix.mjs` her `app/panel/**/page.tsx` rotasının matriste tam bir satırı olduğunu, durum kodlarının geçerli olduğunu ve Özet tablosunun satırlardan hesaplanan sayılarla eşleştiğini denetler. Yeni web sayfası satırsız eklenirse betik başarısız olur.
