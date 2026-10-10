# M9 çocuk verisi ve yaş değerlendirmesi

Tarih: 10 Ekim 2026. Kapsam: Online Dershanem mobil 1.0.0.

Durum: BLOCKED — yaş/veli yetkilendirme ve hukuk onayı bekleniyor.

OD öğrencileri, Yön koçluk öğrencileri ve Deneme Ligi katılımcıları arasında reşit olmayanlar olabilir. Öğretmen, koç ve veli rollerinin bulunması Kids-category veya Families seçimini otomatik belirlemez. Gerçek pazarlama hedefi ve yaş dağılımını ürün sahibi doğrulamalı.

| Karar | Gerekli kanıt / sahip |
| --- | --- |
| Hedef yaş grupları | Ürün sahibi gerçek kullanım ve pazarlama planı; store target-audience anketi |
| Veli yetkisi | Hukuk velinin erişim/onay dayanağı; operasyon doğrulama prosedürü |
| Kids/Families | Hukuk + ürün, güncel platform koşullarına göre karar; otomatik seçilmedi |
| Serbest metin | Koç/check-in/destek içeriklerinde özel veri minimizasyonu; staff scope review |
| Reklam ve tracking | Mobilde reklam/ATT/üçüncü taraf analytics eklenmedi; web handoff ayrıca değerlendirilmeli |
| SDK uygunluğu | Expo, notifications/updates, meeting handoff ve backend sağlayıcılarının çocuk veri koşulları |
| Silme/saklama | Öğrenci/veli bağları, akademik geçmiş, yasal saklama gerekçesi ve süre |

Push payload ad, sınav puanı veya koç notu taşımaz. Reviewer/screenshot verisi yalnız sentetik. Parent akademik erişimi server scope ile; doğrudan studentId yetki sağlamaz. Age rating sorularında web handoff, kullanıcı içerikleri ve mevcut AI web erişimi doğru beyan edilir. Reşit olmayan kullanıcılar için izin/aydınlatma metinleri onaysız final sayılmaz.

Kaynaklar: [Apple review](https://developer.apple.com/app-store/review/guidelines/), [Google Families](https://support.google.com/googleplay/android-developer/answer/9893335).
