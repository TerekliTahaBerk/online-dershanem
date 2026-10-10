# M9 Android / Google Play rehberi

Tarih: 10 Ekim 2026. Kapsam: Online Dershanem mobil 1.0.0.

Durum: BLOCKED. Gerçek package, Play hesabı, upload key/FCM ve Android cihaz kanıtı yok. APK/AAB üretilmedi veya yüklenmedi.

1. Play sahibi kalıcı package'ı seçer/kaydeder. EAS Android credentials ve Play App Signing'i kurar. Upload key yedeği güvenli kasada tutulur.
2. EAS development/preview environment gerçek IDs, EAS UUID ve izole staging origin içerir. `npx eas-cli build --platform android --profile preview` internal APK üretir (build onayıyla).
3. Android 13+ bildirim iznini kullanıcı ayarından isteyin; reddetme eğitim ekranlarını kapatmamalı. Kamera/mikrofon/konum/rehber/media-storage izinleri blockedPermissions ile engelli; gerçek merged manifest ayrıca denetlenir.
4. Production AAB: `npx eas-cli build --platform android --profile production`; remote versionCode her mağaza build'inde artar.
5. Play Console'da app access, content rating, target audience, Data Safety, reklam beyanı, silme URL ve privacy policy doldurulur. Henüz hukuk onayı yok.
6. **Upload onayı sonrası** `npx eas-cli submit --platform android --profile production --id <ONAYLI_EAS_BUILD_ID>`; servis hesabı anahtarını EAS'e güvenli verin. Profil internal/draft; production rollout otomatik değildir. İlk app upload'unu Console'da manuel yapmak gerekebilir.
7. Hesap eligibility'sine göre kapalı test gerekebilir; Play Console'un o hesap için gösterdiği koşulu kaydedin. Kişisel hesabın güncel test yükümlülüğünü varsaymayın.

SDK 57 target/compile API 36 bildiriyor; gerçek AAB manifest ve upload tarihinde Console'un istediği target API kontrol edilir. Bu belge tek başına compliance kanıtı değildir. [Güncel API gereksinimleri](https://support.google.com/googleplay/android-developer/answer/11926878), [SDK tablosu](https://docs.expo.dev/versions/v57.0.0/), [Play test koşulları](https://support.google.com/googleplay/android-developer/answer/14151465).

iOS ile aynı ürün adı, hesap, gizlilik, sürüm ve destek kanalları kullanılır; platform farkları APK/ad-hoc dağıtımı, bildirim izni ve signing'dir.
