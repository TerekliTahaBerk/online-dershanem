# Mobil tasarım uyumu — uygulama ve doğrulama

10 Ekim 2026. Referans: aynı checkout'taki site, AuthCard ve `.pn-scope` paneli. Bu belge store/release onayı değildir.

## Uygulanan değişiklikler

- Webdeki üç logo native asset olarak alındı; giriş, ürün seçimi, değiştirici, OD diğer ürün bağlantıları ve hesap ürünleri aynı varlıkları kullanıyor.
- AuthScreen: sıcak zemin, 380px azami kolon, 48px logolar, gerçek Manrope 800 başlık, 52pt/12px kontroller. Giriş, parola unuttum, zorunlu parola ve MFA aynı düzeni paylaşıyor. Parola göster/gizle ikonu erişilebilir etiketli.
- Giriş eylemi marka yeşili; panel primary eylemi webdeki koyu nötr. Destructive eylem beyaz yüzey/kırmızı çerçeve. Başlık, bölümler, satırlar, boş/hata durumları, alanlar ve sekmeler ortak tasarımdan geliyor.
- Özelleştirilebilir Expo Router Tabs: server primary sırası, aynı ikon ailesi ve aktif ürünün rengi. PanelHeader ürün logosu, bildirim ve hesap erişimini taşıyor. Eski tab güvenli alan dolgusu kaldırıldı; üst boşluk iki kez uygulanmıyor.
- Menüde kullanıcı/rol, logolu ürün değiştirici, server bölüm/satır sırası ve hesap/çıkış erişimi. Ürün değişince avatar ve aktif tab rengi de değişir.
- Kaydırılabilir ve yüksekliği sınırlı seçim penceresi; uzun satır sağ bilgileri genişliğin %45'iyle sınırlı; başlık/eylemler ve filtre etiketleri satır kırabilir. Yön hafta şeridi yatay kayabilir.
- Veli/personel ortak bilgi kutuları beyaz yüzey, ince bordür ve aynı iç boşluk kullanır. Hesap güvenlik bağlantılarına tutarlı ikonlar eklendi.
- İkinci tur: öğretmen, koç ve personel bilgi ana sayfalarındaki yinelenen ürün seçiciler/üst güvenli alan kaldırıldı. Telefonda uzun durumlar ve satır bilgileri başlığın altına geçer; OD/Yön/Deneme listelerinde rozetler başlığı daraltmaz.
- Çok satırlı alanlar 112pt asgari yüksekliğe sahip. Büyük yazıda üç ve dört seçenekli kontroller satıra bölünür; iOS Dynamic Type uygulama açıkken değiştiğinde metin yeniden ölçülür. Bildirim filtreleri en az 44pt, alt navigasyon etiketleri kesilmeden büyür.
- Uzun öğrenci adı ve panel seçimi kimliği kırpılmaz. Veli/personel açıklamalarında aynı paragraf tekrarlandığında React anahtarları çakışmaz; salt okunur seçili karşılaştırma satırı da ürün vurgusunu gösterir.

API iş kuralları, server menüleri, rol/ürün kapıları, MFA ve mevcut web devam sınırları korunur. Mobilde satış, PAYTR, fiyat CTA veya checkout eklenmedi. Yeni test suite oluşturulmadı.

## Referans ve ekran aileleri

| Aile | Web referansı | Native uygulama kararı |
| --- | --- | --- |
| Kimlik/giriş | `components/auth/auth-card.tsx`, `components/panel/login-form.tsx`, `app/giris` | AuthScreen ve auth control varyantı |
| Kabuk/menü | `components/panel/panel-shell`, `panel-nav`, `panel-mobile-nav`, web workspace-switcher | PanelHeader, Tabs, MenuScreen, WorkspaceSwitcher; dokunma hedefi en az 44pt |
| Öğrenci OD | `app/panel/ogrenci`, ders/ödev/kaynak/gelişim/haftalık alt sayfaları | Mevcut içerik sırası + ortak PageHeader/Section/Row/feedback; diğer ürünlerde gerçek logo |
| Yön Koçluk | `app/panel/ogrenci/yon`, plan/koç/hedef/haftalık | Aynı bölüm/eylem sırası; ürün vurgulu seçimler ve kaydırılabilir hafta |
| Deneme Ligi | `components/odk/student-dl-home.tsx`, ODK öğrenci liste/sonuç | Aynı sonuç/odak/sıradaki deneme sırası; native sınav başlatma eklenmez |
| Veli | `app/panel/veli`, ilgili alt sayfalar | ChildBar ve ortak ekran/feedback; beyaz bordürlü bilgi kutuları |
| Öğretmen/koç | `app/panel/ogretmen`, Yön koç alanı, ODK öğretmen raporları | Aynı server menüsü, ortak form/satır/kutu/feedback; sistem tarih seçicisi korunur |
| Hesap/bildirim | `app/panel/ayarlar`, bildirim ve güvenlik ekranları | Aynı semantik kontrol hiyerarşisi, native Stack geri hareketi |

## Doğrulama

- Mobil TypeScript ve ESLint geçti.
- Mevcut Jest: 15 suite / 141 test geçti. Mevcut testler rol/ürün navigasyonu ile OD liste/detay, yazma ve hata/yeniden deneme davranışlarını kapsar; veli/personel için native görsel test veya piksel eşitliği ölçümü değildir.
- Android ham Hermes string tablosunda `Bearer ` sabiti bitişik bağımsız stringlerle birleşerek yanlış alarm üretti. Tarayıcı artık `.hbc` dosyalarını Hermes ile çözüp tarıyor; çözümleme hatası kapıyı durdurur. Sentetik temiz bytecode kabul edildi, gerçek token biçimli sentetik literal reddedildi. Kontrol kaldırılmadı.
- 33 web/native token eşlemesi ve 10 sözleşme sınırı kontrolü geçti.
- iOS ve Android Hermes export başarılı; exportlar secret/release hygiene taramasından geçti. Bunlar imzalı binary değildir. Production config ile ilk export eksik zorunlu bundle kimliğinde güvenle durdu; doğrulama mevcut CI ile aynı unsigned/offline modda yapıldı.
- iPhone SE QA / iOS 26.5 / Expo Go SDK 57: giriş hata durumu, başarılı giriş, üç aktif ürün seçimi, OD ana sayfa ve menü, ürün değiştirici, OK ve ODK ana sayfaları, hesap, parola formu, kaydırma ve çıkış gözlemlendi. Test yalnız sentetik yerel öğrenci hesabında yapıldı; kullanıcı iPhone'u uzaktan kontrol edilmedi.
- Native ekran görüntüleri `design-qa/` altında. Mavi dişli Expo Go geliştirici aracıdır; uygulamanın yayın arayüzünün parçası değildir. Menü görüntüsü güvenli alan düzeltmesinden önce alınmıştır; sonraki ODK görüntüsü son üst boşluğu gösterir.

### Görsel kabul sınırları

İkinci turda iPhone SE QA / iOS 26.5 / Expo Go üzerinde sözleşmelerle doğrulanan, yalnız geçici yerel QA API'sinden gelen sentetik dolu veriler kullanıldı. OD dolu ana sayfa ve gidişat; veli ana sayfa, öğrenci seçimi ve akademik gelişim; öğretmen ana sayfa/ders/hazırlık/kapanış formu; koç ana sayfa/öğrenci/görüşme/not formu; öğretmen Deneme Ligi öğrenci raporu; Yön Bugün/haftalık plan/tercihler/hedefler; Deneme Ligi ana sayfa/sonuç/yanlış filtresi/soru ayrıntısı; dolu bildirim listesi gözlemlendi. Not alanına çok satırlı içerik girildi, yazılım klavyesi açılıp kapatıldı. Tercihler ve filtreler yerelde değiştirildi; eğitim kayıtlarına yazma yapılmadı.

Simülatör tercihli yazı boyutu beş kademe artırıldı; açık uygulamada bir kademe azaltılarak canlı metin ölçümü doğrulandı. Büyük yazıda ders başlığı, satırlar, alt navigasyon ve üçlü sekmeler gözlemlendi; başlangıç yazı boyutu geri getirildi. HTTP 503 hata durumu ve “Tekrar dene” ile dolu içeriğe dönüş gözlemlendi. Bu, cihazın gerçekten çevrimdışı olma testi değildir.

Bu kontrol UI yerleşimi ve etkileşim kontrolüdür; canlı backend veya tüm rol/veri kombinasyonları için uçtan uca kabul değildir. Fiziksel iPhone, Android cihaz ve gerçek bağlantı kesintisi için cihaz kabulü ayrıca gereklidir. Android için bu turdaki doğrulama TypeScript/testler ve Hermes export/hijyen taramasıdır. Geçici QA API'si, sentetik oturum ve bu tur ekran kanıtları repoya eklenmedi; kullanıcının telefondaki Expo bağlantısı aynı API ile çalışmaya devam eder.

## Native ekran envanteri

Aşağıdaki kayıtlar rota wrapper'larını tekrar ekran saymaz. Her kayıt ortak panel tasarım bileşenlerini kullanır. “Kaynak/fixture” görsel cihaz doğrulaması anlamına gelmez.

| Ekran kimliği | Özellik dosyası | Kontrol |
| --- | --- | --- |
| `od-home` | `mobile/src/features/od/od-home.tsx` | iOS dolu + fixture |
| `od-lessons` | `mobile/src/features/od/od-lessons.tsx` | Kaynak/fixture |
| `od-assignments` | `mobile/src/features/od/od-assignments.tsx` | Kaynak/fixture |
| `od-materials` | `mobile/src/features/od/od-materials.tsx` | Kaynak/fixture |
| `od-progress` | `mobile/src/features/od/od-progress.tsx` | iOS karma dolu/boş durum + fixture |
| `od-review-recovery` | `mobile/src/features/od/od-review-recovery.tsx` | Kaynak/fixture |
| `od-weekly-digest` | `mobile/src/features/od/od-weekly-digest.tsx` | Kaynak/fixture |
| `external-mock-exams` | `mobile/src/features/shared/external-mock-exams.tsx` | Kaynak/fixture |
| `check-in` | `mobile/src/features/shared/check-in.tsx` | Kaynak/fixture |
| `yon-today` | `mobile/src/features/yon/yon-today.tsx` | iOS dolu + kaynak |
| `yon-work` | `mobile/src/features/yon/yon-work.tsx` | Kaynak/fixture |
| `yon-coaching` | `mobile/src/features/yon/yon-coaching.tsx` | Kaynak/fixture |
| `yon-plan` | `mobile/src/features/yon/yon-plan.tsx` | iOS dolu/tercihler + kaynak |
| `yon-goals` | `mobile/src/features/yon/yon-goals.tsx` | iOS dolu + kaynak |
| `yon-weekly` | `mobile/src/features/yon/yon-weekly.tsx` | Kaynak/fixture |
| `odk-home` | `mobile/src/features/odk/odk-home.tsx` | iOS dolu + kaynak |
| `odk-exams` | `mobile/src/features/odk/odk-exams.tsx` | Kaynak/fixture |
| `odk-switch` | `mobile/src/features/odk/odk-switch.tsx` | Kaynak/fixture |
| `parent-home` | `mobile/src/features/parent/parent-home.tsx` | iOS dolu + kaynak |
| `parent-lessons` | `mobile/src/features/parent/parent-lessons.tsx` | Kaynak/fixture |
| `parent-assignments` | `mobile/src/features/parent/parent-assignments.tsx` | Kaynak/fixture |
| `parent-teachers` | `mobile/src/features/parent/parent-teachers.tsx` | Kaynak/fixture |
| `parent-insights` | `mobile/src/features/parent/parent-insights.tsx` | iOS dolu + kaynak |
| `parent-coaching` | `mobile/src/features/parent/parent-coaching.tsx` | Kaynak/fixture |
| `parent-odk-reports` | `mobile/src/features/parent/parent-odk-reports.tsx` | Kaynak/fixture |
| `parent-external-exams` | `mobile/src/features/parent/parent-external-exams.tsx` | Kaynak/fixture |
| `parent-weekly` | `mobile/src/features/parent/parent-weekly.tsx` | Kaynak/fixture |
| `parent-account` | `mobile/src/features/parent/parent-account.tsx` | Kaynak/fixture |
| `teacher-home` | `mobile/src/features/staff/teacher/teacher-home.tsx` | iOS dolu/büyük yazı + kaynak |
| `teacher-lessons` | `mobile/src/features/staff/teacher/teacher-lessons.tsx` | Kaynak/fixture |
| `teacher-assignments` | `mobile/src/features/staff/teacher/teacher-assignments.tsx` | Kaynak/fixture |
| `teacher-help` | `mobile/src/features/staff/teacher/teacher-help.tsx` | Kaynak/fixture |
| `coach-home` | `mobile/src/features/staff/coach/coach-home.tsx` | iOS dolu + kaynak |
| `coach-students` | `mobile/src/features/staff/coach/coach-students.tsx` | Kaynak/fixture |
| `coach-sessions` | `mobile/src/features/staff/coach/coach-sessions.tsx` | Kaynak/fixture |
| `coach-plans` | `mobile/src/features/staff/coach/coach-plans.tsx` | Kaynak/fixture |
| `teacher-odk-reports` | `mobile/src/features/staff/odk/teacher-odk-reports.tsx` | iOS dolu + kaynak |

Detay rotaları (ders/ödev/görev/deneme/sonuç/öğretmen teslimi/koç öğrenci-plan-görüşme) ortak Stack, PageHeader, Section, Row, form ve feedback katmanını kullanır. Kimlik kapıları ile genel hesap/bildirim rotaları yukarıdaki aile eşlemesine dahildir.


## İşlev eşliği — 10 Ekim ek kontrol

Analiz Yön ve Deneme Ligi'nde yer tutucuya düşüyordu; artık ortak web yükleyicisini kullanan native ekran açılır. Analiz API'si ve haftalık hedef, aktif OD / OK / ODK öğrenci erişimini kabul eder; kaynak sahipliği ve pilot kapıları korunur. Analiz bildirimi etkin ürünü OD'ye zorlamaz. Öğretmen sunucu menüsünün birincil sekmelerinin gizlenmesi/boş açılması ve OD yardım kutusu eşlemesi düzeltildi. Yön öğrencisi önerilen görüşme saatini artık native onay adımıyla kabul eder; sürüm çakışmasında bilgi gösterilir ve görüşme yenilenir.

Doğrulama: 15 mobil suite / 150 test, mobil ve kök TypeScript, mobil ESLint, ilgili API ESLint, 24 ilgili sunucu birim testi, 10 sözleşme / 33 token kontrolü geçti. iOS ve Android Hermes exportları ve release hygiene taraması geçti; imzalı binary değildir. Yeni gerçek-HTTP E2E regresyonu mevcut mobile-api suite'ine eklendi, tam E2E suite yerelde koşturulmadı.

Gerçek yerel Next API + PostgreSQL ile yalnız OK üyeliğine sahip geçici öğrenci: Analiz okuma, haftalık hedef yazma/yeniden okuma ve OD ana sayfasına erişememe geçti. Geçici kullanıcı temizlendi. ODK-only ilk kontrol pilot kapısında beklendiği gibi durdu; ayrı aktif pilot test üyeliği oluşturma adımı otomatik onay incelemesinde reddedildi ve çalıştırılmadı. Mevcut üç ürüne erişen yerel test hesabıyla iPhone SE QA / Expo Go üzerinde Yön Analiz açıldı, haftalık hedef kaydedildi, Deneme Ligi'ne geçildi ve ortak Analiz/hedef tekrar okundu. Kullanıcının fiziksel iPhone'u kontrol edilmedi.

Tam native panel eşitliği tamamlanmış değildir: yönetim, Dino, sınav çözme ve diğer açık web devamları sürer. Satış / PAYTR / checkout eklenmedi.
