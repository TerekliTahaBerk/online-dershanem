# Panel event, KPI ve iş SLO kataloğu

Bu katalog teknik uptime ile kullanıcı işinin gerçekten tamamlanmasını ayrı izler. `/api/health` altyapının ayakta olduğunu; aşağıdaki SLO'lar admin, öğretmen, öğrenci ve velinin kritik işlerini tamamlayabildiğini gösterir.

## Event sözleşmesi

`ProductEvent` kayıtları kullanıcı, öğrenci, grup, ders, ödev, deneme veya materyal kimliği taşımaz. Ad, e-posta, telefon, not/soru metni, ödev açıklaması ve URL kabul edilmez. Özellikler Zod allowlist'inden geçer; istemci yalnız allowlist'teki başlangıç/görünüm event'lerini gönderebilir, iş sonucu event'leri sunucuda üretilir.

| Event | Kaynak | Rol | Amaç |
|---|---|---|---|
| `lesson_close_started/completed/reopened` | İstemci | Öğretmen | Gerçek iki dakikalık kapanış süresi ve yeniden açma davranışı |
| `lesson_autosave_failed` | İstemci | Öğretmen | Kullanıcı tarafındaki kayıt sorunları |
| `lesson_notes_finished` | Sunucu | Öğretmen | Kayıt başarısı, süre ve tamamlanma niyeti |
| `admin_setup_finished` | Sunucu | Admin | Tek sihirbaz kurulum başarısı ve gecikmesi |
| `student_assignment_progress_finished` | Sunucu | Öğrenci | Ödev durumunun güvenilir kaydı |
| `parent_dashboard_loaded` | Sunucu render | Veli | Veli özetinin kullanılabilir yüklenme süresi |
| `mock_exam_entry_started/completed` | İstemci başlangıcı / sunucu sonucu | Admin, öğretmen, öğrenci | Deneme giriş süresi, kaynak ve neden kapsaması |
| `mock_exam_import_failed` | İstemci | Admin, öğretmen, öğrenci | Yapıştırma satır/biçim/toplam hataları |
| `odk_attempt_started/submitted` | Sunucu | Öğrenci | Kimliksiz sınav ailesi, geç giriş, teslim biçimi, cevap ve süre bantları |
| `odk_exam_scored/results_released` | Sunucu | Admin | Kimliksiz sınav ailesi ve katılım bandıyla puanlama/açıklama operasyonu |
| `error_reason_revised` | Sunucu | Admin, öğretmen, öğrenci | Kontrollü neden düzeltme sıklığı |
| `mock_heatmap_viewed` | İstemci | Dört rol | Kişi içi analiz görünümünün kullanımı |
| `review_items_created` | Sunucu | Admin, öğretmen, öğrenci | Deneme, ders veya öğretmen referansından üretilen toplu öğe sayısı |
| `review_item_answered/deferred` | Sunucu | Öğrenci | Basamak geçişi, geri çağırma yanıtı ve bir günlük erteleme |
| `review_queue_viewed` | İstemci | Öğrenci, öğretmen | Kimliksiz aktif/bekleyen sayı bantları |
| `lesson_close_quality/revised/conflict` | Sunucu | Öğretmen | Eksik alan, 24 saatlik düzeltme ve güvenli kayıt çakışması |
| `plan_generated/task_completed/change_requested/preference_updated` | Sunucu | Öğrenci | Kural çıktısı, uygulama, geri bildirim ve kapasite guardrail'i |
| `plan_review_completed` | İstemci | Öğretmen | Kimliksiz plan inceleme süresi ve onay |
| `weekly_digest_generated/published` | Sunucu | Öğretmen | Kural sürümü, eğilim bandı ve alıcı büyüklük bandı |
| `weekly_digest_viewed/feedback` | Sunucu render / sunucu | Öğrenci, veli | Görüntüleme, yararlılık ve isteğe bağlı kaygı pulse'u |
| `weekly_digest_preference_updated` | Sunucu | Öğrenci, veli, öğretmen, admin | Bildirim opt-out ve kanal tercih eğilimi |
| `case_rule_triggered/opened/assigned` | Sunucu | Admin, öğretmen | Kural sürümü/nedeni, kimliksiz açık-SLA bantları ve sahiplik |
| `intervention_logged` | Sunucu | Admin, öğretmen | Kontrollü aksiyon, ilk aksiyona süre ve SLA içinde olma |
| `case_snoozed/closed/false_positive` | Sunucu | Admin, öğretmen | Bekletme aralığı, kontrollü sonuç ve yanlış işaret geri bildirimi |
| `recovery_package_generated/published/viewed` | Sunucu | Öğretmen, öğrenci | Kural sürümü, öğe sayısı, yayın gecikmesi ve ilk görüntüleme |
| `recovery_item_completed/checkpoint_submitted/package_completed` | Sunucu | Öğrenci | Öğe türü, kontrollü yanıt ve 72 saat içinde tamamlama |
| `assignment_evidence_submitted/review_completed` | Sunucu | Öğrenci, öğretmen | Deneme/karakter bandı, geri bildirim süresi ve kontrollü karar |
| `accessibility_preferences_updated` | Sunucu | Dört rol | Kimliksiz tercih türü sayısı ve kayıt başarısı |
| `academic_accommodation_updated` | Sunucu | Admin | Tanı/gerekçe olmadan kontrollü ek süre ve mola ayarı |
| `network_preferences_updated` | Sunucu | Dört rol | Düşük veri ve açık rızalı cihaz kuyruğu tercihleri |
| `offline_write_queued/synced/conflicted` | İstemci | Öğretmen, öğrenci | Kimliksiz işlem türü, boyut/yaş/deneme bandı ve çatışma sonucu |

Sunucu operasyonlarında sonuç sınıfları:

- `success`: İş ve kalıcı veri yazımı tamamlandı.
- `validation`: İstek biçimi veya seçimi geçersizdi.
- `rejected`: Rate limit, nesne kapsamı veya ilişki kontrolü reddetti.
- `system_error`: Geçerli iş sistem/DB hatasıyla tamamlanamadı.

## SLO'lar

| SLI | Hedef | Pencere | Minimum örnek | Alarm önerisi |
|---|---:|---:|---:|---|
| Ders kapanışı istemci p50 | ≤ 120 sn | 30 gün | 5 | İki ardışık günlük kontrolde hedef dışı |
| Ders kapanışı istemci p90 | ≤ 240 sn | 30 gün | 5 | İki ardışık günlük kontrolde hedef dışı |
| 24 saatte kapanış düzeltme | < %10 | 30 gün | 5 kapanış | İki ardışık haftada hedef dışı |
| Eksik yapılandırılmış kapanış | < %2 | 30 gün | 5 kapanış | Her haftalık kontrolde hedef dışı |
| Ders notu kayıt başarısı | ≥ %99,5 | 30 gün | 5 | 24 saatte ≥10 örnek ve <%99 |
| Öğrenci ödev ilerleme kayıt başarısı | ≥ %99,5 | 30 gün | 5 | 24 saatte ≥10 örnek ve <%99 |
| Admin grup kurulum başarısı | ≥ %99 | 30 gün | 5 | Her `system_error`; veya ≥5 örnekte <%95 |
| Veli özeti sunucu p90 | ≤ 1,5 sn | 30 gün | 5 | İki ardışık günlük kontrolde >2 sn |
| Deneme girişi p50 | ≤ 180 sn | 30 gün | 5 | İki ardışık günlük kontrolde >180 sn |
| Hata nedeni kapsaması | ≥ %50 | 30 gün | 5 | En az 30 kayıtta <%50 |
| 7 gün içinde yeniden çözüm | ≥ %60 | 30 gün | 30 uygun öğe | İki ardışık haftada hedef dışı |
| 30 günlük doğru geri çağırma | Pilot baz çizgisine göre artış | 30–90 gün | 30 adet 30 günlük attempt | Düşüşte algoritma ve içerik kalitesini incele |
| Haftalık plan kabulü | ≥ %65 | 30 gün | 30 plan | İki ardışık haftada hedef dışı |
| Öğretmen plan inceleme p50 | < 120 sn | 30 gün | 5 inceleme | İki ardışık günlük kontrolde hedef dışı |
| “Plan fazla geliyor” pulse'u | Pilot baz çizgisine göre artmamalı | 30–90 gün | 30 gönüllü yanıt | Artışta varsayılan kapasiteyi düşür |
| Haftalık özet görüntüleme | ≥ %50 | 30 gün | 30 yayın | İki ardışık haftada hedef dışıysa teslimat ve değer önerisini incele |
| “Özet kaygı yarattı” pulse'u | ≤ %10 | 30–90 gün | 30 gönüllü yanıt | Hedef aşılırsa rollout'u büyütme; dil ve veri seçimini incele |
| Haftalık özet opt-out | ≤ %15 | 30 gün | 30 tercih değişikliği | Hedef aşılırsa sıklık, kanal ve beklenti metnini incele |
| İlk insan müdahalesi p50 | ≤ 24 saat | 30 gün | 30 ilk aksiyon | İki ardışık günlük kontrolde hedef dışıysa sahiplik ve kapasiteyi incele |
| Müdahale yanlış işaret oranı | ≤ %15 başlangıç guardrail'i | 30–90 gün | 30 kapanış kararı | Eşik aşılırsa ilgili kuralı kapat veya eşiği yükselt; daha fazla veri toplamak için rollout büyütme |
| Müdahalenin sonuçla kapanması | ≥ %60 | 30 gün | 30 üretilen vaka | Sahipsiz/bekletilmiş kayıt ve iş yükünü incele; kişiye performans puanı verme |
| Telafi paketi yayınlama p50 | ≤ 24 saat | 30 gün | 5 yayın | İki ardışık günlük kontrolde hedef dışıysa öğretmen akışı ve bildirim görünürlüğünü incele |
| Telafiyi 72 saatte tamamlama | ≥ %60 başlangıç hedefi | 30 gün | 30 tamamlanan paket | Hedef dışıysa öğe sayısı, kaynak erişimi ve plan kapasitesini incele; öğrenciye baskı veya seri ekleme |
| Kanıtlı ödev geri bildirimi p50 | ≤ 48 saat | 30 gün | 30 değerlendirme | Rubric uzunluğu ve öğretmen kuyruğunu incele |
| Yeniden deneme onayı | ≥ %60 başlangıç hedefi | 30–90 gün | 30 revize deneme | Geri bildirim açıklığını incele; öğrenciyi puanlama veya utandırma |
| Offline eşitleme başarısı | ≥ %99 | 30 gün | 30 sonuçlanan kuyruk | Altında rollout'u büyütme; tarayıcı/ağ ve işlem türü kırılımını incele |
| Offline çatışma oranı | < %2 | 30 gün | 30 sonuçlanan kuyruk | Sürüm sözleşmesi ve çoklu sekme davranışını incele; otomatik ezme ekleme |
| Offline kayıt sona ermesi | < %0,5 | 30 gün | 30 kuyruğa alınan işlem | 24 saat sınırını büyütmeden önce bağlantı geri dönüşü ve kullanıcı uyarısını incele |

Başarı oranı bütün kimliği doğrulanmış operasyon sonuçları üzerinden hesaplanır. Bu nedenle UX doğrulama sorunları da ürün kalitesinin parçasıdır; yalnız HTTP 5xx oranına bakılmaz. Güvenlik amaçlı reddedilen kötüye kullanım artarsa ürün SLO'sundan ayrıca güvenlik loglarıyla ayrıştırılır.

## Yorumlama ve karar kuralları

- Beşten az örnekte yeşil/kırmızı karar verilmez; admin ekranı “Veri bekleniyor” gösterir.
- Yüzdeler kullanıcı veya öğretmen sıralaması için kullanılmaz. Bireysel performans puanı üretilmez.
- Event kaybı kullanıcı işini başarısız yapmaz; telemetri yazımı non-throwing'dir. Event persistence hataları `product.event_persist_failed` structured log'uyla izlenir.
- SLO ihlali önce rol, event sonucu ve zaman aralığına göre incelenir. Kimliksiz event deposundan kişiye geri çözüm yapılmaz.
- `ProductEvent` kayıtları 90 gün sonunda günlük retention işiyle silinir. Uzun dönem trend gerekiyorsa yalnız toplu haftalık oranlar dış sisteme aktarılmalıdır.

## Kademeli yayın kapısı

Yeni ürün fazında ilgili kritik yol için en az 30 başarılı pilot örneği, `system_error=0` ve tanımlı SLO'nun hedefte olması beklenir. Hedef dışındaysa feature flag büyütülmez; kök neden, düzeltme ve tekrar ölçüm kayda alınır.
