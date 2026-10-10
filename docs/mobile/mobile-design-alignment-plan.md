# Mobil uygulama — site ve panel tasarım uyumu planı

Tarih: 10 Ekim 2026. Durum: ortak tasarım ve ekran aileleri uygulandı. Uygulama/kanıt kapsamı `mobile-design-alignment-report.md` belgesinde.

## Hedef ve referans sırası

Mobil uygulama mevcut sitenin marka kimliğini ve web panelinin içerik, bileşen ve navigasyon dilini taşıyacak. Yeni bir görsel kimlik tasarlanmayacak. Ana referanslar çalışan yerel web sürümü ve bu sürümün bileşenleri; production ile SHA/tasarım farkı uygulamaya başlamadan kontrol edilecek.

1. Giriş/kimlik ekranları: `components/auth/auth-card.tsx`, `components/panel/login-form.tsx`, `app/giris`, parola ve MFA ekranları.
2. Uygulama çalışma alanı: `.pn-scope` (`app/globals.css`), `components/panel/primitives`, `panel-shell`, `panel-nav`, `panel-mobile-nav`, web workspace-switcher.
3. Ürün kimliği: sitede kullanılan OD, Yön Koçluk ve Deneme Ligi logo/mascot varlıkları, ürün vurguları ve adlandırma.
4. Sayfa içeriği: ilgili OD/OK/ODK ve rol web ekranlarının başlık, bölüm sırası, durum ve eylem hiyerarşisi.

Web masaüstü genişlikleri küçültülerek telefona sıkıştırılmayacak. Aynı hiyerarşi native güvenli alan, klavye, geri hareketi, dokunma hedefleri ve ekran genişliğine uyarlanacak. Site girişindeki yeşil buton ile panelin koyu nötr butonu ayrı kullanım bağlamlarıdır.

## İnceleme ve kanıt sınırı

Tarayıcıda yerel ana site, giriş, ürün seçimi, OD öğrenci ana sayfası, Yön Koçluk ve Deneme Ligi ana ekranları incelendi. OD panelinin dar görünümü/alt navigasyonu ve geniş görünümü/kenar çubuğu görüldü. Mobil auth, tokens, primitives, native tabs, menu, workspace-switcher ve özellik dosyaları okundu.

Bu turda fiziksel iPhone ekranı doğrudan görülemedi. Native ekrana ilişkin bulgular kaynak koduna dayanıyor; taşma, klavye ve işletim sistemi sekme görünümü gerçek cihazda ayrıca ölçülecek. Yerel test hesabındaki ders/koç/deneme içerikleri boş; dolu ekranlar için gerçek kişi verisi içermeyen test fixture verisi gerekiyor. Şifreler referans görsellere veya belgelere kaydedilmeyecek.

## Somut farklar

| Alan | Mevcut fark | Planlanan eşleştirme |
| --- | --- | --- |
| Giriş markası | Web üç ürün logosu; native tek app ikonu + marka yazısı | Aynı üç logo, aynı sıra, optik boyutlar ve boşluklar |
| Giriş hiyerarşisi | Web “Tekrar hoş geldin”; native marka başlığı ve farklı metin | Web başlığı, alan/button/link sırası ve görsel ağırlığı |
| Auth kontrolleri | Web auth radius 12px; native genel control radius 6 | Auth ve panel için ayrı control varyantları |
| Birincil eylem | Web panel `bg-dc-ink`; native ortak primary marka yeşili | Auth yeşil, panel koyu nötr; semantik destructive ayrı |
| Ürün değiştirici | Web ürün logosu/kullanıcı bağlamı; native renk noktası | Aynı varlıklar, aktif ürün işareti, durum ve kullanıcı hiyerarşisi |
| Menü | Native generic Row ve büyük sayfa başlığı kullanıyor | Web bölüm sırası, satır yoğunluğu, aktif işaret, hesap alt bölümü |
| İkonlar | Tab SF/Material; genel Row metin oku kullanıyor | Tutarlı ikon eşlemesi, ölçü/stroke/renk; gerekli native farklar belgeli |
| Tipografi | Token kontrolü font/yerleşim eşitliğini kanıtlamıyor | Webde gerçekten kullanılan family/weight/size/line-height dökümü |
| Ekran bölümleri | Aynı renkler farklı container/spacing ile kullanılıyor | Her bölümün web karşılığına göre bordür, ayırıcı ve yoğunluk |

## Aşama 1 — Envanter ve tasarım sözleşmesi

- 35 native rota dosyası ve özellik ekranlarını route/role/product matrisine dönüştür; wrapper dosyaları ayrı ekran sayma.
- Her ekran için web referansı, ortak component, veri durumu, native farkı ve kabul ölçütü yaz.
- Üç ürün için logo dosyası, renk, aktif vurgu, typography ve durum renklerini kesinleştir.
- Auth, shell/menu, list/detail, data/analysis, forms/account ve overlay ailelerini ayır.
- Reference ekran görüntülerini parolasız ve sentetik verili olarak hazırla. Dolu/boş/hata/loading durumlarını kapsa.
- İlk uygulama dilimi: giriş + ürün seçimi + menü + bir OD ana ekranı. Böylece ortak bileşenlerin uyumu erken değerlendirilir.

Çıkış ölçütü: tüm native ekranların web karşılığı ve uygulanacak stil kararı belli.

## Aşama 2 — Ortak native tasarım bileşenleri

Öncelikli dosyalar: `mobile/src/design/tokens.ts`, `products.ts`, `theme.tsx`, `primitives/{text,controls,layout,feedback}.tsx`.

- Auth ile panelin zemin, buton, input, radius ve başlık varyantlarını ayır.
- Mevcut marka görsellerini mobile asset olarak taşı; yeni logo üretme.
- Font ağırlıkları ve satır yüksekliğini gerçek web referansından çıkar; eksik font ağırlığını sentetik bold ile geçiştirme.
- PageHeader, Section, Row, EmptyState, Banner, StatusBadge, segmented control, modal/bottom sheet ve button durumlarını eşleştir.
- Basılabilir satırda tutarlı chevron; etiket ve ikonların hizası; uzun metinlerde sağ eylemi kaybetmeyen düzen.
- Dokunma alanını en az 44pt tut; görsel kontrol boyutu daha küçükse hit area ile genişlet.

Çıkış ölçütü: ortak component örnekleri web karşılıklarıyla yan yana uyumlu; ekranlarda gelişigüzel sabit stil eklenmiyor.

## Aşama 3 — Girişten menüye uygulama kabuğu

- Giriş, parola unuttum/değiştir, MFA/hesap kapıları: logo sırası, başlık, form, hata, loading ve klavye yerleşimi.
- Ürün seçim ekranı ve switcher: logolu OD/OK/ODK satırları, aktif/kilitli/pilot durumları, açık seçim geri bildirimi.
- Üst bar: aktif ürün kimliği, sayfa bağlamı ve mevcut bildirim/hesap erişimi için tek düzen; çift başlık ve fazla üst boşluğu kaldır.
- Alt navigasyon: webin mevcut primary menü sırasını koru; aktif/pasif ikon ve metinleri eşleştir. NativeTabs ile web görsel farklarını ölç; kontrol edilemeyen farklılık varsa mevcut router ile özelleştirilebilir tab bar seçeneğini değerlendir.
- Menü: ürün değiştirici, rol/kullanıcı alanı, webdeki bölüm sırası, aktif satır, bildirim sayacı, ayarlar ve çıkış.
- API'den gelen rol/ürün menüsü tek kaynak kalır; tasarım için yetkisiz menü veya sahte çalışan eylem eklenmez.

Çıkış ölçütü: giriş → ürün seçimi → ana ekran → menü → ürün değişimi → geri dönüş iPhone'da tutarlı.

## Aşama 4 — Öğrenci ekranları

| Ürün | Kapsam |
| --- | --- |
| OD | Bugün, dersler/liste-detay, ödevler/liste-detay/teslim, kaynaklar, gelişim/analiz, haftalık özet, tekrar/telafi |
| Yön Koçluk | Bugün, plan/gün/görev detayları, çalışmalar, koç/görüşme, hedefler, haftalık özet, check-in |
| Deneme Ligi | Bugün, denemeler/liste-detay, sonuç, soru/kazanım analizi, durum ve yayın bekleme |

Her ekranda webin öncelikli eylemi, veri sırası, bölüm başlıkları ve görsel yoğunluğu korunur. Tablolar gerektiğinde kolon başlıkları ve ilişkileri anlaşılır native satırlara uyarlanır. Grafik/sayı göstergeleri dekoratif yeni metrik üretmez. ODK native sınav başlatma eklenmez; mevcut browser/bilgisayar gereği açık kalır.

Çıkış ölçütü: üç ürünün tüm mevcut native öğrenci ekranlarında component/spacing/typography/marka tutarlılığı.

## Aşama 5 — Veli, öğretmen, koç ve genel ekranlar

- Veli: çocuk seçimi, ana sayfa, ders/ödev takibi, gelişim, koçluk, deneme raporları, öğretmenler, haftalık ve hesap.
- Öğretmen: bugün, ders/oturum, ödev/teslim inceleme, yardım talepleri, mevcut Deneme Ligi raporları.
- Koç: bugün, öğrenci/liste-detay, plan/liste-detay, görüşme/liste-detay.
- Genel: bildirimler, bildirim tercihleri, hesap, gizlilik, hesap silme, güvenlik/oturum, erişim/bağlantı hataları ve web devam ekranları.
- Mevcut ADMIN web devam kapsamı korunur; yeni native admin paneli veya M8 özelliği yapılmaz.

Çıkış ölçütü: hiçbir mevcut native ekran eski bağımsız görsel dilde kalmaz; rol sınırları korunur.

## Aşama 6 — Gerçek cihaz ve görsel kabul

- Kullanıcının bağlı iPhone'u birincil cihaz; mümkünse küçük/geniş ekran ve Android için ek kontrol.
- Güvenli alan, klavye açık/kapalı, uzun Türkçe metinler, büyük yazı, kaydırma sonu, alt bar/CTA çakışması ve geri hareketi.
- Aynı fixture ve ekran durumunda web referansı/native karşılaştırması: logo, renk, typography, boşluk, radius, ikon, içerik sırası ve eylemler.
- Dolu, boş, loading, hata, offline, disabled, selected ve yetkisiz durumlar.
- Üç ürün arasında art arda geçişte eski ürün rengi, menüsü veya verisi kalmaması.
- Mevcut mobile typecheck/lint/141-test suite, contracts/tokens/hygiene kontrolleri; yeni otomatik test suite oluşturma.
- Expo Go temel görünüm/etkileşim kontrolü; native permission, push, splash ve imzalı build değerlendirmesi ayrı release kontrolleri.
- Görsel sorun listesi ve önce/sonra kanıtlarıyla teslim; build/test başarısı görsel kabul yerine geçmez.

Çıkış ölçütü: okunamayan/kesilen ana içerik, hatalı aktif ürün, erişilemeyen temel eylem ve tasarım referansından açıklanmamış önemli sapma yok.

## Kapsam sınırları ve teslim sırası

Mobil PAYTR, satış, fiyatlandırma CTA ve abonelik checkout yok. Backend iş kuralları, rol tanımları, mevcut auth/MFA ve ürün erişim kapıları tasarım için gevşetilmez. Pazarlama sitesinin satış akışları uygulamaya taşınmaz. Tasarım işi M8 veya yeni native özellik açmaz.

Uygulama sırası: envanter → ortak bileşenler → auth/kabuk → OD → Yön Koçluk → Deneme Ligi → veli/personel/genel → gerçek cihaz/görsel kabul. Her dilim incelenebilir commit olarak hazırlanır. İlk plan turunda kod değiştirilmedi; sonraki uygulama ve doğrulamalar ayrı raporda kayıtlıdır.
