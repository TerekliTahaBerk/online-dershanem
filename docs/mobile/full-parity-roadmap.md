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

**Sıra ve kapsam.**

| # | Alan | Web rotaları | Mevcut API | Eklenecek sunucu işi | Native ekranlar / işlemler |
| --- | --- | --- | --- | --- | --- |
| 2.1 | Operasyon | `yonetim`, `mudahale`, `isler`, `raporlar` | `interventions/*`, `reports/export`, `email-outbox/[id]/retry` | GET: operasyon kuyruğu, provizyon işleri (`isler`) | Görev listeleri + filtre, müdahale detay/çözüm, provizyon tekrar, rapor özetleri (CSV dışa aktarma E5 ile kapsam dışı) |
| 2.2 | Kişiler ve erişim | `basvurular`, `kisiler`, `kullanicilar[/id]`, `ogrenciler[/id]`, `veliler`, `egitmenler` | `users/*` (status, products, staff-roles, mfa-reset, reset-password, offboarding, archive-impact, accessibility, coach-profile; `bulk` E4 ile kapsam dışı), `signups/*`, `relationships/*`, `mfa-resets/[id]/approve`, `leads/[id]` | GET: kişi görünümleri (`people-views.ts`), öğrenci 360 (`student-360`) projeksiyonu | Kişi dizini (rol sekmeleri), detay, oluşturma/düzenleme, durum, ürün erişimi, personel rolleri, MFA sıfırlama onayı, parola sıfırlama, arşiv etkisi + işten çıkarma, veli-öğrenci ilişkisi. **Step-up zorunlu:** rol/erişim/MFA/parola/arşiv. |
| 2.3 | Eğitim | `egitim`, `gruplar/[id]`, `takvim`, `kazanimlar` | `groups/*`, `lessons/*` (+`preview-series`), `assignments/*`, `materials/*` (+upload), `curriculum/*`, `calendar/export` | GET: grup 360 (`group-360-server.ts`) | Grup listesi/detay/üye yönetimi, ders oluşturma (seri önizleme), ödev/materyal CRUD + dosya yükleme (`lib/files`), takvim görünümü, kazanım sürümleri |
| 2.4 | Koçluk | `kocluk` | `coaching-sessions/*`, `kocum/*` | **Server Action → API:** `assignCoach` → `POST /api/panel/coach-assignments` (kapasite/üyelik hataları 422) | Koç atama, kapasite görünümü, öğrenci takip, görüşme detayları |
| 2.5 | Deneme Ligi yönetimi | `odk/yonetim/**` | P4'te | — | P4'te (ADMIN aynı ekranları kullanır) |
| 2.6 | Ticari operasyon | `siparisler[/id]` | `orders/[id]/onboarding`, `orders/[id]/user`, `purchases` | **Server Action → API:** `retryOrderProvisioning` → `POST /api/panel/orders/[id]/provisioning/retry`; GET sipariş listesi/detay | Sipariş listesi, detay, ürün erişimi hazırlama, provizyon tekrarı. **Müşteri satın alma akışı eklenmez** (App Store ücretli içerik politikası). |
| 2.7 | İşletme | `isletme/[section]` (16 bölüm) | yalnız `admin/business/reports.csv`, `admin/integrations/instagram` | **36 Server Action** `lib/business/**` servislerine çıkarılır; `app/api/panel/business/<bölüm>/**` uçları `BusinessPermission` ile | Mesaj kutusu (atama/etiket/okundu), adaylar + satış hunisi (aşama, not, görev, takip, sahip, öncelik, birleştirme), kampanya/reklam, gelir/gider/vergi/mutabakat (dönem kilidi **step-up**), AI bilgi merkezi, otomasyon kuralları (dry-run), entegrasyon durumu (salt okuma; Meta bağlantı kurulumu E3 ile kapsam dışı), sistem kayıtları, ayarlar. Finans raporlarının CSV dışa aktarımı E5 ile kapsam dışı |
| 2.8 | Analitik ve sistem | `analitik[/metric]`, `ozellikler`, `kayitlar`, `pilot`, `kalite`, `denemeler` | `analytics/export`, `pilot-cohorts/*`, `events` | GET: analitik metrikleri (`management-analytics-definitions`), özellik bayrakları okuma/yazma (`flags.ts` + ADR-0015), audit listesi, kalite | Metrik kartları + grafik (sparkline/bar), metrik detay, özellik bayrağı değiştirme (**step-up**), işlem geçmişi filtreli liste, kontrollü yayın kohortları |
| 2.9 | Yönetici önizlemesi (View As) + öğretmen çalışma modu | kabuk `admin-preview*` | `admin-preview` POST/DELETE, `admin-preview/candidates` | Önizleme durumu bugün imzalı **çerezde** (`od_panel_preview`, 2 sa); mobil Bearer kullandığı için çerezsiz taşıma gerekir: `POST /api/panel/admin-preview` mobil istemciye imzalı önizleme belirteci döner, istekler `X-Od-Preview` başlığıyla gelir; belirteç ADMIN `userId` + oturum kimliğine bağlı, aynı TTL ve aynı doğrulama (`admin-preview-core.ts`). Bootstrap önizlemede **konu** kullanıcının navigasyonunu ve `preview: { role, userId, expiresAt }` döner. Önizleme açıkken tüm mutasyonlar sunucuda reddedilir (mevcut kural) — test: her yazma ucu önizleme başlığıyla 403. **Öğretmen modu (E6)** aynı belirteç modeliyle (`X-Od-Teacher-Mode`) taşınır; önizlemeyle birbirini dışlar, yazma açıktır ve denetim kaydı yöneticinin kimliğiyle tutulur (`docs/admin-teacher-mode.md`) | Aday arama → rol seç → öğrenci/veli/öğretmen native ekranları konu adına salt okuma; kalıcı "Önizleme: Ad Soyad · Çık" bandı; yazma düğmeleri gizli; çıkışta ADMIN kabuğuna dönüş |

**Kapsam kararları (11 Ekim 2026).** Yönetici önizlemesi native yapılır (2.9). Mobilde **olmayacaklar:** Meta/Instagram hesap bağlantısının kurulumu, toplu kullanıcı içe aktarma (`users/bulk`), büyük finans raporları ve CSV dışa aktarımları. Bunlar matriste onaylı istisna (E3–E5) olarak kayıtlıdır; mobil bunlar için web bağlantısı da göstermez. Yönetici öğretmen çalışma modu da native yapılır (E6, 2.9).

**Uygulama sırası.** 2.1 → 2.2 (okuma) → 2.9 (önizleme; salt okuma ekranları zaten var, erken değer) → 2.2 (yazma) → 2.3 → 2.4 → 2.6 → 2.8 → 2.7. İşletme en sona alınır çünkü en büyük Server Action → API çıkarımı oradadır ve web CRM'ini kırma riski en yüksektir.

**Riskler.** Server Action çıkarımında web davranış farkı (çözüm: önce saf servis + birim test, sonra action'ı servise çeviren PR, sonra route); büyük listeler için sayfalama eksikliği (uçlar cursor tabanlı olmalı); dosya yükleme boyut/ağ dayanıklılığı.

**Çıkış kriterleri.** Yönetim matris satırlarının tamamı `Tam` veya onaylı `Bilinçli istisna`; her yazma ucu için yetkisiz rol/ürün/izin, IDOR, step-up, idempotency ve 409 testleri; mobilde yapılan değişiklik web sayfasında aynı durumla görünür (Playwright çapraz kontrol en az alan başına bir senaryo).

---

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
