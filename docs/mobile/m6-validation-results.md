# M6 doğrulama sonuçları — Veli

Tarih: 2026-10-10.
Ortam: yerel Postgres 16, `next build` üretim derlemesi, Chromium (Playwright), Node 22.

**Gerçek iPhone / Android cihaz, staging ve üretim doğrulaması YAPILMADI.**

Talimat gereği yeni otomatik test commit'lenmedi. "Probe" satırları scratchpad'deki geçici betiklerdir; kalıcı regresyon kapsamı **değildir**.

## 1. Mevcut paketler

| Kontrol | Sonuç |
| --- | --- |
| Kök `tsc --noEmit` | ✅ temiz |
| Kök `eslint .` | ✅ temiz |
| API girdi doğrulama envanteri | ✅ 212 rota, 235 metot (M5: 201 / 224) |
| Repo hijyeni | ✅ |
| Mobil sözleşme sınırı | ✅ 9 sözleşme dosyası |
| Mobil token senkronu | ✅ 32 değer |
| Birim (`test:unit`) | ⚠️ 928 / 929. Tek hata önceden var olan `lib/public-marketing-products.test.ts` (CSS); M6'dan bağımsız |
| Entegrasyon (CI ile aynı: taze veritabanı + seed + `BUSINESS_INTEGRATION_TEST`) | ⚠️ 98 / 100. Başarısız 2 test `adaptive-plan-product-policy.integration.ts` (KPSS geri sayım planı, OK uçtan uca). **M5 tabanında (`be54fe8`) aynı tarihte de aynı şekilde başarısız**; 2026-10-09'da 100 / 100 geçiyordu → tarihe bağlı, M6'dan bağımsız |
| Mobil `tsc` | ✅ |
| Mobil `expo lint` | ✅ |
| Mobil Jest | ✅ 141 / 141. 3 eski beklenti, M6'nın bilinçli değişikliği nedeniyle güncellendi (§5) |
| Mobil dışa aktarma (Hermes) | ✅ Android 3,6 MB, iOS 3,3 MB |
| Paket sızıntı taraması | ✅ §4 |
| E2E: mobile-api, panel-access, permission-matrix, phase0-security, panel-auth-smoke, panel-experience, coaching-experience, lesson-day, measurement-notifications, panel-design-phase7, panel-design-phase8, odk-product-quality | ⚠️ 108 geçti / 1 başarısız: `panel-experience:660` (erişilebilirlik tercihleri). M3'ten beri flaky olarak belgeli; veli kodu dokunmuyor |

**Web regresyonu:** veli Dersler / Ödevler / Koçluk / Haftalık sayfaları ortak yükleyicilere taşındı. `panel-access`, `permission-matrix`, `panel-experience`, `panel-design-phase7/8` veli akışları geçti.

## 2. Veli API probe'u — 53 / 53 (+ bayrak kapalı 4 / 4)

Kurulum: `e2e_test` veritabanı, `next start`, mobil başlıklar + Bearer. Probe kendi bağlantı ve kayıtlarını oluşturdu:

- ek çocuklar: yalnız ODK, akademik kapalı, bitmiş bağlantı, yalnız KPSS;
- gizlilik kayıtları: özel ders notu, iç ve öğrenciye özel koç notları, taslak plan, KPSS onaylı planı;
- özetler: taslak özet, başka çocuğun yayınlanmış özeti;
- ODK: `parentReports=false` sözleşmesi, hak iptali.

| # (istem §19) | Senaryo | Sonuç |
| --- | --- | --- |
| 3 | Birden çok çocuk listede | ✅ |
| 6 | `canViewAcademic=false` çocuk akademik listede yok; tüm akademik uçlar 404 | ✅ |
| 7 | Hesap amacı: akademik kapalı çocuk listede, `academicAccess=false`; sipariş / tutar yok | ✅ |
| 5 | Bitmiş bağlantı listede yok, uçlar 404 | ✅ |
| 5 | Oturum açıkken bağlantı bitti → sonraki istek 404 `CHILD_NOT_FOUND`, liste güncel | ✅ |
| 8 | Başka ailenin çocuğu ve var olmayan kimlik → 9 uçta 404 `CHILD_NOT_FOUND` | ✅ |
| 11 | Yalnız ODK çocuk: ürünler `["ODK"]` | ✅ |
| 13 | Yalnız KPSS çocuk listede yok, uçlar 404 | ✅ |
| 14 | Yanıtlarda KPSS ürün kodu yok | ✅ |
| 2 / 12 | Bağlı çocuk: 8 uç 200; `studentId` eşleşir; `private, no-store` | ✅ |
| — | `studentId` eksik 400; kimliksiz 401; öğrenci 403; öğretmen 403 | ✅ |
| 16 / 18 | Ortak ders konusu görünür; öğrenciye özel not ve not gövdesi yok; yoklama etiketi sunucudan; Meet / bağlantı yok | ✅ |
| — | Ödev ucu yazma desteklemez (POST 405); kanonik durum; öğretmen e-postası yok | ✅ |
| — | Öğretmenlerde e-posta / telefon yok | ✅ |
| 19 | `PARENT_VISIBLE` not var; `INTERNAL` / `STUDENT_VISIBLE` yok | ✅ |
| 20 | Taslak plan haftası seçilmedi | ✅ |
| — | KPSS onaylı planı Yön koçluk haftası olarak seçilmedi (M6 düzeltmesi) | ✅ |
| 21 | Öğrenci görev notu / görev başlığı yok; görüşme katılım bağlantısı yok | ✅ |
| 25 | Taslak özet görünmez | ✅ |
| 26 | Başka çocuğun özetine geri bildirim → 404 | ✅ |
| — | Kendi çocuğunun özetine geri bildirim (mevcut uç) kaydedildi, geri okundu; boş gövde 400 | ✅ |
| 10 | ODK raporu 200, `studentId = StudentProfile.id`; bütünlük / kullanıcı kimliği / doğru cevap yok | ✅ |
| — | İstemciden öğrenci `User.id` → 404 | ✅ |
| — | ODK ürünü olmayan çocuk → `available:false` | ✅ |
| 22 | `parentReports=false` → `available:false`, sınav yok | ✅ |
| 24 | ODK hakkı iptal → rapor yok | ✅ |
| 27 | Bayrak kapalı (`progressInsights`, `parentWeeklyDigest`, `mockExamAnalysis`) → 404 `FEATURE_DISABLED`; özet bayrağı kapalıyken geri bildirim ucu 404 (ikinci sunucu, port 3001) | ✅ 4 / 4 |

Probe notu: İlk koşuda 4 kontrol, **kurulum hatası** nedeniyle düştü:

- E2E veritabanında `KPSS` ürün satırı yoktu, bu yüzden üyelik oluşmadı. Ürünü olmayan çocuk mevcut "hazırlanıyor" kuralıyla görünüyordu (doğru davranış).
- Bir ortak not kontrolü yanlış dersi seçmişti.

Kurulum düzeltildi ve tam koşu 53 / 53 geçti.

## 3. Saf yardımcı probe'u — 10 / 10

| # | Senaryo | Sonuç |
| --- | --- | --- |
| 28 | Bildirim kaydındaki `studentId` okunur | ✅ |
| 30 | `studentId` yoksa null (belirsiz → bildirim kutusu) | ✅ |
| — | Bozuk `studentId` reddedilir | ✅ |
| — | Veli yolu → menü id; tanınmayan / dış yol → null | ✅ |
| — | Çalışma alanı eşlemesi (ODK raporu → ODK, dersler → OD, koçluk → OK) | ✅ |
| — | Veli bildirimi yalnız yetkili menüdeki ekrana eşlenir | ✅ |
| — | Dış derin bağlantının `studentId`'si atılır | ✅ |

## 4. Paket sızıntı taraması (Android + iOS Hermes)

Sıfır eşleşme:
- `PrismaClient`, `@prisma`, `server-only`
- `DATABASE_URL`, `NEXTAUTH_SECRET`, `CRON_SECRET`, `EXPO_ACCESS_TOKEN`
- `listParentVisibleChildren`, `resolveParentScope`, `loadParentCalmHome`, `loadParentCoaching`, `getOdkAudienceStudentReport`, `stripForParentCalm`
- `privateNote`, `canViewAcademic`, `integrityLevel`, `riskHint`, `parent-api`

## 5. Güncellenen eski beklentiler (yeni test DEĞİL)

| Dosya | Eski | Yeni | Neden |
| --- | --- | --- | --- |
| `mobile/src/navigation/navigation.test.ts` | veli `today` → `placeholder / M6` | → `parent-home` | M6 yer tutucuyu kaldırdı; testin amacı (veli öğrenci ekranına düşmez) korunuyor |
| `mobile/src/navigation/navigation.test.ts` | veli `weekly-digest` → `placeholder` | → `parent-weekly` | Aynı |
| `mobile/src/test/app-flow.test.tsx` | veli girişi `placeholder-today` | → `parent-home` (öğrenci uç çağrısı yok kontrolü aynen) | Aynı |

## 6. Doğrulanamayan / yalnız kod incelemesi

| # | Senaryo | Durum |
| --- | --- | --- |
| 4, 31 | Çocuk değişiminde önbellek izolasyonu (UI) | Kod incelemesi: çocuk kapsamlı anahtar, önceki çocuğun sorgularının silinmesi, `ParentQueryView` kimlik koruması. **Cihazda doğrulanmadı** |
| 32 | Veli hesapları arası izolasyon | M1 `queryClient.clear()` + kullanıcı kimlikli anahtar (M1 Jest akışı) |
| 29 | Bağlantısı bitmiş çocuk için push dokunuşu | Kod: `selectFromTrustedSource` güncel listeyi çeker, yoksa bildirim kutusu. **Cihazda doğrulanmadı** |
| 33–35 | OD / Yön / ODK öğrenci gezinmesi | Mevcut Jest + E2E geçti |
| 36 | M5 push | Değişmedi; push tarafına yalnız veli çocuk çözümü eklendi; M5 Jest geçti |
| — | iPhone: dinamik yazı, güvenli alan, gezinme | [m6-iphone-smoke-checklist.md](./m6-iphone-smoke-checklist.md). **YAPILMADI** |
