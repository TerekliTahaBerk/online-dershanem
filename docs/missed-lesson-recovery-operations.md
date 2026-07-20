# Ders kaçırma sonrası telafi paketi işletim standardı

## Amaç ve sınır

Bu faz, tamamlanmış bir derse katılmayan veya mazeretli sayılan öğrencinin “nereden başlamalıyım?” yükünü azaltır. Paket borç listesi değildir; ders bitişinden sonraki 72 saat için küçük ve sıralı bir dönüş yoludur. V1 yapay zekâ kullanmaz ve veliye paket ayrıntısı göstermez.

## Deterministik içerik sözleşmesi

`recovery-v1` yalnız şu veriyi okuyabilir:

- öğrenciye özel olmayan ortak ders konusu ve sonraki hedef;
- derse bağlı en fazla üç aktif materyal;
- derse bağlı en fazla iki aktif ödev;
- sistemin kontrollü mini kontrol sorusu.

Öğrenciye özel `LessonNote.note`, `Attendance.note`, serbest metin öğrenci geri bildirimi, deneme metni, ödeme veya veli verisi hiçbir zaman girdi değildir. Öğretmen önizlemede öğrencinin göreceği tam sürümü görür. Yayından sonra paket değişmez; yeni bir ders kaydı otomatik olarak yayımlanmış paketi ezmez.

## Yaşam döngüsü

1. Tamamlanmış dersin `ABSENT` veya `EXCUSED` yoklaması öğretmen ekranına düşer.
2. Öğretmen taslağı üretir veya yayımlanmamış taslağı güncel ortak veriyle yeniler.
3. Öğretmen konu, küçük adım, öğe sırası, mini kontrol ve tam 72 saat hedefini önizler.
4. Sürüm eşleşiyorsa paket bir kez yayınlanır ve öğrenciye uygulama içi bildirim gider.
5. Öğrenci her öğeyi inceler ve kontrollü mini kontrol yanıtını verir. Tüm öğeler ile yanıt tamamlanınca paket `COMPLETED` olur.
6. Öğrencinin aktif, öğretmen onaylı haftalık planı varsa aynı gün/dakika/en fazla üç iş sınırlarıyla yeniden dengelenir. Eski açık görevler geçmiş izi olarak `SKIPPED` kalır.

## Yetki ve yatay erişim

- Üretim ve yayın yalnız dersin atanmış öğretmeni ile ders grubunda halen aktif kaydı bulunan öğrenci için yapılır.
- Öğrenci yalnız kendi kullanıcı hesabına bağlı yayımlanmış paketin öğesini veya mini kontrolünü günceller.
- Başka öğretmenin, başka öğrencinin veya sona ermiş üyeliğin nesnesi `404` döndürür; nesnenin varlığı açıklanmaz.
- Veli, paket öğeleri veya mini kontrol yanıtına V1'de erişemez.
- Private materyal bağlantısı paket içinde doğrudan Blob URL'si olmaz; mevcut her-istekte-yetkilendiren dosya rotası kullanılır.

## Ölçüm ve güvenlik

Ürün event'leri yalnız kural sürümü, öğe sayısı/türü, süre, 72 saat bandı ve kontrollü yanıt kodu taşır. Öğrenci/ders/materyal kimliği, başlık, URL, not veya soru metni kabul edilmez.

Pilot kapıları:

- öğretmen yayınlama p50 `≤24 saat`;
- en az 30 tamamlamada 72 saat içinde tamamlama `≥%60` başlangıç hedefi;
- özel ders notu ve yoklama notu sızıntısı `0`;
- yatay erişim ihlali `0`;
- plan yeniden dengelemesinde seçili günlük dakika veya üç görev sınırı ihlali `0`.

Tamamlama oranı öğrenci sıralaması, öğretmen performans puanı veya cezalandırıcı bildirim için kullanılmaz. Sonraki derse katılım etkisi yalnız yeterli örneklemli, kimliksiz kohort değerlendirmesinde incelenir.

## Rollout ve geri alma

1. `0052_missed_lesson_recovery` migration'ını uygulayın.
2. Sunucuda `PANEL_FEATURE_RECOVERY_PACKAGE=true`, build sırasında `NEXT_PUBLIC_PANEL_FEATURE_RECOVERY_PACKAGE=true` ayarlayın.
3. Önce iç hesaplarda özel/yoklama notunun taslakta görünmediğini, private materyal erişimini, 72 saat hesabını ve rol izolasyonunu doğrulayın.
4. Küçük öğretmen pilotunda SLO ve destek taleplerini en az iki hafta izleyin; yeterli veri oluşmadan yeşil karar vermeyin.
5. Güvenlik, içerik veya kapasite guardrail'i ihlalinde iki bayrağı kapatıp yeniden deploy edin. Mevcut paketler korunur; yeni üretim/yayın ve menü erişimi durur.

Migration geri alınmaz ve paketler toplu silinmez. Gerekirse feature flag kapalıyken insan incelemesiyle düzeltme yapılır; veri sahibi talebi akademik kayıt süreciyle birlikte yürütülür.
