# Açıklanabilir müdahale gelen kutusu işletim standardı

Bu özellik akademik ve operasyonel sinyalleri sahipsiz bir “risk listesi” olarak bırakmak yerine zamanında insan takibine dönüştürür. Sistem öğrenciye tanı koymaz, kişilik/motivasyon çıkarımı yapmaz ve otomatik yaptırım uygulamaz.

## Kural sözleşmesi

`intervention-v1` haftalık idempotent değerlendirme penceresinde yalnız dört kural çalıştırır:

| Neden | Eşik | Pencere | Özellikle yapılmayan çıkarım |
|---|---:|---:|---|
| Katılım örüntüsü | En az 3 tamamlanmış derste en az 2 `ABSENT` | 14 gün | Mazeret, sağlık, aile veya motivasyon nedeni |
| Teslimi geçen çalışma | En az 2 tamamlanmamış aktif çalışma | 30 gün | Tembellik, isteksizlik veya başarı etiketi |
| Tekrarlayan çözüm güçlüğü | En az 1 tekrar öğesinde 3 `WRONG/UNSURE` | 30 gün | Zekâ, kalıcı yetersizlik veya tanı |
| Plan kapasitesi | Onaylı mevcut haftada en az 3 geçmiş açık görev | İçinde bulunulan hafta | Borç, seri kaybı veya irade yorumu |

Her çıktı yalnız kontrollü neden kodu, kanıt sayısı, açıklama, değerlendirme penceresi ve önerilen tek küçük eylem taşır. Sınıf sırası, akran karşılaştırması, birleşik risk puanı ve tahmine dayalı ML kapsam dışıdır. Haftalık hash parmak izi aynı öğrenci/neden/pencere için çift vaka oluşmasını önler; yanlış işaretlenen aynı pencere sessizce yeniden üretilmez. Pencere hesabı `lib/istanbul-time.ts` ile aynı İstanbul takvim kaynağını kullanır.

## Yaşam döngüsü ve SLA

1. `OPEN`: Kural sinyali oluşturdu; henüz insan aksiyonu yoktur. İlk insan aksiyonu hedefi 24 saattir.
2. `IN_PROGRESS`: Admin veya aktif grup öğretmeni bağlamı doğrulamaya başladı ya da bir aksiyon kaydetti.
3. `SNOOZED`: Yalnız 1, 3 veya 7 gün bekletilebilir. Süre dolduğunda kayıt yeniden `OPEN` olur ve yeni 24 saat hedefi başlar.
4. `RESOLVED`: Kontrollü sonuçlardan biri seçilmiştir: kısa görüşme, destek planı, çalışma ayarı, aile iletişimi, ek işlem gerekmemesi veya diğer.
5. `FALSE_POSITIVE`: Bağlam eksikliği, eski veri, hassas eşik, tekrarlı kayıt veya diğer kontrollü kural geri bildirimiyle kapanır.

Sahip atamak tek başına ilk insan aksiyonu sayılmaz. Başlatma, aksiyon notu, bekletme, sonuç veya yanlış işaret ilk aksiyon süresini durdurur. Her mutasyon `expectedVersion` ile çoklu sekme çakışmasını `409` olarak reddeder.

## Yetki ve görünürlük

- Admin bütün vakaları görür ve işleyebilir.
- Öğretmen yalnız halen öğretmeni olduğu aktif gruplardaki öğrencilerin vakalarını görür. Sahipsiz veya kendisine ait vakayı işleyebilir; başka bir öğretmenin sahip olduğu kaydı değiştiremez.
- Öğrenci ve veli vaka ekranına, vaka API'sine, SLA'ya, sahipliğe ve iç aksiyon notlarına erişemez.
- Grup üyeliği veya öğretmen sahipliği değiştiğinde bir sonraki istekte canlı ilişki sorgusu uygulanır. Yetkisiz ve bulunmayan nesne aynı `404` yanıtını kullanır.
- İç not 500 karakterle sınırlıdır. Not, açıklama ve öğrenci kimliği ürün event'lerine veya structured log'a kopyalanmaz.

## Adalet ve yanlış işaret denetimi

Yanlış işaret bir kullanıcı hatası değil kural kalitesi sinyalidir. Oran kural nedeni bazında ve en az 30 kapanış kararıyla incelenir. Başlangıç guardrail'i `%15`tir. Eşik aşılırsa:

1. ilgili kural için rollout büyütülmez;
2. eski/veri eksikliği ve grup bağlamı örneklemle incelenir;
3. eşik yalnız yazılı ürün kararı ve yeni kural sürümüyle değiştirilir;
4. korunan özellik, demografik tahmin veya sağlık verisi eklenmez;
5. öğretmen/öğrenci sıralaması ya da yaptırım üretilmez.

Alt grup adaleti ancak yeterli örneklem, veri minimizasyonu ve hukuk/etik onayıyla toplu analiz edilir. Bireysel hassas özellikler ürün event'ine eklenmez.

## Ölçüm, rollout ve geri alma

Pilot için en az 30 vaka ve 30 kapanış kararı gerekir. Kapılar: ilk insan aksiyonu p50 `≤24 saat`, sonuçla kapanma `≥%60`, yanlış işaret `≤%15`, yatay erişim olayı ve sistem hatası `0`.

Sunucu ve menü bayraklarını kapatmak üretim ve görünümü durdurur; kayıtlar silinmez. Migration geri alınmaz. Geri alma sırasında açık vakalar dışa aktarılmadan kişisel e-posta/mesaj kanallarına kopyalanmaz. Tekrar rollout yeni rule version veya belgelenmiş eşik kararıyla yapılır.

Migration: `0051_explainable_intervention_inbox`. Yayından önce migration, production build, unit test, öğretmen yaşam döngüsü E2E'si ve başka öğretmenin vakasına erişim testi geçmelidir.
