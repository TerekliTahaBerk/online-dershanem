# Online Dershanem — mobil uygulama (Expo)

Web panelinin (`../app/api/**`) native istemcisi. İkinci bir backend yoktur;
aynı PostgreSQL ve aynı alan servisleri kullanılır. Mimari ve kararlar:
`../docs/mobile/` (M0 denetimi, M1 raporu, sözleşmeler, güvenlik incelemesi).

## Kurulum

```bash
npm ci
cp .env.example .env   # EXPO_PUBLIC_API_URL
npx expo start
```

## Kontroller (CI: `.github/workflows/mobile.yml`)

```bash
npm run typecheck
npm run lint
npm test
node ../scripts/check-mobile-contracts.mjs   # sözleşme sınırı (repo kökünden)
node ../scripts/check-mobile-tokens.mjs      # web token senkronu (repo kökünden)
```

## Yapı

```text
src/app/                 Expo Router rotaları (kapılar + (app) çalışma alanı)
src/lib/api/             Tipli API istemcisi, hata sınıfları, uç fonksiyonları
src/lib/auth/            Durum makinesi, oturum sağlayıcısı, SecureStore
src/lib/query/           TanStack Query istemcisi ve anahtarları
src/navigation/          Sunucu menüsü → native ekran / derin bağlantı eşlemesi
src/design/              Token'lar (web .pn-scope ile senkron) ve primitives
src/features/            Ekranlar (od/, ok/, shared/ M1'de korunarak taşındı)
../lib/mobile-contracts/ Sunucuyla paylaşılan bağımlılıksız sözleşmeler
```

Web hedefi (`expo start --web`) desteklenmez (MD-17).

## V1.0 M9 release engineering

Mobilde PAYTR, satış, fiyat, IAP, abonelik checkout veya satın alma CTA yok. M8 deferred. Başlangıç: [M9 handoff](../docs/mobile/v1-release-handoff.md), [EAS config](../docs/mobile/m9-eas-configuration.md), [kimlik checklist](../docs/mobile/m9-credentials-checklist.md). Development/preview izole staging, production onaylı HTTPS origin gerektirir. Native profiller eksik gerçek ID/EAS UUID/API config'te fail-closed çalışır. Kalıcı kimlik veya signing sırrı örnek değerle doldurulmaz.

`npm ci`, `npm run typecheck`, `npm run lint`, `npm run test:ci`; repo kökünde `node scripts/check-mobile-release.mjs <ios-export-dir> <android-export-dir>`. Tipler yerelde eskiyse Expo dev server mevcut src/app ağacından `.expo/types` dosyasını yeniler; typed routes kapatılmaz. OTA fingerprint + üç kanal; manuel onay gerekir. Build/submit/publish adımları [iOS](../docs/mobile/m9-ios-build-guide.md), [TestFlight](../docs/mobile/m9-testflight-guide.md), [Android](../docs/mobile/m9-android-release-guide.md) rehberlerinde.

Hesap silme giriş noktası destek talebidir; self-service tamamlama ve hukuk onayı BLOCKED. Signed build, fiziksel test ve store yayın yapılmadı. Güncel karar: [NO-GO](../docs/mobile/m9-go-no-go.md).
