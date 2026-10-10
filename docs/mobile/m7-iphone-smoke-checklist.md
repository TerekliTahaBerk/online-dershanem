# M7 iPhone duman testi listesi (gerçek cihaz — YAPILMADI)

Ön koşul: staging; MFA'lı bir öğretmen hesabı. Hesabın OD grubu, Yön koç ataması ve Deneme Ligi ilişkili öğrencisi olmalı. İkinci bir öğretmen hesabı (atamasız) gerekli.

## Kabuk
- [ ] Giriş + MFA → OD çalışma alanında "Bugün" öğretmen ekranı; alt çubukta yalnız Bugün + Menü.
- [ ] Çalışma alanı değiştirici: Yön → koç Bugün; Deneme Ligi → ilişkili raporlar.
- [ ] Menü bölümleri görünür; native olmayan öğe "web'de aç" ile Safari'de açılır (URL'de token yok).
- [ ] ADMIN hesabı: yalnız bilgi ekranı.

## Öğretmen
- [ ] Bugünkü ders → ders çalışma alanı; Hazırlık / Ders / Kapanış sekmeleri.
- [ ] Ders bağlantısı yalnız HTTPS ise düğme görünür ve Safari'de açılır.
- [ ] Yoklama + öğrenci notu + kazanım (en çok 3) ya da atlama nedeni → kapanış onayı → başarı yalnız sunucu yanıtından sonra.
- [ ] İkinci cihazda / web'de aynı dersi kapat → mobilde gönder → çakışma uyarısı, veri yenilenir, düzenlemeler korunur.
- [ ] Uçak modu: gönder düğmesi kapalı, uyarı; bağlantı gelince gönderilebilir.
- [ ] Çalışmalar → değerlendirme kuyruğu → rubric her ölçüt + geri bildirim → onay; web'de aynı teslimi değerlendirip mobilde dene → "başka yerde değerlendirildi".
- [ ] Yardım isteyenler (Yön menüsü): OD rolü yoksa yanıt kapalı.

## Koç
- [ ] Koç Bugün: görüşmeler, dikkat grupları; özel not yok.
- [ ] Öğrenci → not: varsayılan "Yalnız koçlar"; "Öğrenci görür" seçince onay sorulur.
- [ ] Görüşme planla: geçmiş saat seçilemez; http bağlantı reddedilir; çift dokunma tek kayıt.
- [ ] Görüşme: saati düzenle; öğrenci saat talebi varsa "öneri" metni.
- [ ] Tamamla: paylaşılan ve özel not ayrı; karar günü yalnız bu hafta; 3 karar sınırı.
- [ ] Planlar: öneri kabul / red onayı; plan detayı → görev taşı (yalnız plan haftası) → plan onayı.
- [ ] Atamasız ikinci öğretmen: koç listesi boş; derin bağlantıyla öğrenci → "bulunamadı".

## Deneme Ligi
- [ ] İlişkili öğrenci → rapor (salt okunur); yönetim işlemi yok.

## Erişilebilirlik
- [ ] VoiceOver: sekme ve rubric seçimleri okunuyor; Dinamik Tür en büyükte taşma yok.
- [ ] Tarih seçici (iOS compact) Türkçe.
