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

## Veri sahibi talebi ve silme iş akışı

1. Talep sahibinin kimliği ve çocuk adına işlem yetkisi ikinci bir kanaldan doğrulanır.
2. Talep bir audit kaydıyla açılır; kapsam, teslim tarihi ve işlem sahibi belirlenir.
3. Aktif hukuki saklama yükümlülüğü ve başka kişilerin verileri ayrıştırılır. Silme mümkün değilse kısıtlama/anonymize gerekçesi kaydedilir.
4. Erişim dökümü hazırlanır; serbest metin notları başka çocuklara ait veri açısından incelenir.
5. Onaylı hedeflerde silme/anonymize uygulanır. Blob, cache ve türetilmiş raporlar ayrıca kontrol edilir.
6. Yedekler doğrudan değiştirilmez; kimlik bir tombstone listesine alınır ve her restore sonrasında yeniden uygulanır.
7. Sonuç ve istisnalar sade dille bildirilir; işlem audit kaydı kapatılır.

Bu fazda akademik veya finansal veriyi otomatik silen bir cron özellikle eklenmemiştir. Kesin süre ve hukuki dayanak onaylanmadan geri döndürülemez toplu silme yapılmamalıdır.

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
