# Bildirim kataloğu

Uygulama içi bildirim (`notifications` tablosu), e-posta outbox ve mobil push
aynı satırdan beslenir. Push yalnız `lib/push/classification.ts` izin
listesine uyan satırlar için ve kilit ekranında **genel metinle** gider
(kişisel veri yok). Öğretmen / koç / yönetici push'u `PANEL_FEATURE_STAFF_PUSH`
bayrağı açıkken çalışır; kapalıyken bildirim yine uygulama içinde görünür.

## Ödev ve plan görevi (`lib/panel/study-notifications.ts`)

Tümü "Çalışmalar ve ödevler" (`assignment`) tercihine bağlıdır. Satır kimliği
olaydan türetilir: aynı görevin tekrar işaretlenmesi ikinci bildirim üretmez.

| Olay | Alıcı | Başlık | Açılan ekran |
| --- | --- | --- | --- |
| Öğretmen yeni ödev girdi | Öğrenci | Yeni ödev | Ödevlerim |
| | Veli | Çocuğunuza yeni ödev verildi | Veli → Ödevler |
| Öğrenci ödevi tamamladı | Öğretmen | Ödev tamamlandı | Öğretmen → Çalışmalar |
| | Veli | Çocuğunuz ödevini tamamladı | Veli → Ödevler |
| Öğrenci kanıtlı ödev teslim etti | Öğretmen | Değerlendirme bekleyen ödev | Öğretmen → Çalışmalar |
| Öğretmen teslimi değerlendirdi | Öğrenci | Ödevin onaylandı / yeniden deneme hazır | Ödevlerim |
| | Veli | Ödev onaylandı / düzeltme istendi | Veli → Ödevler |
| Öğrenci plan görevini (madde) kapattı | Koç | Plan görevi tamamlandı · Öğrencin bir görevi yapamadı · Öğrencin günün planını bitirdi | Koç → Öğrenci |
| | Veli | Çocuğunuz bir görevi tamamladı · …yapamadı · …günün planını bitirdi | Veli → Koçluk |
| Ödev kaynaklı plan görevi tamamlandı | OD öğretmeni + veli | Ödev tamamlandı (yukarıdaki satır) | |
| Koç yayınlanmış plana görev ekledi | Öğrenci | Planına yeni görev eklendi | Planım |
| | Veli | Koç plana yeni görev ekledi | Veli → Koçluk |
| Koç haftalık planı yayınladı | Öğrenci | Plan yayınlandı | Planım |
| | Veli | Haftalık plan yayınlandı | Veli → Koçluk |

Plan görevi bildiriminin gövdesi günün ilerlemesini taşır
(`günün görevleri: 2/3 tamamlandı`).

## Diğer mevcut bildirimler

| Alan | Olay | Alıcı |
| --- | --- | --- |
| Ders | Ders programlandı / değişti / telafi planlandı | Öğrenci, veli |
| Ders | Ders hatırlatması (24 saat ve yakında) | Öğrenci, veli |
| Ders | Ders özeti hazır | Öğrenci, veli |
| Ders | Devamsızlık bilgisi | Veli |
| Ders | Ders kapanışında ödev taslağı | Öğrenci, veli |
| Ders | Kaçırılan ders için telafi paketi | Öğrenci |
| Materyal | Yeni ders materyali | Öğrenci, veli |
| Ödev | Geciken çalışma hatırlatması (cron) | Öğrenci |
| Plan | Yaklaşan / geciken plan görevi (cron) | Öğrenci |
| Plan | Haftalık plan onay bekliyor | Koç |
| Koçluk | Yarınki koçluk görüşmesi | Öğrenci, veli |
| Koçluk | Saat değişikliği talebi / yeni saat önerisi | Koç / öğrenci |
| Destek | Yeni yardım isteği, destek yetmedi | Öğretmen / koç |
| Destek | Öğretmen yardım isteğine döndü | Öğrenci |
| Özet | Haftalık özet hazır | Veli |
| Özet | Günün gelişmeleri (günlük özet tercihi) | Tümü |
| Grup | Kayıt / transfer / çıkarılma / öğretmen ataması | Öğrenci, veli, öğretmen |
| Deneme Ligi | Deneme yakında / başladı / sonuç / cevap anahtarı | Öğrenci |
| Deneme | Yaklaşan deneme (takvime eklendi) | Öğrenci |
| Hesap | İşlevsel destek düzenlemesi güncellendi | Öğrenci |
| Ödeme | Ödeme kaydı eşleşti (push'a çıkmaz) | Öğrenci, veli |
| Yönetim | Yeni ödeme, hesap açılışı, yeni aday, kritik cron alarmı | Yönetici |
