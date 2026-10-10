# M6 gizlilik incelemesi — Veli deneyimi

**Yöntem:** kod incelemesi (sorgu sınırında alan seçimi), mobil paket taraması ve geçici, commit'lenmeyen bir HTTP probe'u ([m6-validation-results.md](./m6-validation-results.md)).

**Yapılmayanlar:** bağımsız sızma testi ve gerçek cihaz testi.

## 1. Veliye ASLA gitmeyenler → nerede engellendiği

| Veri | Engel (sunucu) | Doğrulama |
| --- | --- | --- |
| Öğretmenin öğrenciye özel ders notu | `loadParentLessons`: `notes: { where: { studentId: null }, select: { topic } }`. Not gövdesi de seçilmez | Probe 18 |
| Koç iç notu / öğrenciye özel koç notu | `coachNote` sorgusu `visibility: "PARENT_VISIBLE"` | Probe 19 |
| Koç oturum özel notu | `getStudentCoaching` `privateNote` seçmez | Kod |
| Taslak plan | `weeklyPlan` `status: "APPROVED"` + `productRef.code: "OK"` | Probe 20 |
| Öğrenci görev notu, enerji / zorluk girdisi | Plan görev alanları daraltılmış (`studentNote` yok) | Probe 21 |
| Ham check-in, risk skoru, müdahale verisi | Hiçbir veli yükleyicisi okumaz. `parent_calm` `riskHint`'i siler | Kod + paket taraması |
| Taslak haftalık özet | `status: "PUBLISHED"` | Probe 25 |
| Başka çocuğun özetine geri bildirim | Mevcut uç: özet + aktif akademik bağlantı | Probe 26 |
| Yayınlanmamış / gizli ODK skoru, yayın öncesi sonuç | `getOdkAudienceStudentReport`: `publicationStatus = PUBLISHED` + `contractResultAvailable` | Kod (M4 / M5 kuralları) |
| `parentReports` hakkı olmayan rapor | `contractAllowsReport(contract, "PARENT")` | Probe 22 |
| İptal edilmiş ODK hakkı | `listActiveOdkContracts` | Probe 24 |
| Bütünlük (integrity) sinyali | Veli izleyicide `integrityNotice = null`; DTO'da alan yok | Probe |
| Doğru cevap / cevap anahtarı içeriği | Rapor DTO'sunda yok | Probe |
| Başka öğrencinin sonucu, akran sıralaması | Rapor yalnız çözümlenmiş çocuğun `User.id`'si; karşılaştırma kendi denemeleriyle | Kod |
| Personel e-postası / telefonu | Projeksiyonlarda maskeleme; teacher DTO'da alan yok | Probe |
| Koçluk görüşme bağlantısı (Meet) | Mobil DTO'da `meetingUrl` yok | Probe |
| Sipariş, tutar, ödeme | Hesap DTO'sunda yok (MD-09) | Probe 7 |
| KPSS ürün bağlamı | `parentVisibleProducts` / `isStudentParentVisible` | Probe 13–14 |

## 2. Veliye görünen kişisel veriler (bilinçli)

| Görünen veri | Açıklama |
| --- | --- |
| Çocuğun adı | `fullName`; yoksa e-postası (mevcut `listParentVisibleChildren` davranışı) |
| Akademik özetler | Ders katılımı, ödev durumu, deneme netleri, kazanım doğruluk oranları |
| Koçun paylaştıkları | Veliye açık not, yayınlanmış özet, hedef ilerlemesi |
| Öğretmen bilgisi | Öğretmen / koç adı ve öğretmen biyografisi |
| Veli hesabı | Velinin kendi adı ve e-postası (hesap ekranı) |

## 3. Cihazda saklama

- Veli yanıtları yalnız TanStack Query **belleğinde** tutulur; diskte kalıcı önbellek yoktur (M1 kararı).
- Seçili çocuk kimliği bellekte tutulur.
- Çıkışta `queryClient.clear()` çalışır. Çocuk değişince önceki çocuğun sorguları silinir. Erişim düşünce o çocuğun sorguları silinir.
- Deneme Ligi raporu için `gcTime` 5 dk (kullanılmayan hassas sonuç bellekte daha kısa kalır).

## 4. Loglama

Yeni uçlar çocuk adı, akademik sonuç veya not loglamaz. Haftalık özet görüntüleme olayı (`weekly_digest_viewed`) web ile aynı kimliksiz alanları kaydeder: `actorRole`, `trendBand`, `ageBand`.

## 5. Kilit ekranı / push

Push yükü M5'teki gibi yalnız `notificationId` taşır; veli bildirimi çocuk adı veya kimliği içermez. Çocuk, açılışta kimlikli bildirim kaydından çözülür ve yeniden doğrulanır.

## 6. Açık maddeler

- **P-1 (BLOCKED):** Yalnız OK / ODK velisi için özet geri bildirim yetkisi. Ürün / güvenlik kararı gerekir.
- **P-4:** Ana sayfa plan yüzdesi taslak plan görev sayısını içerebilir. Yalnız sayı gösteriliyor; içerik sızmıyor.
- **Ad yerine e-posta:** Çocuğun adı yoksa e-postası görünür (mevcut davranış).
- **KVKK:** Veli mobil kanalının aydınlatma metnine eklenmesi hukuk onayı gerektirir.
