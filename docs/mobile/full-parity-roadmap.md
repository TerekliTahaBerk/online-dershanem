# Mobil Tam İşlev Eşliği Yol Haritası (Faz 1–6)

Tarih: 11 Ekim 2026. Dayanak: `main` @ `11316c7`, TestFlight 1.0.0 (Build 5), [implementation-roadmap](./implementation-roadmap.md) (M1–M9), [m9-go-no-go](./m9-go-no-go.md), [role-permission-matrix](./role-permission-matrix.md), [m7-staff-permission-review](./m7-staff-permission-review.md).

**Hedef.** Web panelinde yetkili bir kullanıcının yapabildiği her işlem — deneme/sınav **çözme** hariç — aynı sunucu yetkisi, aynı veri ve aynı sonuçla iPhone uygulamasında native olarak yapılabilir. Web'e yönlendirme yalnız kayıtlı bilinçli istisnalarda kalır; eksik ekranın yerine kullanılmaz.

**Bu belge M1–M9'daki "mobilde seçilmiş akışlar, karmaşık yönetim webde" kararını (`migration-decisions`, `staff-api.ts` başlığı, `slot-screen.tsx`) kaldırır.** Fazlar bu belgede `P1…P6` kimliğiyle anılır (M1–M9 ile karışmasın).

---

## 0. Başlangıç tespiti (koddan doğrulanmış)

| Konu | Durum | Kanıt |
| --- | --- | --- |
| ADMIN mobil kabuğu | Yalnız bilgi ana sayfası; 1–3. sekme yuvaları `null` | `mobile/src/features/shell/slot-screen.tsx` |
| ADMIN menüsü | Sunucu menü bölümleri gizli (`learner = role !== 'ADMIN'`) | `mobile/src/app/(app)/(tabs)/menu.tsx` |
| Personel API kapısı | `requireStaffApi` yalnız `TEACHER` kabul eder; ADMIN bilinçli olarak dışarıda | `lib/panel/staff-api.ts` |
| Sunucu ADMIN menüsü | Hazır: Bugün · Kişiler · Eğitim · Denemeler · Sistem (+ İşletme bölümleri) | `lib/panel/navigation.ts` `adminSections` |
| Web panel rotaları | 106 `page.tsx` (`app/panel/**`); yönetim 28 + ODK yönetim 8 | `find app/panel -name page.tsx` |
| JSON API | 227 `route.ts`; kullanıcı/grup/ders/ödev/materyal/müdahale/özet/kocum uçları ve **ODK yönetim uçlarının ~20'si zaten var** | `app/api/panel/**`, `app/api/odk/admin/**` |
| Yalnız Server Action | 6 dosya: `yonetim/isletme` (~40 eylem), `yonetim/kocluk` (koç atama), `yonetim/siparisler/[id]` (provizyon tekrarı), `ayarlar` (profil), `ogretmen/hazirlik/[id]`, `veli/hesap` | `grep -rl '"use server"'` |
| Salt-okuma projeksiyonları | Web sayfaları RSC içinde doğrudan `lib/**-server.ts` çağırıyor (operasyon merkezi, kişi görünümleri, grup 360, öğrenci 360, analitik) — mobil için GET ucu yok | `lib/panel/*-server.ts` |
| Step-up | Sunucuda var (`requireApiRecentAdminStepUp`, `requireApiRecentStaffStepUp`, 428 `STEP_UP_REQUIRED`, 10 dk); mobil hata eşlemesi var, **native step-up akışı yok** | `lib/auth/api-guards.ts`, `mobile/src/lib/api/errors.ts` |
| `app.config.ts` | `main`'de `EXPO_PUBLIC_PROJECT_ROOT` izin listesinde **mevcut** (satır 35). Değerlendirmedeki "eski liste" bulgusu bu commit için geçerli değil; yine de build makinesinde `git status`/`git diff` ile yerel sapma kontrol edilmeli | `mobile/app.config.ts` |

Değerlendirme raporunda olmayan ek kapsam: **İşletme modülü** (`/panel/yonetim/isletme/[section]`, 16 bölüm: mesaj kutusu, adaylar, satış hunisi, reklam/kampanya, gelir/gider/vergi/mutabakat, AI bilgi merkezi, otomasyon, entegrasyon, sistem kayıtları, ayarlar). Tamamı Server Action tabanlı ve ayrı `BusinessPermission` (ADR-0011) ile korunuyor.

---

## Genel kurallar (her faz, her PR)

1. **Tek backend, tek veritabanı.** Yeni uç, web'in kullandığı **aynı** `lib/**` fonksiyonunu çağırır. İş kuralı kopyalanmaz; Server Action mantığı önce `lib/` içine paylaşılan servise çıkarılır, sonra hem action hem route onu çağırır (web davranışı değişmez).
2. **Yetki sunucuda.** Mobil yalnız sunucu menüsünü (bootstrap `navigation`) ve yanıt içindeki `capabilities`/`can*` alanlarını gösterir; buton görünmesi yetki değildir. Her yeni uç: rol + ürün + personel/işletme izni + kaynak ilişkisi + (gerekirse) step-up.
3. **Sözleşme önce.** Her uç `lib/mobile-contracts/*.ts` içinde tiplenir ve `validate.ts` ile hem sunucu testinde hem mobil istemcide doğrulanır. Sürüm artışı geriye uyumlu (alan ekleme) olur.
4. **Yazma güvenliği.** Her mutasyon: `Idempotency-Key` (ADR-0013), sürüm/`updatedAt` ile 409 çakışma, işlem geçmişi (audit) kaydı, `PRIVATE_NO_STORE`.
5. **Hata yüzeyi.** 401 → yeniden giriş; 403 → "yetkiniz yok" (gizli kaynakta 404); 409 → yeniden yükle + farkı göster; 428 → native step-up; 422 → alan hataları formda; ağ hatası → yeniden dene.
6. **Test kapısı.** Sunucu: rol/ürün/izin/yabancı kimlik/IDOR + step-up + idempotency entegrasyon testleri. Mobil: `tsc --noEmit`, `expo lint`, `jest` (ekran durumları: yükleme/boş/hata/yetkisiz/çevrimdışı). Web regresyonu: ilgili Playwright senaryoları.
7. **Eşlik matrisi kaynak belgedir.** Her PR, `docs/mobile/parity-matrix.md` içindeki satırların durumunu (`Eksik → Kısmi → Tam` / `Bilinçli istisna`) günceller. Satır "Tam" sayılması için okuma **ve** yazma işlemleri kanıtlı olmalıdır.
8. **Şema değişikliği yok** — istisna yalnız açıkça gerekçelendirilmiş durumlarda (ör. hesap silme talep tablosu, P5) ve ayrı ADR ile.

```text
(P0 matris) ──► P1 altyapı ──► P2 yönetim ─────────┐
                    │                               ├─► P6 kabul + TestFlight
                    ├──► P3 öğretmen/koç ───────────┤
                    ├──► P4 Deneme Ligi personeli ──┤
                    └──► P5 öğrenci/veli/ortak ─────┘
```

P1 tamamlanmadan hiçbir yönetim yazma işlemi açılmaz. P2–P5 P1'den sonra paralel yürüyebilir; P4'ün ODK API'si büyük ölçüde hazır olduğundan erken başlatılması önerilir.

**Giriş kapısı (P0):** ✅ v1 hazır — [parity-matrix.md](./parity-matrix.md) (106 rota: 34 Tam · 14 Kısmi · 51 Eksik · 1 İstisna · 6 Yönlendirme; `npm run lint:mobile-parity` ile CI'da denetlenir). 106 sayfa × alt eylem envanteri (rol, ürün, izin, web rotası, mevcut API, okuma/yazma, mobil karşılık, durum). P1 bu matrisin ilk sürümü olmadan başlamaz; sonraki fazlar matrisin satırlarını kapatır.

---

## P1 — Native yönetim altyapısı

**Amaç.** ADMIN (ve izinli personel) için yönetim ekranlarının güvenle açılabileceği iskeleti kurmak; mevcut öğrenci/veli/öğretmen navigasyonunu bozmamak.

**Bağımlılıklar.** P0 matrisi; personel izin modu kararı (aşağıda).

> **Durum (11 Ekim 2026): kod teslimatları uygulandı**, operasyonel kanıt bekleniyor.
>
> | Teslimat | Durum | Yer |
> | --- | --- | --- |
> | Yönetim API kapısı | ✅ | `lib/panel/admin-api.ts` (`requireAdminApi`, `adminJson`) |
> | Step-up mobil uyumu | ✅ | `/api/auth/mfa/code/verify` → `stepUpExpiresAt`; Bearer ile 428 kanıtı `tests/e2e/mobile-api.spec.ts` |
> | Bootstrap `capabilities.security` | ✅ | `lib/mobile/bootstrap-server.ts`, sözleşme eklemeli |
> | ADMIN menüsü (sipariş / paket arka ofisi dahil) | ✅ | `lib/mobile/bootstrap.ts` `backOffice` |
> | Operasyon Merkezi (okuma) | ✅ | `GET /api/panel/admin/operations-center`, `features/admin/operations-center.tsx` |
> | Global arama | ✅ | `features/admin/global-search.tsx` (mevcut `/api/panel/admin-search`) |
> | ADMIN sekme / menü / faz etiketli yer tutucular | ✅ | `slot-screen.tsx`, `menu.tsx`, `native-screens.ts` (P2 / P4) |
> | Native step-up + `useAdminMutation` | ✅ | `features/auth/step-up.tsx`, `features/admin/shared.tsx` (`runWithStepUp`) |
> | Yönetim UI kiti (ilk parçalar) | ✅ | `features/admin/ui.tsx` (süzgeç çipleri, metrik kutuları, rozetler) |
> | Personel izin modu production kararı | ⏳ Operasyon | Production'daki `STAFF_PRODUCT_ASSIGNMENTS` değeri ve shadow uyuşmazlık raporu koddan okunamaz; sahibi operasyon |
> | Ortak yetki kararı servisi (S-5/S-6/S-7/P-4) | ⏳ P2 ile | İlk yönetim yazma uçlarıyla birlikte, uç başına regresyon testiyle |

### Sunucu

1. **Personel izin modu kararı ve kanıtı.** `STAFF_PRODUCT_ASSIGNMENTS` için production modu (`legacy`/`shadow`/`enforce`) belgelenir; shadow log'larındaki uyuşmazlıklar kapatılıp **enforce**'a geçiş planlanır (`docs/business-rbac-migration-runbook.md`). Yönetim yazma uçları enforce varsayımıyla test edilir.
2. **Yönetim API kapısı:** `lib/panel/admin-api.ts` — `requireAdminApi({ permission?, stepUp? })`: ADMIN rolü + MFA zorunlu + (hassas işlemde) `requireApiRecentAdminStepUp`. Personel/işletme izinli roller için `requireApiStaffPermission` / `BusinessPermission` varyantları. `staff-api.ts` dokunulmaz; ADMIN'in öğretmen uçlarına girmemesi korunur (önizleme overlay'i mobilde yazma yetkisi doğurmaz).
3. **Step-up uçlarının mobil uyumu:** `/api/auth/mfa/code/verify` ve passkey uçları Bearer oturumunda `stepUpAt`'ı günceller; yanıt `stepUpExpiresAt` döner. (Web'in `redirect: "/panel/guvenlik"` alanı mobilde yok sayılır.)
4. **Ortak yetki kararı servisi:** `m7-staff-permission-review` ve güvenlik incelemesindeki web/mobil kapsam farkları (S-5, S-6, S-7, P-4) için yetki kararları tek `lib/` fonksiyonuna toplanır; web sayfası ve API aynı fonksiyonu çağırır. Farklılık başına regresyon testi.
5. **Bootstrap genişletmesi:** `GET /api/panel/me` ADMIN için `workspace.navigation` (adminSections + işletme bölümleri) ve `capabilities` (izin listesi, `mfaEnrolled`, `stepUpFreshUntil`) döner. `MOBILE_BOOTSTRAP_CONTRACT_VERSION` geriye uyumlu artırılır.
6. **İlk salt-okuma projeksiyonları:** `GET /api/panel/admin/operations-center` (`admin-operations-center-server.ts`), `GET /api/panel/admin-search` (mevcut; mobil sözleşmesi eklenir).

### Mobil

1. `slot-screen.tsx`: ADMIN için `navigation.primary[slot]` → `resolveNativeScreen` (öğretmenle aynı yol). `native-screens.ts`'e `ADMIN` eşleme tablosu (`today`, `operations`, `provisioning`, `signups`, `people`, `groups`, `calendar`, `coaching`, `outcomes`, `odk-*`, `orders`, `analytics`, `features`, `audit`, `reports`, `pilot`, `quality`, `business-*`). Eşlemesi olmayan id **placeholder + faz etiketi** (`P2`/`P4`) gösterir; web yolu native rota olarak kullanılmaz.
2. `menu.tsx`: `learner` koşulu kaldırılır; ADMIN de sunucu bölümlerini görür.
3. **Native step-up akışı:** `features/auth/step-up-sheet.tsx` (TOTP kodu; passkey destekleniyorsa passkey). API istemcisi 428 aldığında sheet'i açar, başarıdan sonra **aynı Idempotency-Key ile** isteği bir kez tekrarlar.
4. **Yönetim UI kitleri** (`design/primitives` üzerine): filtreli liste (arama, segment, sayfalama/sonsuz kaydırma), detay başlığı + eylem çubuğu, form (alan hataları 422), onay sheet'i (yıkıcı işlem metni), tablo → kart dönüşümü, durum rozetleri (`status-vocabulary.ts` ile aynı sözlük), boş/hata/yetkisiz durumları.
5. **Mutasyon kancası:** `useAdminMutation` — idempotency anahtarı, 409 → yeniden yükle ve fark uyarısı, 428 → step-up, başarıda TanStack Query invalidation.
6. Operasyon merkezi native ana sayfası (salt okuma) + global arama ekranı.

### Çıkış kriterleri

- ADMIN girişte 4 sekme + tam menü görür; her öğe ya native ekran ya etiketli placeholder açar; öğrenci/veli/öğretmen navigasyon testleri (`navigation.test.ts`) değişmeden yeşil.
- Step-up: 428 → sheet → doğrulama → otomatik tekrar; süre dolumu ve yanlış kod testleri.
- Personel izin modu production kararı kayıtlı; enforce testleri yeşil.
- Matriste "Operasyon merkezi (okuma)" ve "Global arama" satırları **Tam**.

---

## P2 — Yönetim panelinin tamamı

**Amaç.** `/panel/yonetim/**` (28 rota) ve İşletme bölümlerinin tüm okuma ve yazma işlemlerini native yapmak. Her alan önce salt-okuma, sonra yazma olarak iki PR'da açılır.

> **Durum (11 Ekim 2026):** **2.1 Operasyon tamamlandı.** **2.2 Kişiler ve erişim tamamlandı:** dizin (Öğrenciler görünümü + erişim bekleyen sayısı), kişi oluşturma, MFA sıfırlama kuyruğu, kişi detayı (6 sekme; kayıt profili kartı, akademik düzenleme, arşiv etkisi önizlemesi, öğretmen güvenli devri, kalıcı silme, branş bağlantısı), Yeni kayıtlar (iletişim takibi, çocuk hesabı), Veliler (bağlantı kur / düzenle / kaldır, geçmiş), Öğretmen doluluğu ve Öğrenci 360 (tüm sekmeler, veli / branş bağlantısı, koç ata / devret, erişim açmayı yeniden dene). `assignCoach` ve `retryOrderProvisioning` Server Action'ları `lib/panel/*-service.ts` servislerine çıkarıldı; web eylemi ve mobil uç aynı servisi çağırır. Matris: Tam 46 · Kısmi 15 · Eksik 38.
>
> | Alan | Web | Sunucu | Mobil | Not |
> | --- | --- | --- | --- | --- |
> | Müdahale | `mudahale` | `GET /api/panel/admin/interventions`; yazma mevcut `interventions/*` | `features/admin/interventions.tsx` | Etiketler `lib/panel/intervention-vocabulary.ts` (web bileşenleri de buradan okur) |
> | Aktivasyon masası | `isler` | Yükleyici sayfadan `lib/panel/activation-desk-server.ts`'e taşındı; `GET /api/panel/admin/activation-desk` | `features/admin/activation-desk.tsx` | Geçiş + sipariş bağlama taze step-up; native step-up ile uçtan uca test |
> | Kişiler | `kisiler`, `kullanicilar[/id]` | Yükleyiciler `people-directory-server.ts`, `person-detail-server.ts`; `GET /api/panel/admin/people[/:id]` | `features/admin/people.tsx`, `person-detail.tsx`, rota `admin/person/[id]` | Personel rol sözlüğü `lib/panel/staff-role-vocabulary.ts` (web formu da kullanır) |
> | Raporlar | `raporlar` | `lib/panel/admin-reports.ts` (saf) + `-server.ts`; `GET /api/panel/admin/reports` | `features/admin/reports.tsx` | CSV E5 ile kapsam dışı |
>
> Tekrarlanan desen (sonraki alanlar için): sayfanın RSC veri yükleyicisi `lib/panel/*-server.ts`'e **olduğu gibi** taşınır, web sayfası onu çağırır (davranış değişmez), mobil uç aynı yükleyiciyi projeksiyonla sunar; durum etiketleri tek sözlükten gelir.

### P2.9 devam kaydı (11 Ekim 2026)

**Kod teslimatı uygulandı; gerçek HTTP/iPhone kabulü bekliyor.** Yönetici menüsünden ve kişi detayından native önizleme seçicisi açılır. Öğrenci/veli/öğretmen adayları mevcut aday arama ucundan gelir; bootstrap hedef kişinin kimliğini ve mevcut native navigasyonunu döndürür. Kalıcı banttan yönetim paneline dönülür. Öğretmen modu aynı ADMIN kimliğiyle TEACHER çalışma alanını açar.

- `X-Od-Preview` / `X-Od-Teacher-Mode`: mevcut imza çekirdekleriyle üretilir; ADMIN kullanıcı + oturum kimliğine bağlıdır. TTL web ile aynı: önizleme 2 saat, öğretmen modu 12 saat. Bearer istekleri tarayıcı çerezini tüketmez/yazmaz. Bozuk, süresi dolmuş, başka oturuma ait veya birlikte gönderilen belirteçler 403 döner.
- Bootstrap eklemeli `adminOverlay: { mode, actorUserId, expiresAt }` alanını taşır. Kapı kontrolleri gerçek aktöre, çalışma alanı verisi etkili kimliğe uygulanır. Mobil mod açıkken yönetim uçlarına erişim kapanır; açık aktör kapısı yalnız mod kontrol uçlarında kullanılır.
- Önizlemede mobil yazma düğmeleri gizlenir ve API istemcisi yazma isteğini durdurur; sunucudaki `guardMutation` ayrıca salt okumayı uygular. Öğretmen modu yazmayı korur; kullanıcı kimliği değişmediği için audit aktörü yöneticidir. Mod sırasında push çalışma zamanı ve hesap güvenliği rotaları kapalıdır.
- Mod değişiminde devam eden sorgular iptal edilir, sorgu ve materyal önbelleği temizlenir. Belirteç ve ürün seçimi yalnız bellektedir; ürün seçimi hedefin veya yöneticinin oturumuna yazılmaz. Süre sonunda bootstrap yeniden doğrulanır; hata/ürünsüz durumdan da yönetim paneline dönüş vardır.

**Doğrulama:** mobil tip kontrolü/lint ve tam Jest paketi geçti (24 paket / 190 test); sunucu tip kontrolü, overlay/önizleme/öğretmen modu/bootstrap birim testleri ve sözleşme sınırı kontrolü geçti. `tests/e2e/mobile-api.spec.ts` içindeki iki P2.9 gerçek HTTP senaryosu eklendi; bu ortamda E2E hesapları/veritabanı yapılandırması olmadığı için **atlandı**. Gerçek iPhone ve web çerez regresyonu henüz yürütülmedi. Bu nedenle P2 çıkış kriterleri tamamlandı sayılmaz; matris rota toplamları değişmez.

**Kalan geliştirme sırası (koddan kontrol edildi):**

| Sıra | Kalan iş | Hazır olan / sonraki somut teslimat |
| --- | --- | --- |
| 1 | P2.9 kabul | Gerçek HTTP senaryolarını E2E ortamında çalıştır; üç rol önizlemesi, yazma reddi, öğretmen yazması/audit, süre dolumu, çıkış ve web çerez regresyonunu gerçek iPhone ile doğrula |
| 2 | P2.3 Eğitim | Uygulama eşliği tamamlandı; ders/seri, ödev/teslim, materyal/dosya, kurulum, takvim ve kazanımlar native. Gerçek cihaz dosya kabulü P6 |
| 3 | P2.4 Koçluk | Uygulama eşliği tamamlandı: ortak web/mobil kuyrukları, native kapasite/öğrenci/görüşme takibi ve güvenli atama/devretme. Sonraki geliştirme P2.6 |
| 4 | P2.6 Siparişler | Uygulama eşliği tamamlandı: ortak liste/detay GET, native vaka/ödeme/erişim takibi ve güvenli provizyon tekrarı. Sonraki geliştirme P2.8 |
| 5 | P2.8 Analitik/sistem | Okuma ekranları tamamlandı (Y21–Y24, Y26). Sırada Y25 pilot kohort yönetimi ve Y18 dış deneme kaydı/revizyonu; runtime özellik yazması ADR-0015 kararını bekler |
| 6 | P2.7 İşletme | Ortak servis çıkarımı + BusinessPermission API'leri + 16 bölümün native karşılıkları; E3–E5 kapsam dışı kalır |
| 7 | P3–P5 ve P6 | Rol bazlı eksikler aşağıdaki faz tabloları ve `parity-matrix.md` üzerinden kapanır; gerçek cihaz kabulü/TestFlight tüm fazları bekler |

Production personel izin modu/kanıtı P1'in açık operasyon maddesi olarak kalır; bu çalışmada production ayarı veya yayın yapılmadı.

### P2.3 ilk okuma teslimatı — 11 Ekim 2026

- Eğitim sayfasının sorguları `lib/panel/education-management-server.ts` içine taşındı; web ve `GET /api/panel/admin/education` aynı yükleyiciyi kullanır. Mobil yanıt kişi seçeneklerini veya dosya erişim URL'lerini taşımaz; yalnız yönetim özetidir.
- `GET /api/panel/admin/groups/[id]?sekme=` mevcut `loadGroup360Bundle` ile beş sekmeyi üretir. Eksik grup JSON 404, geçersiz sekme 400; gerçek ADMIN kapısı ve `private, no-store` uygulanır. Web'in `notFound()` davranışı korunur.
- Eğitim menüsü native listeye eşlendi: aktif/arşiv/tümü, grup/ders/seviye/öğretmen araması, ders/ödev/materyal okuma bölümleri. Grup 360'da kontenjan, haftalık ders, üyeler/risk/katılım, program/seriler/çakışmalar, geçmiş ve operasyon sinyalleri görünür. Üyeden mevcut Öğrenci 360'a gidilir.
- Y13 ve Y14 **Kısmi** oldu. P2.3 bitmedi. Sonraki iş: grup/üye yazmalarına sunucuda idempotency ve sürüm kontrolü ekleyip native oluşturma/düzenleme/öğrenci ekleme/çıkarma/transfer/onay akışlarını açmak. Ardından seri ders önizleme, ödev/materyal CRUD + dosya işlemleri, kurulum, takvim ve kazanımlar; bunlar bitmeden P2.4'e geçilmez.
- Mevcut grup/üye yazmaları taze step-up, audit ve yaşam döngüsü kontrolleri içeriyor; idempotency ve sürüm önkoşulları eksik. Bu teslimatta yazma düğmesi açılmadı ve bu eksik tamamlandı sayılmadı.

**Doğrulama:** tam mobil Jest paketi geçti (25 paket / 196 test), eğitim projeksiyonunun 4 sunucu birim testi geçti; sunucu/mobil tip kontrolü, değişen kaynakların lint kontrolü, sözleşme sınırı ve eşlik matrisi kontrolü temiz. P2.3 gerçek HTTP senaryosu eklendi; E2E hesapları tanımlı olmadığı için bu ortamda atlandı. Gerçek HTTP ve cihaz kabulü açık kalır.

### P2.3 grup ve üye yazmaları — 11 Ekim 2026

- Mevcut `groups` POST, `groups/[id]` PATCH ve `groups/[id]/members` POST ortak `group-management-service.ts` servisine bağlandı. İş kuralları web/mobil arasında kopyalanmaz; kapasite, aktif hesap/grup, transfer ve ders çakışması kontrolleri mevcut yaşam döngüsü servislerini kullanır.
- Bearer yazmalarında UUID `idempotencyKey` zorunlu; güncellemede `expectedRevision`, transferde ayrıca `expectedTargetRevision` zorunlu. Sürüm grup alanlarını ve aktif üyelikleri kapsar. Eksik önkoşul 400, eski sürüm/aynı anahtarın farklı istek için kullanılması 409. Anahtar aktöre bağlıdır; aynı içerikte tekrar saklanan sonucu döndürür.
- Makbuz mevcut `AuditLog.idempotencyKey` tekilliğinde saklanır; yeni şema/migration gerekmez. Grup/üyelik değişikliği, audit/makbuz, in-app bildirim ve e-posta outbox'ı aynı Serializable transaction içindedir. Kaynak/hedef satırları kimlik sırasıyla kilitlenir. E-posta dış ağ çağrısı transaction'a girmez; cron outbox'ı dağıtır. Bildirimler yalnız aktif ve akademik veri izni olan veli ilişkilerine gider; kanal tercihleri korunur.
- Eski web formları gövde uyumluluğu için anahtar/sürüm göndermeden aynı servisi kullanabilir. **Zorunlu idempotency/sürüm önkoşulu Bearer yazmalarına uygulanır**; legacy web form sürüm koruması tamamlandı sayılmaz.
- Native grup oluşturma, bilgi düzenleme, öğretmen değiştirme (onay ve takvim kontrolü), kapat/tekrar aç, öğrenci arama/ekleme ve en fazla 20 üyede transfer/çıkarma/bildirim açıldı. Toplu işlemler sunucu önizlemesinden ve kullanıcı onayından sonra uygulanır; seçim/metin/hedef değişince önizleme silinir. 428'de native step-up aynı anahtarla tekrarlar; 409'da veri yenilenir ve sessiz tekrar yapılmaz.
- **Sıradaki iş:** ders oluşturma/düzenleme ve seri ders önizlemesi. Ardından ödev/materyal CRUD, teslim değerlendirme, dosya yükleme/açma, kurulum, kurum takvimi ve kazanımlar. P2.3 ve Y13/Y14 tam kabulü bunları bekler; P2.4'e henüz geçilmez.

**Doğrulama:** geçici, yalnız yerel PostgreSQL üzerinde reponun 120 migration'ı uygulandı. Yeni grup yönetimi (7), mevcut grup/ders yaşam döngüsü (4) ve bildirim dağıtımı (1) olmak üzere **12 entegrasyon testi geçti**; gerçek eşzamanlı oluşturma/son kontenjan transferi, tekrar, rollback, outbox ve veli izinleri kapsandı. Sürüm/anahtar/önkoşul ve mevcut projeksiyon/domain birim testleri geçti. Tam mobil Jest paketi **26 paket / 205 test** ile geçti; 20 ilgili sunucu birim testi, tip/lint, sözleşme sınırı, API giriş doğrulaması ve matris kontrolleri temiz. Native testler step-up tekrarını, sürüm çakışmasını, oluşturma/düzenleme, öğretmen/durum, üye ekleme, transfer/çıkarma/bildirim önizlemesi/onayını kapsar. İki P2.3 gerçek HTTP senaryosu yapılandırılmış E2E hesapları olmadığı için atlandı; gerçek iPhone/web HTTP kabulü açık kalır. Test PostgreSQL sunucusu çalışma sonunda kapatıldı.

**Sıra ve kapsam.**

| # | Alan | Web rotaları | Mevcut API | Eklenecek sunucu işi | Native ekranlar / işlemler |
| --- | --- | --- | --- | --- | --- |
| 2.1 | Operasyon | `yonetim`, `mudahale`, `isler`, `raporlar` | `interventions/*`, `reports/export`, `email-outbox/[id]/retry` | GET: operasyon kuyruğu, provizyon işleri (`isler`) | Görev listeleri + filtre, müdahale detay/çözüm, provizyon tekrar, rapor özetleri (CSV dışa aktarma E5 ile kapsam dışı) |
| 2.2 | Kişiler ve erişim | `basvurular`, `kisiler`, `kullanicilar[/id]`, `ogrenciler[/id]`, `veliler`, `egitmenler` | `users/*` (status, products, staff-roles, mfa-reset, reset-password, offboarding, archive-impact, accessibility, coach-profile; `bulk` E4 ile kapsam dışı), `signups/*`, `relationships/*`, `mfa-resets/[id]/approve`, `leads/[id]` | GET: kişi görünümleri (`people-views.ts`), öğrenci 360 (`student-360`) projeksiyonu | Kişi dizini (rol sekmeleri), detay, oluşturma/düzenleme, durum, ürün erişimi, personel rolleri, MFA sıfırlama onayı, parola sıfırlama, arşiv etkisi + işten çıkarma, veli-öğrenci ilişkisi. **Step-up zorunlu:** rol/erişim/MFA/parola/arşiv. |
| 2.3 | Eğitim | `egitim`, `gruplar/[id]`, `takvim`, `kazanimlar` | `groups/*`, `lessons/*` (+`preview-series`), `assignments/*`, `materials/*` (+upload), `curriculum/*`, `calendar/export` | GET: grup 360 (`group-360-server.ts`) | Grup listesi/detay/üye yönetimi, ders oluşturma (seri önizleme), ödev/materyal CRUD + dosya yükleme (`lib/files`), takvim görünümü, kazanım sürümleri |
| 2.4 | Koçluk | `kocluk` | `coaching-sessions/*`, `kocum/*` | **Server Action → API:** `assignCoach` → `POST /api/panel/admin/coach-assignments`; GET `/api/panel/admin/coaching` ve `/sessions/[id]` (kapasite/üyelik hataları 422) | Koç atama, kapasite görünümü, öğrenci takip, görüşme detayları |
| 2.5 | Deneme Ligi yönetimi | `odk/yonetim/**` | P4'te | — | P4'te (ADMIN aynı ekranları kullanır) |
| 2.6 | Ticari operasyon | `siparisler[/id]` | `orders/[id]/onboarding`, `orders/[id]/user`, `purchases` | **Server Action → API:** `retryOrderProvisioning` → `POST /api/panel/admin/orders/[id]/provisioning-retry`; GET sipariş listesi/detay | Sipariş listesi, detay, ürün erişimi hazırlama, provizyon tekrarı. **Müşteri satın alma akışı eklenmez** (App Store ücretli içerik politikası). |
| 2.7 | İşletme | `isletme/[section]` (16 bölüm) | yalnız `admin/business/reports.csv`, `admin/integrations/instagram` | **36 Server Action** `lib/business/**` servislerine çıkarılır; `app/api/panel/business/<bölüm>/**` uçları `BusinessPermission` ile | Mesaj kutusu (atama/etiket/okundu), adaylar + satış hunisi (aşama, not, görev, takip, sahip, öncelik, birleştirme), kampanya/reklam, gelir/gider/vergi/mutabakat (dönem kilidi **step-up**), AI bilgi merkezi, otomasyon kuralları (dry-run), entegrasyon durumu (salt okuma; Meta bağlantı kurulumu E3 ile kapsam dışı), sistem kayıtları, ayarlar. Finans raporlarının CSV dışa aktarımı E5 ile kapsam dışı |
| 2.8 | Analitik ve sistem | `analitik[/metric]`, `ozellikler`, `kayitlar`, `pilot`, `kalite`, `denemeler` | `analytics/export`, `pilot-cohorts/*`, `events` | GET: analitik metrikleri (`management-analytics-definitions`), özellik bayrakları okuma/yazma (`flags.ts` + ADR-0015), audit listesi, kalite | Metrik kartları + grafik (sparkline/bar), metrik detay, özellik bayrağı değiştirme (**step-up**), işlem geçmişi filtreli liste, kontrollü yayın kohortları |
| 2.9 | Yönetici önizlemesi (View As) + öğretmen çalışma modu | kabuk `admin-preview*` | `admin-preview` POST/DELETE, `admin-preview/candidates` | Önizleme durumu bugün imzalı **çerezde** (`od_panel_preview`, 2 sa); mobil Bearer kullandığı için çerezsiz taşıma gerekir: `POST /api/panel/admin-preview` mobil istemciye imzalı önizleme belirteci döner, istekler `X-Od-Preview` başlığıyla gelir; belirteç ADMIN `userId` + oturum kimliğine bağlı, aynı TTL ve aynı doğrulama (`admin-preview-core.ts`). Bootstrap önizlemede **konu** kullanıcının navigasyonunu ve `preview: { role, userId, expiresAt }` döner. Önizleme açıkken tüm mutasyonlar sunucuda reddedilir (mevcut kural) — test: her yazma ucu önizleme başlığıyla 403. **Öğretmen modu (E6)** aynı belirteç modeliyle (`X-Od-Teacher-Mode`) taşınır; önizlemeyle birbirini dışlar, yazma açıktır ve denetim kaydı yöneticinin kimliğiyle tutulur (`docs/admin-teacher-mode.md`) | Aday arama → rol seç → öğrenci/veli/öğretmen native ekranları konu adına salt okuma; kalıcı "Önizleme: Ad Soyad · Çık" bandı; yazma düğmeleri gizli; çıkışta ADMIN kabuğuna dönüş |

**Kapsam kararları (11 Ekim 2026).** Yönetici önizlemesi native yapılır (2.9). Mobilde **olmayacaklar:** Meta/Instagram hesap bağlantısının kurulumu, toplu kullanıcı içe aktarma (`users/bulk`), büyük finans raporları ve CSV dışa aktarımları. Bunlar matriste onaylı istisna (E3–E5) olarak kayıtlıdır; mobil bunlar için web bağlantısı da göstermez. Yönetici öğretmen çalışma modu da native yapılır (E6, 2.9).

**Uygulama sırası.** 2.1 → 2.2 (okuma) → 2.9 (önizleme; salt okuma ekranları zaten var, erken değer) → 2.2 (yazma) → 2.3 → 2.4 → 2.6 → 2.8 → 2.7. İşletme en sona alınır çünkü en büyük Server Action → API çıkarımı oradadır ve web CRM'ini kırma riski en yüksektir.

**Riskler.** Server Action çıkarımında web davranış farkı (çözüm: önce saf servis + birim test, sonra action'ı servise çeviren PR, sonra route); büyük listeler için sayfalama eksikliği (uçlar cursor tabanlı olmalı); dosya yükleme boyut/ağ dayanıklılığı.

**Çıkış kriterleri.** Yönetim matris satırlarının tamamı `Tam` veya onaylı `Bilinçli istisna`; her yazma ucu için yetkisiz rol/ürün/izin, IDOR, step-up, idempotency ve 409 testleri; mobilde yapılan değişiklik web sayfasında aynı durumla görünür (Playwright çapraz kontrol en az alan başına bir senaryo).

---

### P2.3 eğitim yazmaları ve native eşlik tamamlandı — 12 Ekim 2026

- Ders, ödev, materyal, kurulum, kazanım ve teslim değerlendirme web işleyicileri `lib/panel/education-handlers/` altında ortaklaştırıldı. ADMIN yazmaları taze step-up, UUID işlem anahtarı ve hedef sürümüyle çalışır; webin eski gövde sözleşmeleri korunur. Bearer’da eksik önkoşul 400, eski sürüm/anahtar çakışması 409. Kayıtlar, bildirim/outbox ve denetim makbuzu aynı Serializable transaction içindedir. Yerel Prisma facade iç transaction’ları aynı işleme bağlar; global istemci değiştirilmez.
- Native ortak eğitim editörü grup/bireysel ders, seri önizleme, ONE/FOLLOWING düzenleme/erteleme/iptal/yedek öğretmen ve telafi; ödev oluşturma/düzenleme/arşiv, kazanım/kanıt/rubric ve teslim değerlendirme; materyal bağlantı/PDF/MP4/düzenleme/arşiv/kimlikli açma; grup+öğrenci+veli bağlantısı+ders hızlı kurulumunu kapsar. Program sekmesinden gruba ders planlanabilir.
- Haftalık kurum takvimi grup/öğretmen filtreleri ve mevcut kurum ICS aralığıyla indirme/paylaşma sağlar. Kazanımlar bayrağa bağlı sürüm listesi/detayı/durum değişikliği, kazanım oluşturma/detayı ve son 30 gün ders/ödev kapsamasını gösterir. Y13–Y16 uygulama eşliği `Tam`; sıradaki geliştirme P2.4’tür.
- Özel dosya URL’si mobil yanıta veya işlem makbuzuna yazılmaz. Yükleme başarısızsa Blob temizliği çalışır; e-posta/outbox transaction’a dahildir, katalog invalidation ve çapraz ürün yayınları commit sonrasına ertelenir. Native seçim geçici kullanıcı önbelleğine kopyalanır; başarı/ekrandan ayrılma/oturum kapanışında temizlenir. PDF/MP4 sınırı 4 MB. `expo-document-picker` eklendiği için yeni native build gerekir; yalnız OTA yeterli değildir.

**Doğrulama:** 962 sunucu birim testi; geçici yerel PostgreSQL’de 17 eğitim/grup/ders entegrasyon testi; tam mobil Jest 27 paket/215 test; beş rolün gerçek tarayıcı yetki matrisi 10 testle geçti; gerçek HTTP sentetik hesap senaryosu geçti (yetki, 428, önkoşul, tekrar, eski sürüm, seri kapsamı, bireysel/erteleme/yedek/telafi, kanıtlı teslim değerlendirme, ödev, materyal, kurulum, ICS, kazanım ve dosya boyutu/depo-kapalı hataları). Sunucu/mobil tip ve lint, API doğrulama ve eşlik matrisi temiz; iOS/Android/web Expo export başarılı. Gerçek iPhone dosya seçme/açma/paylaşma ve yapılandırılmış özel Blob’a başarılı yükleme kabulü Faz 6’da bekler; bu testte dış dosya/e-posta servisleri kapalıdır. Üretim ayarı, TestFlight veya kamu yayını yapılmadı.

### P2.4 koçluk operasyonu tamamlandı — 12 Ekim 2026

- Web ve mobil kuyrukları `loadAdminCoaching` üzerinden aynı veri ve gecikme kuralını kullanır. Koç bekleyen, geciken, plansız (bayrak açıkken), hedefsiz, kapasite üstü ve Yön sinyalleri kuyrukları; koç dizini, bugünkü/geciken sayıları, öğrenci takip ve görüşme detayları native. Webin plan/hedef kuyruklarındaki 12 satır sınırı kaldırıldı; sayaç ve liste artık aynı kapsamda.
- `POST /api/panel/admin/coach-assignments` taze step-up ister. Bearer yazmaları UUID işlem anahtarı ve atama sürümü taşır; eksik/geçersiz önkoşul 400, eski sürüm veya anahtarın farklı içerikte kullanımı 409. Web ve mobil aynı Serializable servisi kullanır; üyelik, aktif öğrenci/koç ve kapasite işlem içinde kontrol edilir, atama ve denetim makbuzu birlikte commit olur. Gerekçesiz kapasite aşımı 422. Eski web gövdeleri uyumludur.
- Öğrenci 360 atama kısayolu da sürüm ve aynı step-up tekrar anahtarını kullanır. Native atama onay ister; 428 sonrası tek tekrar aynı anahtarla, 409 sonrası okuma yenilenir. Özel koç notları yeni yönetim yanıtlarında seçilmez; yalnız paylaşılan not, odak, bağlantı ve saat değişikliği bilgisi gösterilir.

**Doğrulama:** 966 sunucu birim testi, tam mobil Jest 28 paket/217 test; sunucu/mobil tip ve lint, API doğrulama ve eşlik matrisi temiz; iOS/Android/web Expo export başarılı. İzole yerel PostgreSQL’de 4 testle atama tekrarı, son kapasite yarışı, gerekçeli aşım, eski sürüm, üyelik/aktif hesap ve geri alma testleri; sentetik hesaplarla gerçek HTTP rol/step-up/önkoşul/409/özel not gizliliği ve gerçek tarayıcıyla web formunda devir senaryosu; native kapasite/onay/428/409/arama/boş kuyruk/görüşme detayı testleri. Gerçek iPhone kabulü P6’da bekler; üretim ayarı veya yayın yapılmadı. Sıradaki geliştirme P2.6 Siparişler.

### P2.6 sipariş operasyonu tamamlandı — 12 Ekim 2026

- Web ve mobil aynı `loadAdminOrders` / `loadAdminOrder` verisini okur. Native liste sorun/bu ay/tümü filtreleri, paket/ad/e-posta araması ve 30 satırlık sayfalama sunar. Detay ödeme ve erişim durumunu ayrı gösterir; ürün satırları, ödeme geçmişi, onboarding sorumlusu/son tarihi/sıradaki işlem, kişi/Öğrenci 360 ve teknik hata bilgisi erişilebilir. Alıcı formu/kimlik verisi mobil projeksiyona alınmaz.
- Sipariş detayından mevcut aktivasyon masası hesaba bağlama ve onboarding formları kullanılır; yeni satın alma veya ödeme akışı eklenmez. Arama ve operasyon merkezi sipariş bağlantıları yetkili menü kontrolüyle native detaya gider.
- Web ve mobil provizyon tekrarı taze step-up, UUID ve sipariş sürümü ister. Atomik koşullu sahiplenme ile kalıcı başlangıç/audit kaydı birlikte commit olur; mevcut OD/ODK provisioner'ları hesap/üyelik/iletişim kurallarını yürütür. Tamamlanan istek aynı anahtarla yeniden çalışmadan kayıtlı sonucunu döndürür; sürmekte olan aynı istek veya eski sürüm 409 verir. Süreç kesilirse mevcut beş dakikalık RUNNING kurtarma kuralı, güncel görünüm ve yeni anahtar gerekir. Ödeme değiştirilmez. Öğrenci 360 kısayolu da sipariş sürümü taşır.

**Doğrulama:** 970 sunucu birim testi; tam mobil Jest 29 paket/223 test; sunucu/mobil tip ve lint; API doğrulama, sözleşme sınırı ve eşlik matrisi temiz; iOS/Android/web Expo export başarılı. Yerel PostgreSQL'de beş P2.6 entegrasyon testi liste/sayfa/filtre, yarış, audit geri alma, hata/başarı tekrarı, tek üyelik/iletişim ve ODK uyumluluğunu doğrular. Gerçek HTTP sentetik hesaplarıyla 401/403/404/400/428/409, özel önbellek ve veri sınırı; tarayıcıda web Server Action tekrarı geçti. Native arama/sayfa, onay/428/409, rol reddi ve aktivasyon formları testli. Y19–Y20 `Tam`; toplam 53 Tam / 15 Kısmi / 31 Eksik / 1 İstisna / 6 Yönl. Gerçek iPhone kabulü P6'da bekler; üretim ayarı veya yayın yapılmadı. Sıradaki geliştirme P2.8 Analitik/sistem.

## P3 — Öğretmen ve Yön Koçu işlev eşliği

**Amaç.** M7 ekranlarını koruyarak `/panel/ogretmen/**` (19 rota) eşliğini tamamlamak.

| Alan | Web | Mevcut mobil | Eksik → yapılacak |
| --- | --- | --- | --- |
| Öğrenciler ve gruplar | `gruplar`, `ogrenci/[id]` | Yok (koçta öğrenci var) | Grup listesi, öğrenci profili (öğrenci 360'ın öğretmen kapsamlı projeksiyonu; ilişki kontrolü `teacherId`/grup üyeliği) |
| Ödevler | `odevler` | Görüntüleme + teslim değerlendirme | Oluşturma/düzenleme/yayın (`/api/panel/assignments` POST/PATCH; şablonlar `teacher/templates`, kazanım favorileri) — `teacher-assignments.tsx` içindeki "web panelinde" banner'ı kaldırılır |
| Materyaller | `materyaller` | Yok | Liste, yükleme (`materials/upload`), düzenleme, gruba atama |
| Ders | `ders/[id]`, `takvim`, `plan` | Liste, detay, yoklama/kapanış | Takvim görünümü, ders notları (`lessons/[id]/notes`), seri planlama |
| Tekrar ve telafi | `tekrar`, `telafi` | Yok | İnceleme kuyruğu yanıt/erteleme (`review-queue/*`), telafi paketi oluşturma/yayın/kontrol noktası (`recovery-packages/*`) |
| Müdahale ve analiz | `mudahale`, `analiz` | Yok | Müdahale kutusu (`interventions/*`, `generate`), analiz görünümü (yeni GET projeksiyonu) |
| Haftalık özetler | `ozetler` | Yok | Özet üret/düzenle/yayınla (`weekly-digests/*`) |
| AI yardımcı | `ai-yardimci` | Yok | Taslak listesi/oluşturma/onay (`ai-drafts/*`), `safe-teacher-ai-operations` kuralları ve bayrağına bağlı |
| Yardım talepleri | `yardim` | Var | Geri bildirim (`student-help-requests/[id]/feedback`) |
| Deneme analizi | `denemeler` | ODK raporları var | `mockExamAnalysis` bayrağına bağlı dış deneme analizi |
| Yön koçu | `yon`, `yon/gorusmeler`, `yon/ogrenciler`, `hazirlik/[id]` | Ana sayfa, öğrenci, görüşme, not, plan, görev, öneri, onay | **Hazırlık çalışma alanı:** `ogretmen/hazirlik/[id]/actions.ts` → `lib/` servis + `/api/panel/staff/coach/prep/[id]` uçları; plan kopyalama (`kocum/plans/[id]/copy`), şablon uygulama, haftalık özetler (`kocum/summaries`), ileri müdahaleler |

**Kurallar.** Öğretmen uçları `requireStaffApi` + kaynak ilişkisi; özellik bayrağı kapalıysa menü öğesi gelmez ve uç 404/403 döner — mobil kendi bayrak kontrolünü yapmaz, sunucu menüsüne uyar.

**Çıkış kriterleri.** Öğretmen ve koç matris satırları `Tam`; M7 regresyon (`m7-iphone-smoke-checklist`) yeşil; yabancı öğretmenin başka grubun öğrencisine/ödevine erişimi 403/404 testleriyle kanıtlı.

---

## P4 — Deneme Ligi personeli (ODK yönetimi)

**Amaç.** `/panel/odk/yonetim/**` (8 rota) + `odk/ogretmen/raporlar` native. **Sınav çözme ekranları kapsam dışı kalır** (`odk/ogrenci/denemeler/[id]/coz` web'de; E1).

**Sunucu.** API büyük ölçüde hazır: `app/api/odk/admin/exams/[id]/{questions,imports/answer-key,imports/outcomes,files,preview,ready,schedule,assignments,sessions,score,rescore,results,release,release/preview}`, `exam-series`, `attempts/[id]`, `pilot-runs/*`. Eksikler:

1. Mobil sözleşmeleri (`lib/mobile-contracts/odk-admin.ts`) ve doğrulayıcılar.
2. Canlı operasyon için hafif GET (`operasyon`: aktif oturumlar, bağlantı/ihlal sayaçları — `odk-integrity-monitoring`) ve paketler (`paketler`) okuma ucu, yoksa eklenir.
3. ODK personel menüsü (`navigation.ts` "Deneme Ligi PERSONEL menüsü") ADMIN olmayan izinli personel için bootstrap'te zaten geliyor; uçlar personel izinlerini (`staff-permission-matrix`) enforce modda doğrular.
4. Sonuç yayını, yeniden puanlama ve cevap anahtarı içe aktarma **step-up** (`requireApiRecentStaffStepUp`).

**Mobil ekranlar.** Sınav listesi (durum: taslak → hazır → planlı → canlı → puanlandı → yayınlandı, `odk-exam-lifecycle`), sınav detayı (sekmeler: genel, sorular, cevap anahtarı, kazanımlar, dosyalar, atamalar, oturumlar, sonuçlar), soru düzenleme (`odk-question-schema`), cevap anahtarı/kazanım içe aktarma (dosya seçici), önizleme (salt okuma, çözme değil), hazır işaretleme + takvim, atama (grup/öğrenci), canlı operasyon panosu (yenileme aralıklı sorgu), deneme girişimi inceleme, puanlama/yeniden puanlama, yayın önizleme + yayın, sonuç raporları, paketler, pilot koşuları.

**Çıkış kriterleri.** `odk-pilot-acceptance-checklist` personel adımlarının tamamı mobilde yürütülebilir; yayın sonrası öğrenci/veli mobil sonuç ekranları (M4/M6) aynı sonucu gösterir; yetkisiz personelin başka ürün/sınava erişimi reddedilir.

---

## P5 — Öğrenci, veli ve ortak ayarlar

**Öğrenci (`/panel/ogrenci/**`, 18 rota).**

- Dino AI (`dino`): `/api/panel/dino` üzerinden native sohbet; `dino-allowlist`, yaş/kitle kuralları ve ürün bayrağına bağlı. Çocuk verisi incelemesi (`m9-child-data-review`) onayı olmadan bayrak kapalı kalır.
- `gelisim` (eski, `progressInsights` kapalıyken), `takvim[/id]`, `profil`, `tekrar`, `telafi`, `hedefler` yazma eksikleri matrise göre tamamlanır.
- Deneme listesindeki eski kayıtlar için web yönlendirmesi kaldırılır (eski kayıt detayı native salt-okuma).
- `OD_WEB_ONLY` / `OK_WEB_ONLY` kümeleri boşaltılır; yalnız `odk/.../coz` istisnası kalır.

**Veli (`/panel/veli/**`, 13 rota).**

- Koçluk görüşmesi saat değişikliği talebi + katılım bağlantısı (`coaching-sessions/[id]` uçlarına veli kapsamlı işlem; `parent-scope.ts`).
- Haftalık geri bildirim: yalnız Yön/Deneme Ligi erişimli veli için sunucu yetki sınırı (`weekly-digests/[id]/feedback`) `parent-product-policy.ts` üzerinden düzeltilir + test.
- `veli/hesap/actions.ts` → servis + `/api/panel/parent/account` yazma uçları; `takip`, `bildirimler`, `dino` eşliği.

**Ortak.**

- `ayarlar[/section]` (`saveProfileSettings` → API), `erisilebilirlik`, `guvenlik` (MFA kayıt/yenileme, passkey), `oturumlar`, `parola`, `veri-kullanimi`, `bildirimler`.
- **Hesap silme:** e-posta talebinden uygulama içi başlatma + onaylama akışına geçiş (`m9-account-deletion-review`; DSR mimarisi, saklama süresi, veli-çocuk politikası). Gerekirse tek şema değişikliği burada, ayrı ADR ile.
- **Push:** personel bildirimleri (APNs, izin istemi, bildirim tercihleri, gizlilik incelemesi) — `m5-*` altyapısı üzerine; push yayında kapalı başlar, kontrollü açılır.

**Çıkış kriterleri.** Öğrenci/veli matris satırları `Tam`; `M6` veli kapsam güvenlik testleri yeşil; hesap silme uçtan uca (talep → onay → silme/anonimleştirme) staging'de kanıtlı.

---

## P6 — Gerçek cihaz kabulü ve TestFlight

1. **Ön koşullar (Gate A):** P1–P5 çıkış kriterleri; `m9-go-no-go` engellerinin kapatılması (staging/prod origin ayrımı, backend SHA ↔ migration uyumu, S-1/S-5 düzeltme kanıtı, staff enforce kararı).
2. **Build tutarlılığı:** build makinesinde `git status --short` ve `git diff -- mobile/app.config.ts mobile/app.json` temiz; `main` ile yerel ağaç eşleşiyor; sürüm `1.1.0`, build numarası artırılmış; `EXPO_PUBLIC_*` izin listesi testi.
3. **Otomatik kontroller:** kök `npm run lint`/`typecheck`/test + Playwright; `mobile/` `tsc`, `expo lint`, `jest`; sözleşme doğrulama testleri; yetki matrisi entegrasyon testleri.
4. **Rol bazlı test hesapları (staging, sentetik veri):** öğrenci (OD, Yön, Deneme Ligi), veli (tek/çok çocuk, yalnız Yön/ODK), öğretmen, Yön koçu, Deneme Ligi personeli (enforce atamalı), ADMIN (MFA'lı), işletme izinli personel.
5. **Senaryo bazlı manuel kabul (gerçek iPhone):** her matris satırı için en az bir okuma + bir yazma senaryosu; çapraz kontrol: mobilde yapılan değişiklik web'de görünüyor; negatif senaryolar (yetkisiz rol/ürün/öğrenci, süresi dolmuş step-up, 409 çakışma, çevrimdışı). Kanıt: `docs/mobile/p6-validation-results.md` (ekran görüntüsü/kayıt referanslarıyla).
6. **TestFlight:** EAS build → iç test grubu → kabul tekrar → harici test (gerekirse). Kamuya açık App Store yayını ayrı karar: hesap silme, çocuk verisi, ücretli dijital eğitim içeriği sınıflandırması (`m9-commerce-policy-review`) kapanmadan yapılmaz.

**Çıkış kriterleri (= "Tamamlandı").**

| Kontrol | Başarı koşulu |
| --- | --- |
| Rol eşliği | Her rolün yetkili web işlemleri mobilde erişilebilir (matris %100 `Tam` / onaylı istisna) |
| Ürün eşliği | OD, Yön, Deneme Ligi ayrımı korunuyor |
| Veri / yazma eşliği | Aynı kayıtlar, durumlar, sonuçlar; mobil değişiklik web'de görünüyor |
| Güvenlik | Yetkisiz rol/ürün/öğrenci erişimi reddediliyor; hassas işlemde step-up |
| Hata yönetimi | 401/403/404/409/422/428 doğru ele alınıyor |
| Web'e yönlendirme | Yalnız sınav çözmede (E1); E3–E5 mobil kapsamı dışında, bağlantı gösterilmez |
| Yayın | TestFlight'ta gerçek cihazda bütün rol senaryoları kanıtlı |

---

## Önerilen PR dilimleri (ilk dalga)

1. `docs`: parity-matrix.md v1 (P0).
2. `server`: `admin-api.ts` kapısı + step-up mobil uyumu + testler.
3. `server`: bootstrap ADMIN navigasyon/capabilities + sözleşme sürümü.
4. `mobile`: ADMIN yuva/menü açılımı + placeholder faz etiketleri + navigasyon testleri.
5. `mobile`: step-up sheet + `useAdminMutation` + yönetim UI kiti.
6. `server+mobile`: operasyon merkezi + global arama (salt okuma).
7. `mobile`: ODK yönetimi salt okuma (API hazır olduğu için paralel başlatılabilir).

Her dilim kendi başına yayınlanabilir ve mevcut rollerin davranışını değiştirmez.

### P2.8 analitik ve sistem okumaları tamamlandı — 12 Ekim 2026

Y21–Y24 ve Y26 native: İstanbul tarih aralığı, ürün/sınav/sınıf/grup/öğretmen filtreleri, metrik kataloğu ve detay sözleşmesi, ticari/eğitim/başarı özetleri, kohort dağılımı ve pozitif değişim çubukları; özellik envanteri/drift/geri alma bilgisi; tür filtreli son 100 işlem; öğrenme kalitesi ve ortak eksik sinyalleri. Liste filtreleri metrik detayına taşınır. CSV dışa aktarımı E5 istisnası olarak kalır.

Dört GET ucu gerçek ADMIN hesabını doğrular, `private, no-store` döner ve bağımlılıksız mobil sözleşmelerle kontrol edilir. Web ve mobil aynı metrik hesabını, kalite yükleyicisini ve audit/özellik yükleyicilerini kullanır. Audit payload ve kimlik doğrulama bilgileri taşınmaz. Yetersiz örneklemli kohortlar yalnız sınav türü/durum içerir; kesin öğrenci sayısı, kapsama, değişim yönü ve veri tarihi istemciye gönderilmez. Kalite bayrağı kapalıysa API 404 döner.

**Doğrulama:** 973 sunucu birim testi; izole PostgreSQL'de tam 132 entegrasyon testi; native filtre aktarımı, detay/rol reddi, audit filtresi/boş durum, özellik drift/geri alma, kalite dağılımı ve kapalı bayrak/bozuk sözleşme testleri; sentetik dört rolle gerçek HTTP 401/403/400, sözleşme ve private/no-store; tarayıcıda dört mevcut web ekranı regresyonu. Sunucu/mobil tip ve lint, sözleşme/tasarım token sınırı ve eşlik matrisi kontrol edilir; iOS/Android/web export başarılı. Gerçek iPhone kabulü P6'da bekler.

**P2.8 henüz bütünüyle tamamlanmadı:** Y25 pilot kohort oluşturma/geçişleri ve Y18 dış deneme ekleme/hata nedeni/sonraki adım revizyonu sıradaki geliştirmedir; bunların yazmalarında web ve mobil için ortak step-up, idempotency, sürüm/409 ve atomik audit uygulanmalıdır. Özellik ekranı mevcut web eşliği kapsamında salt okunur; [ADR-0015](../adr/0015-runtime-panel-feature-snapshot.md) onaylanmadan runtime okuma/yazma politikası eklenmez. Üretim ayarı, pilot aktivasyonu veya yayın yapılmadı.

Matris: 58 Tam / 15 Kısmi / 26 Eksik / 1 İstisna / 6 Yönl.; yönetimde 24 Tam, 3 Eksik (Y18, Y25, Y27), 1 Yönl.

### P2.8 tamamlandı: kontrollü yayın ve dış denemeler — 12 Ekim 2026

Y25 ve Y18 native. **Kontrollü yayın:** hazırlık kapıları, gruptan dört rollü kohort oluşturma ve sunucunun izin verdiği geçişler (aktive et / duraklat / sürdür / tamamla / geri al, durdurma nedeniyle). **Dış denemeler:** öğrenci seçimi, elle veya toplu yapıştırmayla giriş, kişisel hata eğilimi, tek sonraki adım onayı ve neden revizyonu.

Web sayfalarının yükleyicileri `lib/panel/pilot-server.ts` ve `lib/panel/admin-mock-exams-server.ts`'e taşındı; iki yeni GET ucu (`/api/panel/admin/pilot`, `/api/panel/admin/mock-exams`) aynı yükleyiciyi projeksiyonla sunar. Yazmalar web ile AYNI `pilot-cohorts*` ve `mock-exams*` uçlarında kalır; rota mantığı `pilot-cohort-service.ts` ve `mock-exam-service.ts` servislerine taşındı:

- **Step-up:** pilot oluşturma/geçiş her yönetici için; dış deneme yazmaları yalnız yönetici aktörde taze step-up ister (öğretmen / öğrenci akışı değişmedi). Web formları 428'de güvenlik sayfasını gösterir.
- **İşlem anahtarı:** aktöre bağlı makbuz `AuditLog.idempotencyKey`; aynı anahtar aynı gövdeyle ilk sonucu döndürür, başka gövde veya başka yönetici 409 `IDEMPOTENCY_REUSE`. Bearer yazmalarında anahtar (ve deneme revizyonunda `expectedRevision`) zorunlu.
- **Sürüm / 409:** pilot `expectedVersion`; deneme revizyonu nedenler + onaylı adım özeti (`mockExamRevision`).
- **Atomik audit:** kayıt ve audit tek Serializable transaction'da; ürün olayları commit sonrası.

**Doğrulama:** sunucu/mobil tip ve lint; 977 sunucu birim testi (kapsam eşikleri karşılanıyor); yerel PostgreSQL'de tam entegrasyon paketi 134/134 (yeni: eşzamanlı aynı anahtar, yeniden kullanım, eski sürüm/revizyon, atomik audit); mobil 31 paket / 234 test; API girdi, sözleşme sınırı ve matris kontrolleri; `next build`. Yeni gerçek HTTP senaryosu `tests/e2e/mobile-api.spec.ts` içinde; web pilot e2e'si step-up'a uyarlandı. Bu ortamda E2E hesapları olmadığından e2e koşulmadı; gerçek iPhone kabulü P6'da.

Matris: 60 Tam / 15 Kısmi / 24 Eksik / 1 İstisna / 6 Yönl.; yönetimde yalnız Y27 (İşletme, P2.7) eksik.

