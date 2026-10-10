# M9 uygulama ve teslim raporu

Tarih: 10 Ekim 2026. Kapsam: Online Dershanem mobil 1.0.0.

## Sonuç

M9'un yerelde yürütülebilen release yapılandırması, güvenlik düzeltmeleri, satışsız mobil kapsamı ve dokümantasyonu hazırlandı. **M9 tamamen store-ready değildir.** Gate A/B/C NO-GO; özellikle self-service deletion, hukuk/commerce kararları, kalan dependency audit ve gerçek cihaz/signing kanıtı açık. Hiçbir merge, production deploy, OTA, store submission veya yayın yapılmadı.

Dal: `test/m9-mobile-release-readiness`. Başlangıç HEAD: `2c8c0995`; M1–M7 main'e birleşmiş. Son teslim commit'i `git log -1 --format=%H` ile alınır; bu rapor o commit'in içindedir. Commit mesajı `Prepare M9 mobile release engineering without in-app commerce`.

| Aşama | Durum | Teslim / sınır |
| --- | --- | --- |
| M9.0 | COMPLETE | Taban, release envanteri, M4/M5/M6/M7 bulguları ve merge durumu |
| M9.1 | PARTIAL | EAS üç profil, remote versions, fingerprint/channels; gerçek hesap/IDs yok |
| M9.2 | PARTIAL | Mevcut od. icon/splash korunur, default Expo Android varlıkları kaldırılır; final mono/mask physical onayı yok |
| M9.3 | PARTIAL | HTTPS/origin/public env guards, minimal permissions, cookie/Bearer sınırı korunur; production API/manifest/entitlements NOT VERIFIED |
| M9.4 | BLOCKED | Privacy/child/disclosure taslakları ve hesap silme entry point; tam lifecycle/legal onay eksik |
| M9.5 | PARTIAL | Güvenli root error boundary, browser failure handling, staff izin/private note/ODK cevap kapıları; cihaz QA ve audit açık |
| M9.6 | NOT VERIFIED | iOS development build ve physical smoke rehberi; imzalı build/cihaz yok |
| M9.7 | BLOCKED | TestFlight/manual submit ve reviewer stratejisi hazır; Apple/EAS erişimi yok |
| M9.8 | BLOCKED | Android APK/AAB/Play signing ve internal track rehberi; gerçek package/key/account yok |
| M9.9 | PARTIAL | TR listing, screenshot manifest, commerce kararı; final screenshot/policy onayı yok |
| M9.10 | PARTIAL | Mevcut validation yürütüldü; sonuçlar ve eski hatalar m9-validation-results'te |
| M9.11 | PARTIAL | Release CI metadata/scan, monitoring/stop/rollback hazır; gerçek operasyon bağlantısı yok |
| M9.12 | COMPLETE | 20 M9/handoff belgesi, roadmap/decisions/README/deploy/rollback güncellendi |

## Kod davranışı

- PAYTR, satış, IAP veya abonelik checkout eklenmedi. Veli paket ekleme/değiştirme CTA kaldırıldı; menü “Hesap”; bilinen ticaret URL'leri projeksiyon/web continuation/material dış linkinde reddedilir.
- Native production/preview ve OTA config aynı HTTPS onaylı origin kontrolüne tabidir; localhost/private IP, URL credential/path/query ve bilinmeyen EXPO_PUBLIC girdileri reddedilir. Kalıcı kimlik veya secret uydurulmaz.
- EAS development/preview/production; dev-client/updates SDK uyumlu paketler. Remote autoIncrement production, fingerprint runtime ve ayrı kanallar. Hiç otomatik submit veya OTA publish yok.
- Android camera/microphone/location/contacts/media-storage gereksiz izinleri engelli; allowBackup=false. Release overlay izni engelli, iOS arbitrary HTTP kapalı; kullanılmayan Face ID açıklaması kaldırıldı. Config introspection geçti. Bildirim contextual/user controlled. Gerçek merged manifest/Info.plist, APNs/FCM signing yeni native build'te doğrulanacak.
- Hesap → Gizlilik / Hesabımı sil ekranları ve public /hesap-silme bilgi sayfası. Silme yalnız destek başvuru girişidir; mağaza şartı geçilmiş sayılmaz. Mevcut tombstone/approver kuralları atlanmadı.
- OD üç mutation ucu okuma uçlarıyla aynı staff permission guard'ını kullanır; global staff mode/rol tanımları değişmedi. Web INTERNAL note hem sorguda hem sütunda izinle filtrelenir. Koç planına OK product süzgeci eklenir. Web correctOption answerKeyAvailable ile gösterilir.
- Mevcut root error boundary raw stack/URL/öğrenci verisi göstermez. WebBrowser başarısızlığı unhandled rejection oluşturmaz. ODK metni bilgisayar/browser gereğini açıklar; native exam API yok.

## Görsel ve güvenlik durumu

iOS icon 1024×1024 ve splash 250×137 mevcut marka; görsel incelendi. Default Expo adaptive foreground/background/mono kaldırıldı; Android mevcut od. ikonunu kullanır. Final monochrome için tasarım: onaylı marka silueti, saydam alpha mask, kare PNG, Android adaptive güvenli alanında merkezli (108dp canvas içinde 66dp kritik alan); native themed-icon maskesi farklı şekillerde QA. Yeni gayriresmî logo üretilmedi. Light mode ve dark sistemde light davranış korunur; Dynamic Type/keyboard/safe area gerçek cihaz kanıtı beklenir.

Auth token SecureStore, sorgular RAM, materyaller cache; credentials=omit, cookie/Bearer fail-closed, session expiry/MFA/workspace/min version mevcut kuralları korunur. Production backend'in M1–M7+M9 deployed SHA'sı bilinmiyor. Push default DISABLED; TEACHER/ADMIN push yok. Gerçek push delivery yapılmadı.

Privacy beyanı final legal statement değildir. Review hesapları/screenshotlar sentetik veriyle provision edilmeli; şifre repo/PR'a yazılmaz. Public destek e-postası mevcut siteyle doğrulandı; resmî controller/contact/retention/provider approval eksik. Commerce model kararında mobil satış yokluğu kesin; mağaza sınıflandırması BLOCKED.

## Dosya envanteri

- `.github/workflows/mobile.yml`
- `app/api/panel/assignment-submissions/[id]/review/route.ts`
- `app/api/panel/lessons/[id]/notes/route.ts`
- `app/api/panel/student-help-requests/[id]/respond/route.ts`
- `app/hesap-silme/page.tsx`
- `app/panel/odk/ogrenci/denemeler/[id]/sonuc/page.tsx`
- `app/panel/ogretmen/hazirlik/[id]/page.tsx`
- `docs/deployment-checklist.md`
- `docs/mobile/implementation-roadmap.md`
- `docs/mobile/m8-handoff.md`
- `docs/mobile/m9-account-deletion-review.md`
- `docs/mobile/m9-android-release-guide.md`
- `docs/mobile/m9-child-data-review.md`
- `docs/mobile/m9-commerce-policy-review.md`
- `docs/mobile/m9-credentials-checklist.md`
- `docs/mobile/m9-eas-configuration.md`
- `docs/mobile/m9-go-no-go.md`
- `docs/mobile/m9-implementation-report.md`
- `docs/mobile/m9-ios-build-guide.md`
- `docs/mobile/m9-iphone-smoke-checklist.md`
- `docs/mobile/m9-monitoring-runbook.md`
- `docs/mobile/m9-privacy-disclosures.md`
- `docs/mobile/m9-release-audit.md`
- `docs/mobile/m9-release-checklist.md`
- `docs/mobile/m9-release-qa.md`
- `docs/mobile/m9-screenshot-manifest.md`
- `docs/mobile/m9-store-listing-tr.md`
- `docs/mobile/m9-testflight-guide.md`
- `docs/mobile/m9-validation-results.md`
- `docs/mobile/migration-decisions.md`
- `docs/mobile/v1-release-handoff.md`
- `docs/rollback-runbook.md`
- `lib/kocum/coach-workspace-server.ts`
- `lib/mobile/bootstrap.ts`
- `lib/panel/staff-api.ts`
- `mobile/.env.example`
- `mobile/.gitignore`
- `mobile/README.md`
- `mobile/app.config.ts`
- `mobile/app.json`
- `mobile/assets/images/android-icon-background.png`
- `mobile/assets/images/android-icon-foreground.png`
- `mobile/assets/images/android-icon-monochrome.png`
- `mobile/eas.json`
- `mobile/package-lock.json`
- `mobile/package.json`
- `mobile/src/app/(app)/_layout.tsx`
- `mobile/src/app/(app)/account/deletion.tsx`
- `mobile/src/app/(app)/account/index.tsx`
- `mobile/src/app/(app)/account/privacy.tsx`
- `mobile/src/app/_layout.tsx`
- `mobile/src/config/app-info.ts`
- `mobile/src/features/odk/exam-detail.tsx`
- `mobile/src/features/parent/parent-account.tsx`
- `mobile/src/features/shell/placeholder-screen.tsx`
- `mobile/src/features/shell/web-continuation.ts`
- `mobile/src/lib/links.ts`
- `mobile/src/test/od-lessons.test.tsx`
- `scripts/check-mobile-release.mjs`

## Doğrulama ve kapılar

Komutlar, gerçek sayılar ve ortam düzeltmeleri [m9-validation-results](./m9-validation-results.md). Bağımlılık audit kalan high/moderate bulguları ve eski unit/integration/E2E hataları açıkça kaydedilir. Fiziksel iPhone/Android, TestFlight/Play ve production API NOT VERIFIED. [GO/NO-GO](./m9-go-no-go.md): **A NO-GO, B NO-GO, C NO-GO**. Ürün sahibi adımları [v1-release-handoff](./v1-release-handoff.md).
