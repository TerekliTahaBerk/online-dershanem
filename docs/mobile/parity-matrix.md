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
| 1. Yönetim (`/panel/yonetim`) | 28 | 27 | 0 | 0 | 0 | 1 |
| 2. Deneme Ligi yönetimi (`/panel/odk/yonetim`) | 8 | 5 | 0 | 3 | 0 | 0 |
| 3. Öğretmen + Yön koçu (`/panel/ogretmen`) | 20 | 19 | 1 | 0 | 0 | 0 |
| 4. Deneme Ligi öğretmen (`/panel/odk/ogretmen`) | 2 | 2 | 0 | 0 | 0 | 0 |
| 5. Öğrenci (`/panel/ogrenci`) | 18 | 15 | 1 | 1 | 0 | 1 |
| 6. Deneme Ligi öğrenci (`/panel/odk/ogrenci`) | 5 | 3 | 1 | 0 | 1 | 0 |
| 7. Veli (`/panel/veli`) | 12 | 8 | 1 | 1 | 0 | 2 |
| 8. Deneme Ligi veli (`/panel/odk/veli`) | 2 | 2 | 0 | 0 | 0 | 0 |
| 9. Ortak / hesap / yönlendirme | 11 | 8 | 1 | 0 | 0 | 2 |
| **Toplam** | **106** | **89** | **5** | **5** | **1** | **6** |

Hedef (Faz 6 çıkışı): Eksik = 0, Kısmi = 0; İstisna yalnız onaylı satırlar.

### Ana bulgular

1. **Yönetim kod eşliği tamamlandı.** P2.9 gerçek HTTP/iPhone kabulü ve P1 operasyon kanıtı açık.
2. **Deneme Ligi yönetiminde K01, K02, K05, K06 ve K07 native tamamlandı.** K03/K04/K08 okumaları ile sınav editörü, puanlama ve yayın yazmaları açık; mevcut `/api/odk/admin/**` servisleri ve personel izinleri temel alınacak.
3. **Server Action kalanları:** V10 paket görüşmesi talebi (1) ve C07/C08 ayarlar (7); Y27 ve T20 ortak servis + native uçlara taşındı.
4. **S12/V09 geri bildirim yetkisi düzeltildi.** OD/OK öğrenci ve aktif akademik veli bağı gerçek HTTP ile doğrulandı. V07 veli görüşme kapsamı/kabulü açık.
5. **P4 kalanları:** K03 kapsamlı sınav çalışma alanı, K04 canlı operasyon/müdahale ve K08 pilot koşuları. K05/K06/K07 okumaları native tamamlandı.

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
| Y13 | `/panel/yonetim/egitim` | `groups` | O: ders/grup/ödev/materyal yönetim görünümü · Y: grup oluştur/düzenle, ders oluştur + seri önizleme, ders düzenle, ödev oluştur/düzenle, teslim değerlendir, materyal yükle/düzenle, ilk kurulum (`setup`), kullanıcı oluştur, ilişki | `groups` POST, `groups/[id]` PATCH, `lessons` POST, `lessons/preview-series` POST, `lessons/[id]` PATCH, `assignments*`, `assignment-submissions/[id]/review`, `materials*`, `materials/upload`, `setup`, `users`, `relationships`, `curriculum/outcomes/search`, `teacher/outcome-favorites` | Hazır (okuma: `GET /api/panel/admin/education`; mevcut yazma uçları) | `admin-education` + `admin/education-editor` | Tam | P2.3 | Grup/üye, ders/seri önizleme ve tüm yaşam döngüsü kapsamları, ödev/kanıt/rubric değerlendirme, materyal bağlantı/dosya/düzenleme/arşiv ve hızlı kurulum native. Ortak web işleyicileri ADMIN step-up, aktöre bağlı idempotency, sürüm kontrolü ve atomik audit/bildirim/outbox kullanır. Gerçek HTTP ve native akış testleri geçti; fiziksel iPhone ve özel Blob kabulü Faz 6’da. |
| Y14 | `/panel/yonetim/gruplar/[id]` | — | O: grup 360 · Y: grup güncelle, üye ekle, öğrenci listesi | `groups/[id]` PATCH, `groups/[id]/members` POST, `groups/[id]/students` GET; `group-360-server.ts` | Hazır (`GET /api/panel/admin/groups/[id]?sekme=` aynı yükleyici) | `admin/group/[id]` | Tam | P2.3 | Beş sekme ve grup/üye yazmalarına ek olarak programdan gruba ders/seri oluşturma ve ders düzenleme/telafi/yedek/iptal akışları native. HTTP seri kapsamı ve sürüm çakışması doğrulandı; fiziksel cihaz kabulü Faz 6’da. |
| Y15 | `/panel/yonetim/takvim` | `calendar` | O: kurum takvimi · Y: .ics dışa aktar | `calendar/export` GET; Prisma | Hazır (`GET /api/panel/admin/education/editor?kind=calendar`) | `admin-calendar` | Tam | P2.3 | Native haftalık görünüm, grup/öğretmen filtreleri, ders detayına geçiş ve kimlikli ICS indirme/paylaşma. Kurum dışa aktarımı mevcut web aralığını korur; fiziksel paylaşım kabulü Faz 6’da. |
| Y16 | `/panel/yonetim/kazanimlar` | `outcomes` (flag `learningOutcomes`) | O: kazanım sürümleri · Y: kazanım oluştur, sürüm oluştur/güncelle | `curriculum/outcomes` POST, `curriculum/versions` POST, `curriculum/versions/[id]` PATCH | Hazır (`GET /api/panel/admin/education/editor?kind=version`) | `admin-curriculum` | Tam | P2.3 | Bayrağa bağlı native sürüm listesi/detayı/durum değişikliği, kazanım oluşturma/detayı ve son 30 gün ders/ödev etiket kapsaması. Sürüm çocuk kayıtlarını içeren revizyonla korunur; HTTP oluşturma/aktif etme/eski sürüm reddi geçti. |
| Y17 | `/panel/yonetim/kocluk` | `coaching` | O: kapasite, atama/gecikme/plan/hedef/sinyal kuyrukları, öğrenci takip ve görüşme detayı · Y: koç ata/devret | `loadAdminCoaching` (web/mobil ortak); `assignCoachService` | Hazır | `admin-coaching`, `admin/coaching-session/[id]` | Tam | P2.4 | GET `/api/panel/admin/coaching`, görüşme detayı; POST atama taze step-up, UUID, atama sürümü, 409 ve atomik audit ile. Son kapasite yarışı/tekrar/rol sınırı testli; gerçek iPhone kabulü P6. |
| Y18 | `/panel/yonetim/denemeler` | `mock-analysis` (flag `mockExamAnalysis`) | O: öğrenci seçimi, son denemeler (net, doğru/yanlış/boş), kişisel hata eğilimi ısı tablosu, tekrarlayan neden ve tek sonraki adım · Y: deneme girişi (elle / toplu yapıştırma, bölüm süresi, en fazla 3 neden), hata nedeni revizyonu, sonraki adım onayı | `loadAdminMockExams` (`lib/panel/admin-mock-exams-server.ts`, sayfadan taşındı); yazma: `mock-exams` POST, `mock-exams/[id]` PATCH → `lib/panel/mock-exam-service.ts` (yönetici taze step-up, aktöre bağlı işlem anahtarı, revizyon/409, atomik audit) | Hazır (`GET /api/panel/admin/mock-exams?ogrenci=`) | `admin-mock-exams` | Tam | P2.8 | Toplu yapıştırma ayrıştırıcısı web ve mobilde ortak (`parseMockExamPaste`); öğretmen / öğrenci akışı değişmedi |
| Y19 | `/panel/yonetim/siparisler` | `orders` | O: sipariş listesi, sorun/bu ay filtresi, arama ve sayfalama | `loadAdminOrders` (web/mobil ortak) | Hazır (`GET /api/panel/admin/orders`) | `admin-orders` | Tam | P2.6 | Native liste; ödeme ve erişim ayrı gösterilir. `admin-orders.test.tsx`, `admin-orders.integration.ts`, gerçek HTTP `admin-orders.spec.ts`. Müşteri satın alma akışı eklenmez. |
| Y20 | `/panel/yonetim/siparisler/[id]` | — | O: vaka/ödeme/ürün erişimi/onboarding/teknik detay · Y: provizyon tekrarı; mevcut aktivasyon formlarına geçiş | `loadAdminOrder`, `retryOrderProvisioningService` (web/mobil ortak) | Hazır (`GET /api/panel/admin/orders/[id]`, `POST .../provisioning-retry`) | `admin/order/[id]` | Tam | P2.6 | Web/mobil tekrar taze step-up, UUID, sipariş sürümü ve 409 ile korunur; sahiplenme ve kalıcı başlangıç kaydı atomiktir. Aynı isteğin sonucu tekrar okunur, süren istek yeniden yürütülmez. Başarı/hata/ODK/yarış/geri alma ve native onay/428/409 testli; gerçek iPhone P6. |
| Y21 | `/panel/yonetim/analitik` | `analytics` | O: yönetim metrikleri, yedi filtre, ticari/eğitim/başarı özetleri ve kohort grafiği | `loadManagementAnalyticsSnapshot` (web/mobil ortak) | Hazır (`GET /api/panel/admin/analytics`) | `admin-analytics` | Tam | P2.8 | CSV dışa aktarımı onaylı E5 istisnası. Küçük kohortlar JSON sınırında bastırılır; native filtre ve grafik testli. |
| Y22 | `/panel/yonetim/analitik/[metric]` | — | O: metrik değeri, tanım, payda, kaynak, tarih semantiği ve saat dilimi | Ortak `metricValue`, metrik kataloğu ve snapshot | Hazır (`GET /api/panel/admin/analytics`) | `admin/metric/[metric]` | Tam | P2.8 | Liste filtreleri detaya taşınır; yönetim web yolu yalnız analitik menüsü yetkisiyle eşlenir. |
| Y23 | `/panel/yonetim/ozellikler` | `features` | O: özellik durumu, olgunluk, sorumlu, rol, veri/test/geri alma bilgisi, eski public env uyumsuzluğu ve son işlemler | `loadAdminFeatures` (web/mobil ortak) | Hazır (`GET /api/panel/admin/features`) | `admin-features` | Tam | P2.8 | Web gibi salt okunur. Runtime politika yazması ADR-0015 onayını bekler; bu teslimata dahil değildir. |
| Y24 | `/panel/yonetim/kayitlar` | `audit` | O: tür filtreli en yeni 100 işlem, aktör ve İstanbul zamanı | `loadAdminAudit` (web/mobil ortak) | Hazır (`GET /api/panel/admin/audit`) | `admin-audit` | Tam | P2.8 | Hassas audit payload taşınmaz; rol, özel önbellek, filtre ve boş görünüm testli. |
| Y25 | `/panel/yonetim/pilot` | `pilot` | O: yayın hazırlık kapıları, aktif gruplar, son 20 kohort (rol kapsaması, sürüm) · Y: gruptan dört rollü kohort oluştur, aktive et / duraklat / sürdür / tamamla / geri al (durdurma nedeni) | `loadPilotPage` (`lib/panel/pilot-server.ts`, sayfadan taşındı); yazma: `pilot-cohorts` POST, `pilot-cohorts/[id]` PATCH → `lib/panel/pilot-cohort-service.ts` (taze step-up, aktöre bağlı işlem anahtarı, sürüm/409, atomik audit) | Hazır (`GET /api/panel/admin/pilot`) | `admin-pilot` | Tam | P2.8 | İzinli geçişler `pilotTransitionAllowed`'dan; aktivasyon kapıları sunucuda. Deneme Ligi pilotu (`odk-pilot`) P4 |
| Y26 | `/panel/yonetim/kalite` | `quality` (flag `cohortQuality`) | O: kazanım etiketleme, geri bildirim medyanı, eşleşmiş kohort dağılımı ve ortak hata sinyalleri | `loadAdminQuality` (web/mobil ortak) | Hazır (`GET /api/panel/admin/quality`) | `admin-quality` | Tam | P2.8 | Bayrak kapalıysa 404; küçük kohortta sayı/kapsama/tazelik JSON yanıtından çıkarılır. Gerçek DB/HTTP ve native testli; gerçek iPhone P6. |
| Y27 | `/panel/yonetim/isletme/[section]` | `business-*` (16 bölüm) | O: genel bakış, mesaj kutusu, adaylar, satış hunisi, reklamlar, kampanyalar, gelirler, giderler, vergiler, mutabakat, raporlar, AI bilgi merkezi, otomasyon, entegrasyonlar, sistem kayıtları, ayarlar · Y: **36 eylem** — konuşma ata/etiketle/okundu/kontrol; aday oluştur/aşama/not/görev/takip/sahip/öncelik/birleştir/sipariş bağla/yaşam döngüsü; kampanya/reklam oluştur; finans işlemi oluştur/ters kayıt; dönem kilidi; mutabakat çalıştır/çöz; Meta senkron; manuel atıf; bilgi kaydı oluştur/sürümle; prompt sürümü; AI öneri; otomasyon oluştur/aç-kapa/dry-run; saklama ayarı; işletme rolü ver/al; Instagram mesaj gönder | SA `app/panel/yonetim/isletme/actions.ts`; `admin/business/reports.csv`, `integrations/instagram/{health,send}`; `lifecycle/lead-detail-server.ts`; okuma `loadBusinessSectionData` (`lib/business/section-data-server.ts`, sayfadan taşındı) | O hazır (`GET /api/panel/business/sections/[section]`, kapı `requireBusinessApi`); Y: CRM hazır (`POST /api/panel/business/crm` → `lib/business/crm-service.ts`; yanıt `integrations/instagram/send`); pazarlama + finans hazır (`POST /api/panel/business/ops` → `lib/business/ops-service.ts`; finans kaydı / ters kayıt / dönem kilidi taze step-up); AI / otomasyon / ayarlar ortak governance servisi (P2.7d); rol ver/al step-up | `business/*` (merkez, 16 bölüm, konuşma ve aday detayı) | Tam | — | P2.7a: 16 bölümün okuması native (süzgeçler, sayfalama, konuşma / aday detayı); görünürlük bootstrap `business`, yetki `BusinessRoleAssignment` (ADR-0011). P2.7b: 17 CRM eylemi servise taşındı ve native (konuşma denetimi, okundu, atama, etiket, AI önerisi, yanıt; aday oluştur, aşama, not, görev, takip, sorumlu, öncelik, kopya, birleştirme, sipariş / hesap bağı). P2.7c: 9 pazarlama + finans eylemi servise taşındı ve native (kampanya, manuel reklam, manuel atıf, Meta senkronu, gelir / gider, ters kayıt, dönem kilidi, mutabakat çalıştır / çöz). P2.7d: kalan 9 eylem ortak servis + native formlar; işlem anahtarı, revizyon, atomik rol/oturum iptali. Kanıt: `business-governance.integration.ts`, `business-governance.spec.ts`, `mobile/src/test/business.test.tsx`. Gerçek iPhone kabulü P6. E3 ve E5 kapsam dışı |
| Y28 | `/panel/yonetim/isletme` | — | — | `redirect → genel-bakis` | — | — | Yönl. | — | |

## 2. Deneme Ligi yönetimi — `/panel/odk/yonetim` (ADMIN + izinli Deneme Ligi personeli)

Mobil karşılık: `odk-management-*` ekranları ADMIN ve yetkili ODK personeli; `teacher-odk-reports` yalnız ilişkili öğrenci raporlarıdır.

| # | Web rotası | Nav id | Alt işlemler (O / Y) | Web kaynağı | API | Mobil | Durum | Faz | Not |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| K01 | `/panel/odk/yonetim` | `today` | O: personel çalışma alanı özeti, pilot hazırlığı | `odk/admin-exam-server.ts`, `odk/pilot-readiness-server.ts` | Ortak GET projeksiyonu | `odk-management-home` | Tam | P4 | |
| K02 | `/panel/odk/yonetim/sinavlar` | `odk-exams` | O: sınav listesi · Y: sınav oluştur, seri oluştur | `odk/admin/exams` POST, `odk/admin/exam-series` POST | Ortak GET/POST + sürüm/receipt | `odk-management-exams` | Tam | P4 | |
| K03 | `/panel/odk/yonetim/sinavlar/[id]` | — | O: sınav detayı, önizleme, sonuçlar, dosya, girişim · Y: düzenle, sorular, cevap anahtarı içe aktar (doğrula/uygula), kazanım içe aktar, dosya yükle, hazır işaretle, takvim, oturumlar, atamalar, puanla, yeniden puanla, yayın önizleme, yayınla, girişim düzelt | `odk/admin/exams/[id]` PATCH + `{questions,imports/answer-key,imports/outcomes,files,preview,ready,schedule,sessions,assignments,score,rescore,results,release/preview,release}`, `odk/admin/files/[fileId]`, `odk/admin/attempts/[id]` | Hazır (detay okuma RSC → GET eklenmeli) | — | Eksik | P4 | Yayın/yeniden puanlama/anahtar → step-up. "Önizleme" çözme değildir |
| K04 | `/panel/odk/yonetim/operasyon` | `odk-ops` | O: canlı oturumlar, ihlal/bağlantı sayaçları · Y: girişim müdahalesi | `odk/admin/attempts/[id]` GET/PATCH | Y var, O yok | — | Eksik | P4 | Aralıklı yenileme |
| K05 | `/panel/odk/yonetim/sonuclar` | `odk-results` | O: puanlama/yayın kuyruğu + filtre | `odk/results-queue-server.ts` | Ortak GET projeksiyonu | `odk-management-results` | Tam | P4 | Eylemler K03 üzerinden; detay şimdilik web’de |
| K06 | `/panel/odk/yonetim/raporlar` | `odk-reports` | O: kitle bazlı sonuç raporları | `odk/reporting-server.ts`, `odk/report-table-server.ts` | Ortak GET projeksiyonu | `odk-management-reports` | Tam | P4 | Genel rapor yalnız `odk:report:read_all`; ilişkili öğretmen ayrı |
| K07 | `/panel/odk/yonetim/paketler` | `odk-packages` | O: ticari paket sözleşmesi | `odk/product-contract` (RSC) | Ortak GET projeksiyonu | `odk-management-packages` | Tam | P4 | Salt okuma |
| K08 | `/panel/odk/yonetim/pilot` | `odk-pilot` | O: pilot koşuları · Y: koşu oluştur/güncelle | `odk/admin/pilot-runs` POST, `pilot-runs/[id]` PATCH | Y var, O yok | — | Eksik | P4 | |

## 3. Öğretmen ve Yön koçu — `/panel/ogretmen` (TEACHER; OD / Yön çalışma alanı)

| # | Web rotası | Nav id | Alt işlemler (O / Y) | Web kaynağı | API | Mobil | Durum | Faz | Eksik alt işlemler / not |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T01 | `/panel/ogretmen` | `today` (OD) | O: Bugün | `teacher-workspace-server.ts`; `staff/teacher/home` | Hazır | `teacher-home` | Tam | — | Dino kısa yolu P5'te (S18) |
| T02 | `/panel/ogretmen/takvim` | `lessons` | O: ders takvimi | Prisma (RSC); mobil `staff/teacher/lessons` | Hazır | `teacher-lessons` | Tam | — | |
| T03 | `/panel/ogretmen/ders/[id]` | — | O: ders detayı · Y: yoklama/kapanış, ders notları, dersten ödev oluştur, şablon oluştur/düzenle/sil/uygula, kazanım arama/favori | `lessons/[id]/notes` PUT, `assignments` POST, `teacher/templates*`, `curriculum/outcomes/search`, `teacher/outcome-favorites`; `teacher-lesson-server.ts` | Hazır | `teacher/lesson/[id]`, `teacher/education-editor` | Tam | P3.1 | Ortak hazır/kişisel şablonlar, native arama/favori. Şablon tekrar/409/IDOR gerçek HTTP; native belirsiz hata tekrarı ve favori testi. Cihaz kabulü P6 |
| T04 | `/panel/ogretmen/odevler` | `assignments` | O: ödev listesi, teslim kuyruğu · Y: teslim değerlendir, ödev oluştur/düzenle, kazanım arama | `assignments` POST, `assignments/[id]` PATCH, `assignment-submissions/[id]/review`, `staff/teacher/education`; `teacher-assignments-server.ts` | Hazır | `teacher-assignments`, `teacher/submission/[id]`, `teacher/education-editor` | Tam | P3.1 | Öğretmen kapsamlı ortak eğitim editörü; Bearer yazmaları atomik receipt/sürüm kontrolü kullanır. Gerçek HTTP tekrar/409/IDOR; native ağ tekrarı |
| T05 | `/panel/ogretmen/yardim` | `help` | O: yardım kutusu · Y: yanıtla | `student-help-requests/[id]/respond` | Hazır | `teacher-help` | Tam | — | |
| T06 | `/panel/ogretmen/gruplar` | `students` | O: grup + öğrenci listesi | `teacher-roster-server.ts` | Hazır (`staff/teacher/students`) | `teacher-students` | Tam | P3.2 | Ortak roster, sunucu filtreleri ve native profil bağlantısı; yabancı öğretmen/öğrenci ve sona ermiş kayıt gerçek HTTP testleri geçti |
| T07 | `/panel/ogretmen/ogrenci/[id]` | — | O: öğretmen kapsamlı öğrenci 360 · Y: bayraklı Dino bağlamı (veli/öğretmen ataması web’de de yalnız ADMIN) | `loadStudent360Bundle`, Dino açıklama | Hazır (okuma: `staff/teacher/students/[id]`) | `teacher/student/[id]` | Kısmi | P3.2 / P5.4 | Native profil sekmeleri, ticaret/yönetim alanları kapalı; HTTP IDOR ve ilişki sona erme testi geçti. Dino bağlamı açık |
| T08 | `/panel/ogretmen/materyaller` | `materials` | O: materyaller · Y: yükle, oluştur, düzenle, dosya | `staff/teacher/education`, `materials` POST, `materials/[id]` PATCH, `materials/upload`, `materials/[id]/file` | Hazır | `teacher-materials`, `teacher/education-editor` | Tam | P3.1 | Ortak native dosya seçici/yükleme ve özel dosya açma; öğretmen kapsamlı seçenekler; HTTP yabancı materyal ve 413 testi. Gerçek Blob/iPhone kabulü P6 |
| T09 | `/panel/ogretmen/tekrar` | `review` | O: kuyruk gözetimi · Y: kaynak referansından tekrar oluştur | `staff/teacher/review`, `review-queue` POST, ortak `teacher-review-server` | Hazır | `teacher-review` | Tam | P3.3 | Ortak web/mobil yükleyici; native öğrenci seçimi, kaynak formu ve gözetim. Bearer tekrar oluşturma atomik receipt/öğrenci sürümü; HTTP tekrar/IDOR/409, native belirsiz hata tekrarı |
| T10 | `/panel/ogretmen/telafi` | `recovery` | O: telafi paketleri · Y: paket üret, yayınla | Ortak servis `lib/recovery-package-server.ts`; `GET/POST /api/panel/staff/teacher/recovery` | Hazır; ortak web yükleyicisi | `teacher-recovery` | Tam | — | Son 30 gün, aktif kayıt ve ders öğretmeni kapsamı; native özet/kaynak/mini kontrol önizlemesi, taslak yenileme ve insan onaylı yayın. Atomik receipt/audit/bildirim/outbox, kaynak değişikliğinde revizyon reddi; aynı yayın anahtarının eşzamanlı tekrarı tek bildirim üretir. Gerçek HTTP ve native testler geçti; iPhone kabulü P6. |
| T11 | `/panel/ogretmen/mudahale` | `interventions` | O: öğretmen kapsamlı kayıtlar, süzgeç ve geçmiş · Y: elle oluştur, üstlen, başlat, not, beklet, çöz, yanlış işaret, yeniden aç, üret | Ortak `intervention-write-server`, `intervention-server`, `intervention-inbox-server` | Hazır (`GET/POST /api/panel/staff/teacher/interventions`) | `teacher-interventions` | Tam | P3.3 | Atomik receipt/audit, kayıt sürümü + kapsam revizyonu; sahiplik ve biten üyelik reddi. `mobile-teacher-interventions.spec.ts`, `teacher-interventions.test.tsx`; gerçek iPhone kabulü P6 |
| T12 | `/panel/ogretmen/ozetler` | `digests` | O: haftalık özet önizlemesi · Y: seçili öğrenci için üret/yenile, onayla/yayımla | Ortak `teacher-digests-server`, `generateCalmDigest` | Hazır (`GET/POST /api/panel/staff/teacher/digests`); web uçları aynı servis | `teacher-digests` | Tam | P3.3 | Taslak/alıcı revizyonu, atomik receipt/audit/bildirim/outbox, yayın insan onayı. `mobile-teacher-digests.spec.ts`, `teacher-digests.test.tsx`; iPhone kabulü P6 |
| T13 | `/panel/ogretmen/analiz` | `analiz` | O: grup ortalamaları, düşen gidişat ve öğrenci listesi | `staff/teacher/analysis`, ortak `loadTeacherGidisatOverview` | Hazır | `teacher-analysis` | Tam | P3.2 | Bayrak + OD personel izni; yalnız aktif grup/kayıt; native ortalamalar ve profil bağlantıları. HTTP yabancı öğretmen/sona ermiş kayıt boş liste |
| T14 | `/panel/ogretmen/ai-yardimci` | `ai-drafts` | O: taslaklar · Y: taslak oluştur, onayla/düzenle | `ai-drafts` POST, `ai-drafts/[id]` PATCH | Ortak kaynaklı servis + scoped GET/POST | `teacher-ai-drafts` | Tam | P3 | Kaynak/düzenleme/insan onayı/reddetme/flag native; kaynak revizyonu, tek sağlayıcı çağrısı, atomik receipt/audit ve özel not sınırı doğrulandı; bayrak ve mevcut gateway korunur, onay otomatik yayın değildir |
| T15 | `/panel/ogretmen/denemeler` | `mock-exams` | O: dış deneme analizi · Y: kayıt ekle, hata nedenlerini düzenle, sonraki eylemi onayla | `staff/teacher/mock-exams`, `mock-exams` POST, `mock-exams/[id]` PATCH, ortak `teacher-mock-exams-server` | Hazır | `teacher-mock-exams` | Tam | P3.2 | Aktif öğretmen/grup/kayıt kapsamlı GET; ortak native giriş/yapıştırma/revizyon/onay. HTTP IDOR/ilişki sona erme; native öğretmen sorgusu yenileme |
| T16 | `/panel/ogretmen/plan` | `plan` | O: haftalık plan / öneriler · Y: planı onayla, öneri incele | `adaptive-plan/[id]/approve`, `kocum/suggestions/[id]/review` | Hazır | `coach-plans`, `coach/plan/[id]` | Tam | — | Yön alanında |
| T17 | `/panel/ogretmen/yon` | `today` (OK) | O: koç Bugün | `kocum/coach-workspace-server.ts`; `staff/coach/home` | Hazır | `coach-home` | Tam | — | |
| T18 | `/panel/ogretmen/yon/ogrenciler` | `coach-students` | O: koçluk öğrencileri | `staff/coach/students` | Hazır | `coach-students` | Tam | — | |
| T19 | `/panel/ogretmen/yon/gorusmeler` | `coach-sessions` | O: görüşmeler | `staff/coach/sessions` | Hazır | `coach-sessions`, `coach/session/[id]` | Tam | — | |
| T20 | `/panel/ogretmen/hazirlik/[id]` | — | O: öğrenci hazırlık çalışma alanı · Y: görüşme oluştur/güncelle, not, görev oluştur, görev ertele, öneri incele, plan onayla/kopyala, şablon uygula, özet oluştur, görüşme kaydet (SA `recordCoachingSession`), öğrenci hedefi koy (SA `setStudentGoal`) | `coaching-sessions*`, `kocum/{notes,tasks,tasks/[id]/reschedule,suggestions/[id]/review,plans/[id]/copy,templates/[id]/apply,summaries}`, `adaptive-plan/[id]/approve`, SA `recordCoachingSession`, `setStudentGoal` | Hazırlık GET/POST + ortak servisler | `coach/student/[id]` | Tam | P3 | Altı hazırlık yazması native; aktif atama/üyelik, revizyon, atomik receipt/audit, özel not ayrımı ve eşzamanlı tekrar gerçek HTTP ile doğrulandı; iPhone kabulü P6 |

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
| S03 | `/panel/ogrenci/takvim` | `lessons` | O: dersler · Y: .ics dışa aktar | Hazır | `od-lessons` | Tam | — | Kimlikli ICS indir/paylaş, geçici dosya temizliği; `profile-calendar.test.tsx`, `mobile-p5-basics.spec.ts`. iPhone paylaşma kabulü P6 |
| S04 | `/panel/ogrenci/takvim/[id]` | — | O: ders detayı, katılım | Hazır | `od/lesson/[id]` | Tam | — | |
| S05 | `/panel/ogrenci/materyaller` | `materials` | O + dosya aç | Hazır | `od-materials` | Tam | — | |
| S06 | `/panel/ogrenci/tekrar` | `review-recovery` | O · Y: yanıtla, ertele | Hazır | `od-review-recovery` | Tam | — | |
| S07 | `/panel/ogrenci/telafi` | `review-recovery` | O · Y: madde tamamla, kontrol noktası | Hazır | `od/review-recovery` | Tam | — | |
| S08 | `/panel/ogrenci/analiz` | `analiz` | O · Y: haftalık hedef | Hazır | `od-progress` | Tam | — | |
| S09 | `/panel/ogrenci/gelisim` | `progress` | — | — | — | Yönl. | — | `redirect → analiz` / ana sayfa |
| S10 | `/panel/ogrenci/denemeler` | `mock-exams` | O: dış denemeler · Y: sonuç ekle, düzenle | Hazır | `external-mock-exams` + `od/mock-exam-editor` | Tam | P5.1 | Ortak native giriş/yapıştırma/hata nedeni formu, kişisel ısı haritası, sürüm ve işlem anahtarı; OK üyeliğiyle gerçek HTTP oluşturma/tekrar/409 ve personel onayı reddi test edildi |
| S11 | `/panel/ogrenci/check-in` | `check-in` | O · Y: check-in, yardım geri bildirimi | Hazır | `check-in` | Tam | — | |
| S12 | `/panel/ogrenci/haftalik` | `weekly-digest` | O · Y: geri bildirim | Hazır | `od-weekly-digest`, `yon-weekly` | Tam | — | OD/OK öğrenci geri bildirimi; `mobile-p5-basics.spec.ts` yalnız OK hesabıyla gerçek HTTP kanıtı |
| S13 | `/panel/ogrenci/yon` | `today` (OK) | O · Y: görev tamamla | Hazır | `yon-today` | Tam | — | |
| S14 | `/panel/ogrenci/plan` | `plan` | O · Y: görev tamamla, değişiklik iste, tercihler, plan üret | Hazır | `yon-plan`, `yon/task/[id]` | Kısmi | P5 | `adaptive-plan/generate` |
| S15 | `/panel/ogrenci/hedefler` | `goals` | O | Hazır | `yon-goals` | Tam | — | |
| S16 | `/panel/ogrenci/kocluk` | `coaching` | O · Y: görüşme saat değişikliği iste, öneriyi kabul et | Hazır | `yon-coaching` | Tam | — | |
| S17 | `/panel/ogrenci/profil` | — | O: profil | Hazır (`student/profile` GET) | `account/profile` | Tam | — | Native profil; aktif veli bağları ve başlamış ürünler; `profile-calendar.test.tsx`, `mobile-p5-basics.spec.ts` |
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
| V04 | `/panel/veli/takvim` | `lessons` | O · Y: .ics dışa aktar | Hazır | `parent-lessons` | Tam | — | Kimlikli ICS indir/paylaş, geçici dosya temizliği; `profile-calendar.test.tsx`, `mobile-p5-basics.spec.ts`. iPhone paylaşma kabulü P6 |
| V05 | `/panel/veli/odevler` | `assignments` | O | Hazır | `parent-assignments` | Tam | — | |
| V06 | `/panel/veli/ogretmenler` | `teachers` | O | Hazır | `parent-teachers` | Tam | — | |
| V07 | `/panel/veli/kocluk` | `coaching` | O · Y: görüşme saat değişikliği talebi, katılım bağlantısı | Yetki | `parent-coaching` | Kısmi | P5 | `coaching-sessions/[id]` veli kapsamı doğrulanmalı |
| V08 | `/panel/veli/denemeler` | `mock-exams` | O | Hazır | `parent-external-exams` | Tam | — | |
| V09 | `/panel/veli/haftalik` | `weekly-digest` | O · Y: geri bildirim | Hazır | `parent-weekly` | Tam | — | Hedef çocuğun OD/OK üyeliği + aktif akademik veli bağı; `mobile-p5-basics.spec.ts` olumlu/yabancı/pasif/izinsiz bağ testleri |
| V10 | `/panel/veli/hesap` | `account` | O: hesap ve paket · Y: paket görüşmesi iste | `POST /api/panel/parent/account/package-meeting` (SA ile ortak `lib/panel/parent-package-meeting.ts`) | `parent-account` | Tam | P5.2 | Yalnız `account` amaçlı bağlı çocuk; onaylı talep, işlem anahtarıyla tek `LeadSubmission`. Fiyat / satın alma yok (MD-09). `account-settings.integration.ts`, `account-settings.test.tsx` |
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
| C07 | `/panel/ayarlar` | O: ayar bölümleri | `GET /api/panel/me/settings` (`lib/account/settings-service.ts`) | `account/settings` | Tam | P5.2 | Tamamlama listesi bölüme götürür; aktif paketler (satın alma bağlantısı yok); panel tercihleri bayrağa bağlı |
| C08 | `/panel/ayarlar/[section]` | Y: profil, iletişim, eğitim, fatura, onaylar, bekleyen çocuk ekle/iptal (7 SA) | `POST /api/panel/me/settings` (7 SA ile ortak servis) | `account/settings/[section]` | Tam | P5.2 | Rol bölüm kapsamı (403), revizyon (409 `STALE_REVISION`), aktör kapsamlı makbuz; KVKK tek yönlü; ödemesi alınmış çocuk kaldırılamaz |
| C09 | `/panel/guvenlik` | O: MFA durumu · Y: TOTP kaydı, passkey, kod doğrulama (step-up) | Hazır | `mfa` (giriş kapısı), `StepUpProvider` (step-up) | Kısmi | P5 | Faz 1: native TOTP step-up + bootstrap `capabilities.security`. Kalan: MFA kaydı ve passkey yönetimi (P5) |
| C10 | `/panel/erisilebilirlik` | Y: erişilebilirlik tercihleri | O: `me/settings` · Y: mevcut PATCH (`expectedVersion`) | `account/accessibility` | Tam | P5.2 | Bayrak kapalıyken kapalı; 409'da güncel sürüm yeniden okunur |
| C11 | `/panel/veri-kullanimi` | Y: düşük veri tercihleri | O: `me/settings` · Y: mevcut PATCH (`expectedVersion`) | `account/data-usage` | Tam | P5.2 | `offlineMode` bayrağı kapalıyken kapalı; çevrimdışı yazma tercihi yalnız web paneline uygulanır |

**P2.9 kod teslimatı (11 Ekim 2026):** native seçici, kişi detayından giriş, kalıcı çıkış bandı, oturuma bağlı Bearer overlay ve öğretmen modu uygulandı. `full-parity-roadmap.md` P2.9 devam kaydında kalan kabul işleri ve test kanıtı bulunur. Gerçek HTTP/iPhone kabulü beklediğinden rota durumları/toplamları değiştirilmedi.

**Ortak kabuk (rota değil, sayıma girmez):** çıkış ve ürün değiştirme mobilde var. ADMIN kabuğu `admin-search` (global arama, P1), `admin-preview*` (önizleme — E2, native, salt okuma, P2.9) ve `admin-teacher-mode` (öğretmen modu — E6, native, P2.9) kullanır.

---

## Bilinçli istisnalar ve kapsam kararları

Karar tarihi: 11 Ekim 2026 (ürün sahibi).

| Kimlik | Konu | Karar | Gerekçe / uygulama | Etkilenen satırlar |
| --- | --- | --- | --- | --- |
| E1 | Deneme/sınav çözme | **İstisna (onaylı)** | Ürün kararı; bütünlük izleme web'de | S23, S21 "Başlat" |
| E2 | Yönetici önizlemesi (View As) | **Kapsamda — native** | ADMIN, öğrenci/veli/öğretmen panelini mobilde görüntüler. Önizleme salt okumadır: sunucu önizleme açıkken mutasyonu reddeder (`docs/admin-panel-preview.md`), mobil yazma düğmelerini gizler. Çerez yerine Bearer oturumuna bağlı imzalı önizleme belirteci uygulandı; native menü + kişi detayı girişleri var. Gerçek HTTP/iPhone kabulü bekliyor (P2.9) | Ortak kabuk; Y08, Y10 giriş noktaları |
| E3 | Meta/Instagram hesap bağlantısının kurulumu | **İstisna (onaylı)** — mobilde yok | Bağlantı kurulumu webde kalır; mobilde entegrasyon **durumu** (salt okuma) ve Instagram mesaj gönderme kapsamda | Y27 (entegrasyonlar bölümü) |
| E4 | Toplu kullanıcı içe aktarma | **İstisna (onaylı)** — mobilde yok | `users/bulk` webde kalır; tekil kullanıcı oluşturma/düzenleme kapsamda | Y06, Y07 |
| E5 | Büyük finans raporları ve CSV dışa aktarımları | **İstisna (onaylı)** — mobilde yok | `admin/business/reports.csv`, `reports/export`, `analytics/export` mobilde sunulmaz; ekrandaki özet/metrik görünümleri kapsamda | Y04, Y21, Y27 (raporlar bölümü) |
| E6 | Yönetici öğretmen çalışma modu (`admin-teacher-mode`) | **Kapsamda — native** | Yönetici aynı hesapla öğretmen paneline geçer; yazma açıktır ve denetim kaydı yöneticinin kimliğiyle tutulur (`docs/admin-teacher-mode.md`). Önizlemeyle birbirini dışlar. Çerezsiz taşıma P2.9 ile aynı belirteç modeliyle uygulandı; gerçek HTTP/iPhone kabulü bekliyor | Ortak kabuk |

Onaylı istisnalar **alt işlem** düzeyindedir; etkilenen satırlar kalan alt işlemleri tamamlandığında `Tam` olur. Bu istisnalar için mobil "web'de aç" bağlantısı göstermez — işlem mobil kapsamında değildir.

## Sunucu iş listesi (matristen türetilen)

| Tür | Satırlar | Adet |
| --- | --- | ---: |
| GET projeksiyonu (O yok / Y var, O yok) | K03, K04, K08 | 3 |
| Server Action → `lib/` servisi + route | V10 (1), C07–C08 (7); Y27 ortak servislere taşındı | 2 dosya / 8 eylem |
| Yetki düzeltmesi / kabul | V07 (veli görüşme işlemleri); S12/V09 ve T15 düzeltildi ve HTTP ile doğrulandı | 1 |
| Yalnız mobil sözleşme + ekran (API hazır) | K03 (+ detay GET), S14, S18, S20, V11, C09–C11 | 8 |

## Bakım

- Satır durumunu değiştiren PR, kanıt olarak test dosyasını veya `p6-validation-results.md` referansını "Not" sütununa ekler.
- Yeni web sayfası eklendiğinde bu matrise satır eklenmeden PR tamamlanmış sayılmaz.
- `node scripts/check-mobile-parity-matrix.mjs` her `app/panel/**/page.tsx` rotasının matriste tam bir satırı olduğunu, durum kodlarının geçerli olduğunu ve Özet tablosunun satırlardan hesaplanan sayılarla eşleştiğini denetler. Yeni web sayfası satırsız eklenirse betik başarısız olur.
