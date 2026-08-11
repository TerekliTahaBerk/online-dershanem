# Erişilebilirlik ve makul düzenleme işletim standardı

## Veri minimizasyonu ve yetki

- Sistem tanı, engel adı, sağlık raporu, belge veya serbest sağlık notu toplamaz.
- Kullanıcı; azaltılmış hareket, yüksek kontrast, büyük metin, rahat aralık, altyazı ve transkript tercihlerini yalnız kendi hesabı için yönetir.
- Akademik ek süre yalnız `%0`, `%25`, `%50` veya `%100` olabilir. Planlı kısa mola iznini ve ek süreyi yalnız admin, aktif bir öğrenci hesabı için atar.
- Öğretmen yalnız kendi aktif grubundaki öğrenci için uygulanabilir yönergeleri görür: ek süre yüzdesi ve mola izni. Gerekçe, tanı veya profili güncelleyen kişi gösterilmez.
- Veli öğrencinin erişilebilirlik profilini göremez veya değiştiremez. Bu sınır öğrenci açık rıza vermiş varsayımıyla genişletilmez.
- Güncellemeler sürüm kontrolü, same-origin ve rate limit ile korunur; admin değişikliği audit kaydına yazılır. Ürün event'leri kullanıcı kimliği veya sağlık verisi taşımaz.

## Ürün davranışı

- Görsel tercihler panel genelinde uygulanır ve kullanıcı tekrar değiştirene kadar saklanır.
- Video materyali yükleyen öğretmen altyazı bulunup bulunmadığını belirtir ve metin transkript ekleyebilir. Transkript yalnız materyale erişebilen aktif grup üyelerine açılır.
- Altyazı veya transkript tercih eden öğrencinin materyal listesinde uyumlu kaynaklar önce gösterilir; uyumsuz kaynak gizlenmez.
- Transkript, öğretmenin paylaşma hakkına sahip olduğu içerikle sınırlıdır; öğrenciye özel not, sağlık bilgisi veya telif hakkı bulunmayan tam metin eklenmez.
- V1'de süreli sınav motoru yoktur. Ek süre kaydı son teslim tarihini otomatik değiştirmez; öğretmene gösterilen açık bir uygulama yönergesidir.

## WCAG 2.2 AA kabul listesi

1. Bütün işlemler klavyeyle tamamlanabilir; odak görünürdür ve sayfa başındaki “İçeriğe geç” bağlantısı ilk Tab ile erişilebilir.
2. Tıklanabilir özel kontroller en az `24 × 24 CSS px` hedef alanına sahiptir veya çevresinde eşdeğer boşluk bulunur.
3. Alanların programatik etiketi, açıklaması ve hata ilişkisi vardır; kayıt sonucu canlı bölgeden bildirilir.
4. Panel `320 CSS px` genişlikte yatay taşma üretmez; `%200` metin büyütmede içerik ve işlem kaybolmaz.
5. Azaltılmış hareket seçiliyken zorunlu olmayan animasyon ve geçişler kaldırılır. Yüksek kontrast yalnız renk ile anlam taşımaz.
6. Transkript aç/kapat kontrolü klavyeyle çalışır; video altyazı durumu metinle bildirilir.
7. Pilot öncesinde öğrenci, öğretmen ve admin akışlarında otomatik Axe taraması ile manuel klavye, zoom ve ekran okuyucu kontrolü birlikte yapılır.

## Rollout ve geri alma

1. `0055_accessibility_preferences` migration'ını uygulayın.
2. `PANEL_FEATURE_ACCESSIBILITY_PROFILE=true` ayarlayın; menü ve sunucu aynı snapshot'tan açılır.
3. Önce küçük bir öğrenci/öğretmen/admin pilotunda tercih kaydetme başarısı, erişilebilir materyal kapsaması ve öğretmen yönergesinin doğru görünürlüğünü izleyin.
4. Tanı/sağlık verisi toplanması, veliye profil sızıntısı, başka grubun öğrencisine erişim veya tercihin paneli kullanılamaz hale getirmesi halinde bayrağı kapatın. Kayıtları topluca silmeyin; olay ve hukuki saklama değerlendirmesi yapın.
5. Bayrak kapatıldığında saklanan tercihler uygulanmaz ve menü görünmez; mevcut materyaller erişilebilir olmaya devam eder.
