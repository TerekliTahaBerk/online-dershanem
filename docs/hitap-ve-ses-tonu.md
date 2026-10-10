# Hitap ve ses tonu rehberi

Panelde ve mobil uygulamada yazılan her metin (başlık, boş durum, hata,
başarı mesajı, buton, erişilebilirlik etiketi) bu rehberi izler. Rol bazlı
hitap kuralı `docs/panel-design-roadmap.md` §19'daki kuralın ayrıntılı
hâlidir.

## Rol bazlı hitap

| Kime | Hitap | Ton |
|---|---|---|
| Öğrenci | **sen** | Sıcak, cesaret veren, kısa. Yanında duran bir abla/abi ya da koç gibi. |
| Veli | **siz** | Sakin, saygılı, açıklayıcı. Kaygı yaratmaz, kıyas yapmaz. |
| Öğretmen / koç | **siz** | Profesyonel, meslektaş dili, kısa. |
| Yönetim / operasyon | **siz** veya kişisiz | Kısa ve net ("3 deneme yayın bekliyor"). |

Rolü bilinmeyen ortak ekranlar:

- **Mobil uygulama** (giriş, hesap, genel hata mesajları): uygulamanın
  ağırlıklı kullanıcısı öğrenci olduğu için sıcak **sen**.
- **Web paneli** giriş ve hata sayfaları: **siz**. Oturum açıldıktan sonra
  rolü bilinen ortak sayfalar (ör. parola) rolüne göre hitap eder.
- Birden çok rolün kullandığı bileşenler `role` / `audience` / `viewerRole`
  değerine göre metin seçer; öğrenciye asla "siz", veliye asla "sen"
  denmez.

## Öğrenci metinleri için ilkeler

1. **Önce durum, sonra ne olacağı.** Kuru "X yok." yerine
   "Bekleyen ödevin yok. Öğretmenin yeni bir ödev verdiğinde ilk burada
   göreceksin."
2. **Biz dili, suçlama yok.** Hata bizdense biz söyleriz:
   "Kaydedemedik. Bir daha dener misin?" — "İşlem başarısız oldu" değil.
3. **Küçük başarıyı kutla, abartma.** "Harika, bir görev daha tamam!",
   "Eline sağlık!" Ekran başına en fazla bir ünlem; emoji yok.
4. **Aksilikte rahatlat.** Gecikme, kaçırma ya da yanlışta yargılamayız:
   "Süresi geçti; yetiştirmek için hâlâ geç değil", "Yanlış yapmak sorun
   değil; ilerlemen silinmez."
5. **Teknik/bürokratik kelime yok.** "Profilin hazırlanıyor" →
   "Hesabını hazırlıyoruz"; "kullanıma açık değil" → "şimdilik kapalı";
   "sunucuda" → "bizim tarafımızda"; "kazanım analizi" → "konu analizi".
6. **Sınav anında sakinlik.** Deneme ekranında önce güvence, sonra adım:
   "Merak etme, cevapların güvende; teslimi bir daha dener misin?"
7. **Butonlar kısa ve fiil.** "Derse katıl", "Hadi başlayalım",
   "Koçuma ilet", "Sonucunu gör".

## Sabit terimler

Ürün ve alan adları değişmez: **onlinedershanem.**, **Yön Koçluk**,
**Deneme Ligi**, **Dino**, **net**, **check-in**, **telafi**, **tekrar**.
Kişisel veriyi (ad, not, puan) telefon bildirimlerinde göstermeme kuralı
ve 112 acil durum uyarısı ton değişikliğinden etkilenmez.

## Örnekler

| Durum | Öğrenci | Veli |
|---|---|---|
| Boş liste | "Henüz paylaşılan bir kaynak yok. Öğretmenin bir kaynak paylaştığında burada seni bekliyor olacak." | "Henüz kayıtlı bir deneme yok. Öğretmen ya da koç bir sonuç girdiğinde burada görebilirsiniz." |
| Ağ hatası | "Sunucuya ulaşamadık. İnternet bağlantını kontrol edip bir daha dener misin?" | "Görüşünüzü kaydedemedik. Bağlantınızı kontrol edip tekrar dener misiniz?" |
| Başarı | "Gönderdik! Öğretmenin bakıp sana dönecek." | "Teşekkürler, geri bildiriminizi aldık." |
| Hesap hazırlığı | "Hesabını hazırlıyoruz. Her şey hazır olduğunda derslerini burada göreceksin." | "Ödemeniz alındı, teşekkür ederiz. Öğrenci hesabı açılır açılmaz bilgileri burada görebileceksiniz." |
