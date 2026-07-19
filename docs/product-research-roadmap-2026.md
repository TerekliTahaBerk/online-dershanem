# Online Dershanem — Ürün, UX, Teknik Mimari ve Pazar Araştırması

**Araştırma tarihi:** 19 Temmuz 2026  
**Kapsam:** Ürün ve yol haritası araştırması; uygulama yapılmamıştır. Ödeme takvimi/taksit modeli ile gerçek WhatsApp sağlayıcı entegrasyonu kapsam dışıdır.

## Yönetici özeti

Online Dershanem'in en güçlü tarafı, genel amaçlı bir LMS olmaktan çok dört rolün aynı ders yaşam döngüsünde çalışması ve öğretmenin ders sonunu tek ekranda kapatabilmesidir. En büyük ürün boşluğu ise verinin var olmasına rağmen henüz bir **öğrenme karar sistemine** dönüşmemesidir. Katılım, not, ödev ve çalışma verileri ayrı ayrı görünür; fakat “hangi kazanım eksik, hata neden oldu, öğrenci şimdi ne yapmalı, öğretmen ne zaman müdahale etmeli ve veliye bunu nasıl sakin biçimde anlatmalıyız?” zinciri tamamlanmamıştır.

Pazar karşılaştırması da aynı noktayı gösteriyor. MEBİ, Raunt ve Doping Hafıza; deneme, eksik analizi, çalışma planı ve AI asistanı sunuyor. Google Classroom ve Canvas kazanım/ustalık takibi yapıyor. TutorBird, Teachworks ve TutorCruncher ders kapanışı ile aile iletişimini hızlandırıyor. Online Dershanem'in bunların tamamıyla içerik miktarında yarışması doğru değildir. Savunulabilir fark şu olmalıdır:

> **Öğretmenin doğruladığı gerçek ders ve deneme kanıtından, öğrencinin bir sonraki en küçük doğru eylemini ve gerektiğinde insan müdahalesini üretmek.**

İlk ürün fazı; kazanım omurgası, deneme/hata analizi, aralıklı yanlış tekrar kuyruğu, istisna odaklı iki dakikalık ders kapanışı ve sakin veli özeti üzerine kurulmalıdır. Öğrenciye açık uçlu AI sohbeti bu fazda yapılmamalıdır.

## Yöntem ve puanlama

Araştırma; repo içindeki README, Prisma şeması, panel operasyon kılavuzu, E2E kapsamı ve arayüz bileşenleri ile; MEB/ÖSYM/KVKK, W3C, OWASP, NIST, UNESCO ve UNICEF kaynakları; yerli ve global rakiplerin resmi ürün belgeleri; seçili akademik derleme ve deneylerle yürütüldü.

Öncelik puanı, brief'teki sıra korunarak ağırlıklandırıldı:

1. Eğitim etkisi — **30 puan**
2. Kullanım kolaylığı — **20 puan**
3. Öğretmenin zaman kazanması — **17 puan**
4. Öğrenci ve çocuk güvenliği — **15 puan**
5. Teknik risk — **10 puan** (düşük risk daha yüksek puan)
6. Ticari değer — **8 puan**

Puanlar iş vakası tahminidir; gerçek öncelik, 4–6 haftalık pilot verisiyle güncellenmelidir.

---

## A. Mevcut ürünün güçlü yönleri

1. **Dört rol tek işlem zincirinde:** Admin, öğretmen, öğrenci ve veli ayrı ekranlar değil, aynı grup–ders–ödev–materyal modeline bağlı. Bu, yeni içgörülerin rol bazında doğru kişiye yönlendirilmesi için iyi bir temel.
2. **Güvenlik mimarisi ürünün içine gömülü:** Sayfa ve API seviyesinde rol/yatay erişim kontrolü, private materyal teslimi ve dört rollü erişim E2E testleri mevcut. Bu, çocuk verisi işleyen bir ürün için önemli bir başlangıç avantajı.
3. **Öğretmen iş akışı doğru yerde yoğunlaşıyor:** Yoklama, ortak/özel not, şablon ve otomatik kayıt aynı ders ekranında. TutorBird ve Teachworks'ün de pazarladığı “express/bulk attendance + lesson notes” kalıbıyla uyumlu; ürün doğru operasyon problemine odaklanmış.
4. **Öğrenci yalnızca pasif izleyici değil:** Haftalık hedef, seri, rozet ve ilerleme grafikleri davranış döngüsünü başlatıyor.
5. **Veli erişimi sınırlandırılmış ve anlaşılır:** Bağlı öğrenci üzerinden ödev, katılım, materyal ve ödeme görünümü; farklı `studentId` denemesinin 404 olması iyi bir güvenlik/mahremiyet tercihi.
6. **Operasyon olgunluğu MVP seviyesinin üzerinde:** Health/smoke kontrolleri, yapılandırılmış hata kaydı, e-posta outbox'ı, şifreli yedek ve gerçek geçici veritabanına restore doğrulaması mevcut.
7. **İhraca ve birlikte çalışabilirliğe başlangıç var:** CSV ve ICS, kullanıcıyı tamamen kapalı sisteme hapsetmiyor.
8. **Mobil ve erişilebilirlik için test zemini var:** Public accessibility E2E ve cross-browser panel testi mevcut; WCAG 2.2 AA hedefi için sıfırdan başlanmayacak.

## B. Kritik eksikler ve kullanıcı problemleri

| Kritik boşluk | Bugünkü kullanıcı problemi | Neden mevcut özellik bunu çözmüyor |
|---|---|---|
| Kazanım/konu omurgası yok | Öğretmen “öğrenci zorlanıyor” diyebilir ama tam olarak hangi LGS/YKS kazanımında, ne kadar kalıcı ve hangi kanıtla olduğunu göremez | Not, ödev ve katılım kayıtları akademik standarda bağlı değil |
| Deneme ve soru düzeyi hata analizi yok | LGS/YKS öğrencisinin neti değişse bile bilgi eksiği, işlem hatası, süre veya dikkatsizlik ayrışmıyor | Genel ilerleme grafiği sınav teşhisi değildir |
| Ders verisi bir sonraki eyleme bağlanmıyor | Öğretmen aynı eksikliği tekrar okuyup manuel ödev/hatırlatma üretir | Otomatik kayıt zaman kazandırır; karar otomasyonu sağlamaz |
| Öğrenci planı kanıta göre yeniden dengelenmiyor | Kaçırılan günler suçluluk ve biriken görev üretir; öğrenci “bugün en doğru küçük adım ne?” sorusuna cevap bulamaz | Haftalık hedef nicelik gösterir, öncelik ve telafi mantığı sunmaz |
| Veli ekranı “ham durum” ağırlıklı | Sık kontrol, kırmızı uyarı ve tekil kötü günler gereksiz kaygı/çatışma yaratabilir | Görünürlük vardır; sakin özet, eğilim ve eylem dili yoktur |
| Müdahale sahipliği yok | Risk görüldüğünde kimin, ne zaman, ne yapacağı kaybolur | Admin raporu liste üretir; vaka/sahip/SLA/sonuç döngüsü kurmaz |
| Öğrencinin açıklaması/veri bağlamı zayıf | Devamsızlık veya ödev gecikmesi motivasyonsuzluk sanılabilir; sağlık, cihaz, yoğunluk veya anlamama ayrışmaz | Davranış verisi var, düşük sürtünmeli öğrenci check-in'i yok |
| Ödev “durum” odaklı, kanıt/geri bildirim döngüsü sınırlı | “Tamamlandı” gerçek öğrenmeyi göstermeyebilir | Teslim kanıtı, rubric, yeniden deneme ve kazanım bağlantısı yok |
| Erişilebilirlik kullanıcı tercihi olarak modellenmiyor | Ek süre, azaltılmış hareket, altyazı/transkript, yüksek kontrast gibi ihtiyaçlar her derste yeniden anlatılır | Test var; kişiye özel makul düzenleme profili yok |
| Zayıf bağlantıda kritik yazma akışları kırılabilir | Mobil internet kesilince yoklama/not/ödev güncellemesi kaybolabilir veya iki kez gönderilebilir | Otomatik kayıt çevrim içi varsayımına dayanır; offline outbox/idempotency görünmüyor |
| KVKK yaşam döngüsü ürünleştirilmemiş | Aydınlatma, saklama, silme, dış hizmet aktarımı ve erişim incelemesi operasyonel dokümana bağlı kalır | Güvenli erişim var; veri envanteri, retention ve veri sahibi talep iş akışı ayrı bir katmandır |
| Gözlemlenebilirlik kullanıcı yolculuğu düzeyinde değil | `/health` yeşilken ders kaydı gecikebilir, e-posta kuyruğu büyüyebilir veya belirli rolde hata oluşabilir | Teknik sağlık kontrolü, iş SLI/SLO'su değildir |

### Türkiye'ye özgü ürün çıkarımları

- 2026 LGS, 8. sınıf kazanımlarını; okuduğunu anlama, yorumlama, sonuç çıkarma, problem çözme, analiz ve bilimsel süreç becerilerini ölçüyor. Dolayısıyla yalnız “konu tamamlandı” değil, **beceri ve hata türü** izlenmeli. Sınav iki oturumlu ve süre baskısı içeriyor; deneme analizi süreyi ayrı sinyal olarak tutmalı. [MEB 2026 LGS kılavuz duyurusu](https://www.meb.gov.tr/2026-lgs-kapsamindaki-merkezi-sinav-icin-basvuru-ve-uygulama-kilavuzu-yayimlandi/haber/40200/tr)
- YKS, TYT/AYT/YDT oturumlarına ayrılıyor; çalışma planı sınav türü, alan ve hedefe göre farklı ağırlıklandırılmalı. [ÖSYM 2026-YKS başvurusu](https://www.osym.gov.tr/TR%2C33850/2026-yks-basvurularin-alinmasi-06022026.html)
- MEBİ artık ücretsiz biçimde LGS/YKS denemeleri, adaptif test, çalışma planı, ayrıntılı raporlama, rehberlik ve AI asistan sunuyor. Bu nedenle yalnızca “AI çalışma planı” veya “deneme ekranı” ücretli farklılaşma değildir. [MEBİ resmi ürün sayfası](https://mebi.eba.gov.tr/)
- MEB'in örnek soruları ve çözümleri düzenli yayımlanıyor. İçerik kopyalamak yerine izin/lisans sınırlarına dikkat ederek resmi kaynağa derin bağlantı ve öğretmen tanımlı kazanım eşleme daha sürdürülebilir. [MEB Nisan 2026 örnek soruları](https://www.meb.gov.tr/mebide-lgs-ogrencileri-icin-nisan-ayi-ornek-sorulari-yayimlandi/haber/40594/tr)

---

## C. En değerli 15 yeni geliştirme fikri

> Boyut varsayımı: Mevcut ekip ve mimaride üretime hazır, testli sürüm. S: birkaç gün, M: 1–3 hafta, L: 3–6 hafta, XL: 6+ hafta. “AI” geçen her özellik için öğretmen onayı, maliyet limiti ve veri minimizasyonu dahildir.

| # | Özellik | Hedef rol | Çözdüğü problem | Kullanıcı değeri | Eğitim sonucuna etkisi | Teknik zorluk | Veri/gizlilik riski | Boyut | Başarı metriği | Puan | Neden şimdi / ertele |
|---:|---|---|---|---|---|---|---|:---:|---|---:|---|
| 1 | **LGS/YKS kazanım omurgası ve kanıt defteri** | Öğretmen, öğrenci, admin | Not/ödev/deneme verisi ortak akademik dile bağlı değil | Her ders ve görev 1–3 kazanıma bağlanır; öğrenci “çalıştım” yerine hangi beceride kanıt ürettiğini görür | Eksiklerin erken ve tutarlı teşhisi; öğretim hedefi ile görev hizası | Müfredat sürümleme, çoklu ders/alan, veri göçü | Düşük–orta; akademik profil hassastır, rol bazlı özet gerekir | L | Kazanım etiketli ders/görev oranı; 4 haftada mastery değişimi | **94** | Diğer tüm kişiselleştirme ve ölçüm bunun üzerine kurulacağı için şimdi |
| 2 | **Deneme analizi: net + süre + hata nedeni** | Öğrenci, öğretmen | Net değişimi kök nedeni göstermiyor | Hızlı manuel/CSV giriş; yanlışları bilgi, işlem, dikkat, süre, boş bırakma olarak sınıflandırma; ders/konu ısı haritası | Doğru müdahale seçimini ve sınav stratejisini iyileştirir | Farklı yayın/formatlar; optik okuma daha sonra | Orta; sınav performansı ve hedef bilgisi hassas | M (manuel/CSV), XL (optik) | Analiz edilen deneme oranı; aynı hata türünün 3 denemede tekrarı | **93** | Türkiye sınav bağlamının çekirdek ihtiyacı; optik okumayı ertele |
| 3 | **Aralıklı “yanlışlarım ve geri çağırma” kuyruğu** | Öğrenci, öğretmen | Yanlış öğrenildikten sonra unutuluyor; öğrenci neyi tekrar edeceğini seçemiyor | Günlük 5–10 dakikalık, geçmiş yanlışlardan ve zayıf kazanımlardan oluşan küçük tekrar listesi; doğru/emin değil/yanlış | Retrieval practice ve aralıklı tekrar kalıcı öğrenmeyi destekler | Basit zamanlama ile başlanabilir; içerik/çözüm telifi gözetilmeli | Düşük–orta; öğrenci performans profili | M | 7/30 günlük yeniden çözüm doğruluğu; kuyruk tamamlama; kalıcılık | **92** | Yüksek eğitim etkisi, sınırlı kapsam ve AI gerektirmemesi nedeniyle şimdi |
| 4 | **İstisna odaklı iki dakikalık ders kapanışı** | Öğretmen | Öğretmen her öğrenci için tekrar eden alanları dolduruyor ve sonra ayrı ödev üretiyor | Varsayılan yoklama + önceki ders bağlamı + toplu işlem; yalnız farklı olanı düzenleme; “not → sonraki eylem/ödev taslağı” | Geri bildirimin zamanında verilmesini ve takip sürekliliğini artırır | Mevcut çalışma alanına dikkatli state/idempotency eklemek gerekir | Düşük; mevcut veri türleri | M | Ders bitişinden tam kayda medyan süre <120 sn; geri dönüş/düzeltme oranı | **91** | Ana ürün vaadini doğrudan güçlendirdiği için şimdi |
| 5 | **Öğretmen onaylı uyarlanabilir haftalık plan ve “bugünün 3 işi”** | Öğrenci, öğretmen | Biriken görevler bunaltıyor; plan performansa göre toparlanmıyor | Kapasite/uygunluk + yaklaşan sınav + eksik kazanıma göre üç öncelik; kaçan günleri cezasız yeniden dengeler | Düzenlilik, öz-düzenleme ve doğru konuya zaman ayırma artar | Kısıt çözücü, açıklanabilir öncelik, plan sürümleme | Orta; davranış ve hedef profili; öğrenci üzerinde baskı riski | L | Plan kabul oranı; haftalık tamamlama; gecikmiş görev azalması; opt-out | **90** | Kazanım ve deneme verisi hazır olduğunda hemen; onlarsız “AI takvim” yüzeysel kalır |
| 6 | **Sakin veli haftalık özeti** | Veli, öğrenci, öğretmen | Ham bildirim ve günlük dalgalanma kaygı/çatışma üretiyor | Haftada bir: “iyi giden 2 şey, destek gereken 1 şey, evde sorulabilecek 1 soru”; karşılaştırma yok, eğilim ve veri tazeliği açık | Özerklik destekleyici aile katılımı ve daha yapıcı konuşma | Kural tabanlı özet kolay; ton/izin/çoklu veli politikası gerekir | Orta–yüksek; çocuğa ait davranış ve akademik yorum paylaşılır | M | Özet açılma; bildirim kapatma azalması; veli/öğrenci “kaygı yarattı” pulse'u | **88** | Mevcut veli verisinin değerini hızla artırır; gerçek zamanlı kırmızı alarm yerine şimdi |
| 7 | **Açıklanabilir müdahale gelen kutusu (vaka yönetimi)** | Admin, öğretmen | Risk listeleri eyleme ve sahipliğe dönüşmüyor | “Neden işaretlendi”, sahip, önerilen küçük eylem, son tarih, not ve sonuç; snooze/yanlış pozitif | Erken ve tutarlı insan müdahalesi; öğrencinin gözden kaçmasını azaltır | Kural motoru, vaka durumu, bildirim ve audit | Yüksek; profil çıkarma ve yanlış etiketleme riski | L | İlk aksiyona süre; kapanan vaka; yanlış pozitif; müdahale sonrası toparlanma | **87** | Önce açıklanabilir kurallarla; tahmine dayalı ML'yi veri/etik denetim oluşana kadar ertele |
| 8 | **Kanıtlı ödev teslimi, hafif rubric ve yeniden deneme** | Öğrenci, öğretmen | “Tamamlandı” öğrenme kanıtı değil; geri bildirim dağınık | Foto/PDF/metin teslimi, 2–4 ölçütlü rubric, sesli/kısa geri bildirim, revize et | Geri bildirim döngüsü ve ustalık kanıtı güçlenir | Dosya işleme, kota, güvenli tarama, mobil yükleme | Yüksek; çocuk el yazısı/görüntüsü ve dosya metadata'sı | L | Geri bildirim süresi; yeniden teslim sonrası kazanım artışı; öğretmen dakika/ödev | **85** | Eğitim değeri yüksek; önce dosya güvenliği, kota ve retention tasarlanmalı |
| 9 | **Düşük sürtünmeli öğrenci check-in'i ve yardım isteği** | Öğrenci, öğretmen | Davranış verisi “neden”i göstermiyor; öğrenci yardım istemeyi erteliyor | Haftada 2 kez enerji/güven/engel seçimi + “öğretmenim görsün” kontrolü; tanı koymayan dil | Aidiyet, yardım arama ve yanlış müdahalenin azalması | Eskalasyon politikası ve hassas kelime akışı gerekir | Yüksek; ruh sağlığı çıkarımı yapılmamalı, acil durum sınırı açık olmalı | M | Yardım isteğine yanıt süresi; check-in tamamlama; fayda skoru | **84** | Sade seçeneklerle pilot; serbest metinli “AI terapist” asla değil |
| 10 | **Ders kaçırma sonrası otomatik telafi paketi** | Öğrenci, öğretmen | Devamsız öğrenci hangi not/materyal/ödevi hangi sırada yapacağını bilmiyor | Ders kaydı sonrası öğretmenin tek onayıyla özet, materyal, mini kontrol ve yeni tarih; plan otomatik yeniden dengelenir | Öğrenme açığının büyümesini ve kopuşu azaltır | Mevcut ders/materyal/ödev verisini birleştirme | Orta; özel not yanlışlıkla paylaşılmamalı | M | Devamsızlık sonrası 72 saatte telafi; sonraki derse katılım | **83** | Mevcut veriyi yeni değer zincirine soktuğu için orta vadede |
| 11 | **Kohort öğrenme kazancı ve öğretim kalite panosu** | Admin, öğretmen | Tamamlama sayısı kaliteyi göstermiyor; öğretmenler arası karşılaştırma adaletsiz olabilir | Başlangıç seviyesine göre kazanım, geri bildirim gecikmesi, tekrar eden ortak eksik; minimum örneklem ve anonimleştirme | İçerik/öğretim sorununu erken bulur, iyi pratiği yayar | Veri modeli, baseline ve istatistiksel guardrail | Yüksek; çalışan ve çocuk profilleme/performans sıralama riski | L | Öğrenme kazancı; müdahale sonrası değişim; veri kapsamı | **81** | Kazanım verisinden sonra; ham öğretmen sıralaması ve prim bağlantısı ertelenmeli/yasaklanmalı |
| 12 | **AI öğretmen yardımcısı: yalnız taslak ve kaynaklı öneri** | Öğretmen | Notlardan ödev, veli özeti veya mini kontrol üretmek zaman alıyor | Yapılandırılmış ders verisinden taslak; kullanılan kaynak/kazanım görünür; diff + zorunlu öğretmen onayı; öğrenciye otomatik yayın yok | Daha hızlı, daha tutarlı fakat insan denetimli materyal/geri bildirim | Model gateway, RAG, eval seti, maliyet/latency, fallback | Yüksek; yurt dışı aktarım, halüsinasyon, prompt injection, çocuk verisi | L | Kabul/düzenleme oranı; kazanılan dakika; hata/şikâyet; maliyet/onaylı çıktı | **79** | Önce kural tabanlı çekirdek ve eval; açık sohbetten önce dar öğretmen araçları |
| 13 | **Offline-first öğretmen kapanışı ve düşük veri modu** | Öğretmen, öğrenci, veli | Zayıf bağlantıda kritik kayıt kaybı ve ağır materyal tüketimi | Draft/outbox, bağlantı durumu, güvenli yeniden deneme, metin/transkript önceliği, video kalite seçimi | Kesintisiz erişim; düşük bağlantılı kullanıcıların dışlanmasını azaltır | Service worker, conflict resolution, idempotency, cache güvenliği | Orta; ortak cihazda hassas verinin cache'lenmesi | L | Offline kaydın başarılı senkronu; veri tüketimi; kayıt kaybı/çift kayıt | **78** | Mobil gerçek kullanım ölçülerek; hassas içeriği cihazda minimum tutarak |
| 14 | **Erişilebilirlik ve makul düzenleme profili** | Tüm roller, admin | Her kullanıcı aynı zamanlama/görsel/medya varsayımına zorlanıyor | WCAG 2.2 AA; azaltılmış hareket, yüksek kontrast, klavye/ekran okuyucu, altyazı/transkript, sınav ek süre profili; öğrenciye damga vurmayan UX | Engelli ve öğrenme farklılığı olan öğrencilerin eşit katılımı | Tasarım sistemi ve medya iş akışına yayılır | Orta; engel/sağlık verisi özel nitelikli olabilir, gereksiz tanı tutulmamalı | L | Axe + manuel görev başarısı; accommodation kullanılan oturum başarısı | **77** | Temel erişilebilirlik hemen; sağlık tanısı yerine işlevsel tercih sakla |
| 15 | **Çocuk veri güvenliği merkezi ve sürekli yetki doğrulama** | Admin, veli, öğrenci | KVKK yaşam döngüsü, dış servis aktarımı ve ilişki değişince erişim dağınık kalabilir | Veri envanteri/retention, dış hizmet listesi, veli/öğrenciye anlaşılır veri görünümü, erişim dışa aktar/silme talebi, ilişki sonlanınca otomatik erişim kesme, nesne-seviyesi auth test matrisi | Doğrudan akademik değil; güvenli katılım ve kurum güveni için temel | Hukuk+ürün+altyapı; silme/backup istisnaları ve audit | Riski azaltır; uygulama hatası çok yüksek etki yaratır | L | Yetkisiz erişim testi geçişi; süresi dolan veri; talep SLA; ilişki kesme süresi | **76** | Yeni analitik/AI'dan önce release gate; KVKK hukuki değerlendirmesi gerekir |

### Fikirlerin kesin öncelik sırası

Brief'teki kriter sırası ve yukarıdaki ağırlıklar uygulanınca sıra şöyledir:

1. LGS/YKS kazanım omurgası ve kanıt defteri — 94
2. Deneme analizi: net + süre + hata nedeni — 93
3. Aralıklı yanlışlarım/geri çağırma kuyruğu — 92
4. İstisna odaklı iki dakikalık ders kapanışı — 91
5. Öğretmen onaylı uyarlanabilir haftalık plan — 90
6. Sakin veli haftalık özeti — 88
7. Açıklanabilir müdahale gelen kutusu — 87
8. Kanıtlı ödev teslimi, rubric ve yeniden deneme — 85
9. Öğrenci check-in'i ve yardım isteği — 84
10. Ders kaçırma sonrası telafi paketi — 83
11. Kohort öğrenme kazancı ve öğretim kalite panosu — 81
12. AI öğretmen yardımcısı — 79
13. Offline-first ve düşük veri modu — 78
14. Erişilebilirlik/makul düzenleme profili — 77
15. Çocuk veri güvenliği merkezi — 76

**Önemli bağımlılık notu:** 15 numara puan sıralamasında eğitim etkisi nedeniyle aşağıda görünse de bir **özellik sırası değil, release gate** olarak ele alınmalıdır. Analitik, dosya teslimi veya AI pilotundan önce ilgili güvenlik/retention/aktarım kontrolleri tamamlanmalıdır.

---

## D. Hızlı kazanımlar — 1–3 gün

1. **Ders kapanışı süre ölçümü:** `lesson_close_started/completed`, alan başına etkileşim ve düzeltme event'lerini ekleyip gerçek 2 dakika baz çizgisini çıkarma.
2. **“Tüm öğrenciler katıldı” ve “önceki dersle aynı” kısayolları:** İstisna odaklı kapanışın risksiz ilk adımı.
3. **Ders notuna “sonraki küçük adım” alanı:** Yeni bir ödev oluşturmadan öğretmen kararını görünür kılar; sonraki fazın veri tohumu olur.
4. **Veli ekranında veri tazeliği ve bağlam:** “Son 7 gün / önceki 7 güne göre” dili; tek günlük kötü sonucu alarm rengine çevirmeme.
5. **Bildirimlerde sessiz saat ve toplu özet seçeneği:** Anlık bildirim yorgunluğunu azaltır; WhatsApp gerektirmez.
6. **Öğrenci seri koruma:** Kaçırılan bir gün seriyi sıfırlamak yerine “ara verdin, bugün küçük dönüş yap” dili; sıralama yok.
7. **WCAG 2.2 kritik kontrol listesi:** 24×24 minimum hedef, görünür odak, 200% reflow, hata metni, parola yöneticisi/copy-paste engeli olmaması. [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
8. **Yetki ilişki tablosu testi genişletme:** Veli–öğrenci, öğretmen–grup, materyal–üyelik ilişkisinin create/read/update/delete ve eski üyelik senaryoları. OWASP her nesne isteğinde kontrol öneriyor. [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
9. **AI olmayan taslaklar:** Geç/eksik ödev için utandırmayan, eylem odaklı 6–8 Türkçe mesaj şablonu.

## E. Orta vadeli yatırımlar — 1–3 hafta

1. Deneme girişi v1: sınav türü, tarih, ders bazında doğru/yanlış/boş/süre; toplu hızlı giriş ve CSV.
2. Hata nedeni sözlüğü ve öğrenci/öğretmen ortak düzeltmesi.
3. Yanlış tekrar kuyruğu v1: sabit 1–3–7–14 günlük zamanlama ve üçlü güven cevabı.
4. Sakin veli özeti v1: kural tabanlı, haftalık, önizlemeli ve öğrenci görünürlüğüyle.
5. Yardım isteği: “konuyu anlamadım / plan çok yoğun / teknik sorun / öğretmenle konuşmak istiyorum”.
6. Müdahale kutusu v1: yalnız deterministik kurallar; sahip, snooze ve sonuç.
7. İş SLI panosu: ders kaydı başarı/latency, e-posta outbox yaşı, private dosya indirme başarısı, rol bazlı hata oranı.

## F. Stratejik ürünler — bir aydan uzun

1. Sürümlenebilir MEB/ÖSYM kazanım grafiği ve kanıt tabanlı mastery modeli.
2. Öğretmen onaylı adaptif planlama ve kaçan günleri cezasız yeniden dengeleme motoru.
3. Kanıtlı ödev, rubric, güvenli dosya tarama/kota/retention ve revizyon akışı.
4. Açıklanabilir erken müdahale vaka sistemi ve kontrollü etki deneyi.
5. Offline-first yazma/outbox, çatışma çözümü ve düşük veri medya seçenekleri.
6. Dar görevli AI öğretmen araçları için model gateway, eval laboratuvarı, maliyet tavanı ve KVKK aktarım mekanizması.
7. Kohort öğrenme kazancı ve kalite iyileştirme panosu; minimum grup büyüklüğü ve adil karşılaştırma guardrail'leri.

---

## G. Özellikle yapılmaması gereken fikirler

1. **Öğrenci veya öğretmen liderlik tablosu:** Başarı düzeyi farklı öğrencileri teşhir eder, düşük sıradakileri demotive eder ve öğretmeni “kolay puan”a iter. Sistematik incelemeler etkiyi bağlama bağlı buluyor; puan/rozet/liderlik kombinasyonunun olumsuz etkileri de raporlanıyor. [ERIC leaderboard sistematik incelemesi](https://eric.ed.gov/?id=EJ1448426)
2. **Seri bozuldu cezası, kayıp korkusu ve sonsuz bildirim:** Sağlıklı alışkanlık yerine uygulama bağlılığı optimize eder. UNICEF'in çocuk refahı çerçevesindeki özerklik, duygu, güvenlik ve yeterlik ilkelerine aykırıdır. [UNICEF RITEC tasarım araçları](https://www.unicef.org/childrightsandbusiness/workstreams/responsible-technology/online-gaming/ritec-design-toolbox)
3. **Veliye gerçek zamanlı kırmızı “risk” akışı:** Tekil kötü günleri büyütür, çocuğun her hareketini gözetim nesnesine dönüştürür. Haftalık eğilim + önerilen destek davranışı daha iyi varsayılandır.
4. **AI'nın öğrenciye not vermesi, tanı koyması veya otomatik disiplin/riske ataması:** Halüsinasyon, önyargı ve itiraz edilebilirlik riski yüksek. AI yalnız taslak/öneri üretmeli; nihai karar insanda olmalı.
5. **Çocuklara açık uçlu AI arkadaş/terapist:** Eğitim kapsamını aşar ve ilişkisel bağımlılık/güvenlik riski taşır. UNICEF 2026, çocukların AI companion sistemlerinde önleyici koruma gerektiğini vurguluyor. [UNICEF AI chatbot/companion politika özeti](https://www.unicef.org/documents/when-ai-becomes-friend-child-rights-risks)
6. **Kaynaksız “AI soru çözümü”nü doğrudan doğru kabul etmek:** Yanlış çözüm öğrenmeyi bozar. Model çıktısı resmi/öğretmen onaylı kaynakla sınırlandırılmalı; güven ve kaynak gösterilmeli; öğretmene itiraz yolu sunulmalı.
7. **Türkiye geneli sıralama tahmini ana ekranı:** Veri örneklemi temsili değilse sahte kesinlik ve kaygı üretir. Aralık, belirsizlik ve yalnız öğretmen/öğrenci isteğiyle gösterim olmadan yapılmamalı.
8. **Her şeyi video/soru bankası olarak içeride üretmek:** MEBİ ücretsiz ve geniş içerik sunarken yüksek maliyetli, düşük savunulabilirlikli bir yarış olur.
9. **Ham öğretmen performans sıralaması veya otomatik prim:** Öğrenci başlangıç düzeyi, grup büyüklüğü ve ders bağlamını cezalandırır; veri manipülasyonu doğurur.
10. **Sadece UUID kullanıp yatay erişimi çözülmüş saymak:** OWASP'a göre tahmin edilemez kimlik, nesne düzeyi yetki kontrolünün yerine geçmez. [OWASP IDOR rehberi](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)
11. **Açık rızayı zorunlu hizmet koşuluna paketlemek:** KVKK, belirli olmayan “battaniye rıza”yı uygun görmez ve rızanın geri alınabilir olduğunu belirtir. [KVKK açık rıza rehberi](https://www.kvkk.gov.tr/Icerik/2037/Acik-Riza-Alirken-Dikkat-Edilecek-Hususlar)

---

## H. İlk uygulanması gereken 5 özellik için ayrıntılı yol haritası

### Faz 0 — 2 hafta: ölçüm, sözlük ve güvenlik kapıları

- 8–12 öğretmen, 20 öğrenci ve 10 veliyle görev bazlı görüşme: ders kapanışı, deneme analizi, planlama ve veli konuşması.
- Ders kapanışı süre/alan baz çizgisi; mevcut ödev/katılım/seri ölçümleri.
- LGS ve YKS için `CurriculumVersion → Subject → Unit → Outcome → Skill` sözlüğünün ilk kapsamı; değişiklik ve arşiv politikası.
- Veri sınıflandırması: normal, çocuk akademik profili, özel nitelikli olabilecek accommodation/check-in; saklama ve rol görünürlüğü.
- Deneme ve AI özellikleri için tehdit modeli; dış hizmet/yurt dışı aktarım envanteri. KVKK'nın 2024 sonrası rejiminde standart sözleşme uygun güvence yöntemidir ve imzadan sonra bildirim süresi vardır; hukuk danışmanı ile doğrulanmalıdır. [KVKK yurt dışı aktarım rehberi](https://www.kvkk.gov.tr/Icerik/8142/Kisisel-Verilerin-Yurt-Disina-Aktarilmasi-Rehberi)

**Çıkış ölçütü:** Öğretmenlerin en az %80'i ilk 100 kazanımın dilini anlaşılır buluyor; ders kapanışı p50/p90 ölçülüyor; veri/retention matrisi onaylı.

### Faz 1 — 2–3 hafta: kazanım omurgası v1

- Öğretmen ders/ödev oluştururken aramayla en fazla 3 kazanım seçer; favori/son kullanılanlar.
- “Kazanım seçmeden devam et” mümkündür ama gerekçe/sonradan tamamlama kuyruğu vardır; zorunluluk iş akışını bozmaz.
- Kanıt türleri: işlendi, gözlendi, bağımsız uyguladı, tekrar gerekli. Sayısal “mastery puanı” ilk sürümde öğrenci/veliye gösterilmez.
- Öğrenci görünümü: “Bu hafta kanıt ürettiğim beceriler” ve “tekrar edeceğim iki beceri”.
- Admin: etiketleme kapsamı ve müfredat sürümü; öğretmen sıralaması yok.

**Deney:** 4 hafta boyunca iki grupta kazanım etiketli/etiketsiz görev karşılaştırması.  
**Çıkış ölçütü:** Ders/görevlerin ≥%70'i 15 saniye içinde etiketleniyor; öğretmenlerin ≥%60'ı etiketi sonraki planlamada kullanıyor.

### Faz 2 — 2–3 hafta: deneme analizi v1

- LGS ile TYT/AYT/YDT şablonları; doğru/yanlış/boş, süre ve opsiyonel yayın/deneme adı.
- Mobil hızlı giriş: sayısal klavye, toplu yapıştırma, toplam soru doğrulaması, son değeri geri alma.
- En fazla 3 hata nedeni; öğrenci seçer, öğretmen düzeltebilir. Değişiklik audit edilir.
- Isı haritası kişi içi eğilim gösterir; sınıf sırası ve sahte yüzdelik yok.
- “Sonraki eylem”: en yüksek tekrarlı hata için tek küçük öneri; öğretmen onayı.

**Çıkış ölçütü:** Bir deneme girişi p50 <3 dakika; öğrencilerin ≥%50'si hata nedeni giriyor; öğretmenlerin ≥%70'i ısı haritasını doğru yorumluyor.

### Faz 3 — 2 hafta: yanlış tekrar kuyruğu

- Deneme yanlışı veya öğretmen işaretli zayıf kazanım kuyruk öğesi olur.
- İlk algoritma deterministik: yanlış/emin değil/doğru yanıtına göre 1–3–7–14–30 gün; başarısızlıkta cezalı “sıfır” dili yok.
- Günlük üst sınır ve “bugün ertele” hakkı; öğrenci özerkliği.
- Sorunun telifli görselini kopyalamak yerine kaynak referansı veya öğretmenin kendi materyali; çözüm notu.
- Öğretmen, aşırı büyüyen kuyruk ve kalıcı hata sinyali görür.

**Çıkış ölçütü:** 7 günlük yeniden çözüm ≥%60; 30 günlük kalıcılık baz çizgiye göre artıyor; bildirim opt-out < %15.

### Faz 4 — 2 hafta: istisna odaklı ders kapanışı

- Önceki ders ve grup varsayımları; toplu yoklama; değişmeyen öğrenciyi atlama.
- Not şablonundan yapılandırılmış alanlar: kazanım, gözlem, sonraki küçük adım.
- “Ödev taslağı oluştur” yalnız seçilen öğrencilere ve öğretmen önizlemesiyle.
- Offline olmasa bile idempotency key, draft state ve çakışma uyarısı; çift kayıt önleme.
- Kapanış sonunda süre gösterilmez; öğretmeni yarışa sokmak yerine ürün ekibi agregada izler.

**Çıkış ölçütü:** Ders kapanışı p50 <120 sn, p90 <240 sn; 24 saat sonra düzenleme < %10; eksik kayıt < %2.

### Faz 5 — 2 hafta: uyarlanabilir haftalık plan v1

- Girdiler: öğrencinin uygun gün/süre aralığı, yaklaşan deneme, zayıf kazanımlar, öğretmen ödevi, tekrar kuyruğu.
- Çıktı: günlük en fazla üç iş; neden bu sırada olduğu açıklanır.
- Kaçan iş “borç” olarak yığılmaz; kapasiteye göre yeniden dengelenir.
- Öğretmen planı onaylar/kitler; öğrenci değişiklik isteyebilir. İlk sürüm AI değil, açıklanabilir kural/kısıt çözücü.
- Veliye görev listesi değil haftalık eğilim ve destek cümlesi verilir.

**Çıkış ölçütü:** Plan kabul ≥%65; haftalık plan tamamlama baz çizgiye göre +10%; “plan bunaltıcı” pulse'u artmıyor; öğretmen düzenleme süresi <2 dk.

### Sonraki adım — sakin veli özeti

İlk beşin ürettiği veri 4 hafta güvenilir hale geldiğinde, veli özeti kural tabanlı olarak açılır. Öğrenci özeti veliyle aynı anda görebilmeli; özel öğretmen notu ve öğrenci check-in'i varsayılan olarak özete girmemelidir.

---

## I. Ölçüm planı: event'ler ve KPI'lar

### North Star ve karşı metrikler

**North Star:** Haftalık aktif öğrenci başına, öğretmen tarafından doğrulanmış ve zamanında tamamlanmış **öğrenme döngüsü** sayısı: `kanıt → sonraki eylem → uygulama → yeniden kontrol`.

Tek başına ekran süresi, oturum sayısı, seri uzunluğu veya gönderilen bildirim North Star olmamalı.

**Guardrail'ler:** Öğrenci kaygı pulse'u, bildirim opt-out, veli şikâyeti, öğretmen düzeltme yükü, yanlış risk işareti, yetkisiz erişim olayı, AI hata oranı, kişi başı AI maliyeti.

### Event sözlüğü

| Alan | Önerilen event'ler | Zorunlu özellikler |
|---|---|---|
| Ders kapanışı | `lesson_close_started`, `attendance_bulk_applied`, `lesson_note_template_used`, `next_action_created`, `lesson_close_completed`, `lesson_close_reopened` | role, lesson_id, group_size, duration_ms, changed_student_count; not metin içeriği değil |
| Kazanım | `outcome_search_used`, `outcome_linked`, `evidence_recorded`, `evidence_revised`, `outcome_viewed` | curriculum_version, subject, outcome_id, evidence_type, actor_role |
| Deneme | `mock_exam_entry_started/completed`, `mock_exam_import_failed`, `error_reason_selected/revised`, `mock_heatmap_viewed` | exam_type, subject, entry_duration, error_category; soru metni event'e konmamalı |
| Tekrar kuyruğu | `review_item_due`, `review_started`, `review_answered`, `review_snoozed`, `review_queue_capped` | interval_days, confidence, result, source_type |
| Plan | `plan_generated`, `plan_explanation_viewed`, `plan_approved`, `plan_edited`, `plan_task_completed`, `plan_rebalanced`, `plan_opted_out` | rule_version, task_count, capacity_minutes, reason_code |
| Veli | `weekly_digest_generated`, `digest_previewed`, `digest_sent/opened`, `digest_feedback_submitted`, `notification_frequency_changed` | trend_band, delivery_channel, feedback; ham not event payload'ında olmamalı |
| Müdahale | `case_rule_triggered`, `case_assigned`, `case_opened`, `intervention_logged`, `case_snoozed/closed`, `case_false_positive` | rule_version, reason_code, owner_role, time_to_action |
| Yardım | `help_requested`, `help_request_acknowledged/resolved` | category, visibility_choice, response_time; serbest metni analytics'e kopyalama |
| Erişilebilirlik/offline | `accessibility_preference_changed`, `offline_write_queued/synced/conflicted`, `low_data_mode_enabled` | preference_type, queue_age, conflict_type; sağlık tanısı değil |
| AI | `ai_draft_requested/generated/accepted/edited/rejected`, `ai_output_flagged`, `ai_fallback_used` | task_type, model_version, latency, token/cost, citation_count, edit_distance; prompt/çıktı varsayılan analytics'e girmez |
| Güvenlik/ops | `authorization_denied`, `relationship_access_revoked`, `private_asset_denied`, `data_request_received/completed`, `restore_drill_completed` | hashed actor/session, object_type, reason, latency; hassas kimlikleri logda azalt |

### KPI panosu

| Amaç | KPI | Hedef yönü / ilk hedef |
|---|---|---|
| Öğretmen zamanı | Ders kapanışı p50/p90 | `<120 sn / <240 sn` |
| Veri kalitesi | 24 saatte yeniden açılan ders kaydı | `<%10` |
| Eğitim | 30 günde aynı kazanım yeniden kontrol doğruluğu | Baz çizgiye göre artış |
| Eğitim | Tekrarlayan aynı hata türü | 3 denemede azalış |
| Düzenlilik | Haftalık planlanan küçük işlerin tamamlanması | +10 puan pilot uplift |
| Sağlıklı motivasyon | Plan/tekrar opt-out ve “bunaltıcı” pulse | Artmamalı |
| Veli güveni | Özet faydalı skoru, bildirim kapatma, şikâyet | Fayda ↑, kapatma/şikâyet ↓ |
| Müdahale | İşaretten ilk insan aksiyonuna medyan süre | `<24 saat` (kritik olmayan akademik vaka) |
| Adalet | Risk kuralı yanlış pozitif oranı; alt gruplar arası fark | İzlenir, eşik aşılırsa kural kapanır |
| Güvenlik | Nesne düzeyi auth regresyon geçişi | `%100` |
| Güvenlik | İlişki sonlanınca erişim kesilme süresi | Anlık / tek transaction |
| Güvenilirlik | Ders kaydı ve private dosya indirme başarı SLO'su | Başlangıç `≥%99.9` aylık; kullanıcı verisiyle ayarla |
| Kurtarma | RPO/RTO ve restore drill | RPO ≤24s, RTO ölçülüp düşürülür; üç ayda bir drill |
| AI | Öğretmen kabulü, edit distance, doğrulanmış hata, maliyet | Kabul tek başına başarı değil; hata tavanı şart |

### Deney tasarımı

- Sınıf içi bulaşmayı azaltmak için öğrenci değil mümkünse grup/öğretmen bazında kademeli rollout.
- En az 4 hafta; sınav dönemi etkisini not et. Sadece pre/post değil, benzer başlangıç seviyeli karşılaştırma.
- Başarıyı kullanım ile değil öğrenme ve iş yüküyle ölç. “Özellik açıldı” grubu ile “gerçekten kullandı” analizi ayrı raporlanmalı.
- Çocuklara yönelik UX araştırmasında yaşa uygun onam/veli süreci; araştırma çıktısında gereksiz ham veri saklamama.

### Gözlemlenebilirlik ve operasyon güvenliği

- Kullanıcı yolculuğu SLI'ları: `lesson close write success`, `notification age`, `private asset authorized download`, `login success by role`, `assignment update success`.
- Her SLO için hata bütçesi; bütçe aşılırsa özellik yayını yerine güvenilirlik işi. Google SRE, SLO'ların kullanıcıya göre belirlenmesini ve hata bütçesinin yönetim desteğine bağlanmasını öneriyor. [Google SRE — Art of SLOs](https://sre.google/resources/practices-and-processes/art-of-slos/)
- Queue lag, p95/p99 latency, DB pool, blob hata oranı, cron son başarı, e-posta outbox yaşı; request/correlation ID ile rol ve akış bazlı izleme.
- Restore testi mevcut güçlü yön; ayrıca izole/offline kopya, retention katmanları ve üç aylık RTO tatbikatı. NIST yedeğin oluşturulmasını değil, korunup düzenli test edilmesini vurguluyor. [NIST backup rehberi](https://csrc.nist.gov/pubs/other/2020/04/24/protecting-data-from-ransomware-and-other-data-los/final)
- AI için ayrı gözlemlenebilirlik: model sürümü, kaynak bulunma oranı, öğretmen edit distance, ret/red, güvenlik filtresi, gecikme ve kullanıcı başı maliyet.

---

## KVKK, çocuk güvenliği ve AI mimarisi için asgari kapılar

Bu bölüm hukuk görüşü değildir; ürün/teknik risk kontrol listesidir.

1. **Amaç ve veri minimizasyonu:** Her alan için amaç, hukuki işleme şartı, rol görünürlüğü, saklama süresi ve alıcı grubu. “Belki AI'da kullanırız” gerekçesiyle ham çocuk verisi biriktirilmemeli.
2. **Yüksek mahremiyet varsayılanı:** Öğrenci check-in'i veliye otomatik açılmamalı; öğretmenin özel notu AI veya özete varsayılan girmemeli; velinin görebileceği alan öğrenciye açıkça gösterilmeli. ICO Children’s Code yasal olarak Türkiye'ye doğrudan uygulanmasa da yüksek mahremiyet varsayılanı ve çocuğun üstün yararı iyi tasarım referansıdır. [ICO Age Appropriate Design Code](https://ico.org.uk/media/for-organisations/guide-to-data-protection/key-data-protection-themes/age-appropriate-design-a-code-of-practice-for-online-services-2-1.pdf)
3. **İlişki tabanlı yetki:** Rol tek başına yeterli değil; `teacher↔group`, `parent↔student`, `student↔enrollment`, `material↔active membership` her istekte doğrulanmalı. Denied/enumeration log ve çok hesaplı IDOR testleri.
4. **Saklama ve silme:** Kullanıcı silmek, veriyi erişilemez ve tekrar kullanılamaz kılacak süreç gerektirir; backup istisnası ve sonraki restore sonrası yeniden silme kuyruğu tasarlanmalı. [KVKK silme/yok etme/anonimleştirme](https://www.kvkk.gov.tr/Icerik/2038/kisisel-verilerin-silinmesi-yok-edilmesi-veya-anonim-hale-getirilmesi)
5. **Yurt dışı aktarım:** AI, e-posta, analytics, log ve blob sağlayıcılarının veri konumları/envanteri; uygun aktarım mekanizması; standart sözleşme bildirim operasyonu. Prompttan isim çıkarma tek başına anonimleştirme sayılmayabilir.
6. **AI gateway:** Sağlayıcı anahtarları sunucuda; allowlist görevleri; PII redaction; prompt injection sınırı; model/şablon sürümü; kaynak kısıtı; maliyet kotası; timeout/fallback; çıktı audit izi.
7. **İnsan denetimi:** AI not vermez, risk vakası kapatmaz, veliye/öğrenciye otomatik yayın yapmaz. Öğretmen diff görüp onaylar. UNESCO yaşa uygun, insan-merkezli ve veri korumalı tasarımı öneriyor. [UNESCO GenAI eğitim rehberi](https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research)
8. **Çocuk AI güvenliği:** Açık sınırlamalar, günlük kullanım sınırı, güvenlik moderasyonu, yetişkin eskalasyonu, itiraz/geri bildirim. Khanmigo bu kontrolleri ürünleştirmiştir; aynı zamanda AI'nın yanlış olabileceğini açıkça söyler. [Khanmigo güvenlik özellikleri](https://support.khanacademy.org/hc/en-us/articles/14394814244365-What-safety-features-does-Khanmigo-have)
9. **Eval önce rollout:** Türkçe LGS/YKS için öğretmen onaylı altın set; yanlış cevap verme, cevabı erken söyleme, uygunsuz ton, kaynak uydurma ve maliyet testleri. Khan Academy 2026'da “next-item correctness”, matematik hata oranı ve cevabı erken verme gibi guardrail'leri birlikte ölçtüğünü bildiriyor. [Khan Academy AI değerlendirme yaklaşımı](https://blog.khanacademy.org/how-khan-academy-is-building-a-better-ai-tutor-our-most-recent-learnings/)

---

## J. Rakip karşılaştırması

| Ürün / kategori | Güçlü özellik | Online Dershanem'deki boşluk | Kopyalanmaması gereken yön / farklılaşma fırsatı |
|---|---|---|---|
| **MEBİ** — Türkiye, ücretsiz sınav/öğrenme | LGS/YKS deneme, resmi/çıkmış soru, adaptif test, çalışma planı, rapor, rehberlik, KANKA AI | Deneme analizi, kazanım ve uyarlanabilir plan | İçerik hacmiyle yarışma. Özel öğretmenin gerçek ders kanıtını ve insan müdahalesini MEBİ'nin genel içeriğine bağla. [MEBİ](https://mebi.eba.gov.tr/)
| **Doping Hafıza** — Türkiye, sınav hazırlık | Seviye/eksik bazlı program, video çözümlü soru, soru gönderme, rehberlik, veli bilgilendirme | Eksik analizi ve dinamik plan | Pazarlama iddiasını sonuç kanıtı sanma; opak “AI kişiselleştirme” yerine neden/kanıt/öğretmen onayı göster. [Doping Hafıza özellikleri](https://www.dopinghafiza.com/sss/genel-konular/doping-hafiza-nedir)
| **Raunt** — Türkiye, YKS | Deneme performansına/hedefe göre yenilenen çalışma planı, yayın içeriği | Hedef/deneme tabanlı yeniden plan | Büyük içerik seti yerine öğretmen–öğrenci döngüsünü hızlandır. [Raunt SSS](https://www.raunt.com/sss)
| **Kunduz** — Türkiye, soru çözüm/koçluk | Fotoğraftan soru gönderme, uzmanla devam, haftalık koçluk, deneme kulübü | Takıldığı anda yardım ve yardım SLA'sı | Sınırsız soru çözümü maliyetli ve kalite değişken olabilir; dar “yardım isteği → kendi öğretmeni/uzman havuzu” ile başla. [Kunduz](https://prod.kunduz.com/tr/)
| **Google Classroom** — global LMS | Practice Sets otomatik değerlendirme ve sınıf içgörüsü; comment bank; zengin geri bildirim; learning goals | Rubric/kanıt, kazanım görünümü, soru düzeyi içgörü | Gradebook ağırlıklı genel LMS olma. Türkçe müfredat ve 2 dakikalık özel ders sonrası akışında derinleş. [Google Classroom değerlendirme](https://support.google.com/edu/classroom/answer/16643267?hl=en), [Learning Goals](https://support.google.com/edu/classroom/answer/17074065?hl=en)
| **Canvas** — global LMS | Mastery Paths ile performansa göre farklı içerik yolu | Uyarlanabilir yol | Tam LMS modül karmaşıklığını kopyalama; günlük üç küçük eylem ve öğretmen kontrolü sun. [Canvas Basics Guide](https://community.canvaslms.com/html/assets/Canvas_Basics_Guide.pdf)
| **Moodle** — açık kaynak LMS | Competency framework ve toplu learning-plan template | Sürümlü kazanım/kompetans modeli | Yönetim karmaşıklığını son kullanıcıya taşıma; admin yapılandırır, öğretmen arama/favori ile kullanır. [Moodle Learning Plans](https://docs.moodle.org/39/en/Learning_plans)
| **TutorBird** — özel ders yönetimi | Express/bulk attendance, öğrenci/veli/özel not, note template, study log, portal | İstisna kapanışı, çalışma günlüğü ve aile self-service | İşletme/billing merkezli kalıbı değil, öğrenme kanıtına bağlı sonraki eylemi al. [TutorBird attendance](https://www.tutorbird.com/new-attendance-experience/), [Student Portal](https://www.tutorbird.com/student-portal/)
| **Teachworks** — özel ders operasyonu | Özelleştirilebilir lesson completion, bulk status, otomatik iletişim, işletme raporu | Kapanışın alan bazında sadeleştirilmesi | Çok sayıda add-on ve ayarı öğretmene göstermeme; rol için iyi varsayılanlar. [Enhanced Lesson Completion](https://teachworks.com/addons/enhanced-lesson-completion)
| **TutorCruncher** — özel ders yönetimi | Zorunlu ders raporu, görünürlük izinleri, batch PDF, hatırlatıcı ve workflow otomasyonu | Rapor sahipliği/izin ve workflow trigger'ları | Zorunlu uzun rapor öğretmen süresini büyütebilir; eksik alan değil istisna zorunluluğu. [TutorCruncher Reports](https://help.tutorcruncher.com/en/articles/14183108-reports)
| **Khanmigo/Khan Academy** — AI öğrenme | Dar öğretmen araçları, kaynak/standart hizası, moderasyon, yetişkin görünürlüğü, AI guardrail ölçümü | Güvenli AI ürün operasyonu | Açık sohbeti ilk ürün yapma; önce öğretmen taslağı, eval ve güvenlik. [Khanmigo öğretmen araçları](https://blog.khanacademy.org/ai-teachers-khanmigo-kt/)

### Rakiplerden alınacak güçlü desenler

- Hızlı/bulk ders kapanışı ve not görünürlüğü ayrımı (TutorBird, TutorCruncher).
- Kazanım/learning goal etiketleme ve ustalık kanıtı (Google Classroom, Moodle, Canvas).
- Deneme sonucu ile planın yeniden dengelenmesi (MEBİ, Raunt, Doping Hafıza).
- Takıldığı anda insan yardımına geçiş (Kunduz).
- AI'da dar görev, öğretmen denetimi, görünür sınırlama ve ölçülmüş guardrail (Khanmigo).

### Rakiplerde/segmentte sık görülen kötü desenler

- İçerik sayısı ve “AI” etiketiyle farklılaşmaya çalışma.
- Opak skor/öneri ve neden gösterilmeyen kişiselleştirme.
- Tamamlama, ekran süresi ve seri gibi davranış metriklerini öğrenme sanma.
- Fazla ayar/add-on ile temel öğretmen işini karmaşıklaştırma.
- Veliyi anlık hata/eksik yağmuruna tutma.
- Liderlik tablosu, utandırma, kayıp korkusu ve sahte kesinlikte sıralama.

---

## Gelir, bağlılık ve eğitim sonucu etkisi

| Yatırım | Gelir etkisi | Bağlılık etkisi | Eğitim sonucu etkisi | Ana risk |
|---|---|---|---|---|
| Kazanım + deneme + tekrar | Premium “sınav gelişim” paketi ve daha güçlü yenileme gerekçesi | Haftalık gerçek kullanım sebebi | En yüksek; doğru eksik ve kalıcılık | Veri giriş yükü |
| İki dakikalık kapanış | Daha fazla öğretmen/grup taşıma, düşük operasyon maliyeti | Öğretmen churn'ünü azaltır | Zamanında geri bildirim | Varsayılanların yanlış olması |
| Uyarlanabilir plan | Aileye görünür kişisel değer | Günlük fakat sınırlı sağlıklı dönüş | Öz-düzenleme ve doğru öncelik | Bunaltıcı görev üretimi |
| Sakin veli özeti | Güven ve yenileme; destek talebi azalabilir | Haftalık veli dönüşü | Dolaylı ama olumlu aile desteği | Gözetim/kaygı |
| Müdahale kutusu | Kurumsal paket/çok öğretmenli yapı değeri | Admin günlük operasyon merkezi | Riskteki öğrencinin kaybolmasını önler | Yanlış pozitif/profilleme |
| AI öğretmen taslağı | Üst paket ve marjinal zaman tasarrufu | Öğretmen kullanımını artırabilir | Dolaylı; kalite denetimine bağlı | Maliyet, hata, KVKK aktarımı |

Ticari başarı için önerilen paketleme, “AI erişimi” değil sonuç üreten iş akışıdır: temel pakette ders/ödev; gelişim paketinde kazanım–deneme–tekrar; kurum paketinde müdahale ve kalite panosu. AI, kullanıcıya ayrı sihirli ürün olarak değil öğretmenin bu akıştaki zamanını azaltan sınırlı bir yetenek olarak sunulmalıdır.

---

## Kaynaklar

### Türkiye sınav ve ürün bağlamı

- [MEB — 2026 LGS başvuru ve uygulama kılavuzu duyurusu](https://www.meb.gov.tr/2026-lgs-kapsamindaki-merkezi-sinav-icin-basvuru-ve-uygulama-kilavuzu-yayimlandi/haber/40200/tr)
- [ÖSYM — 2026-YKS başvurularının alınması](https://www.osym.gov.tr/TR%2C33850/2026-yks-basvurularin-alinmasi-06022026.html)
- [ÖSYM — 2026 YKS temel soru kitapçıkları ve cevap anahtarları](https://www.osym.gov.tr/TR%2C34130/2026-yks-tyt-ayt-ve-ydt-temel-soru-kitapciklari-ve-cevap-anahtarlari.html)
- [MEBİ — resmi ürün sayfası](https://mebi.eba.gov.tr/)
- [MEB — 2026 LGS örnek soruları ve Türkiye geneli deneme](https://www.meb.gov.tr/mebide-lgs-ogrencileri-icin-nisan-ayi-ornek-sorulari-yayimlandi/haber/40594/tr)

### Gizlilik, güvenlik ve operasyon

- [KVKK — Kişisel Veri Güvenliği Rehberi](https://www.kvkk.gov.tr/Icerik/4198/Kisisel-Veri-Guvenligi-Rehberi-%28Teknik-ve-Idari-Tedbirler%29)
- [KVKK — Açık Rıza Alırken Dikkat Edilecek Hususlar](https://www.kvkk.gov.tr/Icerik/2037/Acik-Riza-Alirken-Dikkat-Edilecek-Hususlar)
- [KVKK — Kişisel Verilerin Yurt Dışına Aktarılması Rehberi](https://www.kvkk.gov.tr/Icerik/8142/Kisisel-Verilerin-Yurt-Disina-Aktarilmasi-Rehberi)
- [KVKK — Silme, Yok Etme veya Anonim Hale Getirme](https://www.kvkk.gov.tr/Icerik/2038/kisisel-verilerin-silinmesi-yok-edilmesi-veya-anonim-hale-getirilmesi)
- [OWASP — Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OWASP — IDOR Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)
- [NIST — Protecting and Testing Backups](https://csrc.nist.gov/pubs/other/2020/04/24/protecting-data-from-ransomware-and-other-data-los/final)
- [Google SRE — The Art of SLOs](https://sre.google/resources/practices-and-processes/art-of-slos/)

### Çocuk, erişilebilirlik ve AI

- [UNICEF — Guidance on AI and Children v3](https://www.unicef.org/innocenti/reports/policy-guidance-ai-children)
- [UNICEF — AI Chatbots and Companions: Child Rights Risks](https://www.unicef.org/documents/when-ai-becomes-friend-child-rights-risks)
- [UNICEF — RITEC Child Well-being Design Toolbox](https://www.unicef.org/childrightsandbusiness/workstreams/responsible-technology/online-gaming/ritec-design-toolbox)
- [UNESCO — Guidance for Generative AI in Education and Research](https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research)
- [ICO — Age Appropriate Design Code](https://ico.org.uk/media/for-organisations/guide-to-data-protection/key-data-protection-themes/age-appropriate-design-a-code-of-practice-for-online-services-2-1.pdf)
- [W3C — WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [MDN — Offline and Background Operation for PWAs](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)

### Öğrenme bilimi ve aile iletişimi

- [Retrieval Practice in Classroom Settings — review](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2019.00005/full)
- [Parent Autonomy Support — meta-analysis](https://eric.ed.gov/?id=EJ1110197)
- [Parental Involvement in Middle School — meta-analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC2782391/)
- [Reducing Student Absences by Correcting Parent Misbeliefs — randomized experiment](https://www.nature.com/articles/s41562-018-0328-1)
- [Use of Leaderboards in Education — systematic review](https://eric.ed.gov/?id=EJ1448426)
- [IES — Early Warning Intervention and Monitoring System impact study](https://ies.ed.gov/use-work/resource-library/report/impact-study/getting-students-track-graduation-impacts-early-warning-intervention-and-monitoring-system-after-one)

### Rakip resmi kaynakları

- [Google Classroom — grade, assess and feedback](https://support.google.com/edu/classroom/answer/16643267?hl=en)
- [Google Classroom — Learning Goals](https://support.google.com/edu/classroom/answer/17074065?hl=en)
- [Canvas — Basics Guide / Mastery Paths](https://community.canvaslms.com/html/assets/Canvas_Basics_Guide.pdf)
- [Moodle — Learning Plans](https://docs.moodle.org/39/en/Learning_plans)
- [TutorBird — Calendar, Attendance and Notes](https://www.tutorbird.com/calendar-attendance/)
- [TutorBird — Student Portal and Study Log](https://www.tutorbird.com/student-portal/)
- [Teachworks — Enhanced Lesson Completion](https://teachworks.com/addons/enhanced-lesson-completion)
- [TutorCruncher — Lesson Reports](https://help.tutorcruncher.com/en/articles/14183108-reports)
- [Doping Hafıza — ürün özellikleri](https://www.dopinghafiza.com/sss/genel-konular/doping-hafiza-nedir)
- [Raunt — SSS ve akıllı öneri sistemi](https://www.raunt.com/sss)
- [Kunduz — resmi ürün sayfası](https://prod.kunduz.com/tr/)
- [Khan Academy — Khanmigo Teacher Tools](https://blog.khanacademy.org/ai-teachers-khanmigo-kt/)
- [Khan Academy — Khanmigo Safety Features](https://support.khanacademy.org/hc/en-us/articles/14394814244365-What-safety-features-does-Khanmigo-have)

---

## Tek net öneri

> **Online Dershanem’in bir sonraki ana ürün fazı şu olmalı: öğretmenin doğruladığı ders ve deneme verisini LGS/YKS kazanımlarına bağlayan; öğrencinin yanlışlarını aralıklı tekrar ve sade bir haftalık plana dönüştüren; veliye ise yalnız sakin, eyleme dönük haftalık özet veren “Kanıttan Eyleme Öğrenme Döngüsü”.**

Bu fazın ürün vaadi tek cümlede ölçülebilir: **Öğretmen dersi iki dakikada kapatır; sistem her öğrenci için bir sonraki en doğru küçük adımı hazırlar; insan son kararı verir.**
