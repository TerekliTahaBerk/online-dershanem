# M2 test sonuçları

Tüm komutlar bu oturumda, 2026-10-09'da, `claude/loving-goodall-972n6c` dalında gerçekten çalıştırıldı. Sayılar komut çıktısından alındı.

## 1. Özet

| Katman | Komut | Sonuç |
| --- | --- | --- |
| Taban (M2 öncesi) | mobil tsc / lint / Jest; kök tsc / unit | Mobil temiz, Jest 80/80; kök unit 904/905 (önceden var olan CSS testi) |
| Mobil TypeScript | `cd mobile && npm run typecheck` | ✅ 0 hata |
| Mobil lint | `cd mobile && npm run lint` | ✅ 0 sorun |
| Mobil Jest | `cd mobile && npx jest --ci` | ✅ **141/141** (15 paket; M1'den 80 korunuyor) |
| Mobil paketleme | `EXPO_OFFLINE=1 npx expo export --platform android` / `ios` | ✅ Android 3,4 MB, iOS 3,1 MB Hermes |
| Paket sızıntı taraması | `PrismaClient`, `@prisma`, `server-only`, `DATABASE_URL`, `NEXTAUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`, `loadStudentProgressInsight` | ✅ 0 eşleşme (iki platform) |
| Sözleşme sınırı | `node scripts/check-mobile-contracts.mjs` | ✅ temiz |
| Token senkronu | `node scripts/check-mobile-tokens.mjs` | ✅ 32 değer |
| Kök typecheck / lint / hijyen / API doğrulama | `npm run typecheck`, `lint`, `lint:hygiene`, `lint:api-validation` | ✅ (190 route, 210 metot) |
| Kök unit + kapsam | `npm run test:unit:coverage` | ⚠️ **924/925**. Tek hata önceden var olan `lib/public-marketing-products.test.ts` (CSS modülü; `main`'de de kırık). Kapsam 92,80 / 80,93 / 72,75; eşikler 90 / 74 / 70 karşılanıyor. Bu ölçümden sonra `student-views.test.ts` eklendi (+4 test) |
| Entegrasyon (CI ortamı, sıfırdan DB + seed) | `npm run test:integration` | ✅ **100/100** (86 + M2 14) |
| E2E — mobil API (gerçek `next start`) | `playwright test tests/e2e/mobile-api.spec.ts` | ✅ **18/18** (M1 11 + M2 7) |
| E2E — OD web regresyonu | lesson-day, panel-access, panel-experience, panel-design-phase1/2, measurement-notifications, panel-auth-smoke, phase0-security, permission-matrix, panel-accessibility, coaching-experience | ✅ 91 geçti, 1 flaky (ikinci denemede geçti): `panel-experience` "erişilebilirlik tercihleri … öğretmen yalnız desteği görür" — M2'nin dokunmadığı yönetici/öğretmen akışı |

**Not (yanlış alarm):** Entegrasyon paketi ilk kez CI ortam değişkenleri olmadan koşulduğunda 8 test başarısız oldu. Aynı 8 test `origin/main` üzerinde de aynı şekilde başarısızdı. Kök neden yerel kabukta eksik olan `NEXTAUTH_SECRET` ve `CRON_SECRET` değişkenleriydi. CI ile aynı ortamla (sıfırdan DB + `db:seed`) koşulunca sonuç 100/100.

## 2. İstenen asgari senaryolar

| # | Senaryo | Nerede doğrulandı |
| --- | --- | --- |
| 1 | OD-only öğrenci | entegrasyon "OD-only öğrenci — yaklaşan ders Şimdi…"; mobil `od-home` |
| 2 | OD + OK + ODK öğrenci | entegrasyon "üç ürünlü öğrencide Yön planı ve Deneme Ligi verisi girmez"; mobil "Yön yalnız ayrı giriş satırı" |
| 3 | Yön-only öğrenci | entegrasyon (OD verisi üretilmez); mobil (OD ucu çağrılmaz, derin bağlantı açılmaz) |
| 4 | Deneme Ligi-only öğrenci | E2E: 7 OD ucu → 404 `PRODUCT_ACCESS_REQUIRED`; mobil M1 testi |
| 5 | Aktif OD üyeliği olmayan öğrenci | 3 ve 4 ile aynı kapı (`requireApiOdRole`) |
| 6 | Profili olmayan öğrenci | entegrasyon (Bugün, ders detayı, gidişat, tekrar); mobil Bugün NO_PROFILE |
| 7 | Kapalı bayraklar | entegrasyon (tekrar, telafi, gidişat); mobil `FEATURE_DISABLED`, yalnız-telafi sekmesi; menü `LATER` |
| 8 | Yetkisiz ders detayı | entegrasyon (grup dışı, olmayan ders, sonlanmış kayıtta bağlantı yok); E2E yabancı ders 404, kimliksiz 401 |
| 9 | Korunan materyal indirme | mobil (Bearer başlık, URL'de token yok, güvenli ad, çıkışta silme); E2E yabancı dosya 404, kimliksiz 401 |
| 10 | Ödev durum çakışması | mobil 409 akışı; E2E replay + 409 + DB durumu |
| 11 | Kanıt gönderimi | mobil (sınır, ağ hatasında aynı anahtar, tek kayıt) |
| 12 | Sorgu geçersizleme | mobil (ödev, haftalık hedef, tekrar sonrası yeniden çekme) |
| 13 | Ağ kesintisi | mobil (ilerleme, kanıt, tekrar: otomatik tekrar yok, aynı anahtar) |
| 14 | Oturum süresi dolması | mobil M1 testi (401 → yerel kimlik silinir) |
| 15 | Çalışma alanı değiştirme | mobil (Bugün'deki "Diğer çalışma alanları" satırı sunucuya yazar) |
| 16 | Bildirim / derin bağlantı → OD ekranı | mobil (bildirim → ders detayı); `navigation.test` (izin listesi, yol hileleri) |
| 17 | Web / mobil veri tutarlılığı | aynı yükleyici (ders detayı, tekrar, telafi, özet); entegrasyon gidişat web bundle'ıyla birebir |

## 3. Yapılamayanlar (açıkça)

- **Gerçek cihaz / simülatör testi YAPILMADI.** Ortamda cihaz yok. Doğrulanamayanlar:
  - Native sekme çubuğu, klavye kaçınma ve geri hareketleri.
  - Dinamik yazı boyutu ve ekran okuyucu.
  - `expo-sharing` önizlemesi ve dosya sistemi davranışı.
  - Toplantı bağlantısının harici uygulamada açılması.
- **Jest'teki sahte modüller:** `expo-file-system`, `expo-sharing`, SecureStore ve NetInfo Jest'te sahtedir.
- **Jest'te sekme dondurma:** Odakta olmayan sekmeler `react-freeze` ile dondurulur. Testler ilgili sekmeye geçerek etkileşir; bu, gerçek uygulama davranışıyla aynı.
- **Staging ve gerçek hesaplar kullanılmadı.**
- **`mobile.yml` CI işi:** Bu dalda yeniden koşmadı. Henüz PR yok; komutlar yerelde aynı sırayla koşuldu.
