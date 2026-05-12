# OnlineDershanem Mobile — Master Plan

## Vizyon
> Mobil uygulama, web panelin minik kopyası DEĞİL. Öğrencinin günlük takip ve
> motivasyon merkezi olan; öğretmen için **hızlı yoklama / değerlendirme**
> aracı olan; veli için tek-bakışta-takip; admin için operasyonel özet
> sunan **modern productivity** uygulaması.

## Stack
- **Runtime:** Expo SDK 52, React Native 0.76, New Architecture aktif.
- **Routing:** Expo Router 4 (typed routes + tsconfigPaths).
- **Lang:** TypeScript strict + `noUncheckedIndexedAccess`.
- **UI:** NativeWind 4 (Tailwind RN), React Native Reanimated 3, Gesture Handler 2, FlashList 1.7, expo-image, expo-haptics, react-native-svg.
- **Data:** TanStack Query 5 (+ async-storage persist), Zustand 5 (state).
- **Auth/Storage:** expo-secure-store (token), AsyncStorage (cache), MMKV opsiyonel.
- **Forms:** React Hook Form + Zod.
- **Notifications:** expo-notifications + Expo Push.
- **Build:** EAS (TestFlight + Play Internal).

## Klasör Stratejisi
```
app/                          # Expo Router (route layer)
src/api/                      # HTTP client + endpoint modules
src/features/<domain>/        # UI + queries + mutations + components
src/components/ui/            # Design-system primitives
src/providers/                # AppProviders, AuthProvider, QueryProvider
src/store/                    # Zustand stores
src/lib/                      # storage, queryClient, notifications, haptics, logger
src/hooks/                    # cross-cutting hooks
src/constants/                # config, colors, spacing
src/types/                    # api, user, models
src/utils/                    # cn, date, format
```

## Auth Akışı
```
SecureStore --> AuthProvider hidrasyonu
       |
       v
   /me OK ? --> store.user dolu --> AuthGate role grubuna redirect
       |
       no
       v
   /(auth)/login
```
Her API isteği:
```
fetch -> 401 -> /auth/refresh -> başarı? -> retry
                                |-> başarısızsa logout
```
Tokenlar: **Access 15 dk**, **Refresh 30 gün**, rotation, refresh hash DB'de.

## State Management
- **Server state**: React Query (cache + invalidation). Mutation'larda **optimistic update** (özellikle task toggle, attendance).
- **Auth state**: Zustand (`useAuthStore`).
- **UI state**: Zustand (`useUIStore` — bottom sheet vs).
- **Persistans:** Token → SecureStore. Query cache → AsyncStorage persister.

## Tasarım Sistemi
- Dark-first. Brand `#7C5CFF` (Linear/Notion mavisi).
- Spacing: 4 / 8 / 12 / 16 / 24 / 32 / 48.
- Typography: Inter (system fallback).
- Tüm kartlar `rounded-2xl border border-bg-border`.
- Pressable scale-down 0.98 + haptic.

## Sayfa Haritası

### Öğrenci (Bottom Tabs)
1. **Bugün** (`/(student)/index`) — Greeting + streak + bugünün görevleri (toggle) + bugünkü dersler + performans + son bildirimler + motivasyon.
2. **Dersler** — Yaklaşan + geçmiş, Meet linki.
3. **Görevler** — Filtreli (yapılacak/teslim/değerlendirilen/geciken).
4. **Denemeler** — Sonuçlar, net/doğru/yanlış/sıra; detayda subject/topic stats.
5. **Profil** — Hesap, tercihler, çıkış.

### Öğretmen (Bottom Tabs)
- **Dashboard**, **Dersler**, **Yoklama** (sınıf seç → öğrenci listesi → toplu işaretle), **Değerlendirme**, **Profil**.

### Veli (Bottom Tabs)
- **Çocuğum** (multi-child swipe), **Performans**, **Devam**, **Ödemeler**, **Profil**.

### Admin (Bottom Tabs + modal stack)
- **Özet**, **Arama**, **Duyuru gönder**, **Profil**.

## Push Notification Hiyerarşisi
| Tetikleyici | Alıcı | Kategori | Priority |
|---|---|---|---|
| Yeni ders | Öğrenci + öğretmen | LESSON | NORMAL |
| Ders 15 dk | Öğrenci + öğretmen | LESSON | HIGH |
| Yeni ödev | Öğrenci | ASSIGNMENT | NORMAL |
| Ödev 24h | Öğrenci | ASSIGNMENT | HIGH |
| Ödev değerlendirildi | Öğrenci | ASSIGNMENT | NORMAL |
| Deneme sonucu | Öğrenci + veli | EXAM | HIGH |
| Öğretmen mesajı | Öğrenci/veli | TEACHER_MESSAGE | NORMAL |
| Duyuru | Hedef rol | ANNOUNCEMENT | NORMAL/URGENT |
| Devamsızlık | Veli | ATTENDANCE | HIGH |

Kullanıcı `NotificationPreference` ile kategori/kanal bazlı kapatabilir.

## Performance Bütçesi
- TTI < 1.5s on iPhone 12.
- Tab switch < 100ms (prefetch + cache).
- Liste render: tüm uzun listelerde FlashList.
- Görseller: `expo-image cachePolicy="memory-disk"`.
- Bundle: Hermes default; gereksiz lib import yok.

## Security Checkpoints
- Tüm endpoint'lerde server-side role guard.
- Token plaintext **sadece** SecureStore'da.
- App background → blur overlay (iOS, opsiyonel v2).
- Pinning v2 (sertifika rotasyonu hazır olunca).
- Telemetry içinde PII maskelenir.

## CI / Release
- **EAS Build profiles:** development / preview / production.
- **OTA updates:** EAS Update (sadece JS bundle değişiklikleri için).
- Versiyonlama: SemVer; native değişiklikte `+1` build number.
- Release tag pattern: `mobile-vX.Y.Z`.

## Roadmap
| Sprint | Çıktı |
|---|---|
| S0 | Scaffold, design system, auth UI, API client, mock provider, BACKEND_GAPS |
| S1 | Backend: mobile auth + /me + MobileDevice + NotificationPreference |
| S2 | Student Home + Lessons + push register |
| S3 | Assignments + Exams + DailyTask backend |
| S4 | Teacher dashboard + Yoklama (offline queue) |
| S5 | Parent + Admin paneller |
| S6 | Push pipeline cron + analytics + EAS preview |
| S7 | TestFlight + Play Internal beta |
| S8 | Production submission |
