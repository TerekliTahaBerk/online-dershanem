# M7 doğrulama sonuçları — Öğretmen ve koç

Tarih: 2026-10-10.
Ortam: yerel Postgres 16, `next build` üretim derlemesi, Chromium (Playwright), Node 22.

**Gerçek iPhone / Android cihaz, staging ve üretim doğrulaması YAPILMADI.**

Talimat gereği yeni otomatik test commit'lenmedi. "Probe" satırları scratchpad'deki geçici betiklerdir; kalıcı regresyon kapsamı **değildir**.

## 1. Mevcut paketler

| Kontrol | Sonuç |
| --- | --- |
| Kök `tsc --noEmit` | ✅ temiz |
| Kök `eslint .` | ✅ temiz |
| API girdi doğrulama envanteri | ✅ 227 rota, 250 metot (M6: 212 / 235) |
| Repo hijyeni | ✅ |
| Mobil sözleşme sınırı | ✅ 10 sözleşme dosyası (+`staff.ts`) |
| Mobil token senkronu | ✅ 32 değer |
| Birim (`test:unit`) | ⚠️ 928 / 929. Tek hata önceden var olan `lib/public-marketing-products.test.ts` (CSS modülü). M6 tabanında (`265c55a`, ayrı worktree) de aynı şekilde başarısız |
| Entegrasyon (CI ile aynı: taze veritabanı + seed + `BUSINESS_INTEGRATION_TEST`) | ⚠️ 98 / 100. Başarısız 2 test `adaptive-plan-product-policy` (tarihe bağlı). M6 kaydıyla birebir aynı |
| Mobil `tsc` | ✅ |
| Mobil `expo lint` | ✅ |
| Mobil Jest | ✅ 141 / 141. 1 eski beklenti, M7'nin bilinçli değişikliği nedeniyle güncellendi (§5) |
| Mobil dışa aktarma (Hermes) | ✅ iOS 3,5 MB, Android 3,7 MB |
| Paket sızıntı taraması | ✅ §3 |
| E2E: lesson-day, coaching-experience, kocum-lifecycle, mobile-api, permission-matrix, panel-access | ✅ 51 / 51 |
| E2E: panel-experience | ⚠️ 27 geçti, 1 flaky, 1 başarısız. Ayrıntı aşağıda |

`panel-experience` ayrıntısı:

- `:660` (erişilebilirlik kontrastı): M5 ve M6'da da başarısız; önceden var olan.
- `:337` (öğrenci plan önerisi): bir önceki E2E koşusunun bıraktığı plan verisi nedeniyle düştü. Tohum yenilendikten sonra tek başına **geçti**; veri sırası kirliliği.

**Web regresyonu:** öğretmen ders, yardım ve ödevler sayfaları ile koç çalışma alanı ortak yükleyicilere taşındı. `lesson-day`, `coaching-experience`, `kocum-lifecycle` ve `panel-access` öğretmen akışları geçti.

## 2. Personel API probe'u — 62 / 62 (+ bayrak kapalı 4 / 4)

Kurulum: `e2e_test`, `next start`, mobil başlıklar + Bearer. Probe kendi teslim, plan ve öneri kayıtlarını oluşturdu. Koşudan sonra tohum geri yüklendi.

| # | Senaryo | Sonuç |
| --- | --- | --- |
| 1 | Kimliksiz → 10 uçta 401 | ✅ |
| 2 | ADMIN → 10 uçta 403 (web-only) | ✅ |
| 3 | Öğrenci / veli → 403 | ✅ |
| 4 | Öğretmen: 10 uç 200 + `private, no-store` | ✅ |
| 5–7 | Başka öğretmenin dersi, tahmin edilen kimlik → 404; bozuk kimlik / aralık → 400/404 | ✅ |
| 8–12 | Ders detayı `closeVersion`; yanlış sürüm 409 `LESSON_CLOSE_CONFLICT`; anahtarsız kapanış 400; aynı anahtar tekrarı `replayed`; sürüm bir kez arttı | ✅ |
| 13 | Başka öğretmenin dersine yazma → 404 | ✅ |
| 14–16 | Kuyruk yalnız kendi grubu; yabancı teslim detayı 404; 2 ölçüt + sürüm | ✅ |
| 17–20 | Eksik rubric 400; yabancı teslim 404; eski sürüm 409; değerlendirme 200, ikinci deneme reddedildi (404) | ✅ |
| 21–23 | Yardım: yabancı istek ve özel check-in yok; enerji / özgüven yok; yabancı isteğe yanıt 404 | ✅ |
| 24–25 | Koç öğrencileri yalnız aktif atama; atanmamış öğrenci 404 | ✅ |
| 26–30 | INTERNAL not oluşturuldu; atanmamışa not 403; detayda görünür (shadow); Bugün / liste / öğrenci yanıtında yok | ✅ |
| 31–35 | Görüşme: geçmiş saat 400; http 400; atanmamış 404; tekrar anahtarı tek kayıt; eski sürüm SAVE 409 | ✅ |
| 36 | Görüşme listesinde bağlantı / not yok | ✅ |
| 37–39 | Hafta dışı karar 400; COMPLETE; özel not yalnız koç detayında | ✅ |
| 40 | Başka koçun planı 404; başka öğrencinin görevi 403 | ✅ |
| 41 | Hafta dışı taşıma 400; eski sürüm onay 409; onay 200 + ikinci onay reddedildi; öneri ikinci inceleme reddedildi (404) | ✅ |
| 42 | Bayrak kapalı (`assignmentEvidence`, `studentCheckIn`, `adaptivePlan`) → 404 `FEATURE_DISABLED`; Bugün bayrakları false bildirir (port 3001) | ✅ 4 / 4 |
| 43 | ODK: tahmin edilen öğrenci 404; bütünlük / e-posta yok | ✅ |
| 44 | Başka öğretmen: tohum öğrencinin koç verisi 404; tohum dersi 404 (OD öğretmenliği koçluk açmaz) | ✅ |

Probe notu: İlk koşuda 7 kontrol düştü:

- 4'ü probe hatası: öğrenci alanı `id` yerine `studentId` okunmuştu. Uygulama doğru alanı kullanıyor.
- 2'si kurulum eksikliği: planlama haftasında plan ve öneri yoktu.
- 1'i beklenti farkı: ikinci değerlendirme / inceleme 409 değil 404 döndürüyor. Mevcut uç davranışı; mobil bunu "başka yerde işlendi + yeniden yükle" olarak ele alacak şekilde düzeltildi.

Düzeltmelerden sonra tam koşu 62 / 62 geçti.

Not (43): E2E tohumunda "yabancı" öğrenci Deneme Ligi üzerinden öğretmenle **ilişkili** sayılıyor (listede). İlişkisizlik, tahmin edilen kimlikle doğrulandı.

**NOT VERIFIED:**

- enforce modunda `ProductStaffAssignment` olmadan 403 (mod değiştirilmedi);
- `ok:note:read_private` olmayan koç (shadow'da her öğretmende var);
- 428 step-up akışı (kullanılan uçların hiçbiri step-up istemiyor).

## 3. Paket sızıntı taraması

`NEXTAUTH_SECRET`, `CRON_SECRET`, `DATABASE_URL`, `postgresql://`, özel anahtar, `vercel_blob_rw`, `e2e-only`, `ci-only`, test parolası ve `Bearer <token>` desenleri iOS ve Android çıktısında **0** dosyada bulundu.

## 4. Tekrarlanabilirlik

- Entegrasyon: `DROP/CREATE integration_fresh` → `ALLOW_FRESH_DB_BOOTSTRAP=true npm run db:bootstrap:fresh` → `db:seed` → `test:integration`.
- E2E: `e2e_test` yeniden oluşturuldu → bootstrap → `prisma/seed-e2e.ts` → `build:nomigrate` → Playwright (yerel Chromium).

## 5. Güncellenen eski beklenti

`mobile/src/navigation/navigation.test.ts`: "öğretmen OD `today` → placeholder M7" beklentisi "→ `teacher-home`" olarak güncellendi. M7'nin bilinçli davranış değişikliği; yeni test eklenmedi.
