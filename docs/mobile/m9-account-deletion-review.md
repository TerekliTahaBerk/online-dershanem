# M9 hesap silme incelemesi

Tarih: 10 Ekim 2026. Kapsam: Online Dershanem mobil 1.0.0.

Durum: **PARTIAL (giriş noktası), BLOCKED (store-compliant tamamlanma)**.

Hesap → Hesabımı sil ekranı e-posta talep hazırlama ve açık saklama/kimlik doğrulama açıklaması içerir. /hesap-silme public bilgi sayfası bu dalda eklendi; henüz deploy edilmedi. Başvuru işlemi başarı veya anında silme gibi sunulmaz. E-posta native composer açılması talebin teslim edildiğini kanıtlamaz. Bu destek mekanizması Apple'ın app içinden başlatılabilen silme şartını tek başına karşıladığı kabul edilmez.

## Mevcut lifecycle

`lib/panel/user-deletion.ts` ilişkili öğretmen/ODK kayıtları için blocker toplar; tek başına self-service değildir. `scripts/dsr-request.mjs` → `lib/data-governance/dsr.ts` yetkili approver + ticket ister; self approval reddedilir. requestErasure tombstone oluşturur, hesabı SUSPENDED yapar ve oturumları iptal eder. Bekleme sonrası apply işlemi blocker/retention koşullarını kontrol eder; anonymize/delete birbirinden ayrıdır. Restore tombstone ledger geri yüklemede silinmiş kimlikleri tekrar ele alır. Suspend/delete eşdeğer değildir.

Yeni destructive endpoint, sahte admin onayı veya retention bypass eklenmedi. Parent-child, educational history ve finance kayıtlarına silme kuralı uydurulmadı. PushDevice/Delivery ve kişisel blob/cache davranışı anonimleştirme ve deletion dallarında hukuk/operasyon tarafından uçtan uca kanıtlanmalı; ilişkisel cascade varsayımı kanıt sayılmaz.

## Store blocker kapatma

1. Veri sorumlusu saklanan/silinen kategori, gerekçe ve süreyi onaylar.
2. Operasyon destek posta kutusunun izlendiğini ve kimlik/veli yetkisinin nasıl doğrulandığını kanıtlar.
3. Mevcut lifecycle üzerinden kullanıcı tarafından başlatılabilen, authenticated ve açık confirmation içeren talep akışı veya Apple'ın izin verdiği doğrudan web silme workflow'u tamamlanır. E-posta-only geçici giriş final çözüm sayılmaz.
4. QA sentetik öğrenci/veli/personel için talep, iptal, oturum iptali, apply/blocker, push iptali ve restore kanıtı toplar. Başka kullanıcının hesabına işlem mümkün olmamalı.
5. Yeni public URL onaylı backend release sonrası canlı kontrol edilir; Play Data Safety alanına ancak sonra girilir.

[Apple deletion guidance](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion), [Google deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111).
