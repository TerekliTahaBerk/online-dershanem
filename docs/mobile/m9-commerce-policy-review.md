# M9 satışsız mobil model ve mağaza politikası

Tarih: 10 Ekim 2026. Kapsam: Online Dershanem mobil 1.0.0.

## Kesin ürün kararı

Ürün sahibinin talimatı: **“APP içi PAYTR checkout olmayacak; app içi bir satım olmayacak.”** V1.0'da fiyat, sepet, sipariş, PAYTR checkout, native satın alma, IAP, abonelik checkout veya dış ödeme yönlendirmesi yok. Web platformunun mevcut ticaret akışları kaldırılmaz. Mobil mevcut yetkili eğitim kayıtlarına erişim sağlar.

Uygulanan kontroller: veli hesap sayfasından paket ekleme/değiştirme yönlendirmesi kaldırıldı; mobil menü “Hesap” etiketi kullanıyor; checkout/PAYTR/ödeme/sipariş/paket satış yolları web handoff ve navigation projeksiyonunda reddediliyor; materyal dış URL'leri HTTPS zorunlu, PAYTR hostu ve bilinen ticaret yolları reddediliyor. Generic browser açıldıktan sonra web sitesinin bütün navigasyonunu kontrol etmek mümkün değil; review öncesi izinli handoff hedeflerinin satış CTA taşımadığı gerçek QA ile doğrulanmalı. Sunucudaki ders/materyal linkleri de satışa yönlendirmemeli.

## Politika sınıflandırması — karar bekliyor

| Hizmet | İncelenecek kategori |
| --- | --- |
| Canlı birebir eğitim | Apple 3.1.3(d) person-to-person olasılığı; gerçek birebir hizmet kanıtı gerekir |
| Grup dersleri | Aynı istisna otomatik uygulanmaz; digital service / content incelemesi |
| Dijital materyal ve tekrar | Digital educational content / entitlement |
| Deneme erişimi ve yayınlanmış sonuç | Digital service/entitlement; mobilde sınav çözülmemesi tek başına istisna değildir |
| Süreli abonelik hakları | Subscription entitlement; nerede edinildiği ve app erişim modeli incelenir |

Apple/Google politikalarında tüketim ve ödeme yönlendirmesi koşulları farklıdır. Hiç satış UI olmaması ücretli dijital içerik erişiminin otomatik onayı değildir. Reader/companion/enterprise gibi muafiyetler varsayılmadı. Ülke/entitlement istisnalarına ödeme workaround'u eklenmedi.

**BLOCKED:** Ürün sahibi hizmetlerin birebir/grup/dijital dağılımını ve entitlement edinimini belgeler; hukuk/platform uzmanı Apple ve Google için ayrı policy classification kararını kaydeder. Bu karar ve izinli web hedeflerinin QA'sı Gate C'yi engeller; yeni ödeme entegrasyonu çözüm olarak önerilmez.

10 Ekim 2026'da incelenen resmî kaynaklar: [Apple 3.1](https://developer.apple.com/app-store/review/guidelines/), [Google Payments](https://support.google.com/googleplay/android-developer/answer/9858738).

Public [ürün sayfası](https://www.onlinedershanem.com/) birebir ve küçük grup dersleri, koçluk ve dijital denemeleri birlikte sunuyor. Bu yüzden tüm ürünü birebir eğitim istisnası saymak için dayanak yok. Public site/iletişim sayfası satış CTA içerir; uygulamadan ticaret amaçlı bu sayfalara link eklenmez. Store destek URL'sinin ve gizlilik sayfasındaki genel web navigasyonunun review etkisi ayrıca incelenir.
