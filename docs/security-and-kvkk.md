# Güvenlik ve KVKK

Mesaj, telefon ve e-posta kişisel veridir. Logger PII’yi maskeler; içerik/credential loglanmaz. Erişim iş birimi ve permission ile sınırlı, export audit’lidir. Secret’lar server env veya encryption abstraction’ında tutulur ve client’a dönmez.

Saklama süresi iş birimi ayarındaki `retentionDays` ile yönetilir (varsayılan 730, panel sınırı 30–3650 gün). Günlük `APPLY_BUSINESS_RETENTION` işi süresi dolmuş `CLOSED`/`SPAM` konuşmaların mesaj içeriği, medya/provider metadata’sı ve lead PII’sini anonimleştirir; finans/audit yasal saklama nedeniyle silinmez. Hukuki saklama zorunluluğu bulunan kayıtlar anonimleştirmeden önce operasyon tarafından açık konuşma durumunda tutulmalıdır. KVKK talebi kimlik doğrulama, kapsam, istisna, anonimleştirme ve audit adımlarından geçer.

Replay koruması unique event/idempotency, sahte teslim koruması raw-body HMAC, muhasebe bütünlüğü dönem kilidi ve ters kayıtla sağlanır. CSV spreadsheet formula injection’a karşı korunur.
