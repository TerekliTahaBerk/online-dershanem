# M9 yerel doğrulama sonuçları

Tarih: 10 Ekim 2026. Kapsam: Online Dershanem mobil 1.0.0.

Yeni otomatik test dosyası veya senaryosu oluşturulmadı. Mevcut HTTP dış link kuralı HTTP→HTTPS sıkılaştırıldığı için `mobile/src/test/od-lessons.test.tsx` içindeki bir eski beklenti ve başlığı güncellendi. Geçici config probe commit edilmedi; kalıcı regresyon kapsamı değildir.

## Sonuçlar

| Komut / kontrol | Gerçek sonuç |
| --- | --- |
| git fetch origin; taban main/origin farkı | Başarılı; 0/0, taban 2c8c0995 |
| npm run prisma:generate; npx next typegen | Başarılı; eski generated Prisma ve rota tipleri yenilendi |
| Root npm run typecheck | PASS |
| Root npm run lint | PASS |
| npm run test:unit | 928 PASS / 1 FAIL: lib/public-marketing-products.test.ts, CSS modülü; M7'de aynı |
| npm run test:integration (ilk mevcut env) | PostgreSQL localhost:5432 kapalı: 105 FAIL; ürün sonucu sayılmadı |
| İzole PG16 + mevcut bootstrap/seed + test:integration | 98 PASS / 2 FAIL, 100 toplam; adaptive-plan-product-policy tarih bağımlı iki senaryo, M7 ile aynı |
| npm run build:nomigrate, sentetik E2E ortamı | PASS; Next build, typecheck ve static üretim tamamlandı |
| Mevcut Playwright paketleri | 79 PASS / 1 FAIL (80 toplam), panel-experience:337; taze seed sonrası tekil tekrar sonucu aşağıda |
| Mobile npm run typecheck | PASS; eski .expo rota tipleri Expo src/app kökünden yenilendi |
| Mobile npm run lint | PASS |
| Mobile npm run test:ci (son koşu) | 15 suite / 141 test PASS |
| check-mobile-contracts | PASS, 10 sözleşme |
| check-mobile-tokens | PASS, 32 değer |
| lint:hygiene | PASS; fsmonitor IPC uyarısı sonucu engellemedi |
| lint:api-validation | PASS, 227 route / 250 metot |
| expo install --check | SDK sürümleri uyumlu; offline doğrulamanın CLI uyarısı var |
| expo config --type public --json | PASS; kalıcı kimlikler eklenmedi |
| expo config --type introspect --json (development + production config probe) | PASS; native izin kaldırma direktifleri, Face ID yokluğu ve release ATS kontrol edildi; signed binary değil |
| iOS Hermes export | PASS, yaklaşık 3.6 MB; signed IPA değil |
| Android Hermes export | PASS, yaklaşık 3.9 MB; APK/AAB değil |
| expo export --platform all | PASS; ek web export deploy edilmedi/destek vaadi değil |
| check-mobile-release / final exports | PASS; private-key/DB/token bilinen sızıntı desenleri yok |
| Geçici config probe | 8/8 PASS: eksik IDs, origin mismatch, localhost, preview/prod ayrımı, path reddi |
| git diff --check | PASS |
| Fiziksel iPhone/Android, APNs/FCM, TestFlight/Play | NOT VERIFIED / BLOCKED; yürütülmedi |

## Entegrasyon hataları

`adaptive-plan-product-policy.integration.ts`: “hedef sınav tarihi yaklaştıkça KPSS planının kapasitesi artar, OK planı etkilenmez” ve “OK akışı uçtan uca değişmeden çalışır: üret → onay bekle → onayla → görev tamamla”. M7'deki aynı iki tarih bağımlı hata; yeni güvenlik kuralını gevşeterek yeşil yapılmadı.

## E2E ortam düzeltmesi

İlk geçici koşuda 3117 portu kullanıldı; coaching-experience mevcut testinde Origin sabit localhost:3000 olduğundan 403 gözlendi. CI=false iken local proxy trust kapalı olduğu için sonraki loginler aynı rate-limit anahtarına takıldı. Bu koşu kesildi; ürün kodu gevşetilmedi. Gerçek CI env ile localhost:3000, CI=true ve izole seed yeniden kuruldu. Final sonuç yukarıdaki tabloda. Veri sırası/contrast hataları baseline ile ayrı değerlendirilir.

## Bağımlılık güvenliği

M9 öncesi kilit dosyası npm audit: 72 bulgu (1 critical, 54 high, 17 moderate). İlk M9 install sonrası 73 (1 critical, 55 high, 17 moderate). SDK uyumlu yamalar uygulandı: shell-quote 1.12.0, brace-expansion uyumlu 1.1.21/5.0.12, compression 1.8.2, source-map-js 1.2.2. Son audit **69 bulgu: 0 critical, 52 high, 17 moderate**.

Kalan bulgular arasında braces, node-forge, decode-uri-component, sprintf-js ve uuid/upstream zincirleri bulunur. Npm önerileri SDK 44/React Native 0.72 gibi uyumsuz downgrade veya Jest/SDK major değişimi içerebildiğinden `audit fix --force` uygulanmadı. Bu audit yeşil değildir: release güvenlik sahibi native runtime / build-tool / test-only erişilebilirlik ayrımıyla çözüm veya gerekçeli risk onayı vermeli. Public release engelidir.

## Kanıt ve sınırlar

Doğrulama Node 24.21.0/Mac üzerinde; CI Node 22 ayrı koşmalıdır. Xcode 26.5 bulundu fakat signing/native build çalıştırılmadı. Yerel config probe ve export production API'ye bağlanmadı. İzole PostgreSQL /tmp içinde port 55439, m9_integration/m9_e2e sentetik veritabanlarıyla kullanıldı; production'a erişilmedi. Raw geçici loglar /tmp/m9-*; taşınabilir sonuç özeti bu belgedir. Bundle taraması desen tabanlıdır, bağımsız güvenlik denetimi veya gerçek cihaz kanıtı sayılmaz.

İlk mobile parse hatası (boundary kapanışı) düzeltildi; final typecheck/Jest/export geçti. İlk root typecheck eski Prisma/.next generated dosyaları nedeniyle düştü; generate/typegen sonrası geçti. Bu ilk hatalar final başarılı sonuç gibi sunulmadı.

## E2E son koşu ayrıntısı

Çalıştırılan mevcut paketler: `mobile-api`, `permission-matrix`, `lesson-day`, `coaching-experience`, `kocum-lifecycle`, `panel-access`, `panel-experience`; `npx playwright test ... --workers=1 --reporter=list`, mevcut CI environment ve sentetik seed ile. 79 geçti / 1 başarısız: panel-experience:337 `Pzt` düğmesi beklerken timeout; önceki suite plan durumunu değiştirmiş olabilir. Taze seed ile tek başına tekrar: 1/1 PASS (6 saniye); toplu koşu 80/80 geçmiş sayılmadı. Contrast ve dört rol mobil web erişilebilirlik kontrolleri bu koşuda geçti; bunlar native cihaz testi değildir.

## Native izin introspection

`EXPO_OFFLINE=1 npx expo config --type introspect --json` çalıştırıldı. Kamera/mikrofon/konum/rehber/depolama izinleri Android manifestte `tools:node="remove"` ile işaretli. Kullanılmayan Face ID açıklaması SecureStore plugin seçeneğiyle kaldırıldı. Preview/production profillerinde overlay izni de engellenir ve iOS arbitrary HTTP yükleme kapatılır. Production introspection yalnız sentetik `com.example.m9probe` kimlikleri, örnek UUID ve `api.example.com` ile config kontrolüdür; bunlar repo/env/store yapılandırmasına kaydedilmedi. Çıktıda Face ID anahtarı yok, ATS arbitrary loads=false ve overlay remove direktifi doğrulandı. Development Dev Launcher yerel ağ/Bonjour girdileri gerçek signed release binary incelemesinin yerine geçmez. Bu inceleme hâlâ NOT VERIFIED.
