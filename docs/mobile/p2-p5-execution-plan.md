# P2–P5 kapatma planı

12 Ekim 2026. Başlangıç: `0e706fff` (PR #453 birleşmiş). Kaynak: [eşlik matrisi](./parity-matrix.md), [tam eşlik yol haritası](./full-parity-roadmap.md). Bu plan mevcut E1–E6 kararlarını değiştirmez.

## Kapatma tanımı ve sıra

Bir dilim yalnız kod, yetki/kaynak izolasyonu, işlem güvenliği, native arayüz ve kanıt birlikte tamamlandığında kapanır. Plan yazılması veya uç eklenmesi bir rotayı `Tam` yapmaz. Kabul bekleyen geliştirmeler ayrı kaydedilir; gerçek cihaz veya dış onay olmadan faz kabulü verilmez.

Uygulama sırası: **P2.7d → P3.1 → P3.2 → P3.3 → P3.4 → P4.1 → P4.2 → P4.3 → P5.1 → P5.2 → P5.3 → P5.4 → toplu kabul**. P4 sona ertelenmez: yayın/puanlama güvenliği öğrenci Deneme Ligi kabulünden önce doğrulanır. Her dilim incelemeye uygun, bağımsız geri alınabilir değişikliktir; şema gerekiyorsa önce ADR ve migration uyumluluk kontrolü yapılır.

Her dilimin ortak kapısı:

1. Web sayfasındaki bütün alt işlemleri matris satırına karşı doğrula; mevcut uç, servis, veri alanları ve bayrakları envantere al.
2. Server Action mantığını ortak servise çıkar; action ve route aynı servisi çağırsın. Kaynak ilişkisi, ürün, personel/işletme izni sunucuda kontrol edilsin.
3. Sözleşmeyi `lib/mobile-contracts` içinde tanımla; mobil sunucu modülü import etmesin. Okuma `private, no-store`; özel notlar, secret ve özel dosya URL'leri seçilmesin.
4. Yazmada işlem anahtarı, sürüm/409, audit ve gereken step-up birlikte uygulanıp test edilsin. 428 tekrarında aynı işlem anahtarı kullanılsın.
5. Native form/detay/liste; yükleme, boş, hata, yetkisiz, çevrimdışı, 409 ve 428 davranışları doğrulansın. Sunucu capability alanları buton görünürlüğünü belirlesin.
6. Sunucu/mobil tip ve lint; hedefli birim, gerçek Postgres entegrasyon, gerçek HTTP ve ilgili web regresyonları geçsin. Atlanan testler başarı olarak sayılmasın.
7. Matris ve CHANGELOG güncellensin; gerçek cihaz kanıtı P6 kayıtlarına bağlansın.

## P2 — Yönetim

| Dilim | Kapsam | Teslimat | Kapatma kanıtı |
| --- | --- | --- | --- |
| P2.7d | Y27 kalan 9 işlem | Bilgi oluştur/sürüm; prompt sürümü; otomasyon oluştur/aç-kapat/deneme; saklama; rol ver/kaldır. Ortak `runOpsCommand` + izin bazlı native formlar | İş birimi IDOR; yetkisiz izin; rol step-up; son aktif süper yönetici yarışı; oturum iptali; işlem anahtarı tekrarı/çatışması; eski sürüm; allowlist; web PRG regresyonu |
| P2.9 kabul | Native önizleme ve öğretmen modu | Mevcut kodun gerçek HTTP ve iPhone doğrulaması | Üç rol önizlemesi, yazma reddi, öğretmen yazması/audit aktörü, TTL, çıkış, çerez/Bearer izolasyonu, cache temizliği |

P2.7d kodu bu çalışma dalında uygulandı; izole PostgreSQL, gerçek HTTP ve native form testleri geçti. P2.9 kabulü geçmeden P2 faz kabulü kapatılamaz.

## P3 — Öğretmen ve Yön koçu

| Dilim | Matris | Somut iş | Kritik kanıt |
| --- | --- | --- | --- |
| P3.1 Eğitim yazmaları | T03, T04, T08 | Öğretmen kapsamıyla ödev oluştur/düzenle; dersten ödev; şablonlar; kazanım favorileri; materyal liste/yükle/düzenle/dosya. Mevcut eğitim editörünün yalnız yetkili öğretmen alanlarını ortaklaştır | Başka öğretmenin grup/ders/ödev/materyaline erişim; dosya boyutu/türü; yükleme geri alma; web sonuç eşliği; native seçim/açma |
| P3.2 Öğrenci ve analiz | T06, T07, T13, T15 | `teacher-roster-server` grup GET; öğretmen kapsamlı öğrenci 360 GET; bayraklı Dino bağlamı (ilişki/atama web’de de yalnız ADMIN); sınıf analizi projeksiyonu; öğretmen dış deneme GET ve kayıt editörü | Aktif kaynak ilişkisi; ilişki kaldırılınca erişim reddi; başka grubun öğrencisi; özel koç notlarının seçilmemesi; filtre/sayfalama |
| P3.3 Öğrenme operasyonu | T09–T12, T14 | Tekrar/telafi/müdahale/özet/taslak GET projeksiyonlarını web yükleyicilerinden çıkar. Tekrar oluştur; telafi üret/yayınla; müdahale oluştur/güncelle/üret; özet üret/yayınla; AI taslak oluştur/düzenle/onayla | Bayrak kapalıysa GET/yazma reddi; kaynak kapsamı; tekrar yayınlama; eski sürüm; AI taslağının insan onayı olmadan yayınlanmaması |
| P3.4 Koç hazırlığı | T20 | Görev oluştur; plan kopyala; şablon uygula; özet üret; `recordCoachingSession` ve `setStudentGoal` ortak servis + route; mevcut native hazırlık ekranını tamamla | Atanmış koç; öğrenci ürün üyeliği; yabancı öğrenci; plan sürümü; görev ve hedef audit; özel not sınırı |

T01/T02/T05/T16–T19 ve Deneme Ligi öğretmen raporları için regresyon kapısı korunur. M7 gerçek iPhone kontrol listesi tamamlanır.

## P4 — Deneme Ligi yönetimi

| Dilim | Matris | Somut iş | Kritik kanıt |
| --- | --- | --- | --- |
| P4.1 Liste ve okuma | K01, K02, K04–K08 | Mevcut `/api/odk/admin/**` uçlarını sayfa yükleyicileriyle eşleştir; özet/pilot hazırlığı, sınav listesi, canlı operasyon, puanlama-yayın kuyruğu, raporlar, salt okunur paketler, pilot projeksiyonları. Native navigasyon ve detay bağlantıları | ODK personel izni/ürün; ADMIN olmayan personel kapsamı; kaynak gizleme; sayfalama; K07 salt okuma |
| P4.2 Sınav editörü | K02, K03 | Sınav oluştur/düzenle, soru/cevap anahtarı/kazanım içe aktar, dosya seçme/yükleme, doğrulama ve önizleme. Mevcut import parser ve depolama servislerini kullan | Hatalı satırın alan hatası; kısmi import geri alma; yabancı dosya; dosya boyutu/türü; cevap anahtarı step-up; eski sürüm |
| P4.3 Puanlama ve yayın | K03–K06, K08 | Puanla/yeniden puanla/yayınla, kuyruk ve pilot işlemleri; açık durum geçişleri ve onay ekranı | Yayın/yeniden puanlama step-up; eşzamanlı tekrar; anahtar değişikliğinin sonuçlara etkisi; tek iş sahiplenme; audit; yayın öncesi öğrenciye sonuç sızmaması |

Sınav **çözme** E1 istisnası olarak kalır. P4 kabulünde native yönetimde değişen sınavın web ve öğrenci sonuç ekranlarında aynı durumu göstermesi doğrulanır.

## P5 — Öğrenci, veli, ortak ayarlar

| Dilim | Matris / kapsam | Somut iş | Kritik kanıt |
| --- | --- | --- | --- |
| P5.1 Öğrenci/veli akışları | S03, S10, S12, S14, S17, S20, V04, V07, V09 | Yetkili ICS indir/paylaş; dış deneme ekle/düzenle; OD veya OK haftalık geri bildirim; uyarlanabilir plan üret; profil ekranı; eski ODK kayıtlarını native aç; veli görüşme kapsamı | Yalnız OK üyeliği; pasif veli bağı ve `canViewAcademic`; yabancı çocuk/deneme/görüşme; plan sürümü; geçmiş kayıt detayı; native takvim paylaşma |
| P5.2 Hesap ayarları | V10, C07, C08, C10, C11 | Paket görüşmesi ve 7 ayar action'ını ortak servise taşı; profil/iletişim/eğitim/fatura/onay/bekleyen çocuk ekle-iptal; erişilebilirlik ve düşük veri ekranları | Başkasının hesabı/çocuk talebi; alan sınırları; onay kanıtı; eski sürüm; hesap değişiminde cache; düşük veri ve ekran okuyucu davranışı |
| P5.3 Güvenlik ve silme | C09, uygulama içi silme | MFA kayıt/gizli anahtar/kod doğrulama; passkey liste/ekle/kaldır için native platform kabiliyetini belirle; silme talebi ve mevcut veri saklama servislerine bağlanma | Oturuma bağlı MFA kurulumu; tek kullanımlık challenge; passkey origin/RP eşliği; son giriş yönteminin korunması; talep tekrarı; iptal/yeniden giriş; saklama kanıtı |
| P5.4 Dino ve personel push | S18, V11, rota dışı push | Çocuk verisi onayına bağlı native Dino konuşma/mesaj/hata/yeniden dene; veli kapsamı; personel push kayıt/tercih/kategori/derin bağlantı | Dino inceleme kararı; çocuk/veli kapsamı; sohbet izolasyonu; hız sınırı; kapalı bayrak; oturum/rol değişiminde token temizliği; yetkisiz derin bağlantı |

Passkey için web'e yönlendiren yer tutucu native eşlik sayılmaz. Platform desteği yetersizse açık mimari karar gerekir. Dino ekranının yazılması çocuk verisi onayının yerine geçmez.

## Ortam ve kabul bağımlılıkları

- Gerçek HTTP/E2E için rol bazlı sentetik hesaplar ve izole veritabanı. Önce yerel PostgreSQL ve sentetik hesap olanağı araştırılır; kişisel/production hesap kullanılmaz. Önceki yol haritasındaki bazı dilimlerde gerçek Postgres/HTTP kanıtı zaten kayıtlıdır; “P2.2'den beri hiçbir E2E çalışmadı” genellemesi doğrulanmış kabul edilmez.
- P1 production personel yetki modu ve shadow raporu operasyon kanıtı gerektirir.
- P2.9 ve her değişen native akış için gerçek iPhone; özellikle dosya, ICS, MFA/passkey, push ve çevrimdışı tekrar.
- Dino çocuk verisi kararı; hesap silme/veri saklama ve ticari içerik incelemeleri.
- P6 için staging/prod origin, backend/migration uyumu ve güvenlik düzeltme kanıtları.

Bunlar koddan elde edilemezse durum **kabul bekliyor** olarak kalır. TestFlight ve App Store yayını bu çalışma planına otomatik dahil değildir.

## Bu çalışma dalının durumu

- P2.7d: kod uygulandı; dokuz komut için gerçek PostgreSQL, yetki/428/revizyon/tekrar için gerçek HTTP ve native form testleri. Y27 uygulama eşliği Tam; P2.9 iPhone kabulü açık.
- P3.1: T03/T04/T08 uygulandı: öğretmen kapsamlı ortak ödev/materyal editörü, dersten ödev, şablon CRUD/uygulama, kazanım arama/favori. HTTP ve native testler geçti; Blob/gerçek iPhone kabulü P6.
- P3.2: T06/T13/T15 uygulandı: roster, sınıf analizi, dış deneme analizi ve ortak giriş/revizyon/onay. T07 profil okumaları uygulandı; Dino bağlamı açık. Aktif kaynak ilişkisi ve sona erme gerçek HTTP ile doğrulandı. T07 Dino açık.
- P3.3: T09 tekrar gözetimi/oluşturma uygulandı; Bearer oluşturma atomik receipt ve öğrenci revizyonuyla korundu. T10 telafi önizleme/üretme/yenileme/insan onaylı yayın uygulandı; atomik receipt/audit/bildirim/outbox, kaynak revizyonu ve eşzamanlı yayın tekrarı gerçek HTTP ile doğrulandı. T11 müdahale kutusu ve tüm takip işlemleri uygulandı; öğretmen kapsamı/sahiplik, revizyon, eşzamanlı receipt ve yaşam döngüsü gerçek HTTP ile doğrulandı. T12 taslak önizleme, seçili öğrenci için üretme/yenileme ve insan onaylı yayın uygulandı; taslak/alıcı revizyonu, atomik receipt/audit/bildirim/outbox ve web regresyonu gerçek HTTP ile doğrulandı. T14 kaynaklı taslak üretme, düzenleme, onay/reddetme/flag native uygulandı; mevcut gateway/aktarım/kota kapıları korunur. Tek sağlayıcı çağrısı PostgreSQL testiyle, kapsam/revizyon/receipt/audit ve onayın yayın olmaması gerçek HTTP ile doğrulandı. P3.4 T20 altı hazırlık yazması native uygulandı; ortak web servisleri, aktif öğrenci/OK üyeliği/koç ataması, kaynak revizyonu, atomik receipt/audit ve özel not sınırı gerçek HTTP ile doğrulandı. İlk görev kapasitesinin iki kez sayılması düzeltildi. Gerçek iPhone kabulü açık.
- P4.1: K01 yönetim özeti/pilot hazırlığı ve K07 salt okunur paket sözleşmesi native uygulandı; ortak web yükleyicileri, mevcut personel/pilot izinleri, özel bağlantı/cevap/müşteri verisi sınırı ve yalnız GET davranışı gerçek HTTP ile doğrulandı. K02 liste/sınav/seri oluşturma native tamamlandı; K05 kuyruk/filtre ve K06 genel raporlar native tamamlandı; K08 pilot koşuları native tamamlandı; K03/K04 ve P4.2’nin sınav detayı ile P4.3 açık. Ortak native QueryView doğrulanmış erişim/özellik kaybında eski veriyi ve formları gizler; geçici ağ hatasında son veri gösterimi korunur.
- P5.1: S03, S10, S12, S14, S17, S20, V04, V07, V09 uygulandı. S14 plan üretimi sürüm koşullu; S20 eski denemeler imleçle native; V07 veli saat talebi/katılım bağlantısı ve kapsam PostgreSQL ile doğrulandı. S10 ortak native giriş/toplu yapıştırma/hata nedeni revizyonu ve kişisel analiz ekranı; OK üyeliği, tekrar, eski revizyon ve personel onayı reddi gerçek HTTP ile doğrulandı.
- P5.2: V10, C07, C08, C10, C11 uygulandı. Yedi ayar Server Action'ı ve veli paket görüşmesi web/mobil ortak servise taşındı (`lib/account/settings-service.ts`, `lib/panel/parent-package-meeting.ts`); rol bölüm kapsamı, revizyon, aktör kapsamlı makbuz, başka velinin çocuk kaydı ve bağlı olmayan çocuk PostgreSQL ile doğrulandı. Gerçek HTTP ve iPhone kabulü açık.
- P5.3: C09 TOTP ilk kurulum/değiştirme ve kurtarma kodları native; uygulama içi hesap silme talebi (parola, tek açık talep, yönetici bildirimi, DSR tombstone çakışması) uygulandı. Passkey platform kararı açık (C09 Kısmi).
- P5.4: personel push `staffPush` bayrağı arkasında uygulandı (kayıt/tercih/genel metinli STAFF kategorisi/yönetici derin bağlantısı, finans/sipariş hariç); production açma kararı açık. S18/V11 Dino çocuk verisi inceleme kararı olmadan uygulanmadı.
- Gerçek iPhone, Dino incelemesi, production personel kararı ve P6 kabulü açık. Tüm P2–P5'in kapandığı iddia edilmez.

## Teslimat kaydı

Her dilim aşağıdaki kayıtla kapatılır: `dilim · commit/PR · matris satırları · geçen testler · atlanan testler/nedeni · cihaz kanıtı · açık dış bağımlılık`. Matris özetini `npm run lint:mobile-parity` denetler. Son toplu kontrolde P2–P5'te bütün rota alt işlemleri ve rota dışı silme/push işleri tek tek karşılaştırılır; eksik veya onaysız madde varken “hepsi kapandı” yazılmaz.

### 12 Ekim 2026 — T10 telafi dilimi

- Matris: 75 Tam / 9 Kısmi / 15 Eksik / 1 İstisna / 6 Yönl.
- Kanıt: 985 sunucu birim testi, 41 mobil paket / 259 test; izole yerel PostgreSQL ve gerçek HTTP ile yabancı öğretmen, kaynak değişimi, işlem tekrarı, eşzamanlı yayın, tek bildirim/outbox ve kayıt sona ermesi. Tip/lint/API/sözleşme/matris kontrolleri geçti.
- Gerçek iPhone ve TestFlight dağıtımı bu dilimde doğrulanmadı. P2.9, P3 kalanları, P4, P5 kalanları ve dış kararlar açık.
