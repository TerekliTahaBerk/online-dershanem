# İşletme Paneli — Rol Tabanlı Erişim (RBAC)

Bu doküman `/panel/yonetim/isletme` alanının yetkilendirme modelini tanımlar.
Kod tarafındaki tek kaynaklar:

- `lib/business/permission-matrix.ts` — rol → izin tablosu (saf, test edilebilir)
- `lib/business/permissions.ts` — oturum → atama → birim → izin çözümlemesi
- `lib/business/sections.ts` — bölüm → görüntüleme izni ve menü grupları

## Erişim zinciri

```
Oturum kullanıcısı
  → BusinessRoleAssignment kayıtları (userId + businessUnitId + role)
  → yalnız isActive olan BusinessUnit'ler
  → her birim için BusinessRole
  → istenen BusinessPermission
  → sayfa / API / server action erişimi
```

**Platform rolü işletme yetkisi vermez.** `User.role === "ADMIN"` olması tek
başına hiçbir işletme iznini açmaz. Eğitim tarafındaki yöneticilik ile
finans/CRM yetkisi bilinçli olarak ayrıdır.

Önceki davranış (kaldırıldı):

```
User.role === ADMIN → otomatik SUPER_ADMIN → bütün aktif iş birimleri → bütün izinler
```

Bu zincirde `getBusinessAccess()` aldığı `permission` parametresini hiç
kullanmıyordu; yani `requireBusinessPage("finance:reverse")` ile
`requireBusinessPage("dashboard:read")` aynı sonucu veriyordu.

## Rol → izin matrisi

| İzin | SUPER_ADMIN | ADMIN | SALES | SUPPORT | ACCOUNTING | VIEWER |
|---|---|---|---|---|---|---|
| `dashboard:read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `conversation:read` | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| `conversation:reply` | ✓ | ✓ | ✓ | ✓ | — | — |
| `lead:read` | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| `lead:write` | ✓ | ✓ | ✓ | — | — | — |
| `campaign:read` | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| `campaign:write` | ✓ | ✓ | — | — | — | — |
| `finance:read` | ✓ | ✓ | — | — | ✓ | ✓ |
| `finance:write` | ✓ | ✓ | — | — | ✓ | — |
| `finance:reverse` | ✓ | — | — | — | ✓ | — |
| `knowledge:read` | ✓ | ✓ | — | — | — | ✓ |
| `knowledge:write` | ✓ | ✓ | — | — | — | — |
| `automation:read` | ✓ | ✓ | — | — | — | ✓ |
| `automation:write` | ✓ | ✓ | — | — | — | — |
| `integration:read` | ✓ | ✓ | — | — | — | ✓ |
| `integration:write` | ✓ | ✓ | — | — | — | — |
| `settings:read` | ✓ | ✓ | — | — | — | ✓ |
| `settings:write` | ✓ | ✓ | — | — | — | — |
| `role:read` | ✓ | ✓ | — | — | — | — |
| `role:write` | ✓ | — | — | — | — | — |
| `audit:read` | ✓ | ✓ | — | — | ✓ | — |

Tasarım kararları:

- **`finance:reverse` ADMIN'de yoktur.** Ters kayıt ve muhasebe dönemi kilidi
  geri alınamaz muhasebe işlemleridir; SUPER_ADMIN ve ACCOUNTING ile sınırlıdır.
- **`role:write` yalnız SUPER_ADMIN'dedir.** Yetki yükseltme yolu tek noktada
  tutulur.
- **ACCOUNTING konuşma ve aday PII'sine erişmez.** Muhasebe işini yapmak için
  müşteri mesajlarını okumaya ihtiyacı yoktur (veri minimizasyonu).
- **VIEWER hiçbir mutation iznine sahip değildir.** `permission-matrix.test.ts`
  bunu bütün yazma izinleri üzerinde otomatik doğrular.

## Sayfa görünürlüğü ve mutation yetkisi ayrıdır

Bölümü **görüntülemek** için `SECTION_PERMISSIONS` içindeki READ izni yeterlidir.
Her **mutation** kendi WRITE iznini `actions.ts` içinde ayrıca doğrular.

Menüde link gizlemek bir güvenlik sınırı **değildir**; yalnız kullanıcıya 404
ile biten link göstermemek içindir. `BusinessNav` yalnız
`getUserBusinessPermissions()` sonucundan gelen bölümleri render eder, ama
sayfanın kendisi her zaman `requireBusinessPage()` çalıştırır.

Yetkisiz erişimde **404** döner (403 değil) — alanın varlığını sızdırmamak için.

## İş birimi kapsamı

Bir kullanıcı farklı birimlerde farklı rollere sahip olabilir. Kurallar:

- Okuma sorguları `scopedUnitIds(access)` ile sınırlanır — kullanıcı yalnız o
  izni veren birimlerin verisini görür.
- Her create/update/reverse işlemi `resolveMutationUnit(access, formData.get("businessUnitId"))`
  kullanır. Formdan gelen değere asla doğrudan güvenilmez; erişim listesine
  karşı doğrulanır.
- Kullanıcı tek birime erişiyorsa o birim otomatik kullanılır.
- **Birden fazla birime erişiyorsa seçim zorunludur** — `BUSINESS_UNIT_REQUIRED`
  hatası verilir. Sessizce "ilk birime" yazmak (`access.units[0]`) kaldırıldı;
  çok birimli bir kullanıcının kaydı yanlış birime düşebiliyordu.
- Genel bakışta "tüm birimler" görünümü mümkündür; mutation'da tek birim zorunludur.

## Bootstrap ve kilitlenme önleme

Erişim yalnız atamalardan geldiği için, geçiş anında mevcut yöneticilerin
kilitlenmemesi gerekir. İki mekanizma vardır:

1. **Veri göçü (asıl yol):** `prisma/migrations/0068_business_rbac_backfill`
   aktif platform ADMIN'lerine, aktif her iş biriminde `SUPER_ADMIN` ataması
   oluşturur. Idempotenttir, veri silmez. Yalnız zaten erişimi olanlara zaten
   sahip oldukları yetkiyi verir; kimse yeni yetki kazanmaz.
   Geri alma: `DELETE FROM business_role_assignments WHERE id LIKE 'bootstrap-superadmin-%';`

2. **Kurtarma kapısı (istisna):** `BUSINESS_BOOTSTRAP_SUPER_ADMIN_EMAILS`
   ortam değişkeni. Burada listelenen e-postaya sahip platform ADMIN'i, **hiç
   ataması yoksa** SUPER_ADMIN kabul edilir. Her kullanımda
   `business.bootstrap_super_admin_used` uyarısı loglanır. Normal işletimde boş
   bırakılır; yalnız atamaların kaybolduğu bir olayda kullanılır.

Yeni kurulumlarda `prisma/seed.mjs` aktif yöneticilere atama oluşturur.

## Son SUPER_ADMIN koruması

`revokeBusinessRole` bir SUPER_ADMIN atamasını silmeden önce, sistemde aktif
kullanıcıya bağlı ve aktif birimde başka bir SUPER_ADMIN kaldığını doğrular.
Kalmıyorsa `LAST_SUPER_ADMIN_PROTECTED` hatası verir — yönetici kendi son
süper yöneticiliğini kaldırarak paneli kilitleyemez.

## Test kapsamı

- `lib/business/permission-matrix.test.ts` — matrisin kendisi (unit).
- `tests/e2e/business-rbac.spec.ts` — her rol için menü görünürlüğü, doğrudan
  URL'in HTTP durumu, API erişimi ve birim izolasyonu.

E2E fixture'larının **tamamı platformda ADMIN'dir**; aralarındaki tek fark
atama satırlarıdır. Böylece testler gerçekten işletme rolünü ölçer.
