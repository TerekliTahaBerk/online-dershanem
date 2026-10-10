# Online Dershanem V1.0 release handoff

Tarih: 10 Ekim 2026. Kapsam: Online Dershanem mobil 1.0.0.

## Teslim sınırı

M1–M7 korunur, M8 DEFERRED / NOT REQUIRED FOR V1.0. M9 yerel release engineering teslimidir; App Store/Play ready veya yayınlandı iddiası yok. Mobilde PAYTR/satış/IAP/abonelik checkout/harici satın alma CTA yok. Web ödeme sistemi ayrı kalır.

Dal `test/m9-mobile-release-readiness`; baz `2c8c0995`. Final commit `git log -1 --format=%H`. [Rapor](./m9-implementation-report.md), [denetim](./m9-release-audit.md), [gerçek validation](./m9-validation-results.md), [release kapıları](./m9-go-no-go.md).

## Ürün sahibinin sıradaki adımları

1. **Hesap/kimlik:** [credentials checklist](./m9-credentials-checklist.md) gerçek EAS proje/owner, iOS bundle/Apple Team/ASC, Android package/Play ve signing sahiplerini atayın. Hiçbir secret Git'e gönderilmez.
2. **Ortam:** Operasyon izole staging origin/DB ve onaylı production origin sağlar; EAS environment'ları [config rehberine](./m9-eas-configuration.md) göre doldurur. M1–M7 main'de olsa da production deploy ayrıca kanıtlanır. Backend deploy için onay gereklidir.
3. **Yayın engelleri:** Backend/hukuk self-service deletion + retention ve parent yetki sürecini tamamlar; [privacy](./m9-privacy-disclosures.md), [child data](./m9-child-data-review.md), [commerce](./m9-commerce-policy-review.md) kararları onaylanır. Güvenlik kalan 69 audit bulgusunu değerlendirir; staff assignment mode ve native permission çıktıları doğrulanır.
4. **Code gate:** Mevcut validation hataları triage edilir; S-1/S-5/M4 düzeltmeleri gerçek enforce/yayın kapısı senaryolarında kanıtlanır. M6 P-4 ve S-6/S-7 için ürün/güvenlik kararı yazılır. Yeni otomatik test talimatı olmadan test eklenmez.
5. **Cihaz pilotu:** Sentetik reviewer/test hesaplarını oluşturun; [iOS build](./m9-ios-build-guide.md), [iPhone smoke](./m9-iphone-smoke-checklist.md) ve [QA matrix](./m9-release-qa.md) doldurulur. Android fiziksel QA da gerekir. Push kapalı kalır; ayrı APNs/FCM kanıtıyla ve onayla açılır.
6. **Internal distribution:** Immutable build/commit/backend metadata kaydedilir. Açık onaydan sonra [TestFlight](./m9-testflight-guide.md) ve [Play internal](./m9-android-release-guide.md) upload yapılır. Build onayı store submission onayı değildir.
7. **Public release:** TR [listing](./m9-store-listing-tr.md) ve gerçek [screenshots](./m9-screenshot-manifest.md) onaylanır; Gate C checklist tamamlanır. App Review ve Play public publish ayrı açık onay ister. [Monitoring/rollback](./m9-monitoring-runbook.md) operatörü atanır.

Şu an Gate A/B/C: **NO-GO**. İmzalı IPA/AAB, physical evidence, EAS build ID veya store kayıtları bu görevde üretilmedi. Merge/deploy/OTA/submit/publish yapılmadı. Devam işi release blockers kapsamındadır; M8 veya yeni ödeme özelliği değildir.
