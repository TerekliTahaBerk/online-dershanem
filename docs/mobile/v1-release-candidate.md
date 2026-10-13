# Online Dershanem mobil 1.0.0 — yayın adayı (RC)

Tarih: 13 Ekim 2026. Bu belge yayın durumunun **güncel tek kaynağıdır**. 10 Ekim tarihli [m9-go-no-go](./m9-go-no-go.md), [m9-release-checklist](./m9-release-checklist.md) ve [v1-release-handoff](./v1-release-handoff.md) tarihsel kayıttır; aşağıdaki durum onların yerine geçer.

## 1. Kodda tamamlananlar (Gate A — kod)

| Alan | Durum | Kanıt |
| --- | --- | --- |
| Web eşliği | 106 rota: 94 Tam, 2 Kısmi, 2 Eksik, 2 İstisna, 6 Yönl. Eksik/Kısmi kalanlar açık web devamıyla korunur (aşağıda) | [parity-matrix](./parity-matrix.md), `npm run lint:mobile-parity` |
| Uygulama içi hesap silme | Parolayla doğrulanan, makbuzlu silme **talebi** (Hesap → Hesabımı sil); DSR insan onayıyla işlenir; e-posta yedeği; public `/hesap-silme` | `mobile/src/app/(app)/account/deletion.tsx`, `lib/account/deletion-request.ts`, `account-security.test.tsx` |
| Hesap oluşturma | Mobilde yok (yalnız giriş) | `mobile/src/app/` |
| Satış / ödeme | Mobilde fiyat, sepet, ödeme, IAP, satın alma bağlantısı **yok**. 13 Ekim RC temizliği: veli "paket değişikliği görüşmesi" çağrısı ve ayarlardaki "Fatura bilgileri" bölümü mobilden kaldırıldı (web'de kalır); "satın alındığında / ödeme alındı" ifadeleri nötrleştirildi. Ticari web yolları web devamında reddedilir | `account-settings.test.tsx` (çağrının görünmediği), `features/shell/web-continuation.ts` |
| iOS gizlilik bildirimi | `PrivacyInfo.xcprivacy`: izleme yok, required-reason API'leri (UserDefaults CA92.1, FileTimestamp 0A2A.1/3B52.1/C617.1, SystemBootTime 35F9.1, DiskSpace E174.1/85F4.1) | `mobile/app.config.ts` `PRIVACY_MANIFEST`; prebuild çıktısında doğrulandı |
| Dil | Uygulama Türkçe; iOS `CFBundleDevelopmentRegion=tr` + `tr.lproj`, Android `values-b+tr`. Mağaza dil listesi Türkçe, sistem izin/dosya seçici iletişim kutuları Türkçe | `app.config.ts` `locales`; prebuild çıktısında doğrulandı |
| Açılış ekranı | Arka plan görselin zemin rengiyle (#067A69) eşitlendi; önceden açık zemin üzerinde yeşil kare görünüyordu | `mobile/app.json` |
| Zorunlu güncelleme | "Mağazada güncelle" butonu: Android paket kimliğinden, iOS `MOBILE_IOS_APP_STORE_ID`'den | `src/app/upgrade.tsx`, `src/config/app-info.test.ts` |
| İkon | 1024×1024, alfa kanalı yok (App Store şartı); uyarlanabilir ikon içeriği güvenli alan içinde (284–772 / 171–853 px) | `mobile/assets/images` |
| İzinler | Kamera, mikrofon, konum, rehber, medya okuma Android'de engelli; iOS'ta izin metni gerektiren API yok (bildirim izni sistem metni) | `app.json` `blockedPermissions` |
| Şifreleme beyanı | `ITSAppUsesNonExemptEncryption=false` (yalnız HTTPS) | `app.json` |
| Ağ | Native profillerde yalnız onaylı HTTPS kökeni; yerel/özel adres ve production'a bağlı preview reddedilir | `app.config.ts` |
| Bağımlılıklar | Tüm native modüller Expo SDK 57 beklenen sürümlerinde | `expo/bundledNativeModules.json` karşılaştırması |
| Paket üretimi | `expo export --platform ios --platform android` başarılı; `expo prebuild` (iOS + Android) başarılı | 13 Ekim RC çalıştırması |
| Testler | Sunucu birim 1009, mobil Jest 59 paket, PostgreSQL entegrasyon 144/146 (iki kırmızı main'de de aynı: koçluk saat talebi, ders hatırlatmaları), `next build`, lint/tip/API doğrulama/sözleşme kontrolleri | §5 |

### 1.0 kapsamı dışında, web devamıyla korunanlar

| Satır | Neden | Mobil davranış |
| --- | --- | --- |
| S18 / V11 Dino sohbet, T07 Dino bağlamı | Çocuk verisi + yapay zekâ için dış inceleme ([m9-child-data-review](./m9-child-data-review.md)) | Açık "web'de devam et" |
| C09 passkey | Platform passkey modülü kararı | TOTP native; passkey web'de |
| S23 sınav çözme | E1 ürün kararı | Mobilde yok; bilgisayar/tarayıcı |
| V10 paket görüşmesi, C08 fatura | Mağaza ödeme politikası | Mobilde yok; web'de |

## 2. Yayın sırası (insan adımları)

Her adım ayrı onay ister; GitHub'a push build, OTA veya mağaza gönderimi başlatmaz.

1. **Kodu birleştir.** `claude/zen-wozniak-qbmjb0` → `main` PR'ı (K04, K03a–c ve bu RC). CI yeşil olmalı.
2. **Önce backend'i production'a çıkar.** Yeni mobil sürüm yeni uçları çağırır (ör. `/api/panel/odk/management/exams/[id]`, `/operations`, `/api/panel/me/deletion-request`); backend dağıtılmadan binary yayınlanmaz. Yeni veritabanı migration'ı yok. Sonra canlı kontrol: `GET /api/health`, `/hesap-silme`, `/gizlilik`, `/iletisim` erişilebilir.
3. **Production ayarları** (operasyon): `STAFF_PRODUCT_ASSIGNMENTS` modu kayıtlı; `PANEL_FEATURE_STAFF_PUSH` kararı (kapalı kalabilir); push açılacaksa APNs/FCM teslim kanıtı. `MOBILE_MIN_SUPPORTED_VERSION` **değiştirilmez** (yeni sürüm mağazada yayılmadan yükseltmek kullanıcıları kilitler).
4. **EAS production ortamı** (`eas env:list --environment production` ile kontrol): `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_APP_ENV=production`, `MOBILE_IOS_BUNDLE_ID`, `MOBILE_ANDROID_PACKAGE`, `EAS_PROJECT_ID`, `MOBILE_PRODUCTION_API_ORIGIN` ve **yeni** `MOBILE_IOS_APP_STORE_ID` (App Store Connect → Uygulama Bilgileri → Apple ID; gizli değil). Başka `EXPO_PUBLIC_*` eklenmez (config reddeder).
5. **Yeni native build zorunlu** (OTA yetmez): gizlilik bildirimi, yerelleştirme, açılış rengi ve önceki dilimlerdeki `expo-document-picker` native çıktıyı değiştirir; fingerprint runtime yeni olur. `cd mobile && npx eas-cli build --profile production --platform all`. Sürüm 1.0.0; build numarası EAS remote `autoIncrement` ile artar.
6. **İç test.** `npx eas-cli submit --profile production --platform ios` (TestFlight) ve `--platform android` (Play internal, taslak). Gerçek cihazda [m9-iphone-smoke-checklist](./m9-iphone-smoke-checklist.md) + [m9-release-qa](./m9-release-qa.md); Android fiziksel QA. Öncelikli: giriş/MFA, öğrenci-veli-öğretmen-koç-yönetici rol turları, dosya seçme/yükleme (PDF), hesap silme talebi, zorunlu güncelleme ekranı, bildirim izni Türkçe metni, açılış ekranı.
7. **Mağaza kayıtları** (ürün + hukuk):
   - [Mağaza metni](./m9-store-listing-tr.md) ve gerçek, sentetik verili ekran görüntüleri ([manifest](./m9-screenshot-manifest.md)).
   - App Privacy / Data Safety cevapları ([taslak](./m9-privacy-disclosures.md)) hukuk onayıyla; "Tracking: No".
   - Yaş derecelendirmesi anketi: kullanıcı içeriği (koç/öğretmen notları) ve web'deki yapay zekâ erişimi doğru beyan edilir.
   - Ticari sınıflandırma ([commerce](./m9-commerce-policy-review.md)): mobil yalnız mevcut hesap erişimi sağlar.
   - Hesap silme URL'si: `https://www.onlinedershanem.com/hesap-silme`.
   - İnceleme notu ve demo hesaplar: §3.
8. **Gönderim ve yayın.** App Review'a gönderim ve Play üretim kanalına çıkış ayrı açık onayla; aşamalı yayın önerilir (iOS phased release, Play %10→%100). [İzleme/geri alma](./m9-monitoring-runbook.md) operatörü atanır.
9. **Yayın sonrası.** RC kaydını doldurun (§4); `mobile-v1.0.0` etiketi. Yeni sürüm yayıldıktan sonra gerekirse `MOBILE_MIN_SUPPORTED_VERSION=1.0.0`.

## 3. App Review notu (taslak)

> Online Dershanem, kurumumuzun mevcut öğrenci, veli ve eğitmenleri için bir eşlik uygulamasıdır. Uygulamada hesap oluşturma, satın alma veya ödeme yoktur; hesaplar kurum tarafından açılır. İnceleme için sentetik verili iki hesap verilmiştir: öğrenci ve veli (App Store Connect "Sign-in required" alanında). Hesap silme: Hesap → Hesabımı sil (parola ile talep; talep destek ekibince işlenir, ayrıca https://www.onlinedershanem.com/hesap-silme). Deneme sınavları mobilde çözülmez; yalnız yayınlanmış sonuçlar görüntülenir. Bazı gelişmiş işlemler kullanıcıyı web paneline yönlendirir; bu bağlantılar satış sayfası açmaz.

Demo hesaplar: yalnız sentetik veri; MFA kapalı veya inceleme notunda kod yöntemi açıklanır; şifreler yalnız mağaza konsoluna girilir, Git'e yazılmaz. Personel (yönetici/öğretmen) ekranları yalnız yetkili kurum çalışanlarına açıktır ve sipariş/fiyat gibi iç arka ofis verisi gösterebilir; inceleme hesabı olarak verilmez.

## 4. RC kaydı

Commit SHA __; app version 1.0.0; iOS build __; Android versionCode __; EAS build ID (iOS/Android) __; runtime fingerprint __; EAS environment production; API origin __; backend deployment SHA __; staff assignment modu __; staff push __; QA kanıtı __; App Review gönderim tarihi __; onaylayan __.

## 5. Bu RC'de çalıştırılan kontroller

Kök: `npx tsc --noEmit`, `npm run lint`, `npm run lint:api-validation`, `node scripts/check-mobile-contracts.mjs`, `npm run lint:mobile-parity`, `npm run test:unit`, `npm run test:integration` (izole PostgreSQL), `npx next build`. Mobil: `npx tsc --noEmit`, `npx eslint src`, `npx jest`, `npx expo export --platform ios --platform android`, geçici kopyada `npx expo prebuild --no-install --platform all` (PrivacyInfo, tr.lproj, values-b+tr, splash rengi doğrulandı). `npx expo install --check` ortam ağ kısıtı nedeniyle çalışmadı; yerine kurulu sürümler `expo/bundledNativeModules.json` ile karşılaştırıldı.

Bu çalışmada build, OTA, mağaza gönderimi, production ayarı veya backend dağıtımı **yapılmadı**.
