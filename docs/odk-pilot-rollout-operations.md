# ODK kontrollü pilot ve üretim yayın standardı

Bu süreç Online Deneme Kulübü'nü küçük, adı konmuş bir katılımcı grubuyla açar. Ürün üyeliği satın alma hakkını; pilot üyeliği ise o yayın koşusuna katılımı temsil eder. İkisi birbirinin yerine geçmez.

## Yayın öncesi kapılar

1. `0063_odk_pilot_rollout` migration'ını uygulayın ve deploy'u `ODK_ROLLOUT_MODE=pilot` ile alın.
2. `CRON_SECRET` ile `/api/cron/odk-exam-lifecycle` görevinin çalıştığını, `BLOB_READ_WRITE_TOKEN` ile kitapçıkların özel depoda tutulduğunu doğrulayın.
3. Son 90 gün içinde yalnız yedekten yeni ortama restore tatbikatı yapın; başarılı tarihi `ODK_LAST_RESTORE_DRILL_AT` olarak kaydedin.
4. Bir admin, bir öğretmen, en az bir öğrenci ve bağlı bir veliyle klavye, mobil, `%200` zoom, ağ kesme, süre sonu, sonuç açıklama ve yatay erişim kabulünü tamamlayın.
5. Çocuk verisi/KVKK, Meet oturum protokolü, PDF yetkisi ve olay yönetimi incelemesinden sonra üç manuel onayı açın: `ODK_PILOT_ACCEPTANCE_APPROVED`, `ODK_PILOT_SECURITY_REVIEW_APPROVED`, `ODK_PILOT_OPERATIONS_APPROVED`.
6. Admin ODK “Pilot yayını” ekranında katılımcıları açıkça seçer. Taslak oluşturmak erişim vermez; tüm bloke kapılar kalkınca aktive edilir.

## Sınav günü görev dağılımı

- Sınav sorumlusu denemeyi ve Meet bağlantısını 30 dakika önce doğrular; sonuç açıklama yetkisi yalnız admindedir.
- Teknik sorumlu canlı operasyon ekranında heartbeat, cevap sayısı, otomatik teslim ve yaşam döngüsü cron'unu izler.
- Öğretmen yalnız akademik destek ve sonradan rapor yorumundan sorumludur; planı veya sonucu açıklayamaz.
- Meet'e katılım kullanıcı beyanı ve görevli protokolüyle takip edilir. Tarayıcı heartbeat'i Meet katılım kanıtı olarak yorumlanmaz.
- Öğrenciden ekran paylaşımı, oda görüntüsü veya sınav için gereksiz kişisel veri istenmez.

## Olay ve geri alma

Yetkisiz PDF/sonuç erişimi, başka öğrencinin cevabına erişim, yanlış cevap anahtarı, yaygın cevap kaybı veya zamanlayıcı sapması kritik olaydır. Yeni girişleri durdurmak için önce pilot koşusunu `PAUSED`, deploy seviyesinde acil kesme gerekiyorsa `ODK_PILOT_KILL_SWITCH=true` yapın. Admin erişimi olay müdahalesi için açık kalır.

Geri alma veri silmez. Koşu `ROLLED_BACK` durumuna alınır; aktif denemeler ve cevaplar korunur, sonuçlar açıklanmaz. Yanlış anahtarla puanlanan sonuçlar düzeltilmeden yeniden yayınlanmaz. Olay kaydı, etkilenen kullanıcı bandı, zaman aralığı, alınan karar ve geri dönüş doğrulamasını içerir; soru veya öğrenci içeriği loga kopyalanmaz.

## Genişleme ölçütü

Pilot en az iki planlı matematik denemesi ve dört rol kabulinden sonra değerlendirilir. Şunların tamamı sağlanmadan `ODK_ROLLOUT_MODE=general` yapılmaz:

- yetkisiz nesne erişimi ve sonuç sızıntısı sıfır;
- kaybolan onaylanmış cevap sıfır ve otomatik teslimler açıklanabilir;
- stale aktif oturum yok, bitmiş denemelerde puanlama kuyruğu temiz;
- öğrenci, veli ve öğretmen raporları aynı açıklanmış skordan türetiliyor;
- olay tatbikatında pause/kill switch ve geri dönüş doğrulanmış;
- mobil, erişilebilirlik, ağ kesme ve restore kabul kanıtları güncel.

Genel yayında da kill switch korunur. Pilot koşuları ve audit kayıtları silinmez; sonraki incelemeler için terminal durumda saklanır.
