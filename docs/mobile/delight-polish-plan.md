# Mobil küçük dokunuşlar

14 Ekim 2026. Mevcut onaylı uygulama yerleşimi, ürün renkleri ve Türkçe etiketler korunur; yeni büyük ekran veya oyun ekonomisi eklenmez. Bu, mevcut tasarım sistemi içinde UI polish çalışmasıdır. İkonlar bitmap yerine ölçeklenebilir, uygulamaya özgü vektör geometrisi kullanır.

## Uygulanan kapsam

- Yön görevi DONE, OD çalışması DONE ve telafi adımı sunucuda başarıyla kaydedilince 24 parçacıklı, 1,7 saniyelik konfeti ve kısa başarı bildirimi. Sunucu tekrarı, hata, kısmi durum ve yalnız ekranı açmak kutlama üretmez.
- Kanıt gönderimi için ayrı, konfeti içermeyen “Emeğin yola çıktı” bildirimi; öğretmen onayı veya görevin tamamlandığı iddia edilmez.
- Bildirim 4,5 saniyede kapanır ve kullanıcı kapatabilir. Ekranın geri kalanına dokunma engellenmez. Arka plana geçişte temizlenir; kişi/çalışma alanı değişince önceki kutlamalar taşınmaz. Aynı görev aynı oturumda tekrar kutlanmaz.
- Hareket azaltma açıkken konfeti ve haptics kapalı, metin onayı açık. Ekran okuyucuya tek başarı duyurusu. Native driver, sınırlı parçacık sayısı, zamanlayıcı/animasyon temizliği; yeni native modül, ses veya izin yok.
- Özgün güneş, görev, kitap, takvim, konuşma, hedef, grafik, menü, deneme, yaprak ve yıldız simgeleri. Yuvarlak 1,8 birim çizgi, tutarlı optik boyut ve seçili renk. Ortak navigasyon adları ve 44 px dokunma hedefleri korunur.
- Yön görev satırında tamamlananı ayıran yıldız; haftalık erişilebilir ilerleme çizgisi. Bugünün tüm görevleri DONE ve geciken yokken özel mola mesajı; boş plan bu başarıya dönüşmez.
- OD boş ana ekranında sakin yaprak detayı; durum seçicide ortak basma geri bildirimi.

## QA ve yayın

Gerçek rota ağacında OD tamamlama/çakışma, Yön DONE/tekrar/kısmi/hata ve kutlama sağlayıcısında önizleme/arka plan/hareket azaltma/haptic hatası test edilir. Mobil tam test, typecheck/lint, sözleşme/token kontrolleri ve iOS/Android Hermes export/hijyen çalışır.

Native görsel kontrol: küçük iPhone SE üzerinde Çalışmalar → görev → Tamamlandı → onay + konfeti; görev durumunun yenilenmesi, otomatik kapanma, yeniden açmada tekrar kutlamama, ikonlu alt navigasyon. Üretim hesabı kullanılmaz; yerel sentetik API kullanılır. Tarayıcı bu native animasyonun yerine geçmez.

Görsel karşılaştırma defteri: mevcut beyaz yüzey, Manrope metin ölçeği, ürün rengi, ekran kenarları ve ana görev/form sırası korunur. Kasıtlı eklemeler: başarı bildirimi/konfeti, görev simgesi, ilerleme çizgisi ve tamamlanma mesajı. Dar ekranda metin esner; bildirim eylemi en az 44 px. Geçici başarı bildirimi en fazla 1,6×, alt menü etiketleri 1,25× ölçeklenir ve tek satıra sığar; ekran içeriğinin sistem yazı ölçeği korunur, tam metin ekran okuyucuya duyurulur. Fiziksel titreşim motoru ve cihaz GPU performansı simülatörden doğrulanmış sayılmaz.

PR ve yayın sonrası mevcut TestFlight 1.0.0 (7) fingerprint'iyle karşılaştırılır. Runtime eşleşirse production OTA yayınlanır; native değişiklik olmadığı halde yeni binary zorlanmaz. Yayın grubu ve commit teslim mesajında verilir.
