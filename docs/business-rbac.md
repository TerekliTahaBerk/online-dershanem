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
| `automation:write` (manage) | ✓ | ✓ | — | — | — | — |
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
- **Instagram entegrasyon durumu salt okunurdur.** `GET
  /api/admin/integrations/instagram` için `integration:read`; ayar değiştiren
  `PATCH` için `integration:write` gerekir. Böylece VIEWER bağlantı sağlığını
  görebilir ancak entegrasyonu değiştiremez.

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

## Eğitim içeriği yetkisi (ürün başına) — `kpss:content:write`

İşletme RBAC'ı (finans/CRM) ile eğitim rolleri ayrı tutulur; eğitim **içeriği**
(müfredat kazanımı, soru) yazma yetkisi de ikisinden ayrı, ürün başına bir
izindir. Kod tarafındaki kaynaklar:

- `lib/products/content-permission-matrix.ts` — rol → izin matrisi ve karar (saf, unit test edilir)
- `lib/products/content-permissions.ts` — kullanıcı → aktif atama → karar; kazanım API kararı
- `ProductContentRoleAssignment` (`product_content_role_assignments`, migration 0106)

```
Oturum kullanıcısı (rol ve durum DB'den; önizleme/öğretmen modu overlay'i etkilemez)
  → ProductContentRoleAssignment (userId + productId + role, revokedAt null, ürün aktif)
  → ProductContentRole (CONTENT_EDITOR → content:read, content:write)
  → `<ürün>:content:<eylem>` (ör. kpss:content:write)
```

| Kullanıcı | Legacy ürün içeriği (OD/OK/ODK) | Registry ürün içeriği (KPSS) |
|---|---|---|
| ADMIN | ✓ (mevcut davranış) | ✓ |
| TEACHER, atama yok | — | — |
| TEACHER, KPSS `CONTENT_EDITOR` | — | ✓ yalnız KPSS |
| TEACHER + KPSS `ProductMembership` | — | — |
| STUDENT / PARENT / pasif kullanıcı | — | — |

Tasarım kararları:

- **`TEACHER` + KPSS üyeliği yeterli DEĞİL.** `ProductMembership` bir tüketim
  hakkıdır (satın alma, promosyon); KPSS'ye hazırlanan bir öğretmen üyelik
  alabilir ve bu ona içerik yazdırmamalıdır. Ayrıca `TEACHER` rolü OD/OK/ODK'ya
  koşulsuz erişir — içerik yetkisini role bağlamak her OD öğretmenini otomatik
  KPSS editörü yapardı.
- **Legacy ürünlerde atama yetki açmaz.** OD/ODK içerik yazımı ADMIN'e özel
  kalır; yeni tablo mevcut içerik uçlarına yeni bir yazma yolu açmaz.
- **ADMIN platform içerik sahibidir.** İşletme RBAC'ının aksine burada ADMIN
  izin alır: mevcut KPSS içerik akışı (`docs/kpss-icerik-girisi-rehberi.md`) ADMIN
  ile yürüyor ve kilitlenmemeli.
- **Yetkisiz = bulunamadı (404).** `POST /api/panel/curriculum/outcomes` bulunamayan
  sürümle yetkisiz sürümü ayırt ettirmez.

Bugün izni uygulayan uç: `POST /api/panel/curriculum/outcomes` (registry ürün
sürümleri için). ODK sınav/soru yönetim uçları KPSS aileleri için hâlâ
`requireApiProductRole("ODK", "ADMIN")` ile ADMIN'e özeldir. Atama satırlarını
yönetecek bir UI/API henüz yoktur; satırlar şimdilik yönetici tarafından
veritabanında açılır.

## Veli-free ürünler (KPSS)

`lib/products/parent-visibility.ts` veli akışlarının açık olduğu ürünleri tanımlar:
OD, OK, ODK açık; registry'den gelen her yeni ürün (KPSS) **varsayılan kapalı**.
Kural kullanıcı tipi değil **ürün bağlamıdır**:

- Aktif ürünlerinin tamamı veli-free olan öğrenci (yalnızca KPSS) veli
  kapsamına girmez: `resolveParentScope` (veli sayfaları, URL ile istenirse 404),
  `resolveStudentScopeForViewer` (student-success API'leri), veli–öğrenci bağlantısı
  oluşturma (`POST /api/panel/relationships` → 404) ve veli takvim akışı.
- KPSS + OD öğrencisinin velisi OD bağlamında görmeye devam eder; KPSS kodu
  `ParentChild.products` listesine ve veli paket süresi uyarısına yansımaz.
- Hiç aktif ürünü olmayan öğrencide mevcut davranış korunur.

Bu kısıt UI'da gizleyerek değil, yukarıdaki sunucu kapılarında uygulanır.
Test: `tests/integration/kpss-rbac.integration.ts`.
