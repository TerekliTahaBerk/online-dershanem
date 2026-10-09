# M3 test sonuçları

Tüm komutlar bu oturumda, 2026-10-09'da, `claude/loving-goodall-972n6c` dalında gerçekten çalıştırıldı. Sayılar komut çıktısından alındı.

**Kullanıcı talimatı:** "Kesinlikle test yazma". M3'te **yeni test dosyası veya yeni test senaryosu yazılmadı**. M3 bilinçli olarak iki davranışı değiştirdi:
- Yön menüsü yer tutucudan Yön ekranlarına geçti.
- OD check-in yer tutucudan native ekrana geçti.

Bu değişikliğe dayanan **mevcut** beklentiler en küçük farkla güncellendi. Değişiklikler:
- **`src/test/app-flow.test.tsx`:** Yön hesaplarında `placeholder-today` → `yon-today` (9 satır); bir test başlığı.
- **`src/test/od-home.test.tsx`, `od-assignments.test.tsx`:** `placeholder-today` → `yon-today` (Yön'e geçiş sonrası).
- **`src/test/od-review-recovery.test.tsx`:** check-in yer tutucu beklentisi → native `check-in` ekranı (2 satır + başlık).
- **`src/navigation/navigation.test.ts`:** Yön `today`, `assignments`, `goals` ve `weekly-digest` eşleme beklentileri; OD `check-in` native listesine alındı.

## 1. Özet

| Katman | Komut | Sonuç |
| --- | --- | --- |
| Taban (M3 öncesi) | mobil tsc / lint / Jest | ✅ temiz, Jest 141/141 |
| Mobil TypeScript | `cd mobile && npm run typecheck` | ✅ 0 hata |
| Mobil lint | `cd mobile && npm run lint` | ✅ 0 sorun |
| Mobil Jest | `cd mobile && npx jest --ci` | ✅ **141/141** (15 paket). Yer tutucu beklentileri güncellenmeden önce 13 test, bilinçli davranış değişikliği nedeniyle başarısızdı |
| Mobil paketleme | `EXPO_OFFLINE=1 npx expo export --platform android` / `ios` | ✅ Android 3,3 MB, iOS 3,0 MB Hermes (legacy kaldırıldı; M2: 3,4 / 3,1) |
| Paket sızıntı taraması | `PrismaClient`, `@prisma`, `server-only`, `DATABASE_URL`, `NEXTAUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`, `loadStudentProgressInsight`, `loadYonToday`, `loadStudentPlan`, `loadStudentCoachingHub`, `loadStudentCheckIn`, `privateNote` | ✅ 0 eşleşme (iki platform) |
| Sözleşme sınırı | `node scripts/check-mobile-contracts.mjs` | ✅ temiz (6 sözleşme dosyası) |
| Token senkronu | `node scripts/check-mobile-tokens.mjs` | ✅ 32 değer |
| Kök typecheck / lint / hijyen / API doğrulama | `npm run typecheck`, `lint`, `lint:hygiene`, `lint:api-validation` | ✅ (194 route, 214 metot) |
| Kök unit + kapsam | `npm run test:unit:coverage` | ⚠️ **928/929**. Tek hata önceden var olan `lib/public-marketing-products.test.ts` (CSS modülü; M2'de ve `main`'de de kırık). Kapsam 93,22 / 81,11 / 73,97; eşikler 90 / 74 / 70 |
| Entegrasyon (CI ortamı, sıfırdan DB + `db:seed`) | `npm run test:integration` | ✅ **100/100** |
| E2E (gerçek `next start`, 10 paket) | `playwright test` — `mobile-api`, `coaching-experience`, `kocum-lifecycle`, `panel-access`, `panel-experience`, `permission-matrix`, `panel-auth-smoke`, `phase0-security`, `panel-design-phase1/2` | ⚠️ 94 test: 91 geçti, 1 flaky, 2 başarısız (aşağıda) |

E2E ayrıntısı:
- **`mobile-api`:** 18/18.
- **Yön / koçluk web akışları:** `coaching-experience` 3/3, `kocum-lifecycle` 1/1, `phase0-security` 4/4. Bu akışlar ortak yükleyiciye taşınan sayfaları kullanır.
- **Diğer paketler:** `panel-access` 10/10, `permission-matrix` 15/15, `panel-auth-smoke` 4/4, `panel-design-phase1` 3/3, `panel-design-phase2` 7/7.

### E2E başarısızlıklarının analizi

1. **`panel-experience` › "öğrenci kapasitesine göre plan önerir…" — test sırası kirliliği, M3 değil.**
   - Toplu koşuda `kocum-lifecycle` aynı öğrenciye bu hafta için onaylı plan oluşturuyor; ardından gelen bu test "plan yok" durumunu bekliyor.
   - Taze veritabanında `panel-experience` tek başına koşulunca bu test **geçti**.
2. **`panel-experience` › "öğretmen sakin özeti önizler…" — M3'ün dokunmadığı kod.**
   - `POST /api/panel/weekly-digests/generate` 500 dönüyor: `backgroundJob.create` idempotency anahtarı benzersizlik hatası.
   - Taze veritabanında da tekrarlandı.
   - M3 bu uca, `lib/panel/weekly-digest*` modüllerine ve öğretmen akışına dokunmadı. Öğrenci haftalık özet okuması M2'deki gibi.
3. **(yalnız tekil koşuda) `panel-experience` › "admin hızlı kurulumla…" — tarih / saate bağlı, M3 değil.**
   - `/api/panel/setup` "Planlanan saat başka bir ders ile çakışıyor (öğretmen)" diyor: test `Date.now() + 3 gün` saatinde ders kuruyor ve tohum dersle çakışıyor.
   - Yönetim kurulum koduna dokunulmadı.
4. **Flaky:** "erişilebilirlik tercihleri…" M2'de de flaky'ydi (ikinci denemede geçti).

**Yapılmayan doğrulama:** 2 ve 3 numaralı hataların M2 commit'inde de oluştuğu ayrıca yeniden derlenerek kanıtlanmadı. Dayanak, değiştirilen dosyaların bu akışlarla kesişmemesi.

## 2. İstenen kontrol alanları

| # | Alan | Nerede doğrulandı / durum |
| --- | --- | --- |
| 1 | Yön-only öğrenci | mobil `app-flow` (Yön Bugün açılır, OD uçları çağrılmaz); E2E OK guard'ları |
| 2 | OD + OK öğrenci | mobil `od-home` (çalışma alanı geçişi → Yön Bugün) |
| 3 | OK `assignments` OD'ye düşmez | `navigation.test` (`yon-work`); `od-assignments` (Yön'de OD derin bağlantısı açılmaz, OD ucu çağrılmaz) |
| 4 | Check-in OD menüsünde native | `od-review-recovery` (check-in ekranı açılır) |
| 5 | Web Yön sayfaları ortak yükleyiciyle değişmeden çalışır | E2E `coaching-experience`, `kocum-lifecycle`, `panel-experience` (plan testi tekil koşuda geçti), `phase0-security` |
| 6 | Mobil paket sunucu kodu taşımaz | export + sızıntı taraması |
| 7 | Sözleşme sınırı | `check-mobile-contracts` |

**Yeni M3 uçları için yeni entegrasyon / E2E testi yazılmadı** (talimat). Bu uçlar şu an yalnız tip kontrolü, lint, API doğrulama betiği ve aynı yükleyiciyi kullanan web E2E'leri üzerinden dolaylı olarak doğrulandı. Önerilen testler: [m4-handoff.md](./m4-handoff.md) §5.

## 3. Yapılamayanlar (açıkça)

- **Gerçek cihaz / simülatör testi YAPILMADI.** Ortamda cihaz yok. Doğrulanamayanlar:
  - Native sekme çubuğunda Yön ekranları.
  - Alt sayfa (BottomSheet) ve klavye davranışı.
  - `Switch` erişilebilirliği.
  - Görüşme bağlantısının harici uygulamada açılması.
  - Dinamik yazı boyutu ve ekran okuyucu.
- **Staging ve gerçek hesaplar kullanılmadı.**
- **`mobile.yml` CI işi:** Bu dalda koşmadı (PR yok). Komutlar yerelde aynı sırayla koşuldu.
