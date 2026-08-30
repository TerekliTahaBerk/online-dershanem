# Online Dershanem ürün yol haritası — uygulama takibi

Bu belge [ürün araştırmasındaki](./product-research-roadmap-2026.md) fikirlerin teknik bağımlılık sırasına göre uygulanmasını izler. Öncelik puanı eğitim değerini, aşağıdaki sıra ise güvenli geliştirme bağımlılıklarını ifade eder.

| Aşama | Kapsam | Durum | Çıkış koşulu |
|---:|---|---|---|
| 0 | Başlangıç ölçümleri, tipli event sözleşmesi ve rollout bayrakları | **Tamamlandı** | PII içermeyen ders kapanışı ölçümü; gelecek özellikler varsayılan kapalı; unit/E2E doğrulaması |
| 1 | Çocuk veri güvenliği ve sürekli yetkilendirme | **Tamamlandı** | Veri/retention matrisi, ilişki bazlı auth matrisi, silme ve audit kontrolleri |
| 2 | Event, KPI ve iş SLO altyapısının genişletilmesi | **Tamamlandı** | Kritik rol yolculukları için ölçülebilir SLI/SLO |
| 3 | LGS/YKS kazanım omurgası ve kanıt defteri | **Tamamlandı** | Sürümlü kazanım modeli ve ders/ödev kanıtı |
| 4 | Deneme, süre ve hata nedeni analizi | **Tamamlandı** | LGS/TYT/AYT/YDT hızlı giriş ve hata ısı haritası |
| 5 | Aralıklı yanlış tekrar kuyruğu | **Tamamlandı** | 1–3–7–14–30 gün tekrar döngüsü |
| 6 | İstisna odaklı iki dakikalık ders kapanışı | **Tamamlandı** | p50 <120 sn, p90 <240 sn |
| 7 | Öğretmen onaylı uyarlanabilir haftalık plan | **Tamamlandı** | Açıklanabilir “bugünün üç işi” ve yeniden dengeleme |
| 8 | Sakin veli haftalık özeti | **Tamamlandı** | Karşılaştırmasız, eylem odaklı haftalık özet |
| 9 | Açıklanabilir müdahale gelen kutusu | **Tamamlandı** | Sahip, SLA, sonuç ve yanlış pozitif takibi |
| 10 | Ders kaçırma sonrası telafi paketi | **Tamamlandı** | 72 saatlik telafi döngüsü |
| 11 | Kanıtlı ödev teslimi, rubric ve yeniden deneme | **Tamamlandı** | Güvenli teslim ve geri bildirim döngüsü |
| 12 | Öğrenci check-in'i ve yardım isteği | **Tamamlandı** | Kontrollü görünürlük ve yanıt SLA'sı |
| 13 | Erişilebilirlik ve makul düzenleme profili | **Tamamlandı** | WCAG 2.2 AA ve işlevsel tercihler |
| 14 | Offline-first ve düşük veri modu | **Tamamlandı** | Güvenli outbox, idempotency ve çatışma çözümü |
| 15 | Kohort öğrenme kazancı ve kalite panosu | **Tamamlandı** | Adil, minimum örneklemli gelişim görünümü |
| 16 | Güvenli AI öğretmen yardımcısı | **Tamamlandı** | Kaynaklı taslak, zorunlu onay, eval ve maliyet kapıları |
| 17 | Bütünleşik pilot ve kademeli yayın | **Tamamlandı** | Dört rol, güvenlik, erişilebilirlik ve etki kabulü |

## Aşama 0 kararları

- Panel ürün event'leri `/api/panel/events` üzerinden tipli ve allowlist payload ile alınır.
- Event payload'larında serbest metin, ad/e-posta, kullanıcı/öğrenci/ders/grup kimliği bulunmaz.
- Ders notu yazma API'si, sunucu tarafında request süresi ve toplu kayıt niteliğini structured log'a yazar.
- Gelecek özellik bayrakları kapalı; yalnız baz ölçüm varsayılan açıktır.
- Baz çizgi en az iki haftalık gerçek kullanım ve yeterli örneklemle değerlendirilir.

## Aşama 1 kararları

- Nesne erişimi, kaydı önce bulup sonra rol kontrolü yapmak yerine ilişki koşulunu aynı veritabanı sorgusunda uygular.
- Veli bağlantısı iptali ile grup üyeliği değişiklikleri atomik audit izi üretir; ilişki sona erdiğinde sonraki istek erişimi kaybeder.
- Private materyal erişim denemeleri ham kimlikler loglanmadan gözlemlenir; dosya her istekte uygulama katmanında yeniden yetkilendirilir.
- Otomatik retention yalnız artık kullanılamayan süresi dolmuş/eskiden iptal edilmiş oturumları siler. Akademik, finansal, bildirim ve audit verileri için hukuki süre onayı olmadan toplu silme yapılmaz.
- Veri sınıfları, önerilen saklama süreleri ve veri sahibi talep akışı [panel veri yönetişimi standardında](./panel-data-governance.md) tutulur.

## Aşama 2 kararları

- Admin grup kurulumu, öğretmen ders kapanışı/not kaydı, öğrenci ödev ilerlemesi ve veli özet yüklemesi ortak, sürümlü ve PII'siz event sözleşmesine bağlandı.
- İstemci yalnız UX event'lerini gönderebilir; başarı, doğrulama, ret ve sistem hatası sonuçları güvenilir biçimde sunucu tarafından üretilir.
- Kimliksiz event'ler 90 gün tutulur; kullanıcı, öğrenci, ders, grup, ödev veya materyal kimliği ile serbest metin kabul edilmez.
- Admin rapor ekranı beş kritik SLO'yu 30 günlük pencere ve minimum beş örnek kuralıyla gösterir. Az örneklem yeşil başarı gibi sunulmaz.
- Haftalık plan üretimi ayrıca uygun istek paydasıyla ölçülür; 15 dakikada `%3` üzeri sistem hata oranı beş dakikalık `domain-sli` işiyle alarm kanalına ve admin bildirimine taşınır.
- Yeni fazların rollout büyütme kapıları ve alarm eşikleri [panel SLO kataloğunda](./panel-slo-catalog.md) tanımlıdır.

## Aşama 3 kararları

- Kazanım kataloğu LGS, TYT, AYT ve YDT için sürümlüdür; yalnız `ACTIVE` sürümler öğretmen seçiminde görünür, eski kanıtlar arşivlenen sürümlerle birlikte korunur.
- Ders ve ödev başına en fazla üç kazanım bağlanır. Kazanım seçilmezse öğretmen kontrollü bir neden belirtir; böylece iki dakikalık kapanış akışı zorunlu katalog aramasına dönüşmez.
- Öğrenme görünümü tek bir belirsiz “hakimiyet puanı” üretmez. Kanıtlar `işlendi`, `öğretmen gözlemi`, `bağımsız çalışma` ve `tekrar gerekli` türleriyle, kaynağı ve zamanı korunarak sunulur.
- Öğrenci yalnız katıldığı tamamlanmış derslerden ve kendi tamamladığı ödevlerden kanıt görür. Veli yalnız aktif ilişkisi bulunan öğrencinin sakin, karşılaştırmasız özetini görür.
- Sınıf sıralaması, öğretmen sıralaması, akran karşılaştırması ve cezalandırıcı kırmızı skorlar kapsam dışıdır. Admin yalnız etiketleme kapsamasını ve katalog işletimini izler.
- Kazanım kullanım event'i kimlik ve serbest metin içermez. Katalog kaynağı, lisans/sürüm doğrulaması ve rollout adımları [kazanım kanıtı operasyon standardında](./curriculum-evidence-operations.md) tanımlıdır.

## Aşama 4 kararları

- LGS, TYT, AYT ve YDT girişleri sınav şablonundaki bölüm ve soru toplamını sunucuda doğrular. LGS netinde üç, YKS oturumlarında dört yanlış götürme katsayısı kullanılır; puan tahmini yapılmaz.
- Mobil manuel girişe ek olarak dosya yüklemeden CSV/hesap tablosu sayısal satırları yapıştırılabilir. Formül, dosya metadata'sı, soru metni veya telifli görsel saklanmaz.
- Bir denemede en fazla üç kontrollü hata nedeni bulunur: bilgi, işlem/yöntem, dikkat, süre ve boş bırakma/başlayamama. Öğrenci seçebilir; aktif grup öğretmeni düzeltebilir ve değişiklik audit edilir.
- Isı haritası yalnız öğrencinin kendi denemelerindeki neden sıklığını gösterir. Sınıf sırası, yüzdelik, kırmızı başarısızlık etiketi ve tek denemeden kesin hüküm üretilmez.
- Sistem tekrarlayan neden için yalnız bir küçük eylem taslağı çıkarır; öğrenci/veli görünümünde “öğretmen onaylı” sayılması öğretmen veya admin onayı gerektirir.
- Deneme girişi p50 ≤180 saniye ve hata nedeni kapsaması ≥%50 rollout kapısıdır. Event'ler deneme/öğrenci kimliği, yayın veya soru metni taşımaz; ayrıntılar [deneme analizi operasyon standardında](./mock-exam-analysis-operations.md) tanımlıdır.

## Aşama 5 kararları

- Deneme bölümündeki yanlışlar ve öğretmenin `NEEDS_REVIEW` işaretlediği katılımlı ders kazanımları idempotent biçimde tekrar öğesine dönüşür. Öğretmen ayrıca telifli içeriği kopyalamadan kendi materyaline kaynak referansı ekleyebilir.
- İlk dönüş bir gün sonra; doğru yanıtlar 3–7–14–30 gün basamaklarına ilerler. `UNSURE` daha yakın basamağa, `WRONG` bir güne döner; geçmiş silinmez ve “sıfırlandı/seri bozuldu” dili kullanılmaz.
- Öğrenciye günde en fazla beş öğe gösterilir. “Bugün ertele” İstanbul takvim gününde aynı öğe için bir kez kullanılabilir.
- Her yanıt `reviewItemId + idempotencyKey` unique kuralıyla çift yazımdan korunur. Çözüm notu en fazla 500 karakterdir ve ürün event'ine alınmaz.
- Öğretmen ekranı sıralama yapmaz; aktif kuyruk 20'yi, günlük bekleyen 5'i aştığında veya aynı öğede son 30 günde üç `WRONG/UNSURE` olduğunda yalnız “İnsan bakışı gerekli” sinyali verir.
- Admin raporu 7 günlük yeniden çözüm ve 30 günlük doğru geri çağırma baz çizgisini toplu gösterir. Rollout ve veri güvenliği ayrıntıları [aralıklı tekrar operasyon standardında](./spaced-review-operations.md) tanımlıdır.

## Aşama 6 kararları

- Aktif grup öğrencileri `PRESENT` varsayımıyla başlar; öğretmen tek düğmeyle varsayımı yeniler ve öğrenci kartlarını yalnız istisna olduğunda açar.
- Önceki dersin hedefi görünür bağlamdır, otomatik gerçek kabul edilmez. Ortak alanlar ve en fazla üç kazanım insan onayıyla saklanır.
- Ödev taslağı kapanıştan önce içerik ve alıcı önizlemesi gösterir; ilerleme ve bildirim yalnız seçilen öğrencilere oluşturulur.
- Kapanış `closeVersion + idempotencyKey + requestHash` ile korunur. Aynı istek güvenle tekrar oynatılır; eski sürüm veya farklı içerikle anahtar kullanımı `409` üretir.
- Not, yoklama, kazanım, kapanış, seçili ödev ve uygulama içi bildirim tek transaction içindedir. E-posta kuyruğu başarılı transaction sonrasında çalışır.
- Öğretmene kronometre veya hız sıralaması gösterilmez. Ürün ekibi p50/p90 süreyi, 24 saatlik düzeltmeyi ve eksik kayıt oranını yalnız toplu event'lerden izler.
- Rollout, geri alma ve gözlem ayrıntıları [hızlı ders kapanışı operasyon standardında](./quick-lesson-close-operations.md) tanımlıdır.

## Aşama 7 kararları

- `adaptive-v2` AI kullanmayan, sürümlü ve deterministik kural/kısıt çözücüdür. Ödev, tekrar, öğretmen kanıtı, yaklaşan sınav ve öğrencinin seçtiği kapasite dışında girdi kullanmaz; `adaptive-score-v2` kaynak/aciliyet/güncellik/güven/çelişki ayrımını ve kullanıcı açıklamasını görev bazında snapshot'lar.
- Günlük görev sayısı üçü ve seçilen dakika kapasitesini aşmaz. Kaçan günler geçmişe yazılmaz; yeniden dengelemede eski açık görevler `SKIPPED` iziyle korunur, borç veya ceza dili üretilmez.
- Her görev kontrollü neden koduyla açıklanır. Plan taslak başlar; yalnız aktif grup öğretmeni sürüm kontrolüyle onaylayıp kilitler.
- Öğrenci serbest metin paylaşmadan yoğunluk, yanlış gün, öncelik veya başka neden kategorisiyle değişiklik isteyebilir. 1–5 bunaltı pulse'u isteğe bağlıdır.
- Veli ayrıntılı görev listesi görmez. Event'ler kimlik, görev başlığı, not veya sınav adı taşımaz.
- Algoritma, rollout, yetki ve ölçüm ayrıntıları [uyarlanabilir haftalık plan standardında](./adaptive-weekly-plan-operations.md) tanımlıdır.

## Aşama 8 kararları

- `calm-digest-v1` AI kullanmayan, sürümlü ve deterministik bir kural üreticisidir. Haftalık katılım, tamamlanan plan adımı, katılımlı ders kazanımı ve aktif tekrar başlığı dışında veri kullanmaz.
- Öğretmenin kişisel/özel ders notları, öğrenci pulse'ları, sıralama, sınıf karşılaştırması ve ham puanlar özet girdisi değildir.
- Taslak öğretmen tarafından gerçek öğrenci/veli görünümüyle önizlenir. Yayında aynı sürüm öğrenci ve bağlı velilere eşzamanlı açılır; yayımlanmış içerik otomatik yeniden üretilmez.
- Özet iki iyi giden şey, bir destek alanı ve evde sorulabilecek bir soruyla sınırlıdır. Veri tazeliği görünürdür; günlük alarm veya kırmızı başarısızlık dili yoktur.
- Öğrenci ve veli yalnız kontrollü yararlılık ve 1–5 kaygı pulse'u verebilir; serbest metin toplanmaz. Haftalık özet bildirimi kullanıcı tercihinden kapatılabilir.
- Yetki, ton, rollout, geri alma ve ölçüm ayrıntıları [sakin haftalık özet standardında](./calm-weekly-digest-operations.md) tanımlıdır.

## Aşama 9 kararları

- `intervention-v3` AI veya tahmine dayalı risk skoru kullanmaz. Katılım, teslim, tekrar ve plan sinyallerine aynı sınav türündeki son iki ölçümde en az 5 net düşüş, 7 tam günlük panel etkinlik boşluğu ve öğretmen/admin'in kontrollü insan concern işareti eklenir; aynı öğrenci ve haftadaki sinyaller tek sahip, SLA ve insan sonucu olan `Student Support Episode` altında toplanır.
- Tek devamsızlık, tek gecikmiş çalışma veya iki açık plan görevi vaka üretmez. Açıklama kanıt sayısını ve değerlendirme penceresini gösterir; motivasyon, sağlık veya aile bağlamı hakkında çıkarım yapmaz.
- Her destek bölümü 24 saatlik ilk insan aksiyonu hedefi, tek sahip, önerilen tek küçük eylem, sürüm ve işlem geçmişi taşır. Sahibi olmayan bölümü öğretmen/admin üstlenebilir; başka öğretmenin sahipliğine öğretmen müdahale edemez.
- Bekletme 1/3/7 günlük kontrollü aralıklarla yapılır. Süresi geçen kayıt yeniden açılır; kapanış kontrollü sonuç koduyla, yanlış işaret ise kural iyileştirme nedeniyle kaydedilir.
- İç aksiyon notları en fazla 500 karakterdir, yalnız admin/aktif grup öğretmeni görür ve ürün event'lerine kopyalanmaz. Öğrenci veya veli ekranında vaka, sahiplik, SLA ya da iç not görünmez.
- Öğretmen ana sayfası historical assignment progress üzerinden ayrı oran hesaplamaz; indeksli `TeacherStudentAttentionSnapshot` servisi canonical açık destek bölümlerinden en fazla beş kayıt okur.
- Kural, yaşam döngüsü, rollout ve geri alma ayrıntıları [müdahale kutusu işletim standardında](./explainable-intervention-inbox-operations.md) tanımlıdır.

## Aşama 10 kararları

- `recovery-v1` yalnız tamamlanmış dersteki `ABSENT` veya `EXCUSED` yoklama için çalışır. Hedef zaman ders bitişinden tam 72 saat sonradır.
- Taslak ortak ders konusu ve sonraki hedefi, en fazla üç aktif materyali, en fazla iki aktif ödevi ve kontrollü mini kontrolü birleştirir. Öğrenciye özel öğretmen notu ile yoklama notu sorguya dahi alınmaz.
- Öğretmen öğrencinin göreceği sürümü önizler ve tek kez yayınlar; yayınlanmış paket otomatik yenilenmez. Sürüm kontrolü eski sekmenin taslağı ezmesini önler.
- Öğrenci öğeleri sırayla inceler ve yalnız `henüz değil`, `bir örnek daha gerekli`, `açıklayabiliyorum` yanıtlarından birini verir. Ceza, borç, seri veya akran karşılaştırması dili kullanılmaz.
- Aktif ve öğretmen onaylı haftalık plan varsa yayın sonrası aynı günlük dakika ve en fazla üç görev sınırları korunarak yeniden dengelenebilir. Geçmiş görevler silinmez, `SKIPPED` iziyle korunur.
- Veli V1'de paket ayrıntılarını ve mini kontrol yanıtını görmez. Event'ler kimlik, başlık, URL, özel not ya da yoklama notu taşımaz.
- Yetki, içerik sınırı, rollout ve geri alma ayrıntıları [telafi paketi işletim standardında](./missed-lesson-recovery-operations.md) tanımlıdır.

## Aşama 11 kararları

- Kanıtlı ödev 2–4 gözlenebilir rubric ölçütü taşır; toplam puan, sınıf sırası ve akran karşılaştırması üretmez.
- Öğrenci V1'de 20–2000 karakterlik çözüm/kontrol kanıtı gönderir. Fotoğraf/PDF, zararlı dosya taraması ve metadata temizleme servisi olmadan kabul edilmez.
- Her yeniden deneme ayrı attempt olarak korunur. Öğretmen bütün ölçütleri `bir adım daha`, `gelişiyor`, `karşılıyor` düzeyleriyle değerlendirir.
- Kanıtlı ödev öğrenci tarafından doğrudan tamamlanamaz; yalnız öğretmen onayı ilerlemeyi `DONE` yapar. Idempotency ve sürüm kontrolü çift işlemi engeller.
- Veli V1'de kanıt, rubric veya geri bildirim ayrıntısı görmez; event'ler içerik ve kimlik taşımaz.
- Ayrıntılar [kanıtlı ödev işletim standardında](./assignment-evidence-rubric-operations.md) tanımlıdır.

## Aşama 12 kararları

- Öğrenci İstanbul haftasında en fazla iki check-in yapar; enerji, çalışma güveni ve engel yalnız kontrollü seçeneklerden oluşur. Puan, tanı ve serbest metin yoktur.
- Özel check-in yalnız öğrenciye görünür. Öğretmen ancak öğrenci açıkça paylaşırsa görür; yardım isteği paylaşımı zorunlu kılar ve yalnız seçilen aktif grubun öğretmenine yönlenir.
- Yardım isteği otomatik müdahale vakası veya risk etiketi oluşturmaz. Check-in içeriği veli/admin ekranına, sakin haftalık özete veya yapay zekâ girdisine taşınmaz.
- Öğretmen yalnız kontrollü küçük destek adımlarından birini seçer. Önceki yanıtlar korunur; öğrenci “henüz değil” derse istek yeni 24 saat hedefiyle yeniden açılır.
- Ürün event'leri kimlik veya içerik taşımaz. İlk yanıt p50 ≤24 saat, 24 saatte yanıt ≥%90 ve faydalılık ≥%60 pilot guardrail'idir; beşten az örneklem karar üretmez.
- Ekran acil yardım hattı olmadığını açıkça belirtir; 112 ve güvenilen yetişkin yönlendirmesi verir, sürekli kriz izleme iddiasında bulunmaz.
- Yetki, saklama, rollout ve geri alma ayrıntıları [öğrenci check-in işletim standardında](./student-check-in-help-operations.md) tanımlıdır.

## Aşama 13 kararları

- Profil tanı, engel adı, sağlık raporu, belge veya serbest sağlık notu toplamaz. Görsel ve medya tercihlerini yalnız kullanıcı kendisi yönetir.
- Akademik düzenleme kontrollü `%0/%25/%50/%100` ek süre ve planlı kısa mola yönergesiyle sınırlıdır; yalnız admin aktif öğrenci hesabında değiştirebilir.
- Öğretmen yalnız kendi aktif grubundaki öğrencinin uygulanabilir yönergelerini görür. Gerekçe, admin kimliği ve profil ayrıntısı gösterilmez; veli profile erişemez.
- Azaltılmış hareket, yüksek kontrast, büyük metin ve rahat aralık panel kökünde uygulanır; kayıt sonrası değişiklik anında görünür ve sonraki oturumlarda korunur.
- Video materyali altyazı durumu ve transkript taşıyabilir. Öğrencinin tercihi uyumlu materyali önce sıralar; diğer kaynakları gizlemez.
- V1'de süreli sınav motoru bulunmadığı için ek süre son teslim tarihini otomatik değiştirmez; öğretmene açık uygulama yönergesi olarak sunulur.
- `320 px` reflow, klavye ile içerik atlama, en az `24 × 24 px` kontrol hedefi ve Axe A/AA taraması kabul kapsamındadır. Event'ler kimlik, tanı veya sağlık verisi taşımaz.
- Rollout, telif, yetki ve manuel WCAG kontrol listesi [erişilebilirlik ve makul düzenleme işletim standardında](./accessibility-accommodation-operations.md) tanımlıdır.

## Aşama 14 kararları

- Service worker yalnız statik uygulama dosyaları ile kimliksiz çevrimdışı ekranı cache'ler. Özel panel HTML'i, API yanıtı ve materyal hiçbir zaman Cache Storage'a yazılmaz.
- Çevrimdışı yazma açık rızayla ve varsayılan kapalıdır. V1 allowlist'i öğretmen ders taslağı/kapanışı ile öğrencinin kontrollü ödev durumuyla sınırlıdır.
- Outbox opak oturum kapsamıyla ayrılır; çıkışta temizlenir, kayıt başına `64 KB` ve 24 saat sınırı uygular. Aynı ders/ödev için yeni bekleyen kayıt eskisiyle birleşir.
- Ders kapanışı mevcut sürüm, idempotency anahtarı ve içerik hash'iyle; ödev durumu sürüm ve mutation anahtarıyla korunur. Replay çift yazmaz, eski sürüm güncel sunucu verisini ezmez.
- `409` otomatik çözülmez; kayıt insan kontrolüne geçer. Güvenlik/doğrulama reddi farklı oturumda yeniden oynatılmaz.
- Düşük veri modu transkript ve normal bağlantıyı öne çıkarır; video/PDF ancak kullanıcı tıklarsa yüklenir ve düğme veri kullanacağını söyler.
- Event'ler yalnız işlem türü ile boyut, kuyruk yaşı, deneme ve çatışma bantlarını taşır; içerik veya nesne kimliği taşımaz. Admin SLO'ları eşitleme başarısı, çatışma ve sona erme oranını minimum örneklemle hesaplar.
- Rollout, cache yasağı, cihaz sınırı ve geri alma adımları [offline-first ve düşük veri işletim standardında](./offline-low-data-operations.md) tanımlıdır.

## Aşama 15 kararları

- `cohort-gain-v1`, aynı öğrencinin aynı sınav türündeki ilk ve en az 14 gün sonraki son uygun ölçümünü eşler. Kesitsel sınıf ortalaması öğrenci gelişimi gibi sunulmaz.
- LGS neti üç, YKS neti dört yanlış götürme kuralıyla hesaplanır ve farklı soru sayılarını karşılaştırabilmek için toplam soruya göre yüzdeye normalize edilir. LGS, TYT, AYT ve YDT birbirine karıştırılmaz.
- Bir sınav türünde en az 10 eşleşmiş öğrenci yoksa medyan değişim, değişim yönü ve çeyrek aralığı tamamen bastırılır. Eksik veri sıfır başarı olarak gösterilmez.
- Yayınlanan görünüm medyan değişim, orta `%50` aralığı, pozitif değişim payı, ölçümler arası medyan gün, eşleşme kapsamı ve veri tazeliğini birlikte gösterir.
- Ortak hata nedeni ancak en az 10 farklı öğrencide görülürse görünür. Öğrenci/grup kırılımı, küçük hücre drill-down'u, öğrenci veya öğretmen sıralaması bulunmaz.
- 30 günlük kazanım etiketleme kapsamı ile kanıtlı ödev geri bildirim medyanı süreç kalitesi sinyalidir; bunlar öğrenme kazancı veya öğretmen etkisi diye adlandırılmaz.
- Event yalnız kural sürümü, hazır/bastırılmış kohort sayısı ve toplam eşleşmiş öğrenci bandını taşır. Öğrenci, grup, öğretmen veya sınav kimliği taşımaz.
- Yorumlama, rollout, geri alma ve kabul ayrıntıları [kohort kalite panosu işletim standardında](./cohort-learning-quality-operations.md) tanımlıdır.

## Aşama 16 kararları

- V1 açık sohbet değildir; yalnız `ASSIGNMENT` ve `MINI_CHECK` taslağı üretir. Öğrenci ve veli AI ile doğrudan etkileşmez.
- Girdi ortak ders konusu/notu/sonraki hedef/çalışma notu, grup dersi/seviyesi ve en fazla üç kazanımla sınırlıdır. Öğrenciye özel not, yoklama notu, check-in, yardım isteği, veli ve ödeme verisi sorguya alınmaz.
- Bilinen öğrenci adları, e-posta, telefon, kimlik numarası ve URL dış çağrıdan önce çıkarılır. Kaynaktaki prompt injection işareti dış çağrıyı durdurup deterministik fallback üretir.
- Dış model ancak aktarım onayı, sunucu API anahtarı, açık model adı ve maliyet oranları birlikte yapılandırılmışsa çağrılır. Günlük istek ve mikro-USD tavanı aşılırsa hizmet kesilmez; güvenli fallback kullanılır.
- Model yalnız izin verilen kaynak kimliklerine atıf yapabilir. Şema, uydurma kaynak, tanı, sıralama, utandırma, garanti ve kişisel veri kontrolleri modelden sonra sunucuda yeniden çalışır.
- Her taslak `DRAFT` başlar. Öğretmen kaynakları görür, dört içerik alanını düzenler ve açıkça onaylar; onay öğrenciye, veliye veya ödev akışına otomatik yayın yapmaz.
- Öğretmen taslağı kontrollü nedenle reddedebilir veya hatalı işaretleyebilir. Prompt/çıktı ürün event'ine kopyalanmaz; yalnız görev, sağlayıcı, gecikme/maliyet bandı, kaynak/redaksiyon sayısı ve inceleme sonucu ölçülür.
- `teacher-draft-v1` altın eval seti gizlilik, prompt injection, kaynak doğruluğu ve iki görev türünü kapsar. Canlı eval maliyet onayı olmadan dış çağrı yapmaz.
- Rollout, tehdit modeli, eval ve geri alma ayrıntıları [güvenli AI öğretmen yardımcısı standardında](./safe-teacher-ai-operations.md) tanımlıdır.

## Aşama 17 kararları

- Pilot rastgele kullanıcı yüzdesi değildir; aktif gruptaki öğretmen, öğrenciler ve bağlı veliler ile kurtarma yetkili admin aynı kohorta atomik olarak alınır.
- `PANEL_ROLLOUT_MODE=pilot` sırasında admin dışındaki her sayfa ve API isteği aktif kohort üyeliğini sunucuda doğrular. Global özellik bayrakları üst sınır olmaya devam eder.
- Aktivasyon dört rol kapsamı, sunucu/istemci bayrak eşliği, kabul ve güvenlik onayı, 90 günlük restore tazeliği ve çekirdek SLO ihlalsizliği gerektirir. Az örneklem ilk pilotta bekleme, genişlemede bloktur.
- `DRAFT`, `ACTIVE`, `PAUSED`, `COMPLETED` ve `ROLLED_BACK` geçişleri sürümlüdür. Duraklatma ve geri alma erişimi keser fakat akademik ve audit kayıtlarını silmez.
- Admin pilot sırasında kilitlenmez. `PANEL_PILOT_KILL_SWITCH=true`, aktif üyelikten bağımsız son durdurma kapısıdır.
- Kohort değişiklik event'i yalnız üye bandı, dört rol kapsamı, readiness ve kontrollü eylem taşır; kullanıcı/grup kimliği içermez.
- Kademeli yayın ve geri alma ayrıntıları [bütünleşik pilot işletim standardında](./integrated-pilot-rollout-operations.md) tanımlıdır.
