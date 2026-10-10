# M9 GO / NO-GO

Tarih: 10 Ekim 2026. Kapsam: Online Dershanem mobil 1.0.0.

| Kapı | Karar | Gerekçe |
| --- | --- | --- |
| Gate A — CODE READY | **NO-GO** | Store-compliant hesap silme tamamlanmadı; external/env validation, personel güvenlik açık kararları ve bilinen kırmızı kontroller var. Yerel release altyapısı hazır olması kapıyı geçirmez. |
| Gate B — INTERNAL TEST READY | **NO-GO** | Signed build/staging uyumu, demo hesap ve gerçek cihaz evidence yok. |
| Gate C — PUBLIC STORE RELEASE READY | **NO-GO** | Apple/Play/EAS kimlikleri, hukuki beyanlar, commerce sınıflandırması, silme kanıtı, ekran görüntüleri ve açık yayın onayı eksik. |

## Açık engel / sahip / kapatma

- **Ürün sahibi:** gerçek iOS/Android IDs, EAS owner/project, Apple/Play app records, hesap erişimleri.
- **Operasyon:** isolated staging ve prod API originleri; deployed backend SHA ve migration uyumu; staff mode/assignment verisi. Push kapalı kalır.
- **Backend + hukuk:** mevcut DSR architecture üzerinde self-service initiation/confirmation, retention ve parent-child policy; destek süreci ve public deletion URL canlı doğrulaması.
- **Güvenlik:** S-1/M4 düzeltmelerinin HTTP/SSR kanıtı; S-5 web private note düzeltmesinin kanıtı ve staff enforce kararının kapanması. P-4/S-6/S-7 kabul/düzeltme kararı kaydedilir.
- **Hukuk + platform uzmanı:** çocuk/audience, resmî controller/provider/transfer/retention ve Apple/Play ücretli erişim sınıflandırması. Mobil satış eklenmeyecek.
- **QA/tasarım:** imzalı iPhone/Android kabul testleri, sentetik store screenshot, adaptive icon maskesi/mono teslimi.
- **Release operatörü:** m9-validation-results'teki başarısız/doğrulanmamış kontrolleri kapanış kanıtıyla yeniler; native build/submit/publish için açık onay alır.

NO-GO uygulamanın yayımlandığı veya yarım kalan kontrollerin geçtiği anlamına gelmez. Yerel uygulama çıktıları review için hazırdır; mağaza onayı ve yayın ayrı aşamalardır.
