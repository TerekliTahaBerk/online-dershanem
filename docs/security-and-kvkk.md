# Güvenlik ve KVKK

Mesaj, telefon ve e-posta kişisel veridir. Logger PII’yi maskeler; içerik/credential loglanmaz. Erişim iş birimi ve permission ile sınırlı, export audit’lidir. Secret’lar server env veya encryption abstraction’ında tutulur ve client’a dönmez.

Saklama süresi yazılı politikayla belirlenmelidir. Süresi dolan konuşmada legal hold kontrolünden sonra kimlik alanları anonimleştirilir. Finans/audit yasal saklama nedeniyle silinmez; PII minimize edilir. KVKK talebi kimlik doğrulama, kapsam, istisna, anonimleştirme ve audit adımlarından geçer.

Replay koruması unique event/idempotency, sahte teslim koruması raw-body HMAC, muhasebe bütünlüğü dönem kilidi ve ters kayıtla sağlanır. CSV spreadsheet formula injection’a karşı korunur.

