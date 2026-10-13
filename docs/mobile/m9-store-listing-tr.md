# M9 Türkçe mağaza metinleri — TASLAK

Tarih: 10 Ekim 2026. Kapsam: Online Dershanem mobil 1.0.0.

Hukuk, ürün ve mağaza politika onayı bekleniyor. Final ekran görüntüsü yok.

| Alan | Metin |
| --- | --- |
| Uygulama adı | Online Dershanem |
| iOS alt başlık | Ders, plan ve gelişim takibi |
| Play kısa açıklama | Derslerinizi, çalışma planınızı ve yayınlanan deneme sonuçlarınızı takip edin. |
| iOS anahtar kelimeler | eğitim,matematik,ders,ödev,plan,koçluk,deneme,sonuç,veli,gelişim |
| Tanıtım metni | Eğitim yolculuğunuzun ders, plan ve gelişim bilgileri tek uygulamada. |
| Kategori önerisi | Eğitim / Education; final seçimi ürün sahibine ait |
| Destek | https://www.onlinedershanem.com/iletisim — public sayfa erişilebilir, destek SLA doğrulanmadı |
| Gizlilik | https://www.onlinedershanem.com/gizlilik — mevcut metin inceleme taslağı |
| Silme | https://www.onlinedershanem.com/hesap-silme (backend dağıtımından sonra canlı kontrol edilir); uygulama içi: Hesap → Hesabımı sil |
| E-posta | iletisim@onlinedershanem.com ([public iletişim sayfası](https://www.onlinedershanem.com/iletisim) ile doğrulandı; mailbox operasyonu ayrıca teyit edilmeli) |

## Tam açıklama

Online Dershanem ile eğitim sürecinizi takip edin. Size tanımlanmış çalışma alanları üzerinden derslerinize, çalışmalarınıza ve gelişim bilgilerinize ulaşın.

• Online Dershanem: Ders programınızı ve ders ayrıntılarını inceleyin, ödevlerinizi takip edin, materyallere ve akademik gelişim bilgilerinize ulaşın.
• Yön Koçluk: Çalışma planınızı, görevlerinizi, hedeflerinizi ve koçluk görüşmelerinizi takip edin.
• Deneme Ligi: Deneme Ligi sınavlarını takip edin, yayınlanan sonuçları inceleyin ve gelişiminizi görün. Denemelere desteklenen bilgisayar ve tarayıcı üzerinden katılın; mobil uygulamada sınav çözülmez.
• Veliler: Yetkiniz bulunan öğrencilerin ders, ödev ve yayınlanmış gelişim özetlerini inceleyin.
• Öğretmen ve koçlar: Size atanmış ders, öğrenci ve koçluk işlemlerini mobilden yürütün.
• Kurum ekibi: Yetkili yöneticiler öğrenci, ders ve Deneme Ligi operasyonlarını (hazırlık, canlı takip, puanlama ve sonuç yayını) mobilden yönetir.

İçerik ve özellikler hesabınıza tanımlanmış erişimlere göre görüntülenir. Kullanım için mevcut bir hesap ve internet bağlantısı gerekir. Online Dershanem uygulamasında satış, ödeme, abonelik başlatma veya satın alma bağlantısı bulunmaz. Yön Koçluk ve Deneme Ligi aynı uygulamanın çalışma alanlarıdır.

## 1.0.0 yenilikleri

İlk mobil sürüm: ders ve ödev takibi, Yön çalışma planları ve koçluk bilgileri, Deneme Ligi yayınlanmış sonuçları, veli görünümleri, yetkili öğretmen/koç işlemleri, kurum yönetimi ve Deneme Ligi operasyonları, hesap ayarları ve uygulama içinden hesap silme talebi.

## Review notu

Sentetik test hesabıyla giriş yapın; workspace seçicisinden OD/Yön/Deneme Ligi arasında geçiş yapılır. Şifreler yalnız store app-access alanına girilir. Mobilde sınav çözme ve satın alma yok. Push üretimde kapalıysa review notunda bunu açıkça belirtin; teslim doğrulanmadan push vaat etmeyin. Hesap silme: Hesap → Hesabımı sil (parola ile talep). Güncel inceleme notu taslağı: [v1-release-candidate §3](./v1-release-candidate.md).

Yaş derecelendirmesi: gerçek hedef yaş grupları, kullanıcı içerikleri, chat/AI ve web handoff erişimiyle store anketleri doldurulacak; yaş değeri veya Kids kategorisi uydurulmadı. Şirket adı/adresi/telefonu doğrulanmadan eklenmez.
