# Aralıklı tekrar kuyruğu — ürün ve operasyon standardı

## Eğitim modeli

Kuyruk bir puan veya ceza sistemi değildir. Deneme bölümünde yanlış bulunan kayıtlar ile öğretmenin `NEEDS_REVIEW` işaretlediği kazanımlar kaynak olur. Öğretmen ayrıca kendi materyalinden yalnız kitap/föy/sayfa/soru referansı ekleyebilir; telifli soru metni veya görseli kopyalanmaz.

İlk dönüş kaynak tarihinden bir gün sonra planlanır. Öğrenci yanıtı deterministik olarak işlenir:

| Yanıt | Sonuç |
|---|---|
| Doğru hatırladım | Sıradaki 3–7–14–30 gün basamağına geçer; 30 günlük doğru dönüşte tamamlanır |
| Emin değilim | Bir önceki, daha yakın basamağa döner |
| Henüz oturmadı | Bir gün sonrasına döner |

Yanıt geçmişi silinmez; “sıfırlandı”, “seri bozuldu” veya başarısızlık puanı üretilmez. Öğrenciye günde en fazla beş öğe gösterilir. “Bugün ertele” aynı öğe için İstanbul takvim gününde bir kez kullanılabilir ve öğeyi bir gün taşır.

## Kaynak üretimi ve idempotency

- `MOCK_EXAM_SECTION`: Deneme kaydı oluşturulurken yanlışı bulunan her bölüm için en fazla bir öğe. `mockExamSectionId` veritabanında unique'tir.
- `LESSON_OUTCOME`: Tamamlanan derste katılan/geç kalan öğrenci ile `NEEDS_REVIEW` kazanımı birleşimi. `(studentId, lessonId, outcomeId)` unique'tir.
- `TEACHER_REFERENCE`: Güncel grup öğretmeninin açıkça eklediği erişilebilir kaynak referansı.
- Her yanıt `reviewItemId + idempotencyKey` unique kuralıyla çift yazımdan korunur.

## İnsan gözetimi ve güvenli dil

Öğretmen ekranı öğrenci sıralamaz. Yalnız aktif kuyruk 20'yi, günlük bekleyen 5'i aştığında veya aynı öğede son 30 günde en az üç `WRONG/UNSURE` yanıtı olduğunda “İnsan bakışı gerekli” sinyali verir. Bu sinyal tanı, risk puanı veya otomatik yaptırım değildir.

Veliye ayrıntılı yanlış kuyruğu gösterilmez. Aşama 8'deki sakin haftalık özet tasarlanırken yalnız eyleme dönük, karşılaştırmasız bir özet ayrıca değerlendirilecektir. V1 otomatik tekrar bildirimi göndermez; böylece bildirim baskısı ve opt-out riski oluşmadan gerçek kullanım baz çizgisi toplanır.

## Veri güvenliği ve saklama

Çözüm notu hassas akademik serbest metindir; en fazla 500 karakterdir ve ürün event'ine alınmaz. Event'ler yalnız kaynak türü, yanıt sınıfı, basamak, aralık ve toplu sayı bandı taşır. Öğrenci yalnız kendi öğesini yanıtlar/erteler; öğretmen yalnız aktif grubundaki öğrenciye kaynak ekler. Yetkisiz nesne `404` döner.

Tekrar öğeleri ve yanıt geçmişi ders/ödev/deneme kanıtıyla aynı onaylı hukuki süreye tabidir. Otomatik retention kapalıdır. Veri sahibi dışa aktarma/silme talebinde öğe, çözüm notu, attempt geçmişi ve kaynak bağlantıları birlikte ele alınır.

## Rollout ve başarı kapıları

1. `0047_spaced_review_queue` migration'ını uygulayın.
2. Sunucuda `PANEL_FEATURE_REVIEW_QUEUE=true`, build sırasında `NEXT_PUBLIC_PANEL_FEATURE_REVIEW_QUEUE=true` değerlerini birlikte açın.
3. Önce küçük pilotta en az 30 uygun öğe ve 30 yanıt toplayın.
4. 7 gün içinde en az bir yeniden çözüm oranı ≥%60 olmalıdır.
5. 30 günlük basamak için yeterli örnek oluşmadan “kalıcılık arttı” kararı verilmez; baz çizgi ve doğru geri çağırma oranı birlikte raporlanır.
6. Aktif kuyruk büyümesi, erteleme oranı, yetkisiz erişim ve öğretmen iş yükü haftalık incelenir.
