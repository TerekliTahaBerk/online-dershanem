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
- Mevcut Jest: 15 suite / 141 test geçti. Fixture akışları rol/ürün, liste/detay, yazma, hata/yeniden deneme davranışını kapsar; piksel eşitliği ölçmez.
- Android ham Hermes string tablosunda `Bearer ` sabiti bitişik bağımsız stringlerle birleşerek yanlış alarm üretti. Tarayıcı artık `.hbc` dosyalarını Hermes ile çözüp tarıyor; çözümleme hatası kapıyı durdurur. Sentetik temiz bytecode kabul edildi, gerçek token biçimli sentetik literal reddedildi. Kontrol kaldırılmadı.
- 33 web/native token eşlemesi ve 10 sözleşme sınırı kontrolü geçti.
- iOS ve Android Hermes export başarılı; exportlar secret/release hygiene taramasından geçti. Bunlar imzalı binary değildir. Production config ile ilk export eksik zorunlu bundle kimliğinde güvenle durdu; doğrulama mevcut CI ile aynı unsigned/offline modda yapıldı.
- iPhone SE QA / iOS 26.5 / Expo Go SDK 57: giriş hata durumu, başarılı giriş, üç aktif ürün seçimi, OD ana sayfa ve menü, ürün değiştirici, OK ve ODK ana sayfaları, hesap, parola formu, kaydırma ve çıkış gözlemlendi. Test yalnız sentetik yerel öğrenci hesabında yapıldı; kullanıcı iPhone'u uzaktan kontrol edilmedi.
- Native ekran görüntüleri `design-qa/` altında. Mavi dişli Expo Go geliştirici aracıdır; uygulamanın yayın arayüzünün parçası değildir. Menü görüntüsü güvenli alan düzeltmesinden önce alınmıştır; sonraki ODK görüntüsü son üst boşluğu gösterir.

### Görsel kabul sınırları

Yerel hesabın ders/koç/deneme içerikleri boş. Dolu analiz, uzun liste ve veli/personel görünümleri mevcut fixture testleri/kaynak incelemesiyle doğrulandı; bu durumların native görsel karşılaştırması yapılmış sayılmaz. Fiziksel iPhone, Android cihaz, büyük sistem yazısı, yazılım klavyesi ve offline native görsel kabulü ayrıca açık kalır. Bu işin ortak tasarım uygulaması tamamlandı; tüm rol/veri/cihaz kombinasyonları için görsel kabul tamamlandı iddiası yoktur.

## Native ekran envanteri

Aşağıdaki kayıtlar rota wrapper'larını tekrar ekran saymaz. Her kayıt ortak panel tasarım bileşenlerini kullanır. “Kaynak/fixture” görsel cihaz doğrulaması anlamına gelmez.

| Ekran kimliği | Özellik dosyası | Kontrol |
| --- | --- | --- |
| `od-home` | `mobile/src/features/od/od-home.tsx` | iOS boş durum + fixture |
| `od-lessons` | `mobile/src/features/od/od-lessons.tsx` | Kaynak/fixture |
| `od-assignments` | `mobile/src/features/od/od-assignments.tsx` | Kaynak/fixture |
| `od-materials` | `mobile/src/features/od/od-materials.tsx` | Kaynak/fixture |
| `od-progress` | `mobile/src/features/od/od-progress.tsx` | Kaynak/fixture |
| `od-review-recovery` | `mobile/src/features/od/od-review-recovery.tsx` | Kaynak/fixture |
| `od-weekly-digest` | `mobile/src/features/od/od-weekly-digest.tsx` | Kaynak/fixture |
| `external-mock-exams` | `mobile/src/features/shared/external-mock-exams.tsx` | Kaynak/fixture |
| `check-in` | `mobile/src/features/shared/check-in.tsx` | Kaynak/fixture |
| `yon-today` | `mobile/src/features/yon/yon-today.tsx` | iOS boş durum + fixture |
| `yon-work` | `mobile/src/features/yon/yon-work.tsx` | Kaynak/fixture |
| `yon-coaching` | `mobile/src/features/yon/yon-coaching.tsx` | Kaynak/fixture |
| `yon-plan` | `mobile/src/features/yon/yon-plan.tsx` | Kaynak/fixture |
| `yon-goals` | `mobile/src/features/yon/yon-goals.tsx` | Kaynak/fixture |
| `yon-weekly` | `mobile/src/features/yon/yon-weekly.tsx` | Kaynak/fixture |
| `odk-home` | `mobile/src/features/odk/odk-home.tsx` | iOS boş durum + fixture |
| `odk-exams` | `mobile/src/features/odk/odk-exams.tsx` | Kaynak/fixture |
| `odk-switch` | `mobile/src/features/odk/odk-switch.tsx` | Kaynak/fixture |
| `parent-home` | `mobile/src/features/parent/parent-home.tsx` | Kaynak/fixture |
| `parent-lessons` | `mobile/src/features/parent/parent-lessons.tsx` | Kaynak/fixture |
| `parent-assignments` | `mobile/src/features/parent/parent-assignments.tsx` | Kaynak/fixture |
| `parent-teachers` | `mobile/src/features/parent/parent-teachers.tsx` | Kaynak/fixture |
| `parent-insights` | `mobile/src/features/parent/parent-insights.tsx` | Kaynak/fixture |
| `parent-coaching` | `mobile/src/features/parent/parent-coaching.tsx` | Kaynak/fixture |
| `parent-odk-reports` | `mobile/src/features/parent/parent-odk-reports.tsx` | Kaynak/fixture |
| `parent-external-exams` | `mobile/src/features/parent/parent-external-exams.tsx` | Kaynak/fixture |
| `parent-weekly` | `mobile/src/features/parent/parent-weekly.tsx` | Kaynak/fixture |
| `parent-account` | `mobile/src/features/parent/parent-account.tsx` | Kaynak/fixture |
| `teacher-home` | `mobile/src/features/staff/teacher/teacher-home.tsx` | Kaynak/fixture |
| `teacher-lessons` | `mobile/src/features/staff/teacher/teacher-lessons.tsx` | Kaynak/fixture |
| `teacher-assignments` | `mobile/src/features/staff/teacher/teacher-assignments.tsx` | Kaynak/fixture |
| `teacher-help` | `mobile/src/features/staff/teacher/teacher-help.tsx` | Kaynak/fixture |
| `coach-home` | `mobile/src/features/staff/coach/coach-home.tsx` | Kaynak/fixture |
| `coach-students` | `mobile/src/features/staff/coach/coach-students.tsx` | Kaynak/fixture |
| `coach-sessions` | `mobile/src/features/staff/coach/coach-sessions.tsx` | Kaynak/fixture |
| `coach-plans` | `mobile/src/features/staff/coach/coach-plans.tsx` | Kaynak/fixture |
| `teacher-odk-reports` | `mobile/src/features/staff/odk/teacher-odk-reports.tsx` | Kaynak/fixture |

Detay rotaları (ders/ödev/görev/deneme/sonuç/öğretmen teslimi/koç öğrenci-plan-görüşme) ortak Stack, PageHeader, Section, Row, form ve feedback katmanını kullanır. Kimlik kapıları ile genel hesap/bildirim rotaları yukarıdaki aile eşlemesine dahildir.
