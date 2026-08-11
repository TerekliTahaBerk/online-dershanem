# Panel feature flag envanteri

Son doğrulama: **11 Ağustos 2026**. Kod envanterinin tek kaynağı
`lib/panel-feature-registry.ts`, canlı deployment görünümü ise admin panelindeki
`/panel/yonetim/ozellikler` sayfasıdır.

## Vercel Production ve Preview snapshot

Vercel projesi `online-dershanem` için Production ve Preview env'leri CLI ile
ayrı ayrı çekilip yalnız `PANEL_FEATURE_*`, `NEXT_PUBLIC_PANEL_FEATURE_*`,
`PANEL_ENABLED` ve eski public panel anahtarları filtrelenmiştir.

| Ortam | `PANEL_ENABLED` | `PANEL_FEATURE_*` | `NEXT_PUBLIC_PANEL_FEATURE_*` | Sonuç |
|---|---:|---|---|---|
| Production | `true` | Tanımlı değil | Tanımlı değil | Baseline metrics varsayılan açık; diğer 14 özellik kapalı |
| Preview | Tanımlı değil | Tanımlı değil | Tanımlı değil | Panel kapalı; baseline varsayılanı route açmaz |

Bu envanter secret değer içermez. Flag değişikliği Vercel'de yapıldıktan sonra
yeni deployment alınmalı ve admin snapshot'ı tekrar kontrol edilmelidir.

## Tek kaynak ve drift kararı

`NEXT_PUBLIC_PANEL_FEATURE_*` ailesi **deprecated** edilip kod, `.env.example`
ve CI workflow'larından kaldırıldı. `PanelShell`, `getPanelFeatureFlags()` ile
sunucuda çözdüğü typed snapshot'ı `PanelFeatureProvider` üzerinden `PanelNav`'a
aktarır. Böylece menü ile sayfa/API guard'larının farklı flag okuması yapısal
olarak engellenir. Eski public anahtar Vercel'e sonradan eklenirse canlı admin
snapshot'ında temizlik/drift uyarısı görünür; ürün davranışını değiştirmez.

`PANEL_ENABLED` de yalnız server/edge kapısıdır; eski
`NEXT_PUBLIC_PANEL_ENABLED` artık kullanılmaz. Production ve Preview'da ölü
public panel env değeri bulunmadığından Vercel tarafında silinecek mevcut değer
yoktur.

## Rollout envanteri

| Özellik | Statü | Sahip | Roller | Veri | E2E | Rollback |
|---|---|---|---|---|---|---|
| Baseline metrics | production-ready | Platform Engineering | Admin, Öğretmen | Event logları | panel events/unit + deneyim | `PANEL_FEATURE_BASELINE_METRICS=false` |
| Kazanım kanıtı | pilot | Akademik Operasyon | Tüm roller | 0045 | ders/gelişim/veli | Flag kapat; veriyi koru |
| Deneme analizi | pilot | Akademik Operasyon | Tüm roller | 0046 | öğrenci→öğretmen→veli | Flag kapat |
| Tekrar kuyruğu | pilot | Öğrenme Deneyimi | Öğretmen, Öğrenci | 0047 | akış + yetki | Flag kapat; kuyruğu koru |
| Hızlı ders kapanışı | pilot | Öğretmen Deneyimi | Öğretmen, Öğrenci | 0048 | dört öğrencili kapanış | Flag kapat; klasik akışa dön |
| Uyarlanabilir plan | pilot | Öğrenme Deneyimi | Öğretmen, Öğrenci | 0049 | üret/onay/geri bildirim | Flag kapat; geçmişi koru |
| Haftalık özet | pilot | Aile Deneyimi | Öğretmen, Öğrenci, Veli | 0050 | ortak yayın + yetki | Flag kapat; yayınları koru |
| Müdahale kutusu | pilot | Öğrenci Başarı Operasyonu | Admin, Öğretmen | 0051 | sahiplenme/sonuç/yetki | Flag ve gerekirse kuralı kapat |
| Telafi paketi | pilot | Öğrenci Başarı Operasyonu | Öğretmen, Öğrenci | 0052 | yayın/tamamlama/yetki | Flag kapat; paketleri koru |
| Kanıtlı ödev | pilot | Öğretmen Deneyimi | Öğretmen, Öğrenci | 0053 | iki deneme/rubric/yetki | Flag kapat; teslimleri koru |
| Check-in ve yardım | pilot | Öğrenci Başarı ve Güvenlik | Öğretmen, Öğrenci | 0054 | yardım + veli izolasyonu | Flag kapat; açık istekleri kapat |
| Erişilebilirlik profili | pilot | Erişilebilirlik | Tüm roller | 0055 | 320px/axe/rol sınırı | Flag kapat; tercihleri koru |
| Offline/düşük veri | experimental | Platform Engineering | Öğretmen, Öğrenci | 0056 + browser outbox | sync/conflict/cache | Flag kapat; outbox yazımını kes |
| Kohort kalitesi | experimental | Akademik Operasyon | Admin | Kazanım + deneme | bastırma/sıralamasız görünüm | Flag kapat |
| Öğretmen AI taslakları | experimental | AI Güvenliği + Öğretmen Deneyimi | Öğretmen | 0057 + provider kapıları | insan onayı/unit/eval | Önce dış aktarımı, sonra flag'i kapat |

Tam operasyon metadatası registry'de tutulur ve admin sayfasında doğrudan aynı
kayıttan render edilir. Şu anda ürün özelliği olarak `deprecated` statüsünde
flag yoktur. Deprecated temizlik kararı yalnız eski public flag ailesidir; yeni
özellik kaldırılırsa registry'de önce `deprecated` yapılmalı, sahibi ve veri
saklama/silme kararı kaydedilmeden env anahtarı silinmemelidir.

## Rollout kuralı

- `experimental`: Production'a açılmaz; yalnız kontrollü geliştirme/acceptance.
- `pilot`: Aktif pilot kohortu, SLO ve güvenlik kapılarıyla sınırlı açılır.
- `production-ready`: Genel erişime adaydır; owner rollback sorumluluğunu taşır.
- `deprecated`: Yeni aktivasyon yapılmaz; veri ve env temizliği planı uygulanır.

Bir flag'i açmadan önce ilgili migration/veri kapısı, E2E senaryosu ve rollback
adımı doğrulanır. Statü ile gerçek Açık/Kapalı değeri farklı kavramlardır:
`pilot` bir özellik kapalı olabilir; `experimental` bir özellik ise production'da
açık görünürse bu bir yayın hatasıdır ve hemen rollback edilir.
