# M9 EAS yapılandırması

Tarih: 10 Ekim 2026. Kapsam: Online Dershanem mobil 1.0.0.

## Profiller

| Profil | Dağıtım | Ortam / kanal | API | Android |
| --- | --- | --- | --- | --- |
| development | internal, developmentClient | development | Onaylı izole staging/dev HTTPS | Geliştirme istemcisi |
| preview | internal | preview | İzole staging HTTPS | APK |
| production | store | production | Onaylı üretim HTTPS | AAB |

`expo-dev-client` ve `expo-updates` SDK 57 uyumlu sürümleri kilit dosyasında. `app.config.ts` native profillerde kimlik, EAS UUID, HTTPS köken ve ortam eşleşmesini zorunlu tutar. Localhost/private IP, path/query/credential içeren API URL reddedilir. Preview/development bilinen production alan adını kullanamaz. Operasyonun MOBILE_STAGING_API_ORIGIN değerinin gerçekten ayrı DB kullandığını ayrıca kanıtlaması gerekir; hostname kontrolü DB izolasyonu kanıtlamaz.

EAS ortamlarına EXPO_PUBLIC_API_URL, EXPO_PUBLIC_APP_ENV, MOBILE_IOS_BUNDLE_ID, MOBILE_ANDROID_PACKAGE, EAS_PROJECT_ID ve ilgili MOBILE_*_API_ORIGIN girilir. İlk iki değer client bundle'dadır. Diğer alanlara da secret konulmaz. Aynı anda kurulum için environment bazında gerçek, kayıtlı farklı ID'ler kullanın. Display name Dev/Preview eki taşır; kalıcı ID otomatik türetilmez.

## Sürüm ve güncellemeler

App/package 1.0.0. Yerel ilk buildNumber/versionCode 1; EAS remote version kaynağı ve production autoIncrement kullanılır. İlk bağlantıda `eas build:version:set --platform ios` ve Android karşılığıyla konsoldaki son değeri eşitleyin. `eas build:version:get --platform ios` ile kayıt alın. Preview numarası App Store'a gönderilmez.

Fingerprint runtime native bağımlılık/izin değişikliklerini ayırır. Development, preview, production kanalları ayrıdır. Updates proje ID yokken kapalı. Üretim OTA yalnız ayrı insan onayıyla. Native değişiklik yeni binary ister. Backend MOBILE_MIN_SUPPORTED_VERSION, dağıtılmış uyumlu sürümden yüksek yapılamaz.

Release etiketi önerisi `mobile-v1.0.0-rc.N`, final `mobile-v1.0.0`; SHA, binary build numarası ve backend sürümü birlikte kayıt edilir. Bu çalışmada tag/publish yapılmadı.

Kaynaklar: [EAS profilleri](https://docs.expo.dev/build/eas-json/), [SDK 57 config](https://docs.expo.dev/versions/v57.0.0/config/app/), [Updates](https://docs.expo.dev/versions/v57.0.0/sdk/updates/).

## OTA yayın komutu (yalnız onay sonrası)

Önce preview: `npx eas-cli update --channel preview --environment preview --message "<RC_SHA>"`. Gerçek EAS UUID ve preview ortamını export sırasında da sağlayın; EAS_BUILD_PROFILE yalnız native build'te zorunludur. Native fingerprint'i release kaydıyla karşılaştırın. Sonra açık production OTA onayıyla `npx eas-cli update --channel production --environment production --message "<ONAYLI_SHA>"`. Yayından önce public config/API origin ve fingerprint doğrulanmadan production update çalıştırmayın. Bu komutlar bu görevde yürütülmedi. Rollback m9-monitoring-runbook'ta.
