# M1 uygulama raporu — Mobil temel ve güvenli mimari geçişi

| Alan | Değer |
| --- | --- |
| Dal | `claude/loving-goodall-972n6c` (M0 belgeleri üzerine; `main` = `8438d4a` ile güncel) |
| Durum | M1 tamamlandı; M2 başlatılmadı |
| İlgili | [baseline](./m1-baseline.md) · [API sözleşmeleri](./m1-api-contracts.md) · [güvenlik incelemesi](./m1-auth-security-review.md) · [test sonuçları](./m1-test-results.md) · [M2 devri](./m2-handoff.md) |

## 1. Alt kilometre taşları

| Adım | Ne yapıldı | Kontrol |
| --- | --- | --- |
| M1.1 Baseline, bağımlılık, CI | Değişiklik öncesi ölçüm (`m1-baseline.md`); mobil TypeScript hatası giderildi (web-only `@/global.css` importu kaldırıldı); Jest + RNTL kuruldu; `.github/workflows/mobile.yml` (sözleşme sınırı, token senkronu, typecheck, lint, test, Android + iOS paketleme) | tsc / lint / jest / export |
| M1.2 Kimlik doğrulama | Deterministik çerez/Bearer çözümü (çakışmada fail-closed), mobil girişte çerez yok, `no-store`; davet kabulünde aynı | unit + integration + E2E |
| M1.3 Bootstrap + sözleşmeler | `GET /api/panel/me`, `GET /api/auth/sessions`, kararlı hata kodları, sürüm kapısı, `lib/mobile-contracts/` | unit + integration + E2E |
| M1.4 Oturum, kapılar, istemci, önbellek | Saf durum makinesi, oturum sağlayıcısı, tipli API istemcisi, TanStack Query | Jest |
| M1.5 Tasarım + çalışma alanı navigasyonu | `.pn-scope` ile senkron token'lar, ürün temaları, primitives, sunucu menüsünden kurulan sekmeler, çalışma alanı değiştirici | Jest akış testleri, token betiği |
| M1.6 Hesap, bildirim, temizlik | Bildirim kutusu, oturumlar, parola, hesap merkezi, derin bağlantı eşleyici, şablon artıklarının silinmesi | Jest |

## 2. Sunucu tarafı değişiklikler

| Dosya | Değişiklik |
| --- | --- |
| `lib/auth/bearer-token.ts` | `resolveRequestCredential` — çerez/Bearer karar tablosu (saf) |
| `lib/auth/session.ts` | `getSession` yeni kuralı kullanır; `loadSessionForToken` ve `resolveSessionFromCredentials` ayrıldı (DB kontrolleri aynı); `createSession({ setCookie })` |
| `lib/auth/client-transport.ts` | `isNativeMobileClient`, `loginTransport`, semver, `evaluateClientVersion` (saf) |
| `lib/auth/session-device.ts` | Oturum cihaz etiketi (web bileşeninden çıkarıldı; mobil UA tanınır) |
| `lib/auth/api-guards.ts` | Kararlı `code` alanları (mesajlar aynı); `requireApiSessionBeforeGates` (yalnız bootstrap) |
| `lib/mobile/bootstrap.ts`, `bootstrap-server.ts` | Saf kapı/projeksiyon + mevcut alan servislerini birleştiren okuma modeli |
| `lib/mobile-contracts/{bootstrap,api}.ts` | Paylaşılan bağımlılıksız tipler + doğrulayıcılar |
| `app/api/panel/me/route.ts` | **Yeni** bootstrap ucu |
| `app/api/auth/sessions/route.ts` | **Yeni** oturum listesi (GET) |
| `app/api/auth/login/route.ts`, `invite/accept/route.ts` | Mobil taşıma: token gövdede, çerez yok; login'de 426 sürüm kapısı |
| `app/api/panel/active-product/route.ts` | Hata yanıtlarına kod |
| `components/panel/session-manager.tsx` | Ortak `sessionDeviceLabel` |
| `lib/env-contract.ts` | `MOBILE_MIN_SUPPORTED_VERSION` biçim doğrulaması (uyarı) |
| `scripts/check-mobile-contracts.mjs`, `scripts/check-mobile-tokens.mjs` | CI denetimleri |
| `tests/integration/mobile-auth.integration.ts`, `tests/e2e/mobile-api.spec.ts`, `lib/**/*.test.ts` | Testler |
| `.github/workflows/e2e.yml` | `MOBILE_MIN_SUPPORTED_VERSION: "1.0.0"` (sürüm kapısı E2E'si) |

Şema değişikliği, migration veya yeni servis **yok**. Üretim feature flag'lerine dokunulmadı.

## 3. Mobil mimari

```text
mobile/src/
  app/                      Expo Router
    _layout.tsx             Fontlar + SessionProvider + Stack.Protected kapıları
    +native-intent.tsx      Derin bağlantı temizleyici
    sign-in, forgot-password, change-password, mfa, workspace-select, upgrade, bootstrap-error
    (app)/                  Yalnız WORKSPACE_READY
      (tabs)/               index + slot-1..3 (sunucu menüsü) + menu
      screen/[id]           Birincil olmayan menü öğeleri
      notifications, account/{index,sessions,password}
  config/app-info.ts        Kurulu sürüm, API kökü (prod'da HTTPS zorunlu)
  lib/api/                  client (Bearer, omit, zaman aşımı, iptal, iki hata zarfı), errors, endpoints
  lib/auth/                 app-state (saf durum makinesi), session-provider, token-store, gate-refresh
  lib/query/                query-client (tekrar politikası, NetInfo, AppState), keys (kullanıcı kapsamlı)
  navigation/               native-screens (rol+ürün+id), route-map (bildirim/derin bağlantı), use-nav-target
  design/                   tokens, products, theme, primitives/
  features/                 auth/, shell/, od/, ok/, shared/ (eski ekranlar korunarak taşındı)
```

**Durum makinesi:** `BOOTING → UNAUTHENTICATED → AUTHENTICATING → PASSWORD_CHANGE_REQUIRED → MFA_REQUIRED → WORKSPACE_SELECTION → WORKSPACE_READY` + `UPGRADE_REQUIRED`, `BOOTSTRAP_ERROR`, oturum sona erdi bildirimi. Kapı kararı yalnız sözleşmeyle doğrulanmış bootstrap'tan gelir; istemci kapıyı kendisi açamaz.

**Çalışma alanı:** Ürün durumları ve etkin ürün sunucudan; seçim `POST /api/panel/active-product`. Tek aktif ürün varsa seçim sunucu üzerinden otomatik yapılır (bir kez denenir, döngü yok). Öğrenci/veli: alt sekmeler = sunucu `navigation.primary` (≤4) + Menü. Personel/yönetim: alt çubuk yok (web kararı) — "Bugün" bilgi ekranı + Menü.

**Rol / ürün güvenliği:** `resolveNativeScreen(role, workspace, navId)` — Yön veya Deneme Ligi öğrencisi, veli, öğretmen ve yönetim hiçbir koşulda OD öğrenci ekranına düşmez; native karşılığı olmayan her öğe fazı belirtilmiş yer tutucudur (sahte veri yok, web devam yolu var). Bilinmeyen id güvenli yer tutucu olur.

**Tasarım:** Token'lar `.pn-scope` değerleriyle birebir (32 değer CI'da karşılaştırılıyor); OD yeşil `#0c7c57`, Yön mavi `#0754c9`, Deneme Ligi mor `#5b2599` yalnız vurgu; semantik tonlar üründen bağımsız; Manrope; 44pt dokunma hedefi; dinamik yazı (üst çarpan 2); hareket azaltma; ekran okuyucu rolleri ve etiketleri. Primitives: `Screen`, `PageHeader`, `Section`, `Row`, `StatusBadge`, `ProductMark`, `Button`, `TextField`, `EmptyState`, `ErrorState`, `Skeleton`, `Banner`, `BottomSheet`, `WorkspaceSwitcher`, sekme ve menü bileşenleri.

## 4. Yapılandırma (eksik kimlikler ve adımlar)

`mobile/app.config.ts` kalıcı kimlikleri **uydurmaz**; ortamdan okur, yoksa yazmaz:

| Değişken | Ne için | Nerede tanımlanmalı |
| --- | --- | --- |
| `MOBILE_IOS_BUNDLE_ID` | iOS `bundleIdentifier` | EAS ortam değişkeni / yerel `.env` (kurumun Apple Developer hesabı kararı) |
| `MOBILE_ANDROID_PACKAGE` | Android `package` | EAS ortam değişkeni (Google Play hesabı kararı) |
| `EAS_PROJECT_ID` | `extra.eas.projectId` | `eas init` sonrası |
| `EXPO_PUBLIC_API_URL` | API kökü; geliştirme dışı derlemede HTTPS zorunlu | EAS ortamı / `.env` |
| `MOBILE_MIN_SUPPORTED_VERSION` (sunucu) | Minimum mobil sürüm; tanımsızsa kapı kapalı | Vercel ortam değişkeni |

`scheme: "onlinedershanem"`, `slug: "online-dershanem"` (EAS projesi henüz bağlanmadığı için slug değişikliği güvenli). Üretim imzalama, EAS derleme profili ve mağaza yayını **yapılmadı** (M9).

## 5. Temizlenenler

`scripts/reset-project.js`, `components/ui/collapsible.tsx`, `hooks/use-color-scheme*.ts`, `src/global.css`, `lib/notification-links.ts`, eski `lib/api.ts` ve `lib/auth-context.tsx`, eski sekme düzeni ve iki ekran (Bildirimler/Profil yeni ekranlarla değişti), Expo şablon görselleri, `app.json` web bloğu, `reset-project`/`web` komutları. Çalışan özellik ekranlarının hiçbiri silinmedi (bkz. M2 devri).

## 6. Bilinen sınırlar ve açık işler

- Gerçek cihaz / simülatör doğrulaması yapılmadı (ortamda yok). Native sekme çubuğu, Keychain/Keystore, ekran okuyucu ve dinamik yazı gerçek cihazda test edilmeli.
- Korunan eski ekranlar hâlâ eski görsel dilde ve elle yükleme durumu yönetiyor; M2–M4'te Query + primitives'e taşınacak.
- Bildirim tercihleri ve profil düzenleme mobilde yok (M5 / M8). Push yok (M5).
- Flag kapalı / kaynak yok 404'leri kod taşımıyor; mobil bunları ayırt etmeden `not_found` sayar ve bootstrap'ı yenilemez.
- Önceden var olan iki sorun M1 kapsamı dışında bırakıldı ve ayrı görev olarak önerildi: `lib/public-marketing-products.test.ts` (CSS modülü), `tests/e2e/admin-mfa.spec.ts` (eski admin MFA akışı).

## 7. Ürün onayı bekleyen kararlar

| Karar | Neden |
| --- | --- |
| MD-08 Deneme Ligi sınav çözme mobilde mi? | M4 kapsamını belirler |
| MD-09 Uygulama içi satın alma / kilitli ürün sunumu | Mağaza politikası; M1 kilitli ürünü satın alma bağlantısı olmadan gösteriyor |
| Personel/yönetim için alt çubuk yok kararı (web §6.5) mobilde de geçerli mi? | M1 bunu uyguladı |
| Uygulama görünen adı ("Online Dershanem") ve mağaza kimlikleri | M9 |
| `MOBILE_MIN_SUPPORTED_VERSION` politikası (kim, ne zaman artırır) | Operasyon |
| Çerez ≠ Bearer çakışmasında fail-closed (aynı kullanıcı olsa bile farklı token reddedilir) | Güvenlik tercihi; web etkilenmez |

## 8. Tamamlanma kriterleri

| Kriter | Durum |
| --- | --- |
| Mobil TypeScript ve lint geçiyor | ✅ |
| Mobil CI eklendi | ✅ (`mobile.yml`; GitHub'da henüz koşmadı) |
| Çerez/Bearer kimliği açıkça test edildi | ✅ unit + integration + E2E |
| Parola ve MFA kapıları doğru | ✅ sunucu + istemci testleri |
| Bootstrap korumalı ve test edildi | ✅ |
| Ürün ve rol bazlı navigasyon doğru | ✅ |
| Yön-only / DL-only kullanıcı OD ekranına yönlenmiyor | ✅ (akış testi: OD ucu hiç çağrılmıyor) |
| Sorgu önbellekleri kullanıcı / çalışma alanı arasında izole | ✅ |
| Uygulama içi bildirimler çalışıyor | ✅ (Jest akış testi; cihazda doğrulanmadı) |
| Paylaşılan mobil tasarım temeli | ✅ |
| Mevcut web işlevi bozulmadı | ✅ typecheck, lint, 904/905 unit (tek hata önceden var), 86/86 integration, web E2E regresyonu 34/34 (+ önceden kırık admin-mfa) |
| Önemli sınırlar belgelendi | ✅ |
