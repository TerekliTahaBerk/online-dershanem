# Android / Google Play yayın rehberi

Tarih: 13 Ekim 2026 (10 Ekim M9 sürümünün yerini alır). Kapsam: Online Dershanem mobil 1.0.0. Genel sıra: [v1-release-candidate](./v1-release-candidate.md).

## Kodda hazır olanlar

| Konu | Durum |
| --- | --- |
| Hedef / derleme SDK | API 36 (Expo SDK 57 / RN 0.86); Play'in güncel hedef API şartını karşılar. Yükleme günü Console'un istediği değer yine kontrol edilir |
| Paket türü | `production` profili AAB (`app-bundle`), `preview` APK |
| Sürüm kodu | EAS remote `versionCode`, production `autoIncrement` |
| İzinler | Birleşik manifest: `INTERNET`, `VIBRATE`, bildirim için `POST_NOTIFICATIONS`/`RECEIVE_BOOT_COMPLETED`. Kamera, mikrofon, konum, rehber, medya/depolama okuma-yazma ve `SYSTEM_ALERT_WINDOW` `tools:node="remove"` ile kaldırılır. Dosya seçimi sistem seçicisiyle (izin gerekmez) |
| Yedekleme | `allowBackup=false`; SecureStore yedek/aktarım kuralları |
| Uygulama ikonu | Uyarlanabilir ikon; içerik güvenli alan içinde. **Android 13+ temalı ikon** için `monochrome-icon.png` |
| Bildirim ikonu | `notification-icon.png` (beyaz, saydam zemin, 96 px) + marka rengi #067A69; renkli ikon durum çubuğunda beyaz kare görünmez |
| Bildirim izni | Yalnız kullanıcı "Bildirimleri aç" dediğinde; Android 13+ için izin isteminden **önce** kanal oluşturulur (`native-push.test.ts`) |
| Push yapılandırması | Firebase dosyası yoksa Android'de push "yapılandırılmamış" gösterilir, token denenmez |
| Açılış ekranı | Zemin #067A69, görsel Android 12+ dairesel maskesinin içinde kalır |
| Dil | `values-b+tr` (uygulama adı); arayüz Türkçe |
| Geri hareketi | Predictive back kapalı (`enableOnBackInvokedCallback=false`) |
| Yönlendirme | Telefonlarda dikey. Not: API 36 hedefinde Android 16, büyük ekranlarda (tablet/katlanabilir) yön kilidini yok sayar; ekranlar kaydırılabilir düzende olduğundan yatay görünüm çalışır, tablet QA'da kontrol edilir |

## Sizin yapmanız gerekenler

1. **Play Console uygulama kaydı:** Paket adı EAS `MOBILE_ANDROID_PACKAGE` ile aynı (ör. `com.onlinedershanem.app`). Kalıcıdır, sonradan değişmez. Play App Signing açık.
2. **Push (bildirim gönderilecekse):**
   - Firebase projesinde aynı paket adıyla Android uygulaması ekleyin ve `google-services.json` indirin.
   - EAS'e **dosya** ortam değişkeni olarak yükleyin: `npx eas-cli env:create --environment production --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret`. Dosya Git'e girmez; `.gitignore` buna göre ayarlı.
   - Expo push sunucusu için FCM V1 servis hesabı anahtarını yükleyin: `npx eas-cli credentials -p android` → Google Service Account → FCM V1.
   - Bunlar yapılmazsa uygulama yine çalışır; yalnız Android'de telefon bildirimleri "yapılandırılmamış" görünür.
3. **İmzalama:** İlk `eas build` sırasında EAS'in ürettiği upload key'i kabul edin (veya mevcut anahtarı yükleyin). Yedeği güvenli kasada tutun.
4. **Build:** `cd mobile && npx eas-cli build --platform android --profile production`.
5. **İlk yükleme:** Google, yeni uygulamada ilk AAB'nin Play Console'dan **elle** yüklenmesini ister. Build sayfasından AAB'yi indirip İç test kanalına yükleyin. Sonraki sürümler: `npx eas-cli submit --platform android --profile production` (iç test, taslak). Bunun için Play servis hesabı JSON'u EAS'e verilir (`eas credentials` → Google Service Account); dosya Git'e girmez.
6. **Kapalı test şartı:** 13 Kasım 2023'ten sonra açılmış **kişisel** geliştirici hesaplarında üretime çıkmadan önce kapalı test zorunludur: en az 12 test kullanıcısı, 14 gün kesintisiz. Kurumsal hesapta bu şart yoktur. Hesabınız için Console'un gösterdiği koşulu izleyin.
7. **Play Console formları:**
   - Uygulama erişimi: giriş gerekir; öğrenci ve veli demo hesabı ([inceleme notu](./v1-release-candidate.md)).
   - Reklam: yok.
   - İçerik derecelendirmesi anketi: kullanıcılar arası mesajlaşma/serbest metin (koç-öğretmen notları), web'deki yapay zekâ erişimi doğru beyan edilir.
   - Hedef kitle: hukuk kararıyla ([çocuk verisi](./m9-child-data-review.md)).
   - Data Safety: [taslak](./m9-privacy-disclosures.md); veriler aktarımda şifreli; silme isteği mümkün; silme URL'si `https://www.onlinedershanem.com/hesap-silme`.
   - Gizlilik politikası: `https://www.onlinedershanem.com/gizlilik`.
   - Ödemeler: uygulamada satın alma yok.
   - Uygulama kategorisi: Eğitim; iletişim e-postası.
8. **Mağaza sayfası:** [metin](./m9-store-listing-tr.md). Grafikler:
   - 512×512 ikon: `assets/images/icon.png`'den küçültülür.
   - 1024×500 öne çıkan görsel.
   - En az 2 telefon ekran görüntüsü, sentetik veriyle ([manifest](./m9-screenshot-manifest.md)).
9. **Cihaz QA:** Android 13+ gerçek cihazda giriş, rol turları, PDF seçme/yükleme, bildirim izni (Türkçe sistem metni), temalı ikon (Ayarlar → Duvar kâğıdı → Temalı simgeler), bildirim ikonu, geri tuşu davranışı, koyu tema altında açılış.
10. **Üretime çıkış:** Aşamalı yayın önerilir (%10 → %50 → %100). Android Vitals çökme/ANR oranı izlenir ([izleme](./m9-monitoring-runbook.md)).

[Hedef API şartı](https://support.google.com/googleplay/android-developer/answer/11926878) · [Kapalı test şartı](https://support.google.com/googleplay/android-developer/answer/14151465) · [Expo FCM kurulumu](https://docs.expo.dev/push-notifications/fcm-credentials/) · [EAS ortam değişkenleri](https://docs.expo.dev/eas/environment-variables/)
