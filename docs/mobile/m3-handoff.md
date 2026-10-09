# M3 devir notu — Yön Koçluk çalışma alanı

M2 OD öğrenci deneyimini tamamladı. M3'e hiçbir şey başlatılmadı. Bu not M3'ün neye dayanabileceğini ve neyin Yön'e özel kalması gerektiğini anlatır.

## 1. Yeniden kullanılabilir temeller

| Temel | Yer | Nasıl kullanılır |
| --- | --- | --- |
| Sözleşme doğrulayıcıları | `lib/mobile-contracts/validate.ts` (`v.object`, `v.union`, `v.optional`…) | Yeni Yön sözleşmeleri `lib/mobile-contracts/yon.ts` olarak yazılmalı; eklemeli alanlar `v.optional` |
| Hata kodları | `MOBILE_API_ERROR_CODES` (+ `FEATURE_DISABLED`) | Bayrak kapalı uçlar 404 `FEATURE_DISABLED` |
| Sorgu katmanı | `features/od/shared.tsx`: `useOdQuery`, `QueryView`, `usePullToRefresh`, `useOnline`, `useInvalidateOd`, `OdRouteGate` | Yön için aynı kalıpta `useYonQuery` / `YonRouteGate`: `queryKeys.workspaceResource(user, 'OK', …)`. `QueryView`, `usePullToRefresh` ve `useOnline` olduğu gibi `features/shared/`'a taşınabilir (ürün bağımsız) |
| Yazma kalıbı | `features/od/assignments/hooks.ts` (`keyForWrite`, UUID anahtar, sonucu belirsiz yazmada anahtarı koruma, 409 → geçersizleme) | Yön plan görevi tamamlama / check-in |
| UUID | `lib/ids.ts` (native v4) | Tüm idempotency anahtarları |
| Saat | `lib/format/istanbul.ts` | Tüm tarih / saat gösterimi |
| Güvenli bağlantı | `lib/links.ts` | Dış bağlantılar, görüşme bağlantıları (`meetingUrl`) |
| Dosya | `lib/files/material-files.ts`, `features/od/use-material-opener.ts` | Kimlikli dosya; çıkışta temizlik zaten bağlı |
| Primitives | `design/primitives` + yeni `SegmentedTabs`; `Screen` iOS klavye kaçınma | Yön vurgusu tema üzerinden otomatik (`#0754c9`) |
| Sunucu katmanı | `lib/mobile/*` (saf dönüştürücü + `*-server` yükleyici); web sayfası ile ortak yükleyici deseni (`student-review-recovery-server.ts`) | Yön web sayfalarının (`app/panel/ogrenci/yon`, `plan`, `kocluk`, `hedefler`) sorgularını önce ortak yükleyiciye çıkar |
| Test düzeneği | `mobile/src/test/{harness,fake-server,od-fixtures}.ts` (hesaba özel `routes`, `flags`, `extraNav`) | Yön testleri aynı düzenekle |

## 2. Mevcut navigasyon yapısı

- **Bootstrap:** `workspace.navigation` (sunucu) → `resolveNativeScreen(role, workspace, item)`.
- **OD öğrencisi:** Tüm menü öğeleri native ekrana veya açık web devam yoluna gidiyor (bkz. [m2-screen-migration.md](./m2-screen-migration.md)).
- **Yön öğrencisi (`OK_STUDENT`):** `goals` (eski, M1'den korunan ekran) ve `mock-exams` (ortak dış denemeler) native. Diğer her şey M3 yer tutucusu.
- **OD detay rotaları (`/od/...`):** Yalnız OD çalışma alanında açılıyor. Yön için ayrı `/yon/...` rotaları açılmalı; `/od/...` rotaları Yön'de yeniden kullanılmamalı.
- **`assignments` menü kimliği:** Yön çalışma alanında da var. M2'de Yön'deki `assignments` OD ekranına DÜŞMÜYOR (yer tutucu). Yön'ün "Çalışmalar"ı ayrı bir ekran olmalı.

## 3. Kalan eski bağımlılıklar

Yalnız `features/ok/ok-goals.tsx` kullanıyor:
- `lib/legacy-session.ts`
- `components/{panel-ui,themed-text,themed-view}.tsx`
- `constants/theme.ts`
- `hooks/use-theme.ts`

M3 `ok-goals`'u taşıdıktan sonra bu dosyaların tamamı silinebilir (tüketici kalmayacak).

Sunucuda `GET /api/panel/student/progress` yalnız eski mobil sürümler için duruyor. En eski desteklenen sürüm onu bırakınca kaldırılabilir (MD-16).

## 4. M3'ün güvenle üzerine kurabileceği şeyler

- `GET /api/panel/student/home` artık `scope` parametresi alıyor. `scope=OK` için aynı desenle bir Yön okuma modeli eklenebilir. `getStudentHomeData({ scope })` ve `getStudentToday({ products })` genişletilmeye hazır. Şu an yalnız `"OD"` kabul ediliyor; zod şeması bilinçli olarak dar.
- `buildStudentHomeActionPlan` zaten Yön adaylarını (`OPEN_PLAN`) üretiyor. Yön "Şimdi" eylemi için yeni öncelik kuralı yazılmamalı.
- `useInvalidateOd` deseni: Başarılı yazmadan sonra çalışma alanı kapsamındaki tüm görünümler yenileniyor.

## 5. Yön'e özel kalması gerekenler

- **Plan görevleri:** OD Çalışmalar ve OD Bugün'e GİRMEZ. Ödeve bağlı plan görevi sunucuda tekil tutulmalı (`dedupeLinkedWorkItems`); mobilde ikinci ilerleme kaydı oluşturulmamalı.
- **Plan tamamlama oranı:** OD gidişatında gösterilmiyor. Yön gidişatında gösterilecekse Yön çalışma alanında, açıkça etiketlenerek.
- **Check-in:** OD ve Yön ortak bir form (`requireFirstAccessibleProductRole(["OD","OK"])`). Mobilde tek bir ekran olarak M3'te ele alınmalı; OD menüsünde şimdilik web devam yolu.
- **Koçluk görüşmeleri:** `meetingUrl` gösterimi ve görüşme saatleri yalnız Yön'de; `lib/links.ts` ile.
- **Dış denemeler:** OD ve Yön'de ortak (`mock-exams`). Deneme Ligi ile karıştırılmamalı.

## 6. M3 başlamadan önce

1. **Gerçek cihaz duman testi** (iOS + Android; M1 + M2):
   - Giriş, OD Bugün, ödev durumu ve kanıt.
   - Ders detayında "Derse katıl".
   - Materyal indirip açma, çıkışta dosya temizliği.
   - Dinamik yazı boyutu ve ekran okuyucu.
2. **Mobil CI işi:** `mobile.yml` işinin bu dal için PR'da koşması.
3. **Ürün kararları:** check-in'in mobil sahipliği (OD mi Yön mü, ortak mı); Dino AI'ın mobil kapsamı.
4. **Önceden var olan, M2 dışı hatalar:**
   - `lib/public-marketing-products.test.ts` (CSS modülü).
   - Herkese açık sayfa E2E'leri.
   - `admin-mfa.spec.ts`.
