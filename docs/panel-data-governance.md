# Panel çocuk verisi, erişim ve saklama standardı

Bu belge Online Dershanem panelinin teknik güvenlik standardıdır. Hukuki saklama sürelerinin son onayı veri sorumlusu, hukuk danışmanı ve mali müşavir tarafından verilmelidir; aşağıdaki süreler ürünün veri minimizasyonu varsayımlarıdır.

## Sürekli yetkilendirme matrisi

Her istek aktif kullanıcı ve geçerli oturumla yeniden doğrulanır. Nesne sorguları kullanıcı rolü ve canlı ilişkiyi aynı `where` koşulunda uygular; yetkisiz nesne ile bulunmayan nesne aynı `404` yanıtını verir.

| Kaynak | Admin | Öğretmen | Öğrenci | Veli | Erişimi anında sonlandıran olay |
|---|---|---|---|---|---|
| Grup | Tümü | Güncel öğretmeni olduğu grup | Aktif kaydı olan grup | Bağlı öğrencisinin aktif kaydı olan grup | Öğretmen değişimi, `Enrollment.endedAt`, veli bağlantısının silinmesi |
| Ders/not | Tümü | Dersin atanmış öğretmeni | Kendi aktif grup/ders kapsamı | Bağlı öğrencinin aktif kapsamı | Ders öğretmeni veya üyelik değişimi, veli bağlantısının silinmesi |
| Ödev/ilerleme | Tümü | Güncel grup öğretmeni | Yalnız kendi ilerleme kaydı | Yalnız bağlı öğrenci | Üyelik veya veli bağlantısının sona ermesi |
| Deneme sonucu/hata nedeni | Tümü | Aktif grubundaki öğrenciler | Yalnız kendi kaydı | Yalnız bağlı öğrenci | Üyelik veya veli bağlantısının sona ermesi |
| Tekrar öğesi/çözüm notu | Tümü | Aktif grubundaki öğrenciye kaynak ekleme ve toplu gözetim | Yalnız kendi öğesini yanıtlama/erteleme | V1'de ayrıntı yok | Üyelik sona erince öğretmen yazma yetkisi biter; öğrenci kendi tarihsel kaydını korur |
| Sakin haftalık özet | Tümü | Aktif grubundaki öğrenci için taslak/önizleme/yayın | Yalnız kendi yayımlanmış sürümü | Yalnız bağlı öğrencinin yayımlanmış sürümü | Üyelik veya veli bağlantısı sona erince erişim biter; yetkisiz nesne `404` olur |
| Müdahale vakası/iç not | Tümü; operasyon denetimi | Aktif grubundaki vaka; başka sahibin kaydını salt okunur görür | Erişim yok | Erişim yok | Üyelik veya sahiplik değişince öğretmen yazma erişimi biter; yetkisiz nesne `404` olur |
| Telafi paketi/mini kontrol | Operasyon denetimi; V1'de içerik ekranı yok | Yalnız kendi tamamlanmış dersi ve aktif grup öğrencisi için taslak/yayın | Yalnız kendi yayımlanmış paketi ve öğe yanıtı | V1'de erişim yok | Ders öğretmeni veya aktif üyelik değişince öğretmen erişimi; kullanıcı/öğrenci ilişkisi değişince öğrenci erişimi biter |
| Ödev kanıtı/rubric | Operasyon denetimi; içerik değişikliği yok | Aktif grubundaki teslimi değerlendirir | Yalnız kendi attempt geçmişi ve geri bildirimi | V1'de ayrıntı yok | Öğretmen veya aktif üyelik değişince erişim biter; yetkisiz nesne `404` olur |
| Private materyal | Tümü | Güncel grup öğretmeni | Aktif grup kaydı | Bağlı öğrenci + aktif grup kaydı | Materyalin arşivlenmesi, üyelik/veli ilişkisinin sona ermesi |
| Bildirim/şablon | Rol kapsamı | Yalnız kendi kaydı | Yalnız kendi kaydı | Yalnız kendi kaydı | Oturum/kullanıcı iptali veya sahiplik değişimi |

Kurallar:

- `ParentStudent` silme işlemi, erişim iptali ve `relationship.access_revoked` audit kaydını tek transaction içinde yapar.
- Grup öğrenci ekleme, yeniden etkinleştirme ve çıkarma işlemleri `group.membership_access_changed` kaydı üretir.
- Askıya alınmış veli, öğrenci veya öğretmen yeni ilişkilere eklenemez; mevcut oturumlar her istekte aktif kullanıcı durumunu kontrol eder.
- Private Blob yolu istemciye kalıcı, herkese açık URL olarak verilmez. İndirme uygulama rotasından tekrar yetkilendirilir.
- Yetkisiz private materyal denemeleri, ham kullanıcı ve kaynak kimliği yerine tek yönlü kısa referanslarla structured log'a yazılır.

## Veri ve saklama matrisi

| Veri sınıfı | Amaç | Önerilen aktif saklama | Süre sonunda | Otomasyon durumu |
|---|---|---:|---|---|
| Oturum | Kimlik doğrulama ve cihaz iptali | Geçerlilik süresi; iptal sonrası en çok 30 gün | Kalıcı sil | Günlük cron etkin |
| Veli–öğrenci ilişkisi | Yetkili takip erişimi | İlişki sürdükçe | İlişkiyi sil, iptal kanıtını audit'te tut | Admin işlemi etkin |
| Grup üyeliği | Ders ve içerik erişimi | Eğitim ilişkisi sürdükçe | `endedAt` ile kapat; tarihsel akademik kanıtı koru | Admin işlemi etkin |
| Ders, yoklama, ödev, ilerleme | Eğitim hizmeti ve gelişim kanıtı | Sözleşme süresi + onaylı hukuki süre | Dışa aktar, ardından sil/anonymize kararı | Otomatik silme kapalı |
| Kazanım ve kanıt bağlantısı | Akademik gelişim ve sonraki öğretim kararı | Bağlı ders/ödevle aynı süre | Öğrenci talebi kapsamında dışa aktar/sil/anonymize | Otomatik silme kapalı |
| Ders kapanış sürümü ve idempotency özeti | Çift kayıt ve çoklu sekme çakışmasını önleme | Bağlı dersle aynı süre | Ders silme/talep akışıyla birlikte | Hash geri döndürülemez; ham not veya öğrenci listesi event'e yazılmaz |
| Plan tercihi, haftalık plan ve görev durumu | Öğrenci kapasitesine göre öğretmen onaylı çalışma önerisi | Aktif eğitim ilişkisi + akademik kayıt süresi | Öğrenci talebinde dışa aktar/sil; ilişki bitince öğretmen erişimi kesilir | Bunaltı pulse'u isteğe bağlı; veliye ayrıntılı görev gösterilmez |
| Haftalık özet, yayın sürümü ve kontrollü geri bildirim | Aile katılımını karşılaştırmasız ve eyleme dönük desteklemek | Aktif eğitim ilişkisi + akademik kayıt süresi | Öğrenci talebinde dışa aktar/sil; ilişki bitince öğretmen/veli erişimi kesilir | Özel öğretmen notları ve öğrenci pulse'ları girdi değildir; kaygı pulse'u isteğe bağlı, serbest metin yoktur |
| Müdahale vakası, sahiplik, sonuç ve iç aksiyon notu | Açıklanabilir akademik sinyali zamanında insan takibine dönüştürmek | Aktif eğitim ilişkisi + onaylı operasyon/audit süresi | Öğrenci talebinde insan incelemesiyle dışa aktar/sil/anonymize; serbest metinde üçüncü kişi verisi ayrıştırılır | Öğrenci/veliye gösterilmez; teşhis/risk puanı yok; iç not analytics'e kopyalanmaz; otomatik silme kapalı |
| Telafi paketi, öğe durumu ve mini kontrol | Kaçırılan dersin küçük ve sıralı 72 saatlik dönüşünü desteklemek | Bağlı ders/ödevle aynı akademik kayıt süresi | Öğrenci talebinde ders ve öğe bağlantılarıyla dışa aktar/sil/anonymize | Özel ders notu ve yoklama notu girdi değildir; kontrollü yanıt veliye ve analytics'te kimliğe bağlanarak gösterilmez |
| Ödev kanıtı, rubric ve revizyon geçmişi | Öğrenme ve geri bildirim döngüsünü korumak | Bağlı ödevle aynı akademik kayıt süresi | Bütün attempt ve geri bildirimlerle dışa aktar/sil/anonymize | Metin analytics'e kopyalanmaz; V1 dosya kabul etmez; otomatik silme kapalı |
| Deneme sonucu, süre ve hata nedeni | Kişi içi sınav eğilimi ve öğretmen müdahalesi | Sözleşme süresi + onaylı hukuki süre | Bölümler ve onaylı eylemle birlikte dışa aktar/sil/anonymize | Otomatik silme kapalı |
| Aralıklı tekrar öğesi, çözüm notu ve yanıt | Geri çağırma planı ve kalıcılık kanıtı | Bağlı akademik kanıtla aynı süre | Kaynak bağlantıları ve attempt geçmişiyle dışa aktar/sil/anonymize | Otomatik silme kapalı |
| Öğretmen ortak/özel notu | Eğitim takibi | Gerekli en kısa dönem | Serbest metin PII incelemesi sonrası sil/anonymize | Otomatik silme kapalı |
| Private PDF/MP4 | Eğitim içeriği | Aktif kullanım süresi | Önce arşivle; onaylı bekleme sonrası Blob'u sil | Arşivleme etkin, fiziksel silme kapalı |
| Bildirim | Operasyonel iletişim | Öneri: 12 ay | Kalıcı sil | Hukuki onay bekliyor |
| Audit kaydı | Erişim ve değişiklik kanıtı | Öneri: 24 ay | Güvenli sil veya yasal tutma | Hukuki onay bekliyor |
| Kimliksiz ürün event'i | UX ve iş SLO ölçümü | 90 gün | Kalıcı sil | Günlük cron etkin |
| Finansal kayıt | Muhasebe/yasal yükümlülük | İlgili mevzuatın zorunlu süresi | Hukuk/mali müşavir onayıyla sil | Panel retention cron'u dışında |
| Yedek | Felaket kurtarma | Mevcut döngü ve restore hedefi | Döngüsel sil; silme talebi tombstone'u restore sonrası yeniden uygula | Operasyon prosedürüne bağlı |

## Saklama motoru

Tablodaki süreler tek kaynaktan okunur: `lib/data-governance/retention-policy.ts`. Hukuki onay gelmeyen her kategori `PENDING_LEGAL_APPROVAL` değerindedir ve motor o kategoride hiçbir kayda dokunmaz, yalnız "N kayıt onay bekliyor, silinmedi" diye raporlar. Sayısal süre `approvedBy` + `approvedAt` olmadan geçersizdir.

- **Onay gelince:** ilgili kategoride `retentionDays`, `approvedBy`, `approvedAt` doldurulur. `retention-policy.test.ts` içindeki "hiçbir kategori sayısal süre taşımaz" testi bilerek kırılır; aynı PR onay kaydıyla birlikte günceller.
- **İki faz:** süresi dolan kayıt önce `retention_marks` ile işaretlenir (kayıt yerinde kalır), 30 günlük teknik bekleme (`RETENTION_GRACE_PERIOD_DAYS`, hukuki süre değil) sonunda tekrar doğrulanıp silinir. Bekleme içinde `released_at` doldurulursa silme durur. Arşivli materyalde Blob önce silinir.
- **Çalıştırma:** `.github/workflows/data-retention.yml` her gün `DRY_RUN=true` ile koşar ve raporu iş özetine yazar. Zamanlanmış koşu hiçbir zaman gerçek silme yapmaz. Gerçek silme yalnız elle tetiklemede `dry_run=false` + aktif admin e-postası + ticket ile açılır; silmeden önce `retention.enforcement_approved` audit kaydı yazılır.
- **Gerçek silmeyi etkinleştirmeden önce dry-run raporlarını hukuk/veri sorumlusuyla birlikte gözden geçirin.**
- Oturum ve ürün event'i temizliği mevcut `panel-session-retention` cron'unda kalır (30/90 gün teknik değerler; hukuki onay kaydı yok). İşletme CRM'i `BusinessUnit.retentionDays` (varsayılan 730) ile ayrı anonimleştirilir; bu varsayılan da hukuk onayına sunulmalıdır.

## Veri sahibi talebi ve silme iş akışı

**Komuttan önce, insan tarafından (otomatikleştirilmez):**

1. Talep sahibinin kimliği ve çocuk adına işlem yetkisi ikinci bir kanaldan doğrulanır; sonuç bir ticket'a kaydedilir (ticket'a ad/e-posta yazılmaz).
2. Aktif hukuki saklama yükümlülüğü ve üçüncü kişi verisi değerlendirilir; silme mi anonimleştirme mi uygulanacağına karar verilir.

**Tek komut** (`npm run data:dsr -- …`, onaylayan aktif bir ADMIN hesabı olmalı):

| Aksiyon | Komut | Etki |
|---|---|---|
| Döküm | `--action export --user-id <id> [--ticket <ref>] [--out f.json]` | İlişki grafiğindeki tüm tablolar JSON; kimlik doğrulama sırları hariç. `thirdPartyReviewRows > 0` tablolar teslimden önce elle ayıklanır. |
| Talep | `--action anonymize\|delete --user-id <id> --approved-by <admin> --ticket <ref>` | Tombstone `PENDING_GRACE`, hesap askıya, oturumlar iptal, audit. Geri alınabilir. |
| İptal | `--action cancel --request-id <id> --approved-by … --ticket …` | Bekleme içinde hesap durumu geri yüklenir. |
| Uygula | `--action apply --request-id <id> --approved-by … --ticket …` | 7 günlük teknik bekleme (`DSR_GRACE_PERIOD_DAYS`) sonrası geri alınamaz adım. Önce onay audit'i yazılır. |

`--approved-by` veya `--ticket` eksikse komut veritabanına bağlanmadan çıkış kodu 2 ile reddeder. `delete` silme engelleyici kayıt (ders, ödev, ODK denemesi vb.) bulursa `BLOCKED` olur ve sessizce anonimleştirmeye geçmez; karar yeniden verilir.

**Komuttan sonra, insan tarafından:** sonuç ve istisnalar sade dille bildirilir.

### Eski 7 adımın karşılığı

| Eski adım | Yeni karşılık | Kapsanan tablo/sistem |
|---|---|---|
| 1. Kimlik doğrulama | İnsan adımı (ticket) | — |
| 2. Audit ile talep açma | `anonymize/delete` | `data_subject_tombstones`, `AuditLog` (`dsr.erasure_requested`) |
| 3. Saklama yükümlülüğü/üçüncü kişi ayrıştırma | İnsan kararı + `BLOCKED` engelleyici kontrolü | `USER_DELETE_COUNT_SELECT` sayımları, FK `Restrict` |
| 4. Erişim dökümü | `export` | `users`, `student_profiles` ve User/StudentProfile'a FK taşıyan tüm modeller (şema ilişkilerinden otomatik; Cascade alt kayıtlarına 3 seviye), `AuditLog`, `business_leads` + konuşma/mesaj, tombstone |
| 5. Silme/anonymize; Blob, cache, raporlar | `apply` | Kimlik alanları, oturum/MFA/parola sıfırlama/bildirim silme, sahip olunan kayıtlarda serbest metin temizliği, CRM lead anonimleştirme; `delete` ile Cascade tüm öğrenci verisi |
| 6. Yedek tombstone | `npm run data:tombstones -- export/reapply` | Aşağıdaki restore bölümü |
| 7. Bildirim ve kapanış | İnsan adımı; `dsr.erasure_applied` audit | — |

**Kapsanmayanlar (sonraki adım):**

- Cache (Upstash) ve türetilmiş raporlar: TTL ile düşer ama talep bazlı temizlik yok.
- Private Blob: öğrenciye bağlı dosya yok (materyal grup/öğretmen kaydı). Öğrenci dosya yüklemesi eklenirse DSR'a eklenmeli.
- `AuditLog` satırları silinmez (payload'lar zaten redakte); audit'in DSR kapsamındaki durumu hukuk kararıdır.
- Finansal kayıtlar (`od_orders`, `odk_orders`, ödemeler): `delete` sonrası `SetNull` ile kişiden kopar ama satır kalır (yasal saklama). Sipariş üzerindeki fatura/iletişim alanları hukuk kararı olmadan anonimleştirilmez.
- CRM eşleşmesi yalnız `relatedOdUserId` ve normalize e-posta ile yapılır; yalnız telefonla eşleşen lead'ler kaçabilir.
- E-posta sağlayıcısı (Resend) ve WhatsApp gibi dış sistemlerdeki kopyalar.

## Yedek restore sonrası tombstone

Yedekler doğrudan değiştirilmez. Tombstone defteri dump'tan ayrı saklanır (`database-backup.yml` her gece şifreli `tombstone-ledger-*` artefaktı, 90 gün).

Restore runbook'u: restore bitince, restore anından **sonraki** en güncel defterle:

```bash
npm run data:tombstones -- reapply --ledger tombstone-ledger.json
```

Komut idempotenttir: uygulanmış talepleri yeniden uygular, bekleyen talepleri tekrar askıya alır, eksik tombstone satırlarını geri yazar. Saklama motorunun sildiği kayıtlar restore ile geri gelirse bir sonraki koşuda yeniden işaretlenir ve bekleme süresi yeniden başlar.

`database-backup.yml` içindeki `tombstone-restore-drill` işi her gece sentetik veriyle tatbikatı koşar: silmeden önce alınan yedek restore edilince öğrencinin geri geldiğini, defter uygulanınca yine silindiğini doğrular.

**Açık risk:** GitHub artefakt saklaması en çok 90 gündür. Daha eski bir yedek restore edilirse defter canlı veritabanından alınmalıdır. Canlı veritabanı da kayıpsa kalıcı, yedekten bağımsız bir defter deposu gerekir; bu bir karar bekliyor.

Kesin süre ve hukuki dayanak onaylanmadan geri döndürülemez toplu silme yapılmamalıdır.

## Hesap yaşam döngüsü operasyon notu

- `Yönetim > Eğitim > Öğrenciler` yalnız öğrenci hesaplarını gösterir; `Yönetim > Eğitim > Kişiler` tüm rollerde hesap operasyonu ve veri bütünlüğü kontrolü içindir.
- Hesap açma sonrası kullanıcıya geçici parola yerine tek kullanımlık davet bağlantısı üretilir; bağlantı WhatsApp mesajı veya kopyala akışıyla iletilir.
- Kalıcı silme denemesi öncesi sistem silme etkisini (bağlı geçmiş blokajları) hesaplar.
- Blokaj varsa kalıcı silme reddedilir; önerilen aksiyon önce arşivleme, gerekirse askıya almadır.
- Askıya alma ve arşivleme geri alınabilir güvenlik aksiyonlarıdır; kalıcı silme geri alınamaz.
- Kalıcı silme yalnız arşivli hesaplar için açılır; hard-delete blocker kontrolleri ayrıca korunur.

## Güvenlik regresyon kontrol listesi

- İkinci öğretmen başka öğretmenin dersini/notunu değiştiremez.
- Öğrenci başka öğrencinin ödev ilerlemesini güncelleyemez.
- Veli yalnız bağlı öğrenciyi seçebilir; bağlantı silindikten sonraki ilk istek erişimi reddeder.
- Sona ermiş grup kaydı öğrenci ve veliye materyal erişimi vermez.
- Arşivlenmiş veya başka gruba ait private dosya `404` döndürür.
- Askıya alınmış hesap mevcut cookie ile işlem yapamaz.
- Kimlik değiştiren parametrelerde nesne keşfini önleyen `404` korunur.
- Audit payload'ları ad, e-posta, telefon veya ders notu metni içermez.
