# OnlineDershanem Mobile

OnlineDershanem'in **bağımsız** mobil uygulaması. Aynı backend + database üzerinde çalışır; web tarafına dokunmaz.

> Web ve mobil **tek monorepo** içinde, ama mobil tüm geliştirmesi bu klasör (`mobile-app/`) altında izole edilir.

## Stack

- **Expo SDK 52** + **React Native 0.76** (New Architecture)
- **Expo Router 4** — file-based routing, typed routes
- **TypeScript strict**
- **NativeWind 4** (Tailwind), **Reanimated 3**, **FlashList**
- **TanStack Query 5** + **Zustand 5**
- **expo-secure-store** (token), **expo-notifications** (push)
- **React Hook Form + Zod**

## Klasör Yapısı

```
mobile-app/
├─ app/               # Expo Router routes (auth / student / teacher / parent / admin)
├─ src/
│  ├─ api/            # Tipli HTTP client + endpoint modülleri
│  ├─ features/       # Domain bazlı bileşen + query'ler
│  ├─ components/ui/  # Design-system primitives
│  ├─ providers/      # AppProviders, AuthProvider, QueryProvider
│  ├─ store/          # Zustand stores (auth, ui)
│  ├─ lib/            # storage, queryClient, notifications, haptics, logger
│  ├─ hooks/          # cross-cutting hooks
│  ├─ constants/      # config, colors, spacing
│  ├─ types/          # api / user / models
│  └─ utils/          # cn, date, format
├─ assets/            # icon, splash, fontlar
└─ docs/
   ├─ MASTER_PLAN.md      # Tam mimari + roadmap
   └─ BACKEND_GAPS.md     # Web tarafında açılacak endpoint + Prisma model'ler
```

## Hızlı Başlangıç

> ⚠️ Lint/TS hataları (`Cannot find module 'react-native'`, vb.) `npm install` öncesi normaldir.

```bash
cd mobile-app

# bağımlılıkları yükle (web kök package.json'unu etkilemez)
npm install            # veya: pnpm install / yarn

# .env oluştur
cp .env.example .env
# EXPO_PUBLIC_API_URL=https://onlinedershanem.com  (veya ngrok URL'in)

# dev sunucusu
npm run start
# i  → iOS simulator   (macOS + Xcode)
# a  → Android emulator (Android Studio)
# w  → web preview (debug için)

# tip kontrolü
npm run typecheck
```

### Fiziksel cihazda çalıştırma
1. App Store / Play Store'dan **Expo Go** uygulamasını yükle.
2. `npm run start` çıktısındaki QR kodu oku.

> Push notification fiziksel cihazda test edilir; simulator'de Expo push token üretilmez.

### EAS Build

```bash
# bir kez
npm i -g eas-cli
eas login
eas build:configure

# preview build (internal)
eas build -p ios --profile preview
eas build -p android --profile preview

# production
eas build -p ios --profile production
eas submit -p ios
```

## Backend Bağımlılıkları

Mobil uygulama **HENÜZ AÇILMAMIŞ** şu endpoint'leri bekler:

```
POST   /api/v1/mobile/auth/login
POST   /api/v1/mobile/auth/refresh
POST   /api/v1/mobile/auth/logout
GET    /api/v1/mobile/me
POST   /api/v1/mobile/devices
DELETE /api/v1/mobile/devices/:id
GET    /api/v1/mobile/notifications
GET    /api/v1/mobile/student/dashboard
... (tam liste: docs/BACKEND_GAPS.md)
```

Ve şu **migration-safe** Prisma modelleri:
- `MobileDevice`
- `NotificationPreference`
- `StudentDailyTask`
- `AppActivityLog`

→ Detay ve Prisma snippet'leri: [`docs/BACKEND_GAPS.md`](./docs/BACKEND_GAPS.md)

## Tasarım İlkeleri

- **Dark-first.** Brand `#7C5CFF`.
- Tüm kartlar `rounded-2xl` + ince border.
- Pressable scale 0.98 + haptic.
- Tüm uzun listelerde FlashList.
- Loading → Skeleton; Error → ErrorState; Empty → EmptyState (tutarlı UX).

## Konvansiyonlar

- **`@/` alias** → `src/`. Path alias hem TS hem Metro tarafında çalışır.
- Hiçbir bileşen doğrudan `process.env`'e dokunmaz; `src/constants/config.ts` üzerinden.
- Token sadece `tokenStorage` (SecureStore) üzerinden okunur/yazılır.
- API çağrıları `src/api/<domain>.ts` modüllerinden geçer; ekran içinde çıplak `fetch` yok.

## Yol Haritası

Bkz. [`docs/MASTER_PLAN.md`](./docs/MASTER_PLAN.md) — sprint sprint çıktılar.
