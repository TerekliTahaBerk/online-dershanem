# Dino ana sayfa içgörüsü işletim standardı

## Davranış

- Ana sayfa yüzeyi serbest sohbet veya dış model çağrısı yapmaz. Sunucu, aynı istekte erişim kapsamı doğrulanmış first-party kayıtlardan tek bir sonraki adım seçer.
- Seçim sırası: kanıta bağlı bugünkü açık plan görevi, zamanı gelmiş aktif `ReviewItem`, son 30 gündeki `NEEDS_REVIEW` ders kanıtı.
- Plan görevi yalnız `REVIEW` kaydına veya `WEAK_OUTCOME` ders kanıtına gerçekten bağlıysa önerilir. Eşleşmeyen görevden akademik gerekçe uydurulmaz.
- Veri yoksa eylem üretilmez ve mevcut dürüst boş durum gösterilir.

## Yetki ve güvenlik

- Öğrenci kimliği öğrenci oturumundan; veli kapsamı `resolveParentScope` sonucundan gelir. İstemci tarafından gönderilen serbest bir öğrenci kimliği kullanılmaz.
- Öğretmen özel notu, koç özel görüşme notu, serbest öğrenci metni ve model çıktısı bu yüzeye girmez.
- CTA yalnız mevcut plan, tekrar, koçluk veya takip ekranına gider. Görevi tamamlama, planı değiştirme, tekrar yanıtı verme ya da başka bir mutation otomatik çalıştırılmaz.
