# M1.1 — Başlangıç (baseline) ölçümü

Değişiklik YAPILMADAN önce, `main` = `8438d4a` üzerinde (M0 belgeleri dahil
`claude/loving-goodall-972n6c` dalı) 2026-10-08 tarihinde ölçüldü. Komutlar bu
oturumda gerçekten çalıştırıldı; çıktılar aşağıda özetlendi.

## Mobil (`mobile/`)

| Kontrol | Komut | Sonuç |
| --- | --- | --- |
| Bağımlılık kurulumu | `npm ci` (kilit dosyasıyla) | ✅ 850 paket, 23 sn. Yalnız `uuid@7` kullanımdan kaldırma uyarısı |
| TypeScript | `npx tsc --noEmit` | ❌ **1 hata** (çıkış kodu 2): `src/constants/theme.ts(6,8): TS2882 Cannot find module or type declarations for side-effect import of '@/global.css'` |
| Lint | `npx expo lint` | ⚠️ 0 hata, 1 uyarı (`(tabs)/index.tsx:22` `Array<T>` yasak) |
| Bağımlılık uyumu (çevrimiçi) | `npx expo install --check` | ⛔ Çalıştırılamadı: `HTTP Proxy Network Error: Forbidden` (api.expo.dev bu ortamdan erişilemiyor) |
| Bağımlılık uyumu (çevrimdışı) | `EXPO_OFFLINE=1 npx expo install --check` | ✅ "Dependencies are up to date" (çevrimdışı mod "güvenilmez" uyarısıyla) |
| expo-doctor | `npx expo-doctor` | ⚠️ 19/21; 2 kontrol ağ hatası nedeniyle başarısız (şema ve React Native Directory sorguları) — proje sorunu değil |
| Yapılandırma | `npx expo config --type public` | ✅ çözüldü; `scheme: "mobile"`, `slug: "mobile"`, bundle id / package yok |
| Metro paketleme | `EXPO_OFFLINE=1 npx expo export --platform android` | ✅ 4.9 MB Hermes bytecode, 52 sn |
| Testler | — | ❌ Hiç test yok (Jest yapılandırması da yok) |
| CI | `.github/workflows/*` | ❌ Mobil için iş yok; kök `tsconfig.json` ve `eslint.config.mjs` `mobile/**`'ı hariç tutuyor |

Sonuç: mobil kod **paketlenebiliyordu** ama **TypeScript kontrolünden geçmiyordu**, test ve CI yoktu.

## Kök proje (sunucu)

| Kontrol | Sonuç |
| --- | --- |
| `npm ci` | ✅ 865 paket |
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ |
| `npm run test:unit` | ⚠️ 878/879 — **1 başarısız (M1 ile ilgisiz, önceden var)**: `lib/public-marketing-products.test.ts`, `components/home/product-covers.module.css` dosyasını Node test çalıştırıcısında yükleyemiyor (`SyntaxError: Unexpected token '.'`). `main`'deki ana sayfa yenilemesinden (#437) geliyor. |
| `npm run test:integration` (yerel PostgreSQL 16, CI ile aynı ortam değişkenleri) | ✅ 71/71 |

## Ortam sınırları

- Ağ: npm kayıt defterine erişim var; `api.expo.dev` (Expo hizmetleri) proxy tarafından engelli.
- iOS Simülatör / Android Emülatör / gerçek cihaz **yok**. Native çalışma zamanı doğrulanamaz.
- Playwright 1.63, `/opt/pw-browsers` altındaki Chromium sürümüyle eşleşmiyor; tarayıcı testleri yalnız `executablePath` geçersiz kılınarak (repoya eklenmeyen geçici yapılandırma) çalıştırılabildi.
