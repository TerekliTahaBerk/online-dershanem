# Kanıtlı ödev, rubric ve yeniden deneme işletim standardı

## Güvenli V1 kapsamı

Kanıtlı ödev “tamamlandı” düğmesini öğrenme kanıtı saymaz. Öğrenci çözüm yolunu ve kontrolünü 20–2000 karakterlik metinle açıklar; öğretmen 2–4 gözlenebilir ölçütü değerlendirir. V1 fotoğraf, PDF, ses, dış URL veya dosya metadata'sı kabul etmez. Dosya desteği ancak private quarantine, zararlı dosya taraması, EXIF/metadata temizleme, kota, indirme yetkisi ve silme tatbikatı birlikte hazır olduğunda ayrı pilotla açılabilir.

## Yaşam döngüsü ve guardrail'ler

1. Öğretmen kanıt gerektiren ödevde 2–4 farklı ölçüt tanımlar.
2. Öğrenci aktif grup ilişkisindeki ödeve idempotency anahtarıyla ilk kanıtı gönderir.
3. Gönderim değerlendirmedeyken ikinci teslim kabul edilmez.
4. Öğretmen bütün ölçütleri `bir adım daha`, `gelişiyor`, `karşılıyor` seviyelerinden biriyle işaretler ve kısa geri bildirim yazar.
5. Revizyon istenirse yeni attempt açılır; eski metin, rubric ve geri bildirim korunur. Onay yalnız son gönderimi ve ödev ilerlemesini tamamlar.

Tek toplam puan, yüzde, sınıf sırası, öğretmen sıralaması, ceza, seri kaybı veya otomatik başarısız etiketi yoktur. Veli V1'de kanıt ve rubric ayrıntısını görmez.

## Yetki, veri ve ölçüm

Öğrenci yalnız kendi profiline bağlı teslimi oluşturur ve görür. Öğretmen yalnız halen öğretmeni olduğu aktif gruptaki aktif öğrencinin `SUBMITTED` kaydını değerlendirir. İlişki her istekte yeniden doğrulanır; başka nesne `404` döndürür. Audit kararı, attempt ve ölçüt sayısını taşır; kanıt/geri bildirim metnini taşımaz.

Event'ler yalnız attempt/karakter bandı, geç kalma, karar, süre ve ölçüt sayısı içerir. Hedefler: geri bildirim p50 `≤48 saat`, en az 30 revize denemede onay `≥%60`, yatay erişim ve içerik sızıntısı `0`.

## Rollout ve geri alma

1. `0053_assignment_evidence_rubric` migration'ını uygulayın.
2. Sunucu ve build bayraklarını birlikte açın.
3. İç hesaplarda idempotency, eski sekme çatışması, iki attempt geçmişi ve iki yönlü yatay erişimi doğrulayın.
4. Küçük pilotu en az iki hafta izleyin; yetersiz örneği başarılı saymayın.
5. İhlalde iki bayrağı kapatıp deploy edin. Kayıtları silmeyin; klasik ödev akışı çalışmaya devam eder.
