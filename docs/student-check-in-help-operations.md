# Öğrenci check-in ve yardım isteği işletim standardı

## Ürün ve güvenlik sınırı

Bu özellik psikolojik değerlendirme, tanı, duygu analizi veya otomatik risk puanı değildir. Öğrenci haftada en fazla iki kez yalnız kontrollü enerji, çalışma güveni ve engel seçeneklerini işaretler. Serbest metin alınmaz. Öğrenci açıkça “Öğretmenim görsün” demedikçe check-in yalnız kendisine görünür. Veli ve admin check-in içeriğini hiçbir uçtan göremez.

Yardım istenirse paylaşım zorunlu olur ve istek yalnız seçilen aktif grubun öğretmenine yönlenir. Check-in verisi otomatik müdahale vakası oluşturmaz; mevcut müdahale kurallarıyla birleştirilmez ve yapay zekâya gönderilmez.

## Acil durum sınırı

Öğrenci ekranı bu alanın acil yardım hattı olmadığını açıklar. Kendine veya başkasına zarar riski için 112 ve güvenilen bir yetişkine hemen ulaşma yönlendirmesi gösterilir. Sistem serbest metin almadığı ve sürekli izleme yapmadığı için kriz tespiti yaptığı izlenimini vermez.

## Erişim ve yaşam döngüsü

- Öğrenci yalnız aktif kaydı bulunan gruba check-in gönderebilir ve yalnız kendi geçmişini görür.
- Öğretmen yalnız sahibi olduğu aktif gruba ait, öğrenci tarafından paylaşılmış istekleri görür ve yanıtlar. Yanıt anında aynı gruptaki aktif kayıt tekrar doğrulanır.
- Aynı öğrenci/grup için geri bildirimi tamamlanmamış tek yardım isteği olabilir.
- Öğretmen serbest metin yerine altı kontrollü destek adımından birini seçer. Önceki adımlar değiştirilemez yanıt geçmişinde korunur.
- Öğrenci “İşime yaradı” derse istek kapanır; “Henüz değil” derse yeni 24 saat hedefiyle tekrar açılır.
- Veli rotası, sorgusu, bildirimi ve özet alanı yoktur.

## Pilot, SLO ve durdurma kapıları

`0054_student_check_in_help` migration'ından sonra `PANEL_FEATURE_STUDENT_CHECK_IN=true` açılır; menü ve sunucu aynı snapshot'ı kullanır. Önce 1–2 öğretmen grubunda dört hafta pilot yapılır.

İzlenecek PII içermeyen metrikler: haftalık check-in sayısı, yardım isteme oranı, ilk yanıt p50, 24 saatte yanıt oranı ve öğrenci faydalılık oranı. İlk yanıt p50 hedefi 24 saat veya altı, 24 saatte yanıt hedefi en az %90, faydalılık başlangıç guardrail'i en az %60'tır. Beşten az örneklem karar üretmez.

Şu durumlardan birinde bayraklar hemen kapatılır: veli/admin veri sızıntısı, yatay erişim, özel check-in'in öğretmene görünmesi, serbest metin eklenmesi, yardım isteğinin otomatik risk etiketine dönüşmesi veya 24 saat yanıt oranının iki hafta üst üste %70 altına inmesi. Bayrak kapatıldığında veri silinmez; açık istekler operasyonel olarak öğretmenlerle kapatılır.

## Veri minimizasyonu ve saklama

Ürün eventleri kullanıcı/grup/check-in kimliği veya içerik taşımaz; yalnız kontrollü enum ve toplu sayaçlar kaydedilir. Audit kaydı paylaşım ve yardım seçimini içerir, enerji/güven/engel içeriğini kopyalamaz. Pilot sonunda check-in içerikleri için 90 günlük saklama ve ardından silme/anonymizasyon işi ayrıca devreye alınmadan geniş rollout yapılmaz.

## Koçum ürünüyle, grubu olmayan öğrenci

`0110_coaching_experience` sonrasında aktif grup kaydı bulunmayan, aktif OK erişimi olan öğrenci mevcut check-in ekranından aktif koç atamasını destek alanı olarak seçebilir. Sahte grup oluşturulmaz: kayıt yalnız gerçek `CoachAssignment` ilişkisine bağlanır. Paylaşılmamış içerik yine yalnız öğrenciye görünür; yardım isteği paylaşımı zorunlu kılar ve yalnız atanmış koçun yardım kutusuna gider. Koç değişmiş veya atama sona ermişse eski koç okuyamaz/yanıtlayamaz. Öğrenci geri bildirimi de aktif OK ürün kapısından geçer.

Grup yolunda mevcut OD kapısı ve aktif grup kaydı devam eder. İki destek hedefi aynı istekte seçilemez. Haftada iki check-in sınırı iki yolu birlikte sayar; bir koç atamasında tek açık yardım isteği vardır. Veli/admin ham içerik uçları eklenmez; saklama ve kriz sınırları değişmez. Koçluk ataması hedefi veritabanında FK ve tek hedef CHECK kısıtıyla doğrulanır.
