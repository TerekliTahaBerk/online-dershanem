# Bütünleşik pilot ve kademeli yayın standardı

## Amaç ve güvenlik sınırı

Pilot bir yüzde rastgeleleştirmesi değildir. Öğretmen, aktif öğrenciler ve onların bağlı velileri aynı eğitim ilişkisi içinde birlikte seçilir; işlemi yapan admin kurtarma ve denetim için kohorta eklenir. Böylece öğrencinin açılan bir akışı öğretmen veya velide kapalı kalmaz. Kohort oluşturmak erişimi açmaz.

Global `PANEL_FEATURE_*` bayrakları ürünün üst sınırıdır ve istemci menüsüne aynı server snapshot'ı aktarılır. Pilot kohortu kapalı bir özelliği açamaz. `PANEL_ROLLOUT_MODE=pilot` olduğunda admin dışındaki her korumalı sayfa ve API isteği aktif `PilotCohortMember` ilişkisini sunucuda yeniden doğrular. İstemci menüsü veya middleware güvenlik kararı değildir.

## Aktivasyon kapıları

Bir `DRAFT` kohortunun `ACTIVE` olabilmesi için:

1. `PANEL_ROLLOUT_MODE=pilot` ve `PANEL_PILOT_KILL_SWITCH=false` olmalıdır.
2. Kohortta admin, öğretmen, öğrenci ve veli rollerinin her biri bulunmalıdır.
3. Açık her sunucu özelliğinin istemci görünürlük bayrağı aynı olmalı ve en az bir yeni özellik açık olmalıdır.
4. `PANEL_PILOT_ACCEPTANCE_APPROVED=true` ile dört rol E2E, mobil ve erişilebilirlik kabulü onaylanmalıdır.
5. `PANEL_PILOT_SECURITY_REVIEW_APPROVED=true` ile yatay erişim, çocuk verisi, KVKK ve varsa dış sağlayıcı incelemesi tamamlanmalıdır.
6. `PANEL_LAST_RESTORE_DRILL_AT` geçerli ve en fazla 90 günlük başarılı bir restore tatbikatını göstermelidir.
7. Ders kapanışı p90, ders notu/ödev ilerleme/grup kurulum güvenilirliği ve veli ekranı p90 çekirdek SLO'larında doğrulanmış ihlal bulunmamalıdır.

Beş örnekten az SLO `WAIT` sayılır: ilk küçük pilotu engellemez, fakat genişlemeyi engeller. Eksik veri hiçbir zaman “hedefte” olarak gösterilmez.

## Yaşam döngüsü ve geri alma

- `DRAFT → ACTIVE`: readiness kapıları sunucuda yeniden hesaplanır.
- `ACTIVE → PAUSED`: yeni pilot erişimi anında kesilir; kayıtlar korunur. Operasyon, guardrail, güvenlik veya veri kalitesi nedeni seçilir.
- `PAUSED → ACTIVE`: readiness yeniden doğrulanmadan sürdürülemez.
- `ACTIVE → COMPLETED`: pilot kanıtı korunur; kohort tekrar açılamaz.
- `ACTIVE/PAUSED → ROLLED_BACK`: terminal geri alma durumudur; akademik kayıtlar silinmez.

Her geçiş `version` kontrolü kullanır; eski admin sekmesi yeni kararı ezemez. Değişiklikler audit kaydına, yalnız rol kapsamı/üye bandı/durum içeren PII'siz ürün event'ine yazılır.

Admin erişimi pilot ve kill switch sırasında korunur; aksi halde hatalı kohort veya acil durdurma sonrasında kurtarma yolu kalmaz. `PANEL_PILOT_KILL_SWITCH=true`, aktif kohorttan bağımsız olarak admin dışındaki panel erişimini kesen deploy düzeyi son durdurma kapısıdır.

## Kademeli yayın sırası

1. İç kabul: gerçek model yerine fallback/stub, sentetik hesaplar, migration ve restore doğrulaması.
2. Tek grup pilotu: en az 7 gün; dört rolün kritik yolculukları ve destek talepleri incelenir.
3. Çoklu kohort: en az 3 farklı grup ve 14 gün; bütün çekirdek SLO'lar yeterli örneklemle `PASS` olmalıdır.
4. Kontrollü genişleme: farklı cihaz, düşük veri ve erişilebilirlik tercihleri temsil edilir; güvenlik olayı `0` kalır.
5. Genel yayın: yalnız `canExpand=true`, ürün sahibi ve güvenlik onayı sonrasında `PANEL_ROLLOUT_MODE=general` olarak yeni deploy yapılır. Kohort kayıtları pilot kanıtı olarak korunur.

## Günlük kontrol ve durdurma ölçütleri

- Yatay erişim, özel check-in/öğretmen notu sızıntısı veya çocuk güvenliği olayı: derhal `PAUSED`, gerekirse kill switch.
- Çekirdek SLO ihlali, offline private cache bulgusu, AI uydurma kaynak/gizlilik flag'i veya bilinmeyen model maliyeti: genişleme durur; ilgili özellik global bayrakla kapatılır.
- Veli kaygı pulse'u, öğrenci bunaltı pulse'u veya yardım SLA'sı hedef dışı: kohort büyütülmez; tekil kullanıcı suçlanmaz.
- Restore tatbikatı 90 günü aşarsa yeni aktivasyon yapılmaz.

Pilot tamamlanması veri silme yetkisi değildir. Saklama ve veri sahibi talepleri mevcut veri yönetişimi standardına tabidir.
