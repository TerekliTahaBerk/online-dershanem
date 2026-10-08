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
