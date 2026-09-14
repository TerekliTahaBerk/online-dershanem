# Architecture Decision Records

Önemli bir mimari, güvenlik veya veri modeli kararı alındığında ya da geri alındığında
[`template.md`](template.md) kopyalanarak sıradaki numarayla bir ADR yazılır ve bu listeye eklenir.
Her ADR durum, tarih ve sahip taşır; gerekçe kod veya commit kanıtına dayanır.

Durumlar: **Taslak**, **Kabul Edildi**, **Değiştirildi (→ NNNN)**. Kabul edilmiş bir ADR
düzenlenmez; karar değişirse yeni ADR yazılır ve eskisinin durumu güncellenir.

| No | Karar | Durum |
| --- | --- | --- |
| [0001](0001-user-role-dino-audience-neden-ayri.md) | UserRole ve DinoAudience ayrı kalır | Taslak |
| [0002](0002-product-code-commerce-product-neden-ayri.md) | Ürün erişimi, satış ve kupon kapsamları ayrı kalır | Taslak |
| [0003](0003-curriculum-exam-odk-exam-family-neden-ayri.md) | Curriculum exam ve ODK exam family ayrı kalır | Taslak |
| [0004](0004-lead-plan-task-priority-neden-ayri.md) | Lead ve plan görevi öncelikleri ayrı kalır | Taslak |
| [0005](0005-domain-lifecycle-enumlari-neden-ayri.md) | Alan yaşam döngüsü enum'ları ayrı kalır | Taslak |
| [0006](0006-mfa-reset-suggestion-status-neden-ayri.md) | MFA reset ve plan önerisi statüleri ayrı kalır | Taslak |
| [0007](0007-finans-siparis-odeme-statusleri-neden-ayri.md) | Finans, satın alma, sipariş ve ödeme statüleri ayrı kalır | Taslak |
| [0008](0008-job-event-status-neden-ayri.md) | Arka plan işi ve ürünler arası olay statüleri ayrı kalır | Taslak |
| [0009](0009-provisioning-statusleri-neden-ayri.md) | Provisioning ve fulfillment statüleri ayrı kalır | Taslak |
| [0010](0010-learning-activity-statusleri-neden-ayri.md) | Öğrenme aktivitesi statüleri ayrı kalır | Taslak |
| [0011](0011-egitim-ve-isletme-rbac-ayrimi.md) | Eğitim rolleri işletme yetkisi vermez | Kabul Edildi |
| [0012](0012-oturum-dogrulamasinda-kosullu-updatemany.md) | Oturum doğrulaması koşullu `updateMany` ile atomik | Kabul Edildi |
| [0013](0013-idempotency-anahtari-ve-outbox.md) | Kritik yan etkiler idempotency anahtarı ve outbox ile | Kabul Edildi |
| [0014](0014-cok-dosyali-prisma-semasi-ve-sql-bootstrap.md) | Çok dosyalı Prisma şeması ve SQL bootstrap | Kabul Edildi |

0001–0010 eski biçimdedir (`Status: Proposed`, tarih/sahip yok) ve `b46b615` ile enum envanteri
kapsamında eklenmiştir. Sahipleri koddan çıkarılamadı; kabul edildiklerinde şablona taşınmalıdır.
