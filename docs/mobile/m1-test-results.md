# M1 test sonuçları

Tüm komutlar bu oturumda, 2026-10-08'de, `claude/loving-goodall-972n6c` dalında gerçekten çalıştırıldı. Sayılar komut çıktısından alındı. Değişiklik öncesi durum: [m1-baseline.md](./m1-baseline.md).

## 1. Özet

| Katman | Komut | Sonuç |
| --- | --- | --- |
| Mobil TypeScript | `cd mobile && npm run typecheck` | ✅ 0 hata (baseline: 1 hata) |
| Mobil lint | `cd mobile && npm run lint` | ✅ 0 hata, 0 uyarı (baseline: 1 uyarı) |
| Mobil Jest | `cd mobile && npx jest --ci` | ✅ **80/80** (6 paket) |
| Mobil paketleme | `EXPO_OFFLINE=1 npx expo export --platform android` / `ios` | ✅ Android 5.0 MB, iOS 4.7 MB Hermes |
| Paket sızıntı taraması | Hermes paketlerinde `PrismaClient\|@prisma`, `server-only`, `DATABASE_URL` | ✅ 0 eşleşme (her iki platform); `contractVersion`, `X-Od-Client` mevcut |
| Sözleşme sınırı | `node scripts/check-mobile-contracts.mjs` | ✅ temiz (2 sözleşme dosyası) |
| Token senkronu | `node scripts/check-mobile-tokens.mjs` | ✅ 32 değer web `.pn-scope` ile eşit; kasıtlı uyuşmazlık (`#fefefe`) yakalandı ve geri alındı |
| Kök typecheck | `npm run typecheck` | ✅ |
| Kök lint | `npm run lint` | ✅ 0 sorun |
| Repo hijyeni | `npm run lint:hygiene` | ✅ 1826 izlenen dosya |
| API girdi doğrulama | `npm run lint:api-validation` | ✅ 185 route, 205 metot |
| Kök unit + kapsam | `npm run test:unit:coverage` | ⚠️ **904/905** — tek hata M1 öncesinden (`lib/public-marketing-products.test.ts`, CSS modülü; baseline'da da vardı). Kapsam: satır %92.84 / dal %80.33 / fonksiyon %73.78 (eşikler 90 / 74 / 70) |
| Entegrasyon (yerel PostgreSQL 16) | `npm run test:integration` | ✅ **86/86** (baseline 71 + yeni 15) |
| E2E — mobil API (gerçek `next start` üretim derlemesi) | `npx playwright test tests/e2e/mobile-api.spec.ts` | ✅ **11/11** |
| E2E — web regresyonu | `panel-auth-smoke`, `password-reset`, `phase0-security`, `permission-matrix`, `panel-access`, `admin-mfa` | ✅ 34 geçti, 2 atlandı (admin-mfa yalnız `e2e:mfa` modunda koşar) |
| E2E — `npm run e2e:mfa` | `admin-mfa.spec.ts` (MFA bypass kapalı) | ❌ 1 başarısız, 1 koşmadı — **M1 öncesinden**: test eski "admin girişte MFA kaydı" akışını bekliyor; güncel politika (`userRequiresLoginMfa` ADMIN için false) yöneticiyi doğrudan panel seçiciye gönderiyor. Ekran görüntüsüyle doğrulandı. Ayrı görev önerildi |

## 2. Sunucu test matrisi

| İstenen durum | Test | Katman |
| --- | --- | --- |
| Web çerez kimliği | "yalnız çerez (web)…", "web giriş: httpOnly oturum çerezi var, token yok", web bootstrap çerezle | integration, E2E |
| Mobil Bearer kimliği | "yalnız Bearer (mobil)…", "Bearer ile bootstrap" | integration, E2E |
| Karışık kimlik (aynı token) | `resolveRequestCredential` aynı token, integration aynı token | unit, integration |
| Farklı kullanıcı çerez + Bearer | "çerez ve Bearer FARKLI kullanıcılara aitse hiçbiri doğrulanmaz", E2E 401 `UNAUTHENTICATED` | unit, integration, E2E |
| Geçersiz Bearer + geçerli çerez | "geçerli çereze geri düşülmez" (+ boş Bearer) | unit, integration, E2E |
| Mobil giriş başlıkları | "token gövdede, Set-Cookie YOK, no-store", istek bağlamının çerez deposu boş | E2E |
| Web giriş başlıkları | "httpOnly oturum çerezi var, token yok" + `panel-auth-smoke` 4 rol | E2E |
| Çıkış | "Bearer ile çıkış: aynı token bir daha çalışmaz" | E2E |
| Hesap değişimi | "eski oturum iptal edilince yeni token yalnız kendi kimliğini çözer" | integration |
| İptal edilmiş / askıya alınmış / boşta süresi dolmuş | 3 test | integration |
| Parola değişikliği kapısı | bootstrap `PASSWORD_CHANGE_REQUIRED` + `workspace:null` + gizli bildirim sızmıyor; uç 403 `PASSWORD_CHANGE_REQUIRED`; değişiklikten sonra `READY` | unit, integration, E2E |
| MFA kapısı | `MFA_REQUIRED` + yöntemler + `workspace:null` + `odk:exam:edit` sızmıyor; sunucu doğrulayınca `READY`; uç 403 `MFA_REQUIRED`; çalışma alanı seçimi 403 | unit, integration, E2E |
| Ürün hakkı | OD / Yön / Deneme Ligi / üçü / hiçbiri → durumlar; erişilmeyen ürün seçimi 403 `PRODUCT_ACCESS_REQUIRED`; bayat seçim null | integration, E2E |
| Pilot erişimi | `PANEL_ROLLOUT_MODE=pilot` → `PILOT_CLOSED`, seçilemez | integration |
| Çalışma alanı seçimi | Yön seçiliyken OD menü öğesi yok, Bugün `/panel/ogrenci/yon`; Deneme Ligi seçiliyken yalnız DL; Bearer ile seçim | integration, E2E |
| Yabancı öğrenci erişimi | Veli bootstrap'ında bağlı olmayan / akademik izinsiz çocuk yok; Bearer ile yabancı öğrenci takvimi 404 | integration, E2E |
| Desteklenmeyen sürüm | Saf karar tablosu; eski / eksik sürüm 426, web etkilenmez | unit, E2E |
| Oturum listesi | mevcut oturum işaretli, token / IP / ham UA yok | E2E |

## 3. Mobil test matrisi

| İstenen durum | Test (dosya) |
| --- | --- |
| Giriş başarılı / başarısız | `app-flow`: OD girişi + Bearer + SecureStore; başarısız girişte sunucu mesajı, token saklanmaz; `endpoints`: kısa / eksik token reddi |
| MFA devamı | `app-flow`: yanlış kod kapıyı açmaz, doğru kod sonrası sunucu READY; passkey-only web devam yolu; `endpoints`: `verified !== true` başarı sayılmaz |
| Geçici parola | `app-flow`: kapı ekranı, ürün uçları çağrılmaz, değişiklik sonrası açılır |
| Tüm ürün kombinasyonları | `app-state` (OD / Yön / DL / üçü / hiçbiri), `app-flow` (Yön-only ve DL-only OD ucuna dokunmaz; üç ürün seçimi; tek ürün otomatik seçim; ürünsüz boş durum) |
| Çalışma alanı değiştirme | `app-flow` seçim sunucuya yazılır; `navigation` rol+çalışma alanı eşlemesi |
| Veli ve personel yer tutucuları | `app-flow`: veli → yer tutucu, öğretmen → `staff-home-TEACHER`, yönetim → `staff-home-ADMIN`; `navigation`: M3/M4/M6/M7/WEB fazları |
| Sorgu önbelleği izolasyonu | `app-flow`: A kullanıcısının bildirimi B'de görünmez; `query`: anahtarlar kullanıcıyla başlar, token anahtara girmez |
| Bildirim rota eşlemesi | `navigation` (yetkili hedef, başka çalışma alanı, kötü yollar, derin bağlantı sorgu dizesi atılır); `app-flow` (yetkili hedef açılır, yetkisiz açıklanır) |
| Çıkış | `app-flow`: sunucu iptali Bearer ile, SecureStore boş, giriş ekranı |
| Çevrimdışı | `client` ağ / zaman aşımı / iptal sınıfları; `app-flow` ağ hatasında ürün ekranı yok, hata ekranı + yeniden dene |
| Bilinmeyen sunucu hatası | `client` 500 / 502 HTML gövde gösterilmez; `app-state` `server` → `BOOTSTRAP_ERROR` |
| Geçersiz bootstrap | `endpoints` (yanlış rol, eksik alan, kapıda dolu workspace); `app-flow` bozuk yanıt → hata ekranı, sonra düzelince açılır |
| Oturum süresi dolması | `app-flow`: 401 → yerel kimlik silinir, "Oturumun sona erdi" |
| Sürüm | `app-state` (426, minimum sürüm); `app-flow` güncelleme ekranı |

Testlerin hata yakaladığı kontrol edildi: Yön öğrencisinin "Bugün"ünü kasıtlı olarak OD ana sayfasına eşleyen değişiklikle `navigation` testi başarısız oldu, geri alınınca geçti. Akış testleri ilk çalıştırmada gerçek bir hatayı yakaladı: eski ekranların 401 sonrası ikinci `signOut` çağrısı "oturum sona erdi" bildirimini eziyordu (düzeltildi).

## 4. Yapılamayanlar (açıkça)

- **Gerçek cihaz / simülatör testi YAPILMADI.** Ortamda iOS Simülatör, Android Emülatör veya cihaz yok. Native sekme çubuğu, SecureStore Keychain/Keystore davranışı, native ağ yığınının çerez davranışı, dinamik yazı boyutu ve ekran okuyucu deneyimi gerçek çalışma zamanında doğrulanmadı. Çerez davranışı native kaynak koddan doğrulandı (güvenlik incelemesi §2).
- Jest ortamında native modüller (SecureStore, NetInfo, expo-application, expo-web-browser, lucide ikonları) sahtedir. Native sekme geçişi Jest'te simüle edilemedi; akış testleri sekme yerine yığın rotalarıyla gezinir.
- Jest (node ortamı) TanStack Query'nin "sunucu" kipine düştüğü için otomatik tekrar denemeleri testte devre dışıdır; tekrar politikası ayrı birim testleriyle doğrulandı.
- `expo-doctor` ve çevrimiçi `expo install --check` ağ kısıtı nedeniyle çalışmadı; çevrimdışı kontrol temiz.
- Staging ortamı ve gerçek hesaplar kullanılmadı; E2E yerel seed verisiyle koştu.
- Yeni `mobile.yml` iş akışı yerelde adım adım çalıştırıldı; GitHub Actions üzerinde henüz koşmadı (PR açılmadı).
