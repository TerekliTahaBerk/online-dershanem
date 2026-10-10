# Mobil Uygulama Yol Haritası (M1–M9)

Dayanak: [architecture-audit](./architecture-audit.md), [screen-gap-analysis](./screen-gap-analysis.md), [api-contract-inventory](./api-contract-inventory.md), [design-system-plan](./design-system-plan.md), [role-permission-matrix](./role-permission-matrix.md), [migration-decisions](./migration-decisions.md). Fazlar sıralıdır ama M5 (push) altyapısı M2–M4 ile paralel yürüyebilir. Her faz için: bağımlılıklar, teslimatlar, uygulama sırası, riskler, testler, tamamlanma kriterleri.

Genel kurallar (her faz):

- Her sunucu değişikliği: mevcut web davranışı değişmez; yeni uç aynı `lib` fonksiyonunu çağırır; rol/ürün/flag/yabancı kimlik için entegrasyon testi.
- Her mobil PR: `tsc`, `expo lint`, `jest` yeşil; yeni ekranlar yükleme/boş/hata/çevrimdışı durumlarını `Screen` primitive'i ile ele alır.
- Hiçbir faz şema değişikliği yapmaz; **tek istisna M5** (push tabloları).

```text
M1 ──► M2 ──► M3 ──► M4 ──► M6 ──► M7 ──► M8 ──► M9
  └──► M5 (altyapı M2 ile paralel; mobil tarafı M2 sonrası)
```

---

## M1 — Mobil temel ve kimlik doğrulama

> **Durum: uygulandı.** Gerçekleşen kapsam, sapmalar ve test sonuçları: [m1-implementation-report.md](./m1-implementation-report.md), [m1-test-results.md](./m1-test-results.md). M2 girdisi: [m2-handoff.md](./m2-handoff.md).

**Bağımlılıklar.** Yok (giriş fazı). MD-01, MD-02, MD-03, MD-05, MD-06, MD-11, MD-12, MD-17 kararlarının onaylanması.

**Teslimatlar.**

1. **Derlenebilirlik ve CI:** `mobile/` için `npm ci`, `tsc --noEmit`, `expo lint` mevcut haliyle çalıştırılır ve sonuç kayda geçirilir; GitHub Actions'ta mobil işi (typecheck, lint, jest, token senkron betiği). Kök `tsconfig`/ESLint hariç tutması korunur.
2. **Sunucu (küçük, eklemeli):**
   - `GET /api/panel/me` (bootstrap; api-contract-inventory §1.1), kapı durumları için MFA/parola öncesi çalışan salt-okuma guard varyantı.
   - `GET /api/auth/sessions` (oturum listesi; `listActiveUserSessions`).
   - Login/davet: `X-Od-Client: mobile` isteğinde çerez set edilmez; `resolveToken` Bearer başlığını önceliklendirir (MD-11).
   - Parola değişikliği 403'üne `code: "PASSWORD_CHANGE_REQUIRED"` (eklemeli).
   - `MOBILE_MIN_SUPPORTED_VERSION` ortam değişkeni (`lib/env-contract.ts` kaydı).
   - `lib/mobile-contracts/` (yalnız tip) — bootstrap ve bildirim tipleri.
3. **Mobil kabuk:**
   - `lib/api.ts` yeniden: iki hata zarfı, zaman aşımı, JSON dışı yanıt, `credentials: "omit"`, `X-Od-Client(-Version)`, tipli `ApiError { status, code }`.
   - TanStack Query istemcisi + merkezi hata eşleme (401/403/404/423/428/429/503).
   - `SessionProvider` → `AppStateProvider`: token + bootstrap + çalışma alanı.
   - Kök navigatör: giriş → (güncelleme gerekli) → (parola değişikliği) → (MFA: TOTP / kurtarma kodu) → (çalışma alanı seçici) → rol navigatörü.
   - Çalışma alanı seçici ve değiştirici (`POST /api/panel/active-product`); kilitli/pilot kapalı/hazırlanıyor kartları; satın alma bağlantısı yok (MD-09).
   - Öğrenci/veli: bootstrap `navigation.primary` → alt sekmeler + Menü; personel ve ADMIN: bilgi ekranı (M7'ye kadar).
   - Global bildirim zili + mevcut bildirim listesinin taşınması; `notification-links` tablosunun yeniden yazımı ve testleri.
   - Ayarlar merkezi (salt okuma profil, oturumlar + iptal, parola değiştir, çıkış).
   - Sign-in: `redirect` işleme, 423/403 mesajları, "Parolamı unuttum".
4. **Tasarım temeli:** `design/tokens.ts`, `products.ts`, Manrope, primitives ilk set (`Screen`, `PageHeader`, `Section`, `Row`, `StatusBadge`, `Button`, `Field`, `EmptyState`, `ErrorState`, `Skeleton`, `Banner`, `WorkspaceSwitcher`), token senkron betiği.
5. **Temizlik:** MD-16 şablon artıkları; `app.json` (`scheme`, `slug`, bundle id/package, EAS profilleri), `README.md`.

**Uygulama sırası.** (1) CI + derleme kaydı → (2) sunucu MD-11 değişikliği + testler → (3) bootstrap ucu + testler → (4) API istemcisi + Query → (5) tokens/primitives → (6) kök navigatör ve kapılar → (7) çalışma alanı seçici → (8) bildirim/ayarlar taşıma → (9) mevcut ekranları geçici olarak OD çalışma alanına bağlama (M2'de yeniden düzenlenecek) → (10) temizlik.

**Riskler.** Expo 57 bağımlılıklarının CI'da kurulumu; Metro `watchFolders` ile repo dışı tip paylaşımı (MD-06 yedeği hazır); bootstrap ucunun guard varyantının yanlışlıkla kapıları atlayan bir yazma yolu açması (yalnız `GET`, yalnız okuma, test); `resolveToken` önceliği değişiminin web'i etkilemesi (web `Authorization` göndermiyor; test ile kanıtla).

**Testler.** Sunucu: bootstrap için rol × ürün durumu × kapı matrisi; MFA gerektiren personel bootstrap'ta yalnız `gates` alır; parola değişikliği gereken kullanıcı aynı; mobil login çerez set etmez, web login eder; Bearer+çerez birlikte geldiğinde Bearer kazanır. Mobil: hata eşleme, kapı yönlendirmeleri, bildirim bağlantı eşlemesi, çalışma alanı seçici durumları (jest).

**Tamamlanma kriterleri.** CI yeşil; öğrenci, veli, öğretmen, ayrıcalıklı personel, ADMIN ve geçici parolalı test hesaplarıyla giriş → doğru kapı/ekran (manuel kontrol listesi, simülatör + gerçek cihaz); yalnız-Yön ve yalnız-Deneme Ligi öğrencisi hiçbir 404 ekranı görmez; çıkışta sunucu oturumu iptal edilir ve çerez deposunda oturum çerezi bulunmaz.

---

## M2 — OD öğrenci deneyimi

> **Durum: uygulandı.** [m2-implementation-report.md](./m2-implementation-report.md), [m2-screen-migration.md](./m2-screen-migration.md), [m2-test-results.md](./m2-test-results.md). M3 girdisi: [m3-handoff.md](./m3-handoff.md).

**Bağımlılıklar.** M1 (bootstrap, kabuk, primitives).

**Teslimatlar.**

- OD Bugün (REBUILD): `GET /api/panel/student/home` (gerekirse `?scope=OD`); Şimdi/sıradaki bloğu, deduplike Bugün listesi, Bu hafta satırı, `href` → mobil rota.
- Dersler (REFACTOR) + **Ders detayı** (NEW uç `GET /api/panel/student/lessons/[id]`, önce `takvim/[id]` sorgularını lib'e çıkarma).
- Çalışmalar (REFACTOR): plan görevleri kaldırılır; durum değişikliğinde `expectedVersion` + `mutationKey`; 409 çakışma işleme; kanıtlı teslim (flag).
- Kaynaklar (KEEP): yeni primitives, başlık "Kaynaklar".
- Gidişatım / Analiz (REBUILD): NEW uç (`loadStudentProgressInsight`); `student/progress` kullanımının kaldırılması; haftalık hedef düzenleme korunur.
- Dış denemelerim (REFACTOR, flag açıksa): Deneme Ligi'nden bağlantı kaldırılır.
- Haftalık özet okuma + geri bildirim (öğrenci tarafı) — veli ile ortak uç M6'da; burada yalnız öğrenci.

**Sıra.** Bugün → Çalışmalar → Dersler + detay → Kaynaklar → Analiz → Dış denemeler.

**Riskler.** `student/home` yanıtı büyük (üç ürün); OD kapsamı için gereksiz sorgu maliyeti (ölçülmeli). Analiz ucunun web sayfasıyla birebir aynı veriyi üretmesi. Ders detayında kayıt bağlantısı/ders notu görünürlük kuralları.

**Testler.** Uç yetki testleri (OD yok → 404, yabancı ders → 404); mobil bileşen testleri (boş/hata/çakışma); manuel: aynı hesapla web mobil görünümü ile yan yana karşılaştırma.

**Tamamlanma.** OD öğrencisi web'deki OD menüsünün (flag'e göre) tüm okuma akışlarını ve ödev durumu/kanıt yazmalarını mobilde tamamlar; ekranlar `PANEL_DOMAIN` terminolojisini kullanır; `GET /api/panel/student/progress` mobilde çağrılmaz.

---

## M3 — Yön Koçluk deneyimi (öğrenci)

> **Durum: uygulandı.** [m3-implementation-report.md](./m3-implementation-report.md), [m3-api-contracts.md](./m3-api-contracts.md), [m3-screen-migration.md](./m3-screen-migration.md), [m3-security-review.md](./m3-security-review.md), [m3-test-results.md](./m3-test-results.md). M4 girdisi: [m4-handoff.md](./m4-handoff.md).

**Bağımlılıklar.** M1; M2'deki liste/satır primitives. Ön koşul doğrulama: Yön Bugün görev işaretlemesinin `adaptivePlan` kapalıyken web'deki davranışı (audit §2.4 notu).

**Teslimatlar.**

- Yön Bugün (NEW uç `GET /api/panel/student/yon`; önce `app/panel/ogrenci/yon/page.tsx` sorgularını `lib/kocum/yon-today-server.ts`'e çıkarma): bugünün görevleri, gecikenler, sonraki görüşme + toplantı bağlantısı, hafta şeridi, son öğrenciye görünür koç notu, hedef özeti, check-in durumu.
- Görev tamamlama (`POST /api/panel/kocum/tasks/[id]/complete`) — durum + gerçekleşen değerler + his ölçekleri.
- Hedeflerim (KEEP, gruplu).
- Koçum (NEW okuma ucu): koç, görüşmeler, saat değişikliği talebi (`POST /api/panel/coaching-sessions/[id]`, `idempotencyKey`), paylaşılan notlar, geçmiş.
- Planım (flag `adaptivePlan`): NEW okuma ucu; değişiklik talebi; tercihler.
- Check-in (flag `studentCheckIn`): gönderim + bu haftanın durumu.
- Ürün teması: Yön mavisi vurgusu.

**Sıra.** Lib çıkarma → Yön Bugün → görev tamamlama → Hedeflerim → Koçum → Check-in → Planım.

**Riskler.** Gizli koç notlarının sızması (okuma modeli `select` beyaz listesi + test); flag tutarsızlığı; İstanbul saat dilimi (`lib/istanbul-time.ts`) — tarih hesapları yalnız sunucuda.

**Testler.** `privateNote` ve INTERNAL notların hiçbir yanıtta olmadığına dair entegrasyon testi; OK yok → 404; pilot kapalı → 404/503; görev geçişi reddi (409/400) mobil gösterimi.

**Tamamlanma.** Yön öğrencisi günlük döngüyü (görevleri gör, tamamla, görüşmeye katıl, check-in) web'e gitmeden tamamlar; Yön Bugün web ile aynı görev listesini gösterir.

---

## M4 — Deneme Ligi deneyimi (öğrenci)

> **Durum: uygulandı (kalıcı M4 testleri kullanıcı talimatıyla yazılmadı).** [m4-implementation-report.md](./m4-implementation-report.md), [m4-api-contracts.md](./m4-api-contracts.md), [m4-screen-migration.md](./m4-screen-migration.md), [m4-security-review.md](./m4-security-review.md), [m4-test-results.md](./m4-test-results.md). M5 girdisi: [m5-handoff.md](./m5-handoff.md).

**Bağımlılıklar.** M1; MD-08 kararı (en azından seçenek 1 onayı).

**Teslimatlar.**

- NEW uçlar: `GET /api/odk/student/home`, `GET /api/odk/student/exams?gorunum=`, `GET /api/odk/student/exams/[id]`, `GET /api/odk/student/exams/[id]/result` — `listStudentExams`, `getStudentExam`, `getReleasedStudentResult`, `studentExamState`, `releasedResultsWithDelta`, `buildResultNextStepRecommendations`.
- Deneme Ligi Bugün, Denemelerim (sekmeli), ön-başlangıç (kurallar, Meet gerekliliği, zaman bilgisi; **başlat** v1'de web yönlendirmesi/bilgisi), Sonuç (net özeti, D/Y/B, ders tablosu, güçlü/geliştirilecek kazanımlar, sonraki adımlar, cevap anahtarı yayın kuralına göre).
- Deneme Ligi moru vurgusu; sayısal alanlar mono.
- OD Bugün'deki eski "son deneme" kartının kaldırılması / Deneme Ligi'ne yönlendirmesi.

**Sıra.** Uçlar → Denemelerim → Sonuç → Bugün → ön-başlangıç.

**Riskler.** Yayınlanmamış sonucun sızması (yalnız `getReleasedStudentResult`); grant süresi bitmiş deneme; AYT alan bölümleri; MD-08 kararı gecikirse "başlat" akışı belirsiz kalır.

**Testler.** Yayınlanmamış sonuç → 404; başka öğrencinin denemesi → 404; grant yok → durum doğru; `studentExamState` çıktısının web ile aynı olduğu (aynı fonksiyon) — fixture testi.

**Tamamlanma.** Deneme Ligi öğrencisi yaklaşan denemelerini, durumlarını ve yayınlanmış tüm sonuçlarını mobilde görür; çözme için net ve doğru yönlendirme alır; hiçbir ekran OD dış deneme ucunu çağırmaz.

---

## M5 — Push bildirimleri ve senkronizasyon

> **Durum: uygulandı ve yerel olarak doğrulandı; staging / üretim doğrulaması YOK (üretim NO-GO).** Kalıcı M5 testleri kullanıcı talimatıyla yazılmadı; gerçek cihaz testi yapılmadı. [m5-implementation-report.md](./m5-implementation-report.md), [m5-api-contracts.md](./m5-api-contracts.md), [m5-device-lifecycle.md](./m5-device-lifecycle.md), [m5-delivery-architecture.md](./m5-delivery-architecture.md), [m5-security-review.md](./m5-security-review.md), [m5-validation-results.md](./m5-validation-results.md), [m5-rollout-runbook.md](./m5-rollout-runbook.md). M6 girdisi: [m6-handoff.md](./m6-handoff.md).
>
> Plandan sapmalar: `pushEnabled` varsayılanı **false** (MD-10'daki true yerine; MD-21); `examUpdates` tercih alanı eklendi; Deneme Ligi öğrenci olay bildirimleri (`ODK_STUDENT_NOTIFICATIONS`) eklendi; çalışma modu `PUSH_DELIVERY_MODE` (DISABLED / DRY_RUN / ENABLED).

**Bağımlılıklar.** M1 (bildirim zili, bağlantı eşlemesi, ayarlar). Sunucu kısmı M2 ile paralel başlayabilir. EAS proje kurulumu (M9'un bir kısmı öne çekilir: iOS APNs anahtarı, Android FCM kimliği EAS'e).

**Teslimatlar.**

- Prisma migration: `PushDevice`, `PushDelivery`, `NotificationPreference.pushEnabled` (MD-10).
- Uçlar: `POST/DELETE /api/panel/push-devices`, `GET /api/panel/notifications/preferences`, `PATCH …/preferences` şemasına `pushEnabled`.
- Cron `/api/cron/push-dispatch` (2 dk; `vercel.json`), Expo Push gönderici, makbuz işleyici, `revokeSession`/çıkışta cihaz pasifleme.
- Mobil: `expo-notifications` izin akışı (ilk değerli anda, açılışta değil), token kaydı/yenileme, ön planda bildirim gösterimi, dokunma → okundu + rota, rozet senkronu, tercih ekranı (kategori, sessiz saat, push aç/kapa).
- `docs/unified-notifications.md` güncellemesi.

**Sıra.** Şema → cihaz uçları → dağıtıcı (dry-run modu) → mobil kayıt → dokunma/rota → tercihler → dry-run kapat.

**Riskler.** Doğrudan yazılan bildirimlerde sessiz saat uygulanmaması (dağıtıcı uygular); toplu bildirim patlamaları (dağıtıcı başına üst sınır + Expo hız sınırı); KVKK (yük içeriği genel); aynı cihazda hesap değişimi (token yeniden atanır, eski kayıt iptal); cron gecikmesi (≤2 dk kabul).

**Testler.** Dağıtıcı birim testleri (tercih kapalı, sessiz saat, okunmuş, idempotent tekrar, iptal edilmiş cihaz); entegrasyon: cihaz kaydı yetkisi; mobil: bildirim yanıt işleyici ve rota eşlemesi.

**Tamamlanma.** Gerçek iOS ve Android cihazda: ödev atama, ders hatırlatması ve deneme sonucu yayını bildirimleri ≤3 dk içinde gelir, dokunma doğru ekranı açar ve okundu işaretler; çıkış yapan cihaza bildirim gitmez; tercih kapatıldığında gönderim durur.

---

## M6 — Veli deneyimi

> **Durum: uygulandı ve yerel olarak doğrulandı; gerçek cihaz / staging doğrulaması YOK.** Kalıcı M6 testleri kullanıcı talimatıyla yazılmadı (yalnız M6'nın bilinçli değiştirdiği 3 eski mobil beklenti güncellendi). [m6-implementation-report.md](./m6-implementation-report.md), [m6-api-contracts.md](./m6-api-contracts.md), [m6-screen-migration.md](./m6-screen-migration.md), [m6-parent-scope-security.md](./m6-parent-scope-security.md), [m6-privacy-review.md](./m6-privacy-review.md), [m6-validation-results.md](./m6-validation-results.md), [m6-iphone-smoke-checklist.md](./m6-iphone-smoke-checklist.md). M7 girdisi: [m7-handoff.md](./m7-handoff.md).
>
> Plandan sapmalar: dış denemeler ayrı uç (`/api/panel/parent/external-exams`); `GET /api/panel/parent/account` (hesap amacı); veli koçluk görüşmeleri salt okunur; haftalık özet geri bildirimi mevcut uçla ve onun OD kapısıyla (P-1 BLOCKED).

**Bağımlılıklar.** M1–M4 (ekran primitives ve öğrenci okuma modelleri), M5 (veliler için en değerli kanal).

**Teslimatlar.**

- NEW uçlar: `GET /api/panel/parent/{home,insights,assignments,teachers,coaching,digests}?studentId=`, `GET /api/odk/parent/report?studentId=` — `resolveParentScope`, `loadParentCalmHome`, `parent-visibility`, `getOdkAudienceStudentReport`.
- Çocuk seçici (başlık bağlam satırı "Öğrenci: …"), Bugün (Dikkat · Sizden beklenen · Bu hafta · Akademik gelişim · Yön), Dersler (`student-success/calendar`), Ödev, Öğretmenler, Koçluk, Deneme Ligi raporu, Haftalık özet + geri bildirim, Hesap (salt okuma; satın alma yok), `PREPARING` bilgi kartı.

**Sıra.** Kapsam/çocuk seçici → Bugün → Dersler → Deneme Ligi raporu → Ödev/Öğretmenler → Koçluk → Haftalık özet → Hesap.

**Riskler.** Yabancı `studentId` ile veri sızıntısı (her uçta `resolveParentScope`); veli görünürlük izinleri (`canViewAca…` benzeri ilişki bayrakları); birden çok çocuk için önbellek anahtarları.

**Testler.** Her uç için: bağlı olmayan çocuk → 404; ilişki bitmiş → 404; görünürlük kapalı → alan yok.

**Tamamlanma.** Veli web'deki (flag'e göre) tüm okuma ekranlarına mobilde ulaşır, çocuklar arasında geçiş yapar ve haftalık özete geri bildirim verir.

---

## M7 — Öğretmen ve koç deneyimi

**Bağımlılıklar.** M1, M5; `STAFF_PRODUCT_ASSIGNMENTS` modunun (shadow/enforce) üretimdeki durumunun netleşmesi; MD-07 onayı.

**Teslimatlar.**

- Öğretmen: Bugün (`getTeacherWorkspace`), Dersler + ders çalışma alanı (Hazırlık/Ders/Kapanış; `PUT /api/panel/lessons/[id]/notes` — yoklama, not, kazanım), teslim inceleme kuyruğu, yardım isteyenler (flag).
- Koç: Bugün (`buildCoachWorkspace`), Öğrencilerim, Görüşmeler (oluştur/güncelle, `idempotencyKey`), koç notu, görev erteleme, öneri inceleme, plan onayı (flag).
- Deneme Ligi raporları (salt okuma, `odk:report:read_related`).
- Personel kabuğu: alt çubuksuz yığın, çalışma alanı değiştirici, ekran içi sabit alt aksiyon.
- MFA gerektiren personel için step-up gerektiren işlemler mobilde gösterilmez.

**Sıra.** Personel kabuğu → öğretmen Bugün → ders kapanışı → inceleme kuyruğu → koç Bugün → görüşmeler → notlar/görevler → raporlar.

**Riskler.** Sayfa içi sorguların lib'e çıkarılması büyük (öğretmen ve koç sayfaları); ders kapanışının sürüm/çakışma kuralları; personel izinlerinin `kocum/notes` gibi uçlarda enforce modunda doğrulanması (api-contract-inventory §7 notu).

**Testler.** İzinsiz öğretmen (COACH ataması yok) → koç uçları 403; başka grubun dersi → 404; kapanış çakışması (409) mobil gösterimi.

**Tamamlanma.** OD öğretmeni bir dersi mobilden kapatabilir (yoklama + not); koç günün görüşmelerini yönetip not bırakabilir; hiçbir personel ekranı izni olmayan kullanıcıya görünmez.

---

## M8 — İleri mobil yetenekler

**Bağımlılıklar.** M1–M7; ilgili flag'lerin üretimde açılması; MD-08, MD-13, MD-14 kararları.

**Aday teslimatlar (her biri ayrı onay).**

- Universal/App Links (`apple-app-site-association`, `assetlinks.json`), davet kabulü ve parola sıfırlama derin bağlantıları.
- Kalıcı çevrimdışı önbellek ve `offline-outbox` uyumlu mutasyon kuyruğu (`ASSIGNMENT_PROGRESS`, `LESSON_CLOSE`).
- Native Deneme Ligi runner (MD-08 seçenek 3; attempt okuma ucu, PDF görüntüleyici, mobil bütünlük olayları).
- Erişilebilirlik ve düşük veri tercihlerinin okunması/yazılması (`accessibility/preferences`, `network/preferences` için GET).
- Takvime ekleme (`calendar/export`), iOS/Android widget (Bugün özeti), Dino AI (flag), tekrar kuyruğu ve telafi (flag), biyometrik yerel kilit, passkey (associated domains).
- ADMIN salt okuma Gelen kutusu (ayrı karar).

**Riskler.** Native runner sınav adaleti; widget'larda kilit ekranı veri gizliliği; çevrimdışı çakışma çözümü.

**Tamamlanma.** Seçilen her yetenek kendi kabul kriterleriyle; hiçbiri v1 mağaza çıkışını bloklamaz.

---

## M9 — Sürüm mühendisliği ve mağaza çıkışı

**Bağımlılıklar.** v1 kapsamı (M1–M6) tamamlanmış; MD-09 hukuk kararı.

**Teslimatlar.**

- EAS Build profilleri (development, preview, production), EAS Submit, EAS Update kanalları (yalnız JS), sürüm/derleme numarası otomasyonu, `minSupportedVersion` işletim kılavuzu.
- Uygulama kimlikleri, ikon ve açılış ekranı (marka varlıkları), mağaza listeleri (TR), ekran görüntüleri.
- Gizlilik: App Store gizlilik etiketleri ve Google Play Data Safety (KVKK envanteri `docs/data-classification-inventory.md` ile uyumlu), hesap silme talebi yolu (mağaza zorunluluğu; mevcut süreç `lib/panel/user-deletion.ts` / tombstone ledger ile eşlenmeli), çocuk kullanıcılar için yaş derecelendirmesi ve hedef kitle beyanı.
- İnceleme hesapları (öğrenci, veli; MFA'sız), inceleme notları (hesapların yönetim tarafından açıldığı, satın alma olmadığı).
- Hata izleme (mevcut `lib/error-capture.ts` sözleşmesiyle uyumlu bir mobil karşılık; yeni sağlayıcı seçimi ayrı karar) ve sürüm sağlık panosu.
- Maestro E2E: giriş, MFA, çalışma alanı değiştirme, ödev durumu, push açılışı.
- `docs/deployment-checklist.md` ve `docs/rollback-runbook.md`'e mobil bölümleri.

**Riskler.** Mağaza reddi (ödeme, minimum işlevsellik, hesap silme, çocuk gizliliği); APNs/FCM kimlik bilgisi yönetimi; OTA ile native uyumsuz JS gönderimi (runtimeVersion politikası).

**Tamamlanma.** TestFlight ve Play iç test kanalında kapalı pilot (pilot kohort ile hizalı), çökme oranı ve kritik akış başarısı hedefleri karşılandıktan sonra mağaza yayını; geri alma prosedürü (minimum sürüm yükseltme + EAS Update rollback) prova edilmiş.

---

## M1 için kesin ön koşullar (başlamadan önce)

1. **Karar onayları:** MD-01, MD-02, MD-03, MD-05, MD-06, MD-07, MD-11, MD-12, MD-17 (bu belge setinin incelenmesi).
2. **Uygulama kimlikleri:** iOS bundle identifier ve Android package adı, Apple Developer ve Google Play hesap sahipliği, EAS hesabı/organizasyonu (M1'de `app.json`'a yazılacak; M5'te push kimlik bilgileri için gerekli).
3. **Test hesapları (staging):** OD-only, Yön-only, Deneme Ligi-only ve üç ürünlü öğrenci; iki çocuklu veli; `PREPARING` durumlu veli; OD öğretmeni; `COACH@OK` öğretmen; ayrıcalıklı Deneme Ligi personeli (MFA'lı); ADMIN; `mustChangePassword=true` kullanıcı; pilot dışı kullanıcı.
4. **Ortam:** mobilin bağlanacağı staging API URL'i (HTTPS), `NEXT_PUBLIC_APP_URL`/`APP_URL` doğru ayarlı (same-origin guard), staging'de flag değerlerinin listesi.
5. **CI:** mobil iş için GitHub Actions dakika/önbellek bütçesi; Node sürümünün kökle hizalanması.
6. **Sunucu sahipliği:** bootstrap ucu ve `resolveToken`/çerez değişikliği için kod sahibi incelemesi (kimlik doğrulama yüzeyi).
7. **Doğrulanacak açık sorular:** (a) `STAFF_PRODUCT_ASSIGNMENTS` üretim modu; (b) Yön görev tamamlama ucunun `adaptivePlan` kapalıyken web davranışı; (c) ADR 0015'in durumu (bootstrap flag kaynağını etkiler).

M0 kapsamında M1'e başlanmamıştır.
