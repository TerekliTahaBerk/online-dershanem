# M9 yayın kapısı kontrol listesi

Tarih: 10 Ekim 2026. Kapsam: Online Dershanem mobil 1.0.0.

| Kapı | Gereksinim | Durum / sahip |
| --- | --- | --- |
| A | M1–M7 korunur, M8 deferred, satış yok | Kod hazır; mevcut kontroller ve QA kaydı gerekir |
| A | EAS, güvenli API, release scan | Hazır; gerçek config/signing eksik |
| A | Hesap silme tamamlanabilir, kritik güvenlik kusurları kapanır | BLOCKED — lifecycle/hukuk; S-5 ve prod staff review |
| A | Root/mobile checks, export ve integration/E2E | m9-validation-results'te gerçek sonuçlar |
| B | Aynı SHA backend staging + signed build | BLOCKED — operasyon + hesap sahipleri |
| B | Sentetik reviewer hesapları ve physical smoke | NOT VERIFIED — QA |
| B | Push etkinse gerçek APNs/FCM delivery | NOT VERIFIED; push disabled kalır |
| B | Disclosure/listing drafts reviewed | BLOCKED — hukuk + ürün |
| C | Permanent Apple/Google identities, signing, app records | BLOCKED — ürün sahibi |
| C | Privacy, child data, retention, commerce classification | BLOCKED — hukuk/platform uzmanı |
| C | Account deletion uçtan uca kanıtı ve public URL | BLOCKED — backend + operasyon |
| C | Reviewer access ve screenshotlar | NOT VERIFIED — QA |
| C | Açık yayın onayı | Verilmedi; TestFlight/upload/Review/Play için ayrı açık onay |

## RC kayıt formu

Commit SHA __; git clean __; app version __; iOS buildNumber __; Android versionCode __; platform __; EAS build ID __; signing identity ref __; runtime fingerprint __; update channel/group __; EAS environment __; API origin __; backend deployment SHA __; migration ref __; validation evidence __; release reviewer __; tarih __; approval ticket __.

Sıra: code checks → onaylı uyumlu backend deploy → health/API/rol smoke → immutable native build → physical QA → onaylı internal submit → pilot → Gate C → açık publish onayı. GitHub pushes production build/upload/OTA başlatmaz.
