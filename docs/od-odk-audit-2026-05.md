# OD / ODK Sistem Audit & Yeniden Yapılandırma Raporu

**Tarih:** 2026-05-17  
**Branch:** `test`  
**Hedef:** OnlineDershanem (OD) ve OnlineDenemeKulübü (ODK) ürünlerini iki bağımsız SaaS gibi davranan, ortak auth/kullanıcı modeli üzerinde çalışan iki ayrı panel sistemine dönüştürmek.

---

## A. Mevcut Sistem Audit Raporu (Bulgular)

Repo, `app/panel/admin/...` altında klasik OD admin paneli; `app/panel/admin/odk/...` altında ODK alt-panelini barındırıyor. ODK için **ayrı bir veri modeli ailesi (`OdkExam`, `OdkPackage`, `OdkOrder`, `OdkPayment`, `OdkEntitlement`, `OdkAccessTag`, `OdkUserAccessTag`, `OdkExamAccessTag`, `OdkPackageAccessTag`)** zaten Prisma schema'sında mevcut — yani **ürün ayrıştırması için backbone hazır**. OD tarafı `Package`/`StudentPackage`/`Lesson`/`Classroom` üzerinde duruyor. İki taraf da `User` ve `Student` modelini ortak kullanıyor.

Sorun: Sidebar/dashboard/ürün switcher mevcut ama:
- OD ve ODK menüleri **birleşik** akıyor (ODK admin için her zaman sidebar'ın sonuna append ediliyor; ürün seçimine göre menü değişmiyor).
- Admin OD modülleri yarı boş (sadece liste; oluşturma/düzenleme çoğunlukla yok).
- Erişim/tag yönetimi tamamen read-only (CRUD ve atama UI yok).
- Muhasebe ürün ayrımı yapılmıyor.
- Paket modeli iki: `Package` (OD) ve `OdkPackage` (ODK). İyi haber; ayrım var. Ama frontend hâlâ tek "Paketler" sayfası gibi davranıyor.

---

## B. Tespit Edilen 404 / Eksik Route Hataları

| # | Beklenen Route | Durum | Etki |
|---|---|---|---|
| 1 | `/panel/admin/dersler/yeni` | **YOK** — sadece `page.tsx` var | "Yeni ders" butonu olmadığından OD'de ders oluşturma yapılamıyor |
| 2 | `/panel/admin/dersler/[id]` veya `/duzenle` | **YOK** | Mevcut dersi düzenlemek imkansız |
| 3 | `/panel/admin/dersler/_actions.ts` | **YOK** | Server action yok, yani backend tarafında bile fonksiyon yok |
| 4 | `/panel/admin/ders-programi/yeni` veya planlama formu | **YOK** | Ders planlama UI yok; sadece read-only liste |
| 5 | `/panel/admin/odk/erisim/[id]` (tag detail/edit) | **YOK** | ODK erisim sayfasında "düzenle" linki olsa 404 verir; UI'da hiç edit linki yok ama `exam-detail-editor.tsx` "Önce Erişim Tagları sayfasından bir tag oluşturun" diyor → kullanıcı oraya gidip oluştur arıyor → bulamıyor → kafa karışıyor / muhtemel 404 algısı |
| 6 | `/panel/admin/odk/erisim/yeni` (tag oluştur) | **YOK** | Kullanıcı `OdkAccessTag` ekleyemiyor |
| 7 | `/panel/admin/odk/erisim/kullanici/[userId]` (öğrenciye tag atama) | **YOK** | Manuel access grant yapılamıyor |
| 8 | `/panel/admin/odk/paketler/yeni` ve `[id]/duzenle` | **YOK** | ODK paketleri CRUD'u eksik |
| 9 | `/panel/admin/odk/denemeler/[id]/duzenle` | Kısmen — `[id]/page.tsx` var (detay), tam edit form ayrı bir component | Çalışıyor ama 404'e yakın UX |
| 10 | `/panel/admin/odemeler/yeni` | **YOK** | "Yeni ödeme" girilemiyor |
| 11 | `/panel/admin/odemeler/[id]` | **YOK** | Detay yok |
| 12 | `/panel/admin/muhasebe/yeni` | **YOK** (page.tsx içinde linkleniyor) | Linke tıklayan 404 alır |
| 13 | `/panel/admin/odk/erisim` — kullanıcı/öğrenci/öğretmen ekran sekmeleri | Sadece 3 tablo + KPI | "Hızlı aç/kapa, paket atama" gibi işlevler yok |
| 14 | OD öğrenci detayında ODK verisi gösterimi | Yok | Ürün ayrımı yapılmadığı için karışık |

> NOT: Tarayıcıdaki "404" muhtemelen kullanıcının **/panel/admin/odk/erisim** sayfasında bir "düzenle" beklerken bir alt segmente (`/erisim/{id}` veya `/erisim/yeni`) gitmeye çalışmasından geliyor. Sayfanın kendisi 200 dönüyor ama tag düzenleme/oluşturma rotaları yok. Çözüm: rotaları + UI'ı eklemek.

---

## C. Tespit Edilen UI Hataları

1. **Product Switcher metin çakışması** (`components/panel/shell/product-switcher.tsx` + `globals.css:2570+`):
   - `.od-product-name` ile `.od-product-badge` aynı satırda → uzun isim ("OnlineDenemeKulübü") + badge ("ODK") + chevron buton genişliğini aşıyor, mobile'da `.od-product-name` gizli ama trigger içinde `current.badge` hâlâ render ediliyor.
   - Dropdown menüde `.od-product-menu-meta` flex:1 + `.od-product-locked` rozeti sonda → küçük ekranda alt satıra düşüp `s` satırı ile çakışıyor.
   - `position: absolute; left: 0` → sidebar drawer açıkken topbar'da menü viewport dışına taşabiliyor.
2. **Sidebar ürün-bazlı değişmiyor.** ODK seçildiğinde OD menüleri hâlâ ekranda. Kullanıcı "ürün değiştirdim" hissi alamıyor.
3. **Topbar'daki "Rol değiştir" select** ile ürün switcher yan yana → admin için iki dropdown çakışıyor (responsive değil).
4. **Paketler sayfasında "Tür"** sadece raw enum (`COURSE` / `EXAM`) gösteriyor; OD vs ODK ayrımı yok ve `OdkPackage` listede çıkmıyor.
5. **Muhasebe sayfasında** `Yeni kayıt` butonu var ama `/yeni` route yok → tıklayan kullanıcı 404 görüyor.
6. **Dersler tablosu** sadece son 100, filtre/arama yok, ders sayısı çok olunca veri kaybı.
7. **Dashboard** OD odaklı, ODK metriği yok; admin tek bir karma dashboard görüyor.

---

## D. Çalışmayan Admin Feature'ları

| Modül | Durum |
|---|---|
| Öğrenci oluştur/düzenle | ✅ var (`ogrenciler/yeni`, `[id]`) |
| Öğretmen CRUD | ✅ var |
| Veli CRUD | ✅ var |
| Sınıf CRUD | ⚠️ liste + delete var, `yeni` route eksik (sidebar'da link olmamasına rağmen kullanıcı bekliyor) |
| **Ders oluşturma** | ❌ YOK (action + form + route yok) |
| **Ders planlama** | ❌ YOK (sadece read-only liste) |
| Ödev oluşturma | ⚠️ form var ama OD/ODK ayrımı yok |
| Paket oluşturma (OD) | ✅ var |
| Paket oluşturma (ODK) | ❌ YOK |
| Öğrenciye OD paket ata | ✅ kısmen |
| Öğrenciye ODK paket ata / tag grant | ❌ YOK (manuel UI yok) |
| Ödeme oluşturma (manuel) | ❌ YOK |
| Muhasebe kayıt ekleme | ❌ YOK (link var, sayfa yok) |
| ODK deneme oluştur | ✅ var (`odk/denemeler/yeni`) |
| ODK PDF yükleme | ✅ var (exam-detail-editor) |
| ODK JSON yükleme | ✅ var |
| ODK erişim tag CRUD | ❌ YOK |
| ODK öğrencisine tag atama | ❌ YOK |
| Öğrenci ürün erişim kontrolü (panel guard) | ✅ var (`requireOdAccess`, `requireOdkAccess`) ama yönlendirme `/panel`'e değil ürün satın alma sayfasına olmalı |
| Cheat log inceleme | ✅ liste var |
| Kazanım analizi | ✅ var |
| Raporlar | ✅ kısmi |

---

## E. Eksik API Endpoint'leri

- `POST /api/v1/admin/lessons` — ders oluştur
- `PATCH /api/v1/admin/lessons/[id]` — ders güncelle
- `POST /api/v1/admin/schedule` — ders planla (toplu / tekrarlı)
- `POST /api/v1/odk/admin/access-tags` — yeni tag (`access-tags/route.ts` var ama sadece GET olabilir, kontrol gerekli)
- `PATCH /api/v1/odk/admin/access-tags/[id]` — tag düzenle/pasifle
- `POST /api/v1/odk/admin/user-access` — manuel kullanıcıya tag/entitlement ver
- `DELETE /api/v1/odk/admin/user-access/[id]` — tag revoke
- `POST /api/v1/admin/od/packages` — OD paket oluştur (server action olarak kısmen var; API yok)
- `POST /api/v1/odk/admin/packages` — ODK paket CRUD
- `POST /api/v1/admin/payments` — manuel ödeme + muhasebe kaydı
- `POST /api/v1/admin/accounting` — manuel muhasebe kaydı
- `GET /api/v1/me/products` — current user'ın hangi ürünlere erişimi var (mobil + redirect kontrolü için)

---

## F. Eksik Database İlişkileri / Sorunlar

1. **`AccountingEntry` ürün ayrımı yok.** Hangi gelir/gider OD mi ODK mi belirsiz. Çözüm: `service AccessService` (OD/ODK) kolonu ekle, default `OD`. ODK ödemesinden gelen entry'leri otomatik `ODK` yaz.
2. **`Package` modelinde `service` alanı yok.** `type PackageType` var (COURSE/EXAM) ama ürün bayrağı yok. Tüm `Package`'lar OD kabul edilebilir; ODK ayrı `OdkPackage` modelinde. UI bunu açıkça gösteren etiketle çözülebilir; veri modelinde değişiklik gerekmez.
3. **`StudentPackage` — sadece OD kapsamında çalışıyor.** ODK için ekvivalent `OdkEntitlement` var, iyi.
4. **`OdkAccessTag.service` enum'u var** (OD/ODK) — perfekt, OD erişimi için de aynı tablo kullanılıyor (`AccessService.OD` ile). `od-default` tagı backfill ile var. Bu **tutarlı**, sürdürelim.
5. **Lesson `subjectId` veya ders şablonu yok.** "Ders" = `Lesson` (zamanlı oturum) — yani sistemde "ders tanımı" (örn. Matematik 12 — Limit) ile "ders oturumu" (örn. Pazartesi 17:00) ayrımı yok. Kullanıcı "ders tanımlama" ile "ders planlama"yı **ayırmak istiyor**. Bunun için **yeni `Course`/`Subject` benzeri model** ya da mevcut `Course` modelinin OD admin tarafında kullanılması gerekiyor. `Course` zaten var ama OD admin UI'da kullanılmıyor.
6. **`Lesson.studentId` zorunlu** (1:1) — sınıf bazlı ders için `studentId` `optional` olmalı ya da `Lesson` per öğrenci × planlama N kayıt yaratmalı. Şu an `classroomId` opsiyonel ama `studentId` zorunlu → grup dersi planlanamaz.
7. **`Attendance` `lessonId` veya `classroomId` üzerinden çalışıyor** — `Lesson.studentId` zorunluluğu kaldırılırsa Attendance'ı da düzenlemek gerekli.

---

## G. OD / ODK Ayrıştırma Planı

**Mimari karar:** İki ürün, **tek monorepo + tek Next.js app + ortak User/Student/Auth + ayrı route ailesi + ayrı sidebar + ayrı veri modeli**.

```
/panel/admin                  → OD admin (kök)
/panel/admin/odk              → ODK admin (alt-namespace)
/panel/ogretmen
/panel/ogretmen/odk
/panel/ogrenci
/panel/ogrenci/odk
/panel/veli
/panel/veli/odk
```

Ürün seçimi:
- URL path → "şu an ODK'deyim" / "şu an OD'deyim" state'inin kaynağı (mevcut `usePathname` mantığı korunur).
- Switcher tıklandığında diğer ürünün kök URL'ine yönlendir.
- Erişim yoksa **ürün satın alma sayfasına** yönlendir (admin için disabled görünür ama tıklanamaz).

Sidebar:
- `getSectionsForRole(role, flags, currentProduct)` → şu an `currentProduct` parametresi yok. **Eklenecek.**
- Product = "OD" iken sadece OD menüleri; "ODK" iken sadece ODK menüleri.

Dashboard:
- `/panel/admin` → OD dashboard (mevcut)
- `/panel/admin/odk` → ODK dashboard (mevcut)
- "Toplam şirket görünümü" için admin-only `/panel/admin/genel-bakis` (OPSİYONEL faz)

---

## H. Product Switcher — Yeni Mimari

**Hedef:** Tek satır, çakışmasız, premium görünüm, mobil/desktop tutarlı.

UX:
- Trigger genişliği sabit min/max (180–260px). Tek satır + ellipsis.
- İçinde: renk noktası + ürün adı + (sub `xs` opsiyonel) + chevron. **Badge trigger'da gösterilmesin** (dropdown'da gösterilsin).
- Dropdown 320px sabit min-width, item'lar `display: grid; grid-template-columns: 12px 1fr auto;` ile düzgün hizalanır.
- Disabled item için: rozet "Erişim yok" sağda; tıklayınca **satın alma sayfasına yönlendirme** (admin görünümünde `disabled`, öğrenci/öğretmen görünümünde tıklanır).
- Aktif ürün `is-active` background + check ikonu; current ürün üstte değil tabloda kendi sırasında.
- Pathname değişince auto-close (zaten var).
- Klavye: `Esc` close, arrow up/down navigation eklenebilir (faz 2).

CSS düzeltmeleri:
- `min-width: 320px` (mevcut 280px → çakışıyor).
- `.od-product-menu-item` `grid` layout'a geçir, `min-width: 0` ve `overflow: hidden; text-overflow: ellipsis` ekle `.t` ve `.s` için.
- Trigger içindeki badge gizle (sadece menu'de).
- Drawer açıkken `z-index` topbar üstünde tutmak için `z-index: 70`.

---

## I. Ürün Bazlı Access / Paket Planı

Tablolar (mevcut + ekleme):

| Tablo | OD | ODK | Not |
|---|---|---|---|
| `OdkAccessTag` (service: OD/ODK) | ✅ | ✅ | Tek tablo, service ile ayır |
| `OdkUserAccessTag` | ✅ | ✅ | Aynı tablo, çift servis |
| `Package` | ✅ | ❌ | Sadece OD |
| `StudentPackage` | ✅ | ❌ | Sadece OD |
| `OdkPackage` | ❌ | ✅ | Sadece ODK |
| `OdkEntitlement` | ❌ | ✅ | ODK paket satın alma sonucu |
| `OdkOrder` / `OdkPayment` | ❌ | ✅ | ODK ödeme zinciri |
| `PurchaseIntent` / `PurchaseEvent` | ✅ | ❌ | OD satışı |
| `AccountingEntry` | ✅ | ⚠️ | **service kolonu yok — eklenecek** |

Erişim kuralı (mevcut `lib/access/odk.ts` doğru, sadece **redirect target'lar** düzeltilecek):
- `requireOdAccess` → flags.hasOD yoksa `/paketler?from=panel`
- `requireOdkAccess` → flags.hasODK yoksa `/odk-paketleri?from=panel`
- Admin her zaman geçer.

---

## J. OD Panel Yeni Menü Yapısı

```
[Genel]
  Dashboard               /panel/admin
  Inbox                   /panel/admin/inbox

[Eğitim]
  Sınıflar                /panel/admin/siniflar
  Dersler (tanımlar)      /panel/admin/dersler         ← Course-level
  Ders programı (plan)    /panel/admin/ders-programi   ← Lesson-level
  Ödevler                 /panel/admin/odevler
  Devamsızlık             /panel/admin/devamsizlik     (yeni)

[İnsanlar]
  Öğrenciler              /panel/admin/ogrenciler      (OD-only filtreli)
  Öğretmenler             /panel/admin/ogretmenler
  Veliler                 /panel/admin/veliler

[Finans (OD)]
  Paketler                /panel/admin/paketler
  Ödemeler                /panel/admin/odemeler
  Muhasebe                /panel/admin/muhasebe?service=OD
  Öğretmen ödemeleri      /panel/admin/maaslar         (yeni)

[Analiz]
  İstatistikler           /panel/admin/istatistikler
  Raporlar                /panel/admin/raporlar

[Sistem]
  Ayarlar                 /panel/admin/ayarlar
  Yetkiler                /panel/admin/yetkiler
  Audit logs              /panel/admin/audit
```

---

## K. ODK Panel Yeni Menü Yapısı

```
[Genel]
  ODK Dashboard           /panel/admin/odk

[İçerik]
  Denemeler               /panel/admin/odk/denemeler
  Yeni deneme             /panel/admin/odk/denemeler/yeni
  Çözümler / Sonuçlar     /panel/admin/odk/cozumler    (zaten attemptId detail var; liste yapılacak)
  Kazanım analizi         /panel/admin/odk/kazanim
  Cheat logları           /panel/admin/odk/cheat

[Satış]
  ODK Paketleri           /panel/admin/odk/paketler
  ODK Siparişleri         /panel/admin/odk/siparisler  (yeni)
  ODK Ödemeleri           /panel/admin/odk/odemeler    (yeni)
  ODK Muhasebe            /panel/admin/muhasebe?service=ODK

[Erişim]
  Erişim Tagları          /panel/admin/odk/erisim
  Yeni tag                /panel/admin/odk/erisim/yeni
  Kullanıcı erişimleri    /panel/admin/odk/erisim/kullanicilar (yeni)

[İnsanlar]
  ODK Öğrencileri         /panel/admin/odk/ogrenciler  (yeni — ODK entitlement'lı user listesi)

[Analiz]
  Raporlar                /panel/admin/odk/raporlar
```

---

## L. Ders Oluşturma & Planlama Çözüm Planı

**Konsept ayırımı:**
- **Ders tanımı (Course):** "Matematik 12 – Limit konusu" gibi şablon. Tek seferlik tanımlanır.
- **Ders oturumu (Lesson):** Tek bir tarihte gerçekleşen oturum. Bir Course'tan veya boş şekilde planlanabilir.
- **Ders programı:** Çoklu Lesson'ı toplu oluşturmak (tekrarlı: haftada Pzt+Çar saat 17:00 → 12 hafta).

**Schema değişiklikleri (migration):**
```prisma
model Lesson {
  studentId   String?   // ← optional yapılıyor (önceden zorunlu)
  classroomId String?
  courseId    String?   // ← yeni: Course referansı (opsiyonel)
  ...
}
```
- `classroomId` veya `studentId`'den **en az biri** zorunlu (DB constraint yerine validator).
- Eğer `classroomId` doluysa Lesson grup dersi; attendance her öğrenci için ayrı kayıt tutulur.

**Yeni UI:**

1. `app/panel/admin/dersler/yeni/page.tsx` (Course oluştur)
2. `app/panel/admin/dersler/[id]/page.tsx` (Course detay/düzenle, modüller + içerikler)
3. `app/panel/admin/ders-programi/yeni/page.tsx` (Lesson planlama wizard'ı: tek/tekrarlı)
4. `app/panel/admin/ders-programi/[id]/page.tsx` (Lesson detay)
5. `app/panel/admin/dersler/_actions.ts` (createCourse / updateCourse / publish)
6. `app/panel/admin/ders-programi/_actions.ts` (createLesson / scheduleSeries / cancelLesson / sendNotification)

**Bildirim:** Ders planlandığında ilgili öğrencilere/öğretmene `Notification` insert + email outbox + (push faz mobile).

---

## M. ODK Erişim/Tag Ekranı Çözüm Planı

**Şu an:** `/panel/admin/odk/erisim` → sadece KPI + 3 tablo (tag listesi, son atamalar, OD/ODK aktif kullanıcı). **CRUD yok.**

**Yapılacak:**

1. **Tag CRUD**
   - `/panel/admin/odk/erisim/yeni` → form: key, title, description, service (OD/ODK), isActive
   - `/panel/admin/odk/erisim/[id]/duzenle` → düzenleme + pasifleştirme
   - Server actions: `createAccessTag`, `updateAccessTag`, `toggleAccessTag`
   - API endpoint: `POST/PATCH/DELETE /api/v1/odk/admin/access-tags/[id]`

2. **Kullanıcı erişim yönetimi**
   - `/panel/admin/odk/erisim/kullanicilar` → tüm kullanıcılar tablo + filter (OD/ODK/None)
   - `/panel/admin/odk/erisim/kullanicilar/[userId]` → kullanıcının tüm tagları, aktif/expired/revoked
     - Hızlı aç/kapat butonları
     - Manuel paket atama (OD veya ODK)
     - Aktif entitlement listesi
   - Server actions: `grantUserAccess(userId, tagId, expiresAt?)`, `revokeUserAccess(userTagId)`
   - API: `POST /api/v1/odk/admin/user-access`, `DELETE .../[id]`

3. **404 algısı çözümü**
   - Mevcut "Tag yok — seed scriptiyle eklenir" mesajını **"+ Yeni tag"** butonuna çevir.
   - `exam-detail-editor.tsx` içindeki "Önce Erişim Tagları sayfasından bir tag oluşturun" linkini `/panel/admin/odk/erisim/yeni` ile değiştir.

---

## N. Ürün Bazlı Muhasebe Planı

**Schema:**
```prisma
model AccountingEntry {
  ...
  service AccessService @default(OD)   // ← yeni
  ...
  @@index([service, occurredAt])
}
```

**Otomatik bağlantı:**
- ODK ödemesi `PAID` olduğunda webhook `service=ODK, category=PACKAGE_SALE, refType="OdkPayment", refId=...` yazsın.
- OD `PurchaseIntent.PAID` olduğunda `service=OD, category=PACKAGE_SALE, refType="PurchaseIntent"` yazsın.

**UI:**
- `/panel/admin/muhasebe?service=OD` → OD entry'leri + KPI (Gelir / Gider / Net) — OD-only
- `/panel/admin/muhasebe?service=ODK` → ODK entry'leri
- `/panel/admin/muhasebe?service=ALL` → her ikisi (sadece admin)
- Sidebar OD → `?service=OD` ile linklenir; ODK menüsünden link → `?service=ODK`.
- Yeni kayıt formu (eksik) `/panel/admin/muhasebe/yeni?service=OD` parametresiyle pre-fill.

---

## O. Ürün Bazlı Öğrenci Yönetimi Planı

**Konsept:** Tek `Student` kaydı; **iki view filtre** ile listelenir.

- `/panel/admin/ogrenciler` → **OD öğrencileri** (filtre: `hasOdAccess`).
- `/panel/admin/odk/ogrenciler` → **ODK öğrencileri** (filtre: `hasOdkAccess`).

**Detay sayfası akıllı:**
- `/panel/admin/ogrenciler/[id]` (OD bağlamı) → OD bölümleri (sınıf, dersler, ödevler, devamsızlık, OD paket, OD ödemeler).
- `/panel/admin/odk/ogrenciler/[id]` (ODK bağlamı) → ODK bölümleri (denemeler, sonuçlar, kazanım, cheat, ODK paket, ODK ödemeler).
- Üst kısımda küçük "Bu öğrencinin OD/ODK erişim durumu" rozetleri her iki sayfada görünür.

Filtre SQL (öğrenci sorgusunda):
```ts
where: { user: { odkUserAccessTags: { some: { accessTag: { service: "ODK" }, revokedAt: null, OR: [{expiresAt:null},{expiresAt:{gt:now}}] }}} }
```

---

## P. Migration Planı

**Migration 1: `accounting_service_column`**
```sql
ALTER TABLE "AccountingEntry"
  ADD COLUMN "service" "AccessService" NOT NULL DEFAULT 'OD';
CREATE INDEX "AccountingEntry_service_occurredAt_idx"
  ON "AccountingEntry"("service", "occurredAt");
```

**Migration 2: `lesson_studentid_optional_courseid`**
```sql
ALTER TABLE "Lesson"
  ALTER COLUMN "studentId" DROP NOT NULL,
  ADD COLUMN "courseId" TEXT;
ALTER TABLE "Lesson"
  ADD CONSTRAINT "Lesson_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL;
CREATE INDEX "Lesson_courseId_idx" ON "Lesson"("courseId");
-- App-side validator: studentId OR classroomId NOT NULL.
```

Her iki migration **non-destructive**: mevcut veriler kaybolmaz, default değerler güvenli.

**Geri alma planı:** Migration'lar Prisma `migrate diff` ile down-script üretilebilir.

---

## Q. Uygulama Sırası (Faz Plan)

Önerilen sıralama — her faz **bağımsız PR / commit** olabilir:

### FAZ 0 — Audit Dökümantasyonu (BU dosya)
- ✅ Bu rapor.

### FAZ 1 — Ürün Switcher & Sidebar Ayrıştırması (UI only, riskz)
- `product-switcher.tsx` + `globals.css` UI düzeltme.
- `getSectionsForRole(role, flags, currentProduct)` — sidebar product bilinçli.
- `PanelShell` ürün belirleme → URL'den.
- Disabled ürün → satın alma sayfasına yönlendir.
- **Etki:** sadece UI; veri kaybı yok.

### FAZ 2 — ODK Erişim CRUD (404 çözümü)
- Tag yeni / düzenle sayfaları + actions + API.
- Kullanıcı erişim yönetimi sayfaları.
- exam-detail-editor link düzeltmesi.
- **Etki:** sadece ekleme; mevcut sayfa değişmez.

### FAZ 3 — Dersler & Ders Programı CRUD
- Migration: `lesson_studentid_optional_courseid`.
- `dersler/yeni`, `dersler/[id]`, `_actions.ts`.
- `ders-programi/yeni`, `ders-programi/[id]`, planlama wizard.
- Notification entegrasyonu.

### FAZ 4 — Muhasebe Ürün Ayrıştırması
- Migration: `accounting_service_column`.
- `muhasebe/yeni/page.tsx` (eksikti).
- `?service=` filtresi.
- Webhook'larda otomatik service set.

### FAZ 5 — ODK Paket CRUD + Sipariş/Ödeme yönetim ekranı
- `odk/paketler/yeni`, `[id]/duzenle`.
- `odk/siparisler`, `odk/odemeler`.

### FAZ 6 — Öğrenci Listesi Ürün Bazlı
- `ogrenciler` OD filtreli.
- `odk/ogrenciler` yeni sayfa.
- Detay sayfaları ürün bağlamlı.

### FAZ 7 — Polish & Test
- Tüm route'ları manuel test.
- Boş state'ler.
- Regression UI kontrol.
- E2E happy-path script.

---

## R. Test Checklist

### Smoke (admin oturumuyla)
- [ ] `/panel/admin` 200, sidebar OD menüleri görünüyor.
- [ ] Switcher → "OnlineDenemeKulübü" → `/panel/admin/odk` 200, sidebar **sadece** ODK menüleri.
- [ ] Switcher → "OnlineDershanem" tıklandığında geri OD'ye dön.
- [ ] Trigger metinleri tek satır, taşma yok.
- [ ] Dropdown 320px+, item'lar arasında çakışma yok, mobile'da scroll yok.

### Eksik route 404 kontrolleri (faz sonrası)
- [ ] `/panel/admin/dersler/yeni` → form render.
- [ ] `/panel/admin/ders-programi/yeni` → planlama wizard.
- [ ] `/panel/admin/odk/erisim/yeni` → tag form.
- [ ] `/panel/admin/odk/erisim/kullanicilar` → kullanıcı listesi.
- [ ] `/panel/admin/muhasebe/yeni` → kayıt formu.

### Functional
- [ ] Yeni Course oluştur → dersler listesinde göründü.
- [ ] Course'tan tek bir Lesson planla → ders programı liste içinde.
- [ ] Haftalık tekrarlı planlama → N kayıt + Notification fan-out.
- [ ] Yeni AccessTag (ODK servisi) oluştur → erişim sayfasında listede.
- [ ] Bir öğrenciye manuel ODK tag ata → `getUserAccessFlags` `hasODK=true` döner.
- [ ] Tag revoke → `hasODK=false`.
- [ ] OD/ODK erişimi olmayan öğrenci `/panel/ogrenci/odk` → satın alma redirect.
- [ ] OD/ODK paketi ödemesi sonrası AccountingEntry `service` doğru.

### UI regression
- [ ] Light/dark tema switcher uyumlu.
- [ ] Sidebar drawer mobile'da kapanıyor.
- [ ] Topbar overflow / text-clip yok.
- [ ] Tüm `Link` href'leri 200 dönüyor. 

---

## Risk & Etki Analizi

| Faz | Risk | Mitigation |
|---|---|---|
| 1 | Sidebar değişimi → kullanıcı bookmark'ları → hiçbir URL değişmiyor, riski yok. | — |
| 2 | Yeni route'lar → conflict yok. | — |
| 3 | `Lesson.studentId` optional → mevcut sorgular `studentId!`-cast etmiş olabilir. | Tüm `lesson.studentId` kullanımlarını `?.` veya null-check ile gözden geçir. |
| 4 | `AccountingEntry.service` default `OD` → mevcut kayıtlar OD sayılır. | Manuel review; ODK ödeme kaynaklı eski kayıtları opsiyonel backfill script. |
| 5 | Yeni ekranlar — risk düşük. | — |
| 6 | Öğrenci filtresi `User.odkUserAccessTags` ilişkisi gerektirir; Student → User join var. | Test ile doğrula. |

---

## Sonraki Adım

**Önerim:** FAZ 1'i (Product Switcher + Sidebar ayrıştırması) hemen uygulayalım — düşük riskli, anında görsel kazanım. Sonra FAZ 2 (ODK erişim CRUD — 404'ün gerçek çözümü). Sonra FAZ 3 (Dersler).

Bana **"FAZ 1 uygula"** veya **"FAZ 1+2 uygula"** dersen ardışık olarak hayata geçiririm. Tüm fazları tek mesajda uygulamak; (a) güvenli değildir (rollback zor) (b) PR boyutu manuel review imkansız hale getirir.
