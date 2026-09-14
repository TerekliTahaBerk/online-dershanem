# 0011 — Eğitim rolleri işletme (CRM/finans) yetkisi vermez

| Durum | Tarih | Sahip |
| --- | --- | --- |
| Kabul Edildi | 2026-08-04 | Taha Berk |

## Bağlam

İşletme paneli ilk sürümünde (`c536227`, 2026-08-03) `User.role === "ADMIN"` otomatik olarak
`SUPER_ADMIN` sayılıyor, bütün aktif iş birimlerine ve bütün izinlere erişiyordu.
`getBusinessAccess()` aldığı `permission` parametresini kullanmadığı için
`requireBusinessPage("finance:reverse")` ile `requireBusinessPage("dashboard:read")` aynı sonucu
veriyordu ([business-rbac.md](../business-rbac.md), "Önceki davranış").

## Karar

İşletme erişimi yalnız `BusinessRoleAssignment` (kullanıcı + iş birimi + `BusinessRole`) üzerinden
çözülür. Platform rolü (OD/ODK/Koçum tarafındaki `UserRole`) tek başına hiçbir işletme iznini açmaz.
Rol → izin tablosu saf ve test edilebilir bir modülde tutulur.

## Sonuçlar / Riskler

- Eğitim yöneticisi finans ters kaydı veya CRM verisine kendiliğinden erişemez; en az yetki ilkesi.
- Platform admini işletme paneline girebilmek için ayrıca atama almalıdır; geçiş için
  [business-rbac-migration-runbook.md](../business-rbac-migration-runbook.md) yazıldı.
- Yeni işletme bölümü eklerken izin `lib/business/sections.ts` ve matriste tanımlanmazsa erişim
  kapalı kalır (güvenli varsayılan).

## Kanıt

- `lib/business/permission-matrix.ts`, `lib/business/permissions.ts`, `lib/business/sections.ts`
- `lib/business/permission-matrix.test.ts`
- `fbe9b19` (2026-08-04) — RBAC dokümanı, matris ve testlerin eklendiği commit. Otomatik "test"
  mesajlı commit'tir; PR açıklaması yoktur, gerekçe dokümandaki "Önceki davranış" bölümünden alınmıştır.
