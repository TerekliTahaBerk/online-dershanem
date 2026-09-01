# Panel global search ve command palette

Bu not, admin/öğretmen paneli global arama mimarisini belgeler. Amaç: menü
dolaşmadan öğrenci, veli, öğretmen, grup, sipariş veya lead’e saniyeler içinde
ulaşmak; aynı yüzeyde yetkili hızlı komutları sunmak.

## Mimari

```
PanelShell (role + flags + lead:read)
  └─ AdminCommandSearch          components/panel/admin-command-search.tsx
       ├─ yerel komut süzme       lib/panel/global-search.ts
       └─ GET /api/panel/admin-search
            └─ runGlobalSearch()  lib/panel/global-search-server.ts
                 └─ Prisma (permission-scoped, take-limit)
```

Tek arama endpoint’i korunur: `/api/panel/admin-search`. İkinci bir search
altyapısı yok.

## Klavye ve UX

| Eylem | Masaüstü | Mobil |
| --- | --- | --- |
| Aç / kapat | ⌘K / Ctrl+K | Topbar arama düğmesi |
| Gezin | ↑ ↓ | Dokunma |
| Seç | Enter | Dokunma |
| Kapat | Esc / overlay | Overlay / X |
| Focus trap | dialog içinde | aynı |
| SR | `role=dialog` + combobox/listbox | aynı |

- Debounce: `180ms`
- Minimum karakter (entity): `2`
- Sonuç limiti: tür başına `5`
- Son aramalar: yalnız sorgu metni (`localStorage`); e-posta, uzun telefon ve
  cuid benzeri değerler yazılmaz

## İndekslenen entity’ler

### ADMIN

| Kind | Kaynak | Eşleşme alanları | Hedef |
| --- | --- | --- | --- |
| STUDENT | `StudentProfile` + `User` | ad, email, telefon, sınıf, id | `/panel/yonetim/ogrenciler/[profileId]` |
| PARENT | `User` (PARENT) | ad, email, telefon, bağlı öğrenci adı, id | `/panel/yonetim/kullanicilar/[id]` |
| TEACHER | `User` (TEACHER) | ad, email, telefon, id | `/panel/yonetim/kullanicilar/[id]` |
| USER | `User` (ADMIN) | ad, email, telefon, id | `/panel/yonetim/kullanicilar/[id]` |
| GROUP | `Group` | ad, ders, id | `/panel/yonetim/gruplar/[id]` |
| LESSON | `Lesson` | başlık, grup adı, id | `/panel/yonetim/gruplar/[groupId]` |
| ORDER | `OdOrder` | id, paket, kullanıcı ad/email/telefon | `/panel/yonetim/siparisler/[id]` |
| LEAD | `BusinessLead` | ad, öğrenci/veli adı, email, telefon | mesaj kutusu veya adaylar |
| EXAM | `OdkExam` | title, slug, id | `/panel/odk/yonetim/sinavlar/[id]` |

LEAD yalnız `lead:read` işletme izni olan birimlerde aranır.

### TEACHER

| Kind | Kapsam |
| --- | --- |
| STUDENT | Aktif grubundaki veya aktif koç atamasındaki öğrenciler |
| GROUP | `teacherId = viewer` |
| LESSON | `teacherId = viewer` → `/panel/ogretmen/ders/[id]` |

Sipariş, lead, tüm kullanıcı dizini ve ODK deneme kaydı öğretmene sızmaz.

## Komutlar

Komut kataloğu `GLOBAL_SEARCH_COMMANDS` içindedir. Görünürlük:

1. `roles` (ADMIN / TEACHER)
2. isteğe bağlı feature flag (`interventionInbox` vb.)
3. isteğe bağlı `businessPermission` (`lead:read`)

Örnekler: yeni öğrenci, yeni grup, ders planla, siparişler, provisioning,
açık müdahaleler, deneme operasyonu.

## Arama kalitesi

- Case-insensitive (`ILIKE` + `toLocaleLowerCase("tr-TR")`)
- Türkçe karakter varyantları (`ı/i`, `ş/s`, …) OR ile
- Telefon: rakam çıkarımı + `contains`
- ID: cuid benzeri değerlerde doğrudan id eşlemesi
- Basit typo: birincil sonuç boşsa tek karakter silme / komşu harf ikinci turu
- Ağır search engine (Elastic/Meilisearch) yok

## Güvenlik

- Endpoint `requireApiAccountRole("ADMIN", "TEACHER")`
- Filtreleme sunucuda; istemciye yetkisiz satır dönmez
- Admin-only nesneler (sipariş, lead, tüm kişiler) öğretmen sorgusunda
  hiç çalıştırılmaz
- MFA’sız admin oturumu mevcut API guard politikasına tabidir
- `Cache-Control: no-store`

## Performans

- Paralel `Promise.all` sorguları
- Tür başına `take: 5`
- Rol / öğretmen kapsamı WHERE içinde
- DB indeksleri (`0089_panel_global_search_indexes`):
  - `users(full_name)`, `users(phone)`
  - `groups(name)`
  - `lessons(title)`
- Mevcut: `users(email)` unique, `business_leads(normalized_phone/email)`,
  `od_orders(user_id, created_at)`, `groups(teacher_id, is_active)`,
  `lessons(teacher_id, starts_at)`

5.000+ kullanıcıda hedef: dar `take` + kapsam filtresi; full-table fuzzy
yok. İleride gerekirse `pg_trgm` GIN eklenebilir.

## Testler

- Unit: `lib/panel/global-search.test.ts`
  - exact / partial komut eşlemesi
  - permission + flag süzme
  - Türkçe varyant / typo helpers
  - recent search hassas veri reddi
  - kategori gruplama
- E2E: `tests/e2e/admin-bulk-and-search.spec.ts` (endpoint çağrısı)

## Geriye dönük uyumluluk

- Route path aynı: `/api/panel/admin-search`
- Response şekli genişledi: `{ query, commands, results }`
- Eski istemciler `results` alanını kullanmaya devam edebilir
