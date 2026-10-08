# M2 devir notu — OD öğrenci deneyimi

M1 temeli hazır: bootstrap, kapılar, çalışma alanı navigasyonu, API istemcisi, TanStack Query, tasarım primitives, bildirimler, hesap. M2 bu temelin üzerine **yalnız OD çalışma alanını** native'e taşır. M2'ye M1 kapsamındaki hiçbir şey başlatılmadı.

## 1. Taşımaya hazır ekranlar

M1'de bu ekranlar `git mv` ile korunarak `mobile/src/features/` altına taşındı ve yalnız ait oldukları çalışma alanında, sunucu menüsü onları içerdiğinde açılıyor (`mobile/src/navigation/native-screens.ts`). Hepsi geçici köprü `useLegacySession()` ile yeni API istemcisini kullanıyor (Bearer, zaman aşımı, merkezi 401); ancak **TanStack Query'ye, yeni primitives'e ve sözleşme doğrulamasına henüz geçmedi.**

| Dosya | Menü id (çalışma alanı) | Kullandığı uç | Durum | M2 aksiyonu |
| --- | --- | --- | --- | --- |
| `features/od/od-home.tsx` | `today` (OD) | `GET /api/panel/student/home` | REUSE, ürün bağımsız uç | REBUILD: OD Bugün (Şimdi / Bugün listesi / Bu hafta). `today`/`weeklyPlan`/`latestExam` alanları Yön ve Deneme Ligi verisi taşır — OD ekranında gösterilmemeli. Öneri: `?scope=OD` (ADAPT, eklemeli). `unifiedToday.items[].href` → `useNavTarget().openNotificationHref` ile aynı eşleyici |
| `features/od/od-lessons.tsx` | `lessons` (OD) | `GET /api/panel/student/lessons?durum=yaklasan\|tamamlanan` | REUSE | REFACTOR: Query + primitives + `StatusBadge`; ders satırı → **yeni** ders detayı |
| `features/od/od-assignments.tsx` | `assignments` (OD) | `GET /api/panel/assignments`, `PATCH /api/panel/assignments/[id]/progress`, `POST /api/panel/assignments/[id]/submissions` | REUSE | REFACTOR: "Yön Koçluk plan görevleri" bölümünü kaldır (Yön'e, M3). Durum güncellemesinde sunucunun desteklediği `expectedVersion` + `mutationKey` (uuid) gönder; 409 çakışmayı göster. Kanıt gönderiminde `idempotencyKey` zaten var. Yazmalar otomatik tekrarlanmaz |
| `features/od/od-materials.tsx` | `materials` (OD) | `GET /api/panel/materials`, `GET /api/panel/materials/[id]/file` (Bearer, `authHeaders()`) | REUSE | KEEP + primitives; indirilen dosyanın önbellek ömrü / adı gözden geçirilmeli (güvenlik incelemesi S2) |
| `features/od/od-progress.tsx` | `analiz` / `progress` (OD) | `GET /api/panel/student/progress` (repo içinde **yalnız mobil** kullanıyor), `PATCH /api/panel/student/weekly-goal` | ESKİ uç | REBUILD: **NEW** `GET /api/panel/student/insights` (`lib/progress-insights/server.ts#loadStudentProgressInsight`, web `/panel/ogrenci/analiz` ile aynı). Sonra `student/progress` kullanımdan kaldırılır (MD-16) |
| `features/shared/external-mock-exams.tsx` | `mock-exams` (OD veya Yön; flag `mockExamAnalysis`) | `GET/POST /api/panel/mock-exams` | REUSE | Düşük öncelik; menü yalnız flag açıkken içerir |
| `features/ok/ok-goals.tsx` | `goals` (Yön) | `GET /api/panel/student/goals` | REUSE | M3 |

OD menüsünde olup M1'de yer tutucu kalan öğeler (`resolveNativeScreen` → `placeholder`, faz M2): `review-recovery` (flag), `check-in` (flag), `weekly-digest`, `dino` (flag).

## 2. M2'nin ihtiyaç duyduğu sunucu işleri

| Öncelik | Uç | Kaynak | Ön iş |
| --- | --- | --- | --- |
| P1 | `GET /api/panel/student/lessons/[id]` | `/panel/ogrenci/takvim/[id]` sayfasının sorguları | Sorguları `lib/` sunucu fonksiyonuna çıkar; sayfa aynı fonksiyonu çağırsın (davranış değişmeden) |
| P1 | `GET /api/panel/student/insights` | `loadStudentProgressInsight` | — |
| P2 | `GET /api/panel/student/home?scope=OD` | `getStudentHomeData` | Eski alanlar en az iki mağaza sürümü korunur |
| P2 | Flag kapalı / kaynak yok 404'lerine kararlı kod | ilgili route'lar | İsteğe bağlı; mobil şu an `not_found` olarak toplar |

Her yeni uç için: `lib/mobile-contracts/` altına tip + doğrulayıcı, `tests/integration` yetki testi (OD yok → 404 `PRODUCT_ACCESS_REQUIRED`, yabancı kaynak → 404), mümkünse `tests/e2e/mobile-api.spec.ts`'e Bearer senaryosu.

## 3. Uygulama deseni (M1'de kuruldu)

```ts
// Veri: workspace kapsamlı anahtar + paylaşılan doğrulayıcı
const bootstrap = useReadyBootstrap();
const { api } = useSession();
const query = useQuery({
  queryKey: queryKeys.workspaceResource(bootstrap.user.id, 'OD', 'lessons', { durum }),
  queryFn: ({ signal }) => endpoints.fetchLessons(api, durum, signal), // parse* ile doğrula
});
// Ekran: <Screen> + PageHeader + Section + Row + StatusBadge (+ Skeleton / ErrorState / EmptyState)
// Gezinme: useNavTarget().openNavId(id) — sunucu menüsünde olmayan hedef açılmaz
```

- Durum etiketi / tonu sunucudan gelmeli (`lib/panel/status-vocabulary.ts`); mobilde enum → etiket tablosu tutulmaz.
- Yeni ekran `useLegacySession` kullanmaz. Tüm eski ekranlar taşındığında `src/lib/legacy-session.ts`, `src/components/{panel-ui,themed-*}.tsx`, `src/constants/theme.ts`, `src/hooks/use-theme.ts` silinir.
- Sekme / iç ekran eşlemesi `native-screens.ts`'te; yeni ekran eklemek = `NativeScreenKey` + `native-screen-view.tsx` kaydı + `navigation.test.ts` vakası.

## 4. M2 başlamadan önce kontrol edilecekler

1. `mobile.yml` iş akışının GitHub Actions'ta ilk koşusu (PR ile).
2. Gerçek cihazda (iOS + Android) M1 kabuğunun duman testi: giriş, MFA, çalışma alanı seçimi, çıkış, bildirim açma, dinamik yazı boyutu, VoiceOver/TalkBack. M1'de yapılamadı.
3. Ürün kararları: MD-08 (sınav çözme), MD-09 (satın alma) — M2'yi engellemez ama M4/M6'yı etkiler.
4. `MOBILE_MIN_SUPPORTED_VERSION` staging / üretim değeri (önerilen: ilk mağaza sürümüyle birlikte `1.0.0`).
