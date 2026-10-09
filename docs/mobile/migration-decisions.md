# Mobil Göç Kararları (M0)

Biçim: her karar için bağlam, karar, reddedilen alternatifler ve sonuçlar. Durum: **Öneri** (ekip onayı bekliyor) · **Kabul** · **Açık** (ürün/hukuk kararı gerekiyor). Bu belgedeki hiçbir karar uygulanmadı.

| # | Karar | Durum |
| --- | --- | --- |
| MD-01 | Mevcut `mobile/` Expo projesi yerinde, artımlı göç edilir | Uygulandı (M1) |
| MD-02 | Ayrı BFF yok; Next.js içinde ince JSON okuma uçları | Uygulandı (M1) |
| MD-03 | Tek bootstrap ucu (`GET /api/panel/me`) navigasyonu sunucuda hesaplar | Uygulandı (M1) |
| MD-04 | Çalışma alanı = `Session.activeProduct`; mobilin yerel kopyası yalnız önbellek | Uygulandı (M1) |
| MD-05 | Sunucu durumu için TanStack Query; global durum kütüphanesi yok | Uygulandı (M1) |
| MD-06 | Sözleşme tipleri tek kaynakta, yalnız-tip modül olarak paylaşılır | Uygulandı (M1) |
| MD-07 | v1 kapsamı: öğrenci + veli; öğretmen/koç seçili akışlar; ADMIN ve Deneme Ligi personeli kapsam dışı | Öneri |
| MD-08 | Deneme Ligi sınav çözme v1'de native değil | **Açık** |
| MD-09 | Uygulama içi satın alma yok; kilitli ürünler bilgi kartı | **Açık** (hukuk/mağaza) |
| MD-10 | Push: Expo Push Service + `Notification` tablosundan beslenen cron dağıtıcısı | Öneri |
| MD-11 | Mobil çerez kullanmaz; sunucu mobil girişte çerez set etmez; çerez ≠ Bearer çakışmasında oturum açılmaz | Uygulandı (M1) |
| MD-12 | Yol sürümlemesi yok; eklemeli sözleşme + minimum sürüm kapısı | Uygulandı (M1) |
| MD-13 | Çevrimdışı: v1 salt okuma önbelleği; çevrimdışı mutasyon kuyruğu M8 | Öneri |
| MD-14 | Derin bağlantı: özel şema v1, universal/app link M8 | Kısmen (M1) |
| MD-15 | Test: jest-expo + RNTL (M1), E2E (Maestro) M9 | Kısmen (M1) |
| MD-16 | Şablon artıkları ve yalnız-mobil eski uçların emekliliği | Kısmen (M1; M2: yeni ekran `student/progress` kullanmaz, uç eski sürümler için korunur) |
| MD-17 | Expo web hedefi desteklenmez | Uygulandı (M1) |
| MD-18 | Durum etiketleri ve metinler sunucudan; mobil iş kuralı tutmaz | Uygulandı (M1, M2: web sayfası + JSON ucu ortak yükleyici) |

---

## MD-01 — Artımlı göç, yeniden başlatma yok

**Bağlam.** Mevcut kod ~3.000 satır, Expo SDK 57 / RN 0.86 / expo-router 57 ile güncel bir taban üzerinde. Sorun çerçeve değil, ürün modeli (tek panel, yalnız öğrenci).

**Karar.** `mobile/` yerinde kalır. Önce kabuk (bootstrap, kapılar, çalışma alanı navigatörü, primitives) kurulur; mevcut ekranlar tek tek yeni kabuğa taşınır (KEEP/REFACTOR), kalanlar yeniden yazılır. Her taşıma PR'ı tek ekran veya tek akış içerir.

**Reddedilen.** (a) Sıfırdan yeni proje — güncel taban ve çalışan akışlar (güvenli token, kimlikli indirme, kanıt gönderimi) çöpe gider. (b) Web panelini WebView'da göstermek — çerez tabanlı oturum, mağaza "minimum işlevsellik" riski, native bildirim/derin bağlantı yok.

**Sonuç.** M1'in ilk teslimatı mobilin bugünkü haliyle derlendiğini kanıtlayan CI işidir; sonra kabuk değişir.

## MD-02 — Ayrı BFF yok

**Bağlam.** Web okuma yolları RSC'de; bir kısmı `page.tsx` içinde satır içi Prisma sorgusu (ör. `app/panel/ogrenci/yon/page.tsx`, `app/panel/ogrenci/plan/page.tsx`, `app/panel/ogrenci/kocluk/page.tsx`). Mobil için açılmış öncü uçlar `app/api/panel/student/*` altında ve "web sayfasıyla AYNI sorgu" ilkesiyle yazılmış.

**Karar.** Her yeni mobil okuma ucu için iki adım: (1) sayfadaki sorgular `lib/**/…-server.ts` fonksiyonuna taşınır, sayfa o fonksiyonu çağırır (davranış değişmez, mevcut E2E'ler korur); (2) aynı fonksiyonu çağıran ince `GET` route eklenir. Uçlar mevcut ağaçlarda kalır: `app/api/panel/**` (OD, Yön, ortak), `app/api/odk/**` (Deneme Ligi).

**Reddedilen.** Ayrı bir BFF servisi veya GraphQL katmanı — yeni dağıtım, yeni yetki yüzeyi, aynı veritabanına ikinci bağlantı havuzu; kullanıcı açıkça istemiyor.

**Sonuç.** İş kuralları tek yerde; web ve mobil aynı fonksiyonu test eder. Bazı uçlar mobil için "fazla" veri döndürebilir; gerekirse `?scope=` parametresiyle daraltılır.

## MD-03 — Bootstrap ucu

**Karar.** `GET /api/panel/me` (sözleşme: api-contract-inventory §1.1) kullanıcıyı, kapıları, ürün durumlarını, aktif çalışma alanını, flag'leri, sunucuda hesaplanmış navigasyonu, personel izinlerini, veli çocuklarını ve okunmamış sayısını döndürür. Uygulama açılışında, ön plana dönüşte (en fazla 5 dakikada bir), çalışma alanı değişiminde ve her 403/404 sonrasında çağrılır.

**Kritik ayrıntı.** Bu uç parola ve MFA kapısından **önce** çalışabilmelidir (aksi halde kapı durumunu raporlayamaz). `requireApiAuthorizedRole(roles, requireMfa=false)` deseni mevcut; parola kapısını atlayan salt-okuma bir varyant gerekir. Uç bu durumda yalnız `user` + `gates` döndürür, ürün/navigasyon alanlarını boş bırakır.

**Reddedilen.** Mobilde `navigation.ts` kopyası — flag, ürün ve personel izin kuralları iki yerde yaşar ve sapar.

## MD-04 — Çalışma alanı modeli

**Karar.** Seçim `POST /api/panel/active-product` ile sunucuya yazılır (web ile aynı); mobil son seçimi `SecureStore` dışında, sıradan yerel depoda yalnız açılış hızını artırmak için önbellekler, doğruluk kaynağı bootstrap'tır. Tek erişilebilir ürün varsa seçici gösterilmez. ADMIN'in break-glass kapsamı mobilde kullanılmaz.

**Not.** `activeProduct` oturum başınadır; aynı kullanıcı web ve mobilde farklı çalışma alanında olabilir (farklı oturum kayıtları). Bu beklenen davranıştır.

## MD-05 — Veri katmanı

**Bağlam.** 9 ekranda kopyalanmış `load/loading/error/refreshing/401` bloğu; önbellek, iptal, yeniden deneme, odakta yenileme yok.

**Karar.** `@tanstack/react-query` v5: sorgu anahtarları `[workspace, resource, params]`; 401/403/404 merkezi `onError` ile bootstrap'a bağlanır; mutasyonlar `idempotencyKey`/`mutationKey` üretir ve `expectedVersion` taşır; ağ durumu `@react-native-community/netinfo` ile `onlineManager`'a bağlanır. Global istemci durumu (oturum, çalışma alanı, tema) React context'te kalır. Redux/Zustand eklenmez.

**Reddedilen.** Elle yazılmış hook — önbellek geçersizleştirme, yeniden deneme ve odakta yenileme yeniden icat edilir.

## MD-06 — Sözleşme tipleri

**Karar.** Mobil okuma modellerinin TypeScript tipleri `lib/mobile-contracts/*.ts` altında **yalnız tip** (hiç runtime import'u ve `@prisma/client` bağımlılığı olmadan) tanımlanır. Sunucu uçları `satisfies` ile bu tipe uyar; mobil `@contracts/*` alias'ı ve Metro `watchFolders` ile import eder. Tarihler `string` (ISO) olarak tiplenir. Sözleşme değişikliği tek PR'da iki tarafı birden derler.

**Reddedilen.** (a) OpenAPI üretimi — mevcut route'larda şema altyapısı yok, büyük yatırım. (b) Mobilde elle kopyalanan tipler — mevcut durum; sessiz sapmaya yol açıyor (ör. `productData` mobilde hiç tiplenmemiş).

**Risk.** Metro'nun repo dışı klasör izlemesi monorepo dışı yapıda yapılandırma ister; M1'de doğrulanmalı. Çalışmazsa yedek: CI'da `tsc` ile sözleşme dosyasını mobile kopyalayan ve farkı reddeden betik.

## MD-07 — Kapsam

**Karar.** v1 (mağaza ilk sürümü) = öğrenci (üç çalışma alanı, sınav çözme hariç) + veli + bildirimler/push. Öğretmen ve koç akışları M7'de ikinci sürümle gelir. ADMIN ve Deneme Ligi personeli için mobil içerik yok; giriş yapabilirler, bilgi ekranı görürler.

**Gerekçe.** Rol oturum politikaları (ADMIN 30 dk boşta), ayrıcalıklı personel MFA/step-up, yönetim ekranlarının tablo yoğunluğu; mobilin değer üretimi öğrenci/veli günlük döngüsünde.

## MD-08 — Deneme Ligi sınav çözme (AÇIK)

**Bağlam.** Web runner PDF kitapçık (`GET …/booklet`), cevap kaydı, heartbeat, süre ölçümü, bütünlük olayları (`visibilitychange` vb.), oturum kapatma ve teslim uçlarını kullanır; ön-başlangıçta "ekran genişliği" kontrolü var (<768px uyarı). Deneme durumunu okuyan JSON ucu yok (runner RSC'den beslenir). Bütünlük incelemesi (`lib/odk/integrity.ts`) web olay semantiğine göre kurgulanmış.

**Seçenekler.**

1. **v1'de mobilde çözme yok** (öneri): ön-başlangıç ekranı kuralları gösterir ve "Bu denemeyi bilgisayar veya tablet tarayıcısından çözebilirsin" bilgisini verir; sonuçlar mobilde.
2. **Tarayıcıya devretme:** sistem tarayıcısında web runner'ı açmak. Tarayıcıda oturum çerezi yok; kullanıcı tekrar giriş yapar. Tek kullanımlık "handoff" kodu yeni bir kimlik doğrulama yüzeyidir ve ayrı güvenlik ADR'si gerektirir.
3. **Native runner (M8):** attempt okuma ucu, native PDF görüntüleyici, uygulama yaşam döngüsü (arka plan, kilit ekranı, gelen arama) için olay sözlüğü genişletmesi ve bütünlük kurallarının mobil için yeniden kalibrasyonu gerekir.

**Karar verilmesi gereken.** Ürün: telefon ekranında deneme çözmek adil mi (web zaten <768px'te uyarıyor)? Ölçme: mobil olaylar bütünlük skorunu nasıl etkiler? Bu kararlar verilmeden seçenek 3'e başlanmaz.

## MD-09 — Ödeme ve satın alma (AÇIK)

**Bağlam.** Ürün seçicide `LOCKED` kartlar `/paketler`, `/odk-paketleri`, `/urunler/online-kocum` sayfalarına; veli "Hesap ve paket" sayfası ödeme akışlarına bağlanıyor; ödeme PayTR.

**Öneri.** Mobilde hiçbir satın alma bağlantısı veya fiyat gösterilmez; kilitli ürün kartı yalnız ürün adı ve "Bu ürün hesabınızda aktif değil" bilgisini taşır. App Store 3.1.1 / Google Play ödeme politikalarının eğitim hizmetleri (canlı birebir ders istisnaları dahil) için yorumlanması hukuk/ürün kararıdır.

## MD-10 — Push mimarisi

**Bağlam.** Push kanalı yok. `Notification` tablosu tüm uygulama içi bildirimlerin tek ortak yazım noktası; ancak ~24 kod yolu bildirimi `produceNotification` dışında doğrudan yazıyor ve sessiz saat/günlük özet kurallarını uygulamıyor. Cron altyapısı (`vercel.json`, `CRON_SECRET`) mevcut.

**Karar.**

- Sağlayıcı: **Expo Push Service** (`expo-notifications`, EAS kimlik bilgileri). Sunucudan HTTPS çağrısı; yeni servis yok. FCM/APNs'e doğrudan geçiş gerekirse yalnız gönderici değişir.
- Şema (tek migration):
  - `PushDevice { id, userId, sessionId?, token @unique, platform, appVersion, createdAt, lastSeenAt, revokedAt? }`
  - `PushDelivery { id, notificationId, deviceId, status, ticketId?, error?, createdAt, @@unique([notificationId, deviceId]) }`
  - `NotificationPreference.pushEnabled Boolean @default(true)`
- Dağıtıcı: `/api/cron/push-dispatch` (her 2 dk). `Notification` satırlarından `inAppVisible = true`, `readAt IS NULL`, son 24 saat içinde oluşturulmuş, cihazın kayıt anından sonra gelen ve `PushDelivery`'si olmayanları seçer; kategori tercihini (`preferenceKey`) ve sessiz saati (`afterQuietHours`) **dağıtıcıda** uygular; `PushDelivery` satırını gönderimden önce yazar (idempotent, ADR 0013 deseni).
- Yük: başlık kategori bazlı genel metin ("Yeni bir çalışman var", "Ders hatırlatması"); gövde boş veya genel; `data: { notificationId }`. Uygulama açılınca içerik `GET /api/panel/notifications` ile gelir.
- Makbuzlar: `DeviceNotRegistered` → `revokedAt`. Çıkış ve `revokeSession` → cihaz pasif.
- Okundu senkronu: push'a dokunma → `POST /api/panel/notifications/read {id}`; rozet sayısı bootstrap `unreadNotifications`.

**Reddedilen.** Push'u `produceNotification`'a bağlamak — doğrudan yazan 24 yolu kaçırır. Her yola push çağrısı eklemek — dağınık ve kırılgan.

## MD-11 — Çerez / Bearer çakışması

**Bağlam.** `resolveToken()` çerezi Bearer'dan önce okur. Login ve davet kabulü mobil istekte de httpOnly çerez set eder. iOS/Android'de RN `fetch` varsayılan olarak sistem çerez deposunu kullanır.

**Karar.** (1) Mobil istemci tüm isteklerde `credentials: "omit"`. (2) Sunucu: `X-Od-Client: mobile` girişlerinde `createSession` çerez yazmaz (`setCookie: false`). (3) **M1'de güncellendi:** çerez ve Bearer birlikte gelip FARKLI ise oturum açılmaz (fail-closed); "Bearer'ı tercih et" yerine bu seçildi çünkü geçersiz Bearer'da çereze sessizce düşmek veya çerezi yok saymak her iki yönde de yanlış kimlik riskini taşır. Web `Authorization` göndermediği için davranışı değişmez. Uygulama ve testler: `docs/mobile/m1-auth-security-review.md`.

## MD-12 — Sürümleme

**Karar.** Yol sürümü (`/v1/`) eklenmez. Mobil okuma modelleri yalnız alan **ekleyerek** değişir; kaldırma/yeniden adlandırma en az iki mağaza sürümü boyunca eski alanı korur. Bootstrap `gates.minSupportedVersion` döndürür (ortam değişkeni); istemci `X-Od-Client-Version` gönderir; altındaysa "Güncelleme gerekli" ekranı. EAS Update (OTA) yalnız JS düzeltmeleri için; native değişiklik mağaza sürümü ister.

## MD-13 — Çevrimdışı

**Karar.** v1: TanStack Query önbelleği bellekte; ağ yokken son veri + çevrimdışı şeridi; mutasyonlar çevrimdışıyken devre dışı ve açıklamalı. M8: web'deki `lib/offline-outbox.ts` sözleşmesiyle (aynı `mutationKey`/`expectedVersion`) uyumlu kalıcı kuyruk; yalnız `offlineMode` flag'i açıkken ve yalnız web'in de kuyruğa aldığı işlemler (ödev durumu, ders kapanışı) için.

## MD-14 — Derin bağlantı

**Karar.** v1: `scheme: "onlinedershanem"`; bildirim `href` (web yolu) → mobil rota eşlemesi tek tabloda, birim testli; eşlenemeyen yol için çalışma alanının Bugün'üne düş. M8: `/.well-known/apple-app-site-association` ve `assetlinks.json` Next `public/` altından; `/panel/**` yollarını uygulamada açma; davet kabulü ve parola sıfırlama bağlantıları.

## MD-15 — Test stratejisi

**Karar.** M1: `jest-expo` + `@testing-library/react-native` (API istemcisi hata eşlemesi, bildirim bağlantı eşlemesi, kapı yönlendirmeleri, primitives). Sunucu tarafı: her yeni uç için mevcut `tests/integration/*.integration.ts` desenine uygun yetki testleri (rol, ürün yok, flag kapalı, yabancı öğrenci kimliği). M9: Maestro ile kritik akış E2E'leri (giriş, MFA, çalışma alanı değiştirme, push açılışı). Mobil CI işi: `tsc --noEmit`, `expo lint`, `jest`, token senkron betiği.

## MD-16 — Temizlik ve eski uçlar

**Karar.** Kaldırılacaklar: `components/ui/collapsible.tsx`, `hooks/use-color-scheme*` (tek tema), `scripts/reset-project.js`, şablon görselleri, şablon README. `GET /api/panel/student/progress` repo içinde yalnız mobil tarafından kullanılıyor ve web Analiz'den farklı veri döndürüyor: yeni Analiz ucu yayınlandıktan ve en eski desteklenen mobil sürüm onu kullanmayı bıraktıktan sonra kaldırılır. Yorumlardaki "mobil inşa promptu §x" atıfları bu belgelere yönlendirilir.

## MD-17 — Expo web

**Karar.** Web hedefi desteklenmez (`app.json` `web` bloğu ve `react-native-web` bağımlılığı M1'de değerlendirilir). Gerekçe: same-origin guard Expo web `Origin`'ini reddeder; token web'de bilinçli olarak saklanmıyor; web zaten tam panel.

## MD-18 — Sunum kuralları sunucuda

**Karar.** Okuma modelleri hazır `{ label, tone }`, `state.key`, `nextAction`, metin özetleri taşır (`status-vocabulary`, `student-exam-state`, `yon-today`, `result-next-step`, `trendCaption` benzeri). Mobil enum çevirisi, net hesaplama, durum türetme veya "sıradaki adım" mantığı içermez. Navigasyon etiketleri bootstrap'tan; ekran başlıkları `PANEL_DOMAIN` alt kümesi. Ürün telemetrisi mevcut `POST /api/panel/events` (izin listeli olaylar) ile gönderilir; mobil kaynağı ayırmak gerekirse olay şemasına ek alan ayrı PR'dır.

## MD-19 — Yön (M3) sunum ve kapsam kararları

**Karar.**
- **Taslak plan:** Mobil, öğrenciye yayınlanmamış (DRAFT) planın görevlerini almaz; yalnız durum ve görev sayısı gelir. Web Planım taslak görevleri salt okunur listeler; mobil daha dar davranır (gizlilik tarafında).
- **Yön "Çalışmalar":** Yön çalışma alanındaki `assignments` menü öğesi OD ödev ekranına değil, bu haftanın yayında Yön plan görevlerine (`yon-work`) gider; OD ucu çağrılmaz.
- **Görüşme:** Öğrenciye mobilde yalnız saat değişikliği TALEBİ (`REQUEST`) açılır. Koçun önerdiği yeni saatin onayı (`ACCEPT`) web devam yoluyla yapılır; `SAVE` / `COMPLETE` öğrenciye hiç açılmaz.
- **Ortak haftalık özet (Yön):** `WeeklyDigest` uçları OD üyeliği ister (mevcut politika). Yön "Haftalık" ekranı ortak özeti yalnız öğrencinin aktif OD üyeliği varken ister; yayınlanmış koç özeti (`WeeklyCoachSummary`) ayrı başlıkla gösterilir. Politika genişletilmedi.
- **Check-in:** OD ve Yön için tek native ekran; sunucu kuralları (OD grubu öncelikli, grubu yoksa koç ataması; haftalık hak; açık yardım isteği tekilliği) değişmedi.
- **Test politikası (M3):** Kullanıcı talimatıyla M3'te YENİ test yazılmadı; yalnız mevcut paketler koşuldu. M3'ün bilinçli olarak değiştirdiği davranışa (Yön yer tutucusu → Yön ekranları, check-in yer tutucusu → native ekran) dayanan mevcut beklentiler güncellendi.

