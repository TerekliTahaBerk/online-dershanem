# M2 uygulama raporu — OD native öğrenci deneyimi

Tarih: 2026-10-09 · Dal: `claude/loving-goodall-972n6c` (güncel `main` = `39fb658` üzerinden yeniden başlatıldı; M1 PR #438 ile birleşmişti).

## 1. Özet

onlinedershanem. (OD) çalışma alanındaki tüm öğrenci menü öğeleri M1 mimarisine taşındı: TanStack Query, paylaşılan sözleşme doğrulayıcıları (`lib/mobile-contracts/student.ts`), M1 tasarım primitives'i ve merkezi navigasyon. OD ekranlarının hiçbiri artık `useLegacySession()` kullanmıyor. Sunucuda iş kuralı kopyalanmadı: yeni JSON uçları web sayfalarının kullandığı yükleyicileri çağırıyor; dört web sayfasının sorguları ortak yükleyicilere çıkarıldı (davranış değişmedi).

## 2. Kilometre taşları

| Taş | Durum | Kısa sonuç |
| --- | --- | --- |
| M2.0 Taban ve sözleşme | ✅ | Taban ölçüldü (mobil tsc/lint temiz, Jest 80/80; kök unit 904/905 — önceden var olan CSS testi). Bağımlılıksız doğrulayıcı (`validate.ts`), öğrenci sözleşmeleri, `FEATURE_DISABLED` kodu |
| M2.1 OD Bugün | ✅ | `GET /api/panel/student/home?scope=OD`; Şimdi / Bugün / Bu hafta / Akademik gidişat / Diğer çalışma alanları |
| M2.2 Çalışmalar | ✅ | `?scope=OD`; Bekleyen / Teslim edilen / Değerlendirilen; detay; `expectedVersion` + UUID `mutationKey`; 409; kanıt idempotency |
| M2.3 Dersler + detay | ✅ | Ortak yükleyici `loadStudentLessonDetail` (web + `GET /api/panel/student/lessons/[id]`); katılım penceresi tek kaynak |
| M2.4 Kaynaklar | ✅ | Bearer indirme, kullanıcıya özel önbellek dizini, güvenli dosya adı, çıkışta temizlik |
| M2.5 Gidişatım + dış denemeler | ✅ | `GET /api/panel/student/insights` (web Analiz servisi); haftalık hedef; dış denemeler Deneme Ligi'nden ayrı |
| M2.6 Tekrar, telafi, kalan menü | ✅ | `review-queue`, `recovery`, `weekly-digest` okuma uçları (ortak yükleyici); yanıt/erteleme/adım/kontrol/geri bildirim mevcut uçlarla; check-in, Dino AI, eski "Gelişim" açık web devam yolu |
| M2.7 Bütünleştirme | ✅ | Tüm kontroller koşuldu (bkz. [m2-test-results.md](./m2-test-results.md)); belgeler |

## 3. Yeni / uyarlanan sunucu uçları

Ayrıntı: [m2-api-contracts.md](./m2-api-contracts.md).

- **Yeni:** `GET /api/panel/student/lessons/[id]`, `GET /api/panel/student/insights`, `GET /api/panel/student/review-queue`, `GET /api/panel/student/recovery`, `GET /api/panel/student/weekly-digest`.
- **Eklemeli uyarlama:** `GET /api/panel/student/home?scope=OD` (parametresiz istek birebir eski), `GET /api/panel/assignments?scope=OD` (`planTasks: []`, Yön sorgusu çalışmaz), `GET /api/panel/student/lessons` (`endsAt`, `status`, `attendance`), `GET /api/panel/assignments` satırlarına `teacherName`, `submittedAt`, `reviewedAt`.
- **Değişmeyen ve kullanılan:** ilerleme PATCH, kanıt POST, materyal listesi/dosya, haftalık hedef PATCH, dış denemeler GET, tekrar respond/defer, telafi complete/checkpoint, özet geri bildirimi.
- **Korunan eski uç:** `GET /api/panel/student/progress` (yeni ekran kullanmıyor; eski mobil sürümler için duruyor — MD-16).

## 4. Ortak yükleyiciye çıkarılan web sorguları (davranış korunarak)

| Web sayfası | Yükleyici |
| --- | --- |
| `app/panel/ogrenci/takvim/[id]` | `lib/panel/student-lesson-detail-server.ts#loadStudentLessonDetail` |
| `app/panel/ogrenci/tekrar` | `lib/panel/student-review-recovery-server.ts#loadStudentReviewQueue` |
| `app/panel/ogrenci/telafi` | `…#loadStudentRecoveryPackages` (ilk görüntüleme kaydı dahil) + `recoveryItemWebHref` |
| `app/panel/ogrenci/haftalik` | `…#loadStudentWeeklyDigest` + `recordWeeklyDigestViewed` |

Diğer küçük, davranışı değiştirmeyen değişiklikler:
- `student-home-actions.ts` katılım penceresini `lib/panel/lesson-join.ts`'ten alıyor.
- `getStudentHomeData` ve `getStudentToday` isteğe bağlı kapsam / ürün parametresi aldı.
- `progress-insights/server.ts`, öğretmen kapsamı modülünü yalnız öğretmen fonksiyonunda dinamik yüklüyor. Bu modül `next/navigation` yüklediği için öğrenci yükleyicisini Node test koşucusunda kullanılamaz kılıyordu.

## 5. Güvenlik ve yetki

- **Ürün kapısı:** Tüm yeni OD uçları `requireApiOdRole("STUDENT")` kullanıyor. Yön-only ve Deneme Ligi-only öğrenci 404 `PRODUCT_ACCESS_REQUIRED` alıyor (E2E ile doğrulandı). Bayrak kapalıysa 404 `FEATURE_DISABLED` dönüyor.
- **Ders detayı:**
  - Görünürlük web sayfasının mevcut politikasıyla aynı: öğrenci kayıtlı olduğu (aktif veya sonlanmış) grubun dersini görüyor. Kapsam genişletilmedi.
  - Başka öğrencinin özel notu sorgulanmıyor.
  - Katılım bağlantısı yalnız aktif kayıt, aktif grup, iptal edilmemiş ders ve açık pencerede veriliyor. Bu, `calendar/export` politikası ile ana sayfadaki 30 dk önce / 90 dk sonra kuralının birleşimi.
  - Bağlantı yalnız http(s) olabilir; pencere dışında yanıtta hiç yer almıyor.
- **Materyaller:**
  - Kimlikli dosya `Authorization: Bearer` ile indiriliyor; token URL'e girmiyor.
  - Dosya `cache/od-materials/<kullanıcı>/` altına yazılıyor; ad temizleniyor (`..`, ayırıcı ve özel karakter atılıyor, ad kimlikle önekleniyor).
  - Giriş, çıkış ve oturum düşmesinde dizin siliniyor.
  - Dış bağlantı yalnız http(s) ise açılıyor.
- **Yazmalar:**
  - Hiçbiri otomatik tekrarlanmıyor ve başarı mesajı yalnız sunucu onayından sonra gösteriliyor.
  - İlerleme yazması gerçek UUID `mutationKey` ve son sunucu `expectedVersion` ile gidiyor. 409 `ASSIGNMENT_PROGRESS_CONFLICT` gelirse yetkili durum yeniden yükleniyor ve öğrenciye açıklanıyor; ekran sessizce üzerine yazmıyor.
  - Kanıt ve tekrar yanıtında idempotency anahtarı aynı mantıksal yazma için yeniden kullanılıyor; sonucu belirsiz kalan (ağ / zaman aşımı) yazmada anahtar korunuyor.
  - UUID üretimi için `expo-modules-core`'un native v4 üreticisi kullanılıyor; `Math.random` ile yedek üretilmiyor.
- **Mobil koruma kapısı:**
  - `/od/...` detay rotaları `OdRouteGate` ile korunuyor: yalnız OD çalışma alanında ve öğe kullanıcının yetkili menüsündeyse açılıyor.
  - Bildirim ve derin bağlantı eşlemesi yalnız yetkili menü öğesi varken detaya gidiyor; sorgu dizesi atılıyor.
- **Paket sızıntısı:** Android ve iOS Hermes paketlerinde Prisma, `server-only`, ortam değişkeni adları ve sunucu yükleyicileri yok.
- **Gizlilik:** Yön plan tamamlama oranı ve iç risk sinyali (`riskHint`) mobil gidişat modeline alınmadı. Telafide kimlikli dosyanın depo adresi mobile verilmiyor.

## 6. Korunan / kaldırılan eski bileşenler

- **Kaldırılan OD kullanımları:** `useLegacySession`, `components/panel-ui`, `themed-*`, `constants/theme`, `hooks/use-theme`. Bu dosyalar silinmedi, çünkü tek tüketicileri Yön `ok-goals` ekranı (M3).
- **Değiştirilen eski kopyalar:** Eski OD ekran dosyaları (`od-home`, `od-lessons`, `od-assignments`, `od-materials`, `od-progress`, `external-mock-exams`) aynı yolda yeni mimariyle yeniden yazıldı.
- **Eski ödev ekranındaki "Yön Koçluk plan görevleri" bölümü kaldırıldı.** Sunucuda ödeve bağlı plan görevi kopyası oluşturulmuyor; mevcut sunucu davranışına dokunulmadı.

## 7. Kararlar ve sınırlamalar

- **Şimdi eylemi:**
  - Öncelik web planıyla aynı kaynaktan geliyor; OD kapsamında yalnız ders, telafi ve tekrar adayları var.
  - Ödev, mevcut planda "Şimdi" adayı olmadığı için yalnız Bugün listesinde görünüyor. Yeni öncelik kuralı icat edilmedi.
- **Bugün listesi:** Web öncelik sırası yerine kronolojik sıralanıyor (M2 isteği). Aynı varlık iki kez gösterilmiyor.
- **Haftalık hedef:** Web hedef yokken örnek bir metni hedefmiş gibi gösteriyor. Mobil bunun yerine "henüz hedef yazmadın" diyor; uydurma veri yok.
- **Menü fallback'leri:**
  - `check-in`, `dino` ve eski `progress` (yalnız `progressInsights` kapalıyken menüde) açık web devam yoluna gidiyor (`LATER` metni).
  - `check-in` Yön ile ortak bir form olduğu için M3 ile birlikte değerlendirilmeli.
- **Kapsam dışı bırakılanlar:**
  - Dış deneme GİRİŞİ mobilde yok; web'e yönlendiriliyor.
  - Telafi materyali indirilirken dosya adı / MIME bilinmiyor (`kind: LINK` yedeği).
- **Gerçek cihaz / simülatör testi YAPILMADI.** Ortamda cihaz yok.

## 8. Tanımlı "Bitti" ölçütleri

| Ölçüt | Durum |
| --- | --- |
| OD Bugün web OD deneyimini yansıtır; ürünler karışmaz | ✅ (entegrasyon + E2E) |
| Ödev ilerleme / kanıt akışları doğru | ✅ (mobil akış + entegrasyon + E2E 409/replay) |
| Ders listesi ve detay | ✅ |
| Korunan materyaller yalnız yetkiliye | ✅ (E2E 404/401) |
| Gidişat progress-insights'tan | ✅ (web ile birebir karşılaştırma testi) |
| Haftalık hedef kalıcı | ✅ (mobil akış; uç değişmedi) |
| Dış denemeler Deneme Ligi'nden ayrı | ✅ |
| Tekrar / telafi işlevsel veya bayrakla kapalı | ✅ |
| M2 ekranları M1 mimarisini kullanır; OD'ye özel eski durum yönetimi gereksiz | ✅ |
| Rol / ürün sınırları doğrulandı | ✅ |
| Web / mobil veri tutarlılığı test edildi | ✅ (aynı yükleyici + karşılaştırma) |
| M1 kimlik / navigasyon regresyonu yok | ✅ (M1 Jest + E2E 11/11) |
| İlgili CI / lint / tip / test geçiyor; sınırlamalar raporlandı | ✅ önceden var olan tek CSS unit hatası hariç |
| M3 devir belgesi | ✅ [m3-handoff.md](./m3-handoff.md) |
