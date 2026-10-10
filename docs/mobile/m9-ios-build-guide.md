# M9 iPhone geliştirme ve iOS build rehberi

Tarih: 10 Ekim 2026. Kapsam: Online Dershanem mobil 1.0.0.

Durum: yerel Xcode var; Apple/EAS signing kimlikleri ve fiziksel cihaz erişimi doğrulanmadı. IPA üretilmedi. Hermes export bir IPA değildir.

Repo kökünde `npm ci`, `npm run prisma:generate`; mobile içinde `npm ci`. Node en az SDK 57'nin gerektirdiği 22.13.x. Mac'te Xcode 26.5 bulundu; seçili Xcode/CocoaPods/simülatör kontrolü operatöre ait.

1. Expo hesabıyla `npx eas-cli login`, ardından `npx eas-cli whoami`; owner/UUID'yi kontrol edin. Gerçek proje UUID sağlandıktan sonra `npx eas-cli init --id <GERCEK_EAS_PROJECT_ID>` ile mevcut projeyi bağlayın ve config diff'ini inceleyin. Bu komutlar kullanıcı hesabına bağlanır.
2. m9-credentials-checklist'teki gerçek IDs/originleri EAS development ortamına girin. LAN cihaz geliştirmesi için Expo Go yerine development client önerilir; push gerçek signed build ister.
3. iPhone UDID'yi `npx eas-cli device:create` ile kaydedin; Apple hesabındaki cihazla eşleştirin.
4. Build onayı sonrası `npx eas-cli build --platform ios --profile development`; internal provisioning profilindeki cihazlara kurun.
5. Metro için mobile dizininde `npx expo start --dev-client`; telefon ve Mac ağını kontrol edin. Yalnız sentetik staging hesapları kullanın.
6. Uygun credentials sağlandıktan sonra yerel alternatif: `npx eas-cli build --local --platform ios --profile development`. Eksik kimlikleri sahte değerle aşmayın.
7. Preview: `npx eas-cli build --platform ios --profile preview`. Ad-hoc cihaz listesi build öncesi tamamlanmış olmalı.
8. Production IPA: `npx eas-cli build --platform ios --profile production` (build onayından sonra). Submit ayrı adımdır.

Push kapalıyken in-app bildirim merkezi çalışmalı. Native izin/entitlement/package değişiminden sonra eski dev client yeterli değildir. `m9-iphone-smoke-checklist` kanıtlarıyla tamamlayın. SDK 57 [referansı](https://docs.expo.dev/versions/v57.0.0/) React Native 0.86 ve iOS 16.4+ tabanını belirtir.
