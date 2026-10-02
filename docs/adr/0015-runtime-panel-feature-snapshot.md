# 0015 — Panel özellikleri veritabanından, ortam üst sınırı altında okunur

| Durum | Tarih | Sahip |
| --- | --- | --- |
| Onay bekliyor | 2026-10-02 | Platform Engineering |

## Karar önerisi

- Mevcut Prisma/PostgreSQL kullanılır; yeni servis veya Edge Config bağımlılığı eklenmez.
- Yeni `runtimeFeatureFlags` özelliği varsayılan false olur. Bu okuma katmanı açılmadığında mevcut ortam davranışı sürer. Bir kez açıldıktan sonra özellik politikası değişiklikleri deployment gerektirmez.
- `PanelFeaturePolicy` global politika veya mevcut `PilotCohort` ilişkisi taşır. Global kayıt `enabled` ve `cohortOnly`, kohort kaydı `enabled` içerir; yeni kayıtlar false başlar. Özellik anahtarı mevcut tipli registry ile doğrulanır. Global kayıt yoksa mevcut ortam varsayılanı korunur.
- Sonuç daima `ortam üst sınırı AND global politika AND gerekiyorsa aktif kohort üyeliği/politikası` olur. Ortamda false olan özellik veritabanından açılamaz. Durdurulmuş kohort izin vermez. Ürün üyeliği, rol/ilişki guard'ları ve pilot erişim güvenlik kapısı aynen çalışır; politika erişim hakkı vermez.
- RSC'de istek içinde tek `React.cache` snapshot'ı kullanılır. `PanelShell` bu sonucu mevcut istemci provider'ına aktarır. Sayfa/API işlevleri aynı sunucu resolver'ına taşınır; saf ortam resolver'ı yalnız yapılandırma/test hesaplarında kalır. İstekler arasında cache yoktur; sonraki istekte DB değişikliği görülür. API bir işlemde snapshot'ı bir kez alır.
- Genel site ve kullanıcı bağlamı olmayan işler global snapshot kullanır. Kohortla sınırlı bir özellik için kullanıcı bağlamı olmayan okuma izin vermez; gerekli işler mevcut ilişkiyle bulduğu kullanıcı için açıkça snapshot alır. Yönetici özellik envanteri global politika ve ortam sınırını ayrıca gösterir.
- Politika değişikliği mevcut yönetici guard'ı ve mutation korumalarıyla, beklenen sürüm ve audit kaydıyla yapılır. Yeni kimlik/yetki sistemi kurulmaz. DB okuması başarısızsa runtime tarafından yönetilen özellikler false döner; sessizce ortam değerine dönüp kapatılmış bir özellik açılmaz.

## Doğrulama ve geri alma

Unit: ortam false sınırı, global kapatma, aktif/durdurulmuş kohort, eksik politika ve hata sonucu. Integration/E2E: canlı politika değişikliğinin sonraki istekte menü ve API'ye birlikte yansıması, başka kullanıcı/kohort kapsamı, sürüm çakışması ve audit.

Runtime katmanını devre dışı bırakmak ortam davranışına döndürür; bu yüzden acil kapatma önce ilgili `PANEL_FEATURE_*` üst sınırını false yaparak gerçekleştirilir. Eklemeli politika tablosu ve audit kayıtları geri almada korunur. Canlı ortam ayarları bu PR kapsamında değiştirilmez.

Bu ADR onaylanmadan runtime okuma katmanı uygulanmaz.
