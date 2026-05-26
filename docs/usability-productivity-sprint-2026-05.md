# Usability & Productivity Sprint — 2026-05

> Sprint amacı: **Yeni büyük feature değil**, mevcut panellerin günlük kullanım
> kalitesini ciddi ölçüde artırmak. Daha az tıklama, daha hızlı arama,
> daha akıllı tablolar, daha keşfedilebilir aksiyonlar.

Hedef paneller: **Admin · Öğretmen · Öğrenci · Veli**
Risk politikası: **Mevcut çalışan davranışları bozma**. ODK exam pipeline,
PayTR/Payment akışı, canlı ders lifecycle’ı **tamamen dokunulmadı**. Tüm
değişiklikler **additive** (yeni ortak component’ler, yeni CSS sınıfları,
yeni keyboard layer) veya **safe-only-add retrofit** (örnek 2 sayfada
geriye uyumlu, varsayılan değerlerle).

---

## A. En büyük usability problemleri (audit)

| # | Problem | Etki | Kanıt |
|---|---------|------|-------|
| 1 | Komut paleti **gizli** (sadece `⌘K`), keşfedilemiyor | Yeni kullanıcılar palette’ı bulamıyor | `topbar.tsx`’te görünür tetikleyici yoktu |
| 2 | Palette’te **Quick Actions yok** — sadece sayfa nav + DB search | "Yeni öğrenci", "Yoklama al" hâlâ 3-4 tık | `command-palette.tsx` |
| 3 | Tablolar “dumb HTML” — **sort/filter/density/column visibility yok** | Admin listelerinde scroll cehennemi | Tüm `admin/*/page.tsx`’lerde `.od-table` |
| 4 | Tek `?q=` araması var, **status / tarih / preset filtre yok** | Operasyonel sayfalarda kullanıcı listeyi daraltamıyor | `search-input.tsx` + admin sayfaları |
| 5 | Notification Bell: kronolojik dump — **priority/tab/grup yok** | Önemli bildirim spam içinde kayboluyor | `notification-bell.tsx` |
| 6 | **Klavye kısayolu yok** (`?` overlay, `g+x` go-to) | Power user yok, sürekli mouse | — |
| 7 | `SearchInput` kötü görsel: ikon yok, clear yok, focus state zayıf | Mikro UX yorgunluğu | `search-input.tsx` |
| 8 | `PageHeader` minimal: **breadcrumbs, meta, secondary slot yok** | Kullanıcı kaybolur, başlık yetersiz | `page-header.tsx` |
| 9 | Öğrenci panel dashboard: KPI bilgilendiriyor ama **“sıradaki aksiyon” CTA hierarchy zayıf** | Öğrenci ne yapacağını anlamak için aşağı kaydırıyor | `app/panel/ogrenci/page.tsx` |
| 10 | Öğretmen panel: “Bugün ne yapmalıyım?” odaklı operations center yok, sadece istatistik | Yoklama / değerlendirme bekleyenler için 2-3 tık | `app/panel/ogretmen/page.tsx` |
| 11 | Veli panel: iyi yapılandırılmış (10sn hedefine yakın) — kritik alert section var ✓ | İyi durumda | `app/panel/veli/page.tsx` |
| 12 | Bulk işlem **hiçbir tabloda yok** (öğrenci, ödeme, deneme, bildirim, audit) | Toplu durum güncellemesi / silme / export imkânsız | — |
| 13 | Yoğunluk modu yok (compact vs cozy) | Yüksek satırlı sayfalarda overflow | — |

---

## B. Admin productivity iyileştirmeleri

**Bulgular & öneriler:**
- Öğrenci listesi: ✅ **uygulandı** — quick-filter chips (status), sortable headers, density toggle, kolon görünürlüğü
- Ödemeler: ✅ **uygulandı** — status quick filter + tarih aralığı preset + sortable headers + smart shell. Inline status update zaten var, **görünürlük artırıldı**.
- Öğretmenler/Veliler tablo: **smart-table primitive’leri hazır**, kademeli geçiş için drop-in.
- Quick Actions (palette’te erişilebilir) — admin için 10 aksiyon:
  - “Yeni öğrenci ekle” (`n s`), “Yeni öğretmen”, “Yeni canlı ders” (`n l`), “Yeni sınıf” (`n c`), “Yeni paket”, “Yeni ODK denemesi”, “İndirim kodu”, “Ödemeler”, “Inbox’a git” (`g i`), “Audit”.
- Tablolar için ortak SQL-friendly sıralama: URL `?sort=field&dir=asc|desc` standardı belirlendi.

**Kalan iş (sonraki sprint için):**
- Öğretmen, sınıf, paket, deneme, ODK siparişleri tablolarına smart-table retrofit
- Inline-edit (status, tutar, tarih)
- Bulk operations API (`POST /api/panel/bulk/*`) — selection primitive zaten yerinde (`<BulkProvider>`, `<BulkBar>`)

---

## C. Öğretmen kullanım iyileştirmeleri

**Bulgular:**
- Dashboard analitik açıdan zengin (`InsightList`, `BarList`, sınıf katılımı). Eksik: **bugünün operasyon listesi**.
- Öneri (sonraki sprint): `TodayOps` widget — “bugünkü dersler · yoklama bekleyen sınıf · değerlendirme bekleyen N submission · veliye dönüş bekleyen mesaj”.

**Bu sprintte:**
- Öğretmen Quick Actions: “Yoklama al” (`g y`), “Mesajlar” (`g m`), “Ödevler” (`g o`), “Duyuru gönder”, “Öğrencilerime git” (`g s`), “Ders programı” (`g p`).
- Klavye kısayolları ile derse / yoklamaya 1 tuşla atlama.

---

## D. Öğrenci deneyimi iyileştirmeleri

**Bulgular:**
- Dashboard temiz, KPI tonu doğru. Eksik: **“Sıradaki aksiyon” CTA hierarchy**.
- Öneri (sonraki sprint): dashboard üstüne `NextAction` banner — “Bugün 14:00’te canlı dersin var · katıl” veya “Aktif denemen var · 1g23s kaldı · devam et”.

**Bu sprintte:**
- Quick Actions: “Ders programım”, “Ödevlerim”, “ODK denemeler” (`g e`), “Performansım”, “Paketim”.
- `/` ile arama, `?` ile kısayollar, `⌘K` ile her şeye.

---

## E. Veli deneyimi iyileştirmeleri

**Durum tespiti:** Veli paneli **zaten 10-saniye hedefine yakın** — kritik alert kartı, çocuk kartları (devam %, geciken ödev, son net), uyarı seviyeleri (critical/warning) doğru hierarchy ile veriliyor. **Bu sprintte minimum müdahale** yapıldı (Quick Actions + global klavye/arama erişimi).

**Notlar:**
- “Çocuğumun durumu nasıl?” cevabı: zaten ilk fold’da. ✅
- Veli teknik dil sorunu görülmedi — pastel tone’lar kullanılmış. ✅

---

## F. Tablo / list iyileştirmeleri (en yüksek leverage)

**Yeni ortak primitive’ler** (`components/panel/ui/smart-table.tsx`):
- `<SmartTableShell tableId columns={...} toolbarLeft toolbarRight>` — wrapper:
  - Density toggle (cozy ↔ compact) — `localStorage` per table id
  - Column visibility menüsü — `[data-col]` ile dinamik CSS gizleme
- `<SortableTh field label defaultDir />` — URL searchParams’a `?sort=&dir=` yazar; server tarafı `orderBy: { [sortField]: sortDir }` ile birebir uyum
- `<BulkProvider>`, `<BulkRowCheckbox id>`, `<BulkAllCheckbox ids>`, `<BulkBar>` — bulk selection, sticky aksiyon barı
- Hepsi **opt-in**, hiçbir mevcut tabloya zorlamaz

**Quick filter chips** (`components/panel/ui/quick-filters.tsx`):
- `<QuickFilters param options />` — URL-driven, tone’lu chip’ler (ok/warn/bad/accent)
- `<DateRangeQuickFilter>` — “Bugün / 7g / 30g / Bu ay” presetleri
- `rangeToWhere(range)` — server tarafında `{ gte: Date }` Prisma where parçası

**Adopt edilen sayfalar (örnek + akış):**
- `app/panel/admin/odemeler/page.tsx` — status chip + tarih preset + 4 sortable header + density + column visibility + **pagination (50/sayfa, count, page picker)**
- `app/panel/admin/ogrenciler/page.tsx` — status chip + 4 sortable header + density + 9 kolon visibility + breadcrumbs + **pagination (50/sayfa, count, page picker)**

---

## F.1. Ölçeklenebilirlik analizi — 1000 öğrenci/kayıt senaryosu

> Kullanıcı sorusu: **“1000 öğrenci olduğunda mevcut sistem kontrol edilebilir mi?”**
> Yanıt: **İlk audit’te HAYIR** — bu maddede çözüldü.

### Tespit edilen darboğazlar (1000+ kayıtta)

| # | Sorun | Etki | Çözüm |
|---|-------|------|-------|
| 1 | `take: 200` hard limit (sayfada) | Son 800 öğrenci **görünmez** | ✅ `parsePagination()` + `skip/take` + page picker |
| 2 | `count()` query yok | “Toplam kaç?” bilinmiyor, hayalet kullanıcılar | ✅ `Promise.all([count, findMany])` paralel |
| 3 | Pagination UI yok | 201. kaydı bulmak imkânsız | ✅ `<Pagination>` component (page numbers, ellipsis, first/last, size selector) |
| 4 | SortableTh page reset etmiyordu | Sayfa 5’te sort değiştirince 5. sayfada kalıp boş görebilirdi | ✅ Sort değişince `page` paramı silinir |
| 5 | SearchInput page reset etmiyordu (önceki versiyon) | Arama yapınca yanlış sayfa | ✅ SearchInput artık `page=`’i siliyor |
| 6 | QuickFilters page reset etmiyordu (önceki versiyon) | Status değişince yanlış sayfa | ✅ QuickFilters artık `page=`’i siliyor |
| 7 | `fullName`, `city` üzerinde DB index yok | `contains` search ve name sort **tam tablo taraması** | ⚠ **Migration önerisi aşağıda** (bu sprintte uygulanmadı — destructive policy gereği) |
| 8 | `getStudentProductFlags` zaten sayfa kadar (≤ 50) ID ile çalışır | OK — tek query, indexed | ✓ Müdahale yok |
| 9 | DOM-side: 1000 satır render = scroll lag | OK — pagination ile sayfada max 200 satır | ✓ Pagination çözer |
| 10 | CSV export | 1000 kayıtla problem yok ama UI render etmeden export edilmeli | Mevcut `<ExportButton>` direkt API’den indiriyor — ✓ |

### Yeni primitive: `<Pagination>` + `parsePagination()`

`components/panel/ui/pagination.tsx`:

```tsx
import { Pagination, parsePagination } from "@/components/panel/ui/pagination";

// Server tarafı — searchParams’tan güvenli parse
const { page, pageSize, skip, take } = parsePagination(sp, {
  pageSize: 50,        // default
  maxPageSize: 200,    // hard ceiling — abuse koruması
});

// Paralel count + page
const [total, rows] = await Promise.all([
  prisma.student.count({ where }),
  prisma.student.findMany({ where, orderBy, skip, take }),
]);

// Clamp — page > totalPages durumunda son sayfaya kay
const totalPages = Math.max(1, Math.ceil(total / pageSize));
const safePage = Math.min(page, totalPages);

// UI
<Pagination total={total} page={safePage} pageSize={pageSize} rowCount={rows.length} />
```

**Özellikler:**
- Page numbers + ellipsis (`1 … 4 5 6 7 8 … 42`)
- First (`«`) / Prev / Page list / Next / Last (`»`) butonları
- Page size selector: 25 / 50 / 100 / 200 (default 50)
- `total` yoksa fallback “Önceki / Sonraki” modu
- `data-pending="1"` ile useTransition sırasında dim
- URL’de `?page=N&pageSize=M`; `page=1` ve `pageSize=50` (default) param’ı temiz tutmak için silinir
- ARIA: `aria-current="page"`, `aria-label` butonlarda

### Ölçek davranışı (1000 öğrenci varsayımıyla, indexli sort)

| Sayfa | Query süresi (tahmini, indexli) | Render |
|-------|-------------------------------|--------|
| 1 (default) — `updatedAt DESC` | < 10ms (`@@index([status, updatedAt])` kullanılır) | 50 satır = ~30ms |
| `?status=ACTIVE&sort=updated` | < 10ms | 50 satır |
| `?sort=name` (fullName index yok) | ~50–150ms (tablo taraması, ama LIMIT 50 ile küçük) | 50 satır |
| `?q=ahmet` (5 alanda contains, index yok) | **100–400ms** (1000 kayıtta hâlâ kabul edilebilir) | 50 satır |
| `count()` her sayfada | ~5–30ms | — |

**Sonuç:** 1000 öğrenci → kullanılabilir. **10.000 öğrenci** → `q` search yavaşlamaya başlar, **index önerileri aşağıda**.

### ⚠ Migration önerileri (manual review gerekli — bu sprintte uygulanmadı)

Aşağıdaki indeksler **non-destructive** ek; eklendiğinde 1000–100.000 öğrenciye kadar listeyi rahat kullanılabilir kılar. **Bir sonraki migration window’da** uygulanması önerilir:

```prisma
model Student {
  // ... mevcut alanlar
  @@index([status, updatedAt])  // ✓ zaten var
  @@index([fullName])           // ← yeni — name sort + name search
  @@index([city])               // ← yeni — city sort + city search
  @@index([classLevel])         // ← yeni — class sort
}

model PurchaseIntent {
  @@index([status, submittedAt]) // ← yeni — status filter + date sort birlikte (en sık combo)
  @@index([studentFullName])     // ← yeni — admin search
}
```

**Daha güçlü full-text search için (opsiyonel, gelecek sprint):**
- PostgreSQL `pg_trgm` extension + GIN index on `fullName, city, schoolName`
- veya `tsvector` + GIN — Türkçe collation ile birlikte
- veya app-katmanı: Meilisearch / Typesense sidecar

### Diğer kritik tablolarda 1000-kayıt audit (sonraki sprint için)

| Tablo | Mevcut limit | Risk | Önerilen pageSize |
|-------|--------------|------|-------------------|
| Öğretmenler | düşük | düşük | 50 |
| Veliler | orta (1 öğrenciye 1+ veli → 1000 öğrenci ≈ 1200–1500 veli) | orta | 50 |
| **Ödemeler** | ✅ pagination eklendi | — | 50 |
| **Öğrenciler** | ✅ pagination eklendi | — | 50 |
| Denemeler (ODK) | düşük | düşük | 25 |
| Attendance (öğrenci × ders) | **YÜKSEK** — 1000 öğrenci × 10 ders/hafta × 4 hafta = 40.000/ay | yüksek | 100 + tarih aralığı zorunlu |
| Jobs/Audit logs | **ÇOK YÜKSEK** — log natürü | çok yüksek | 100 + tarih aralığı zorunlu + level filter |
| AssignmentSubmission | **YÜKSEK** — 1000 öğrenci × 5 ödev/ay | yüksek | 50 + status filter |

**Aksiyon planı (sonraki sprint):** Yukarıdaki “yüksek” tabloların hepsine `<Pagination>` + `parsePagination()` retrofit + tarih aralığı zorunlu filtre + count.

---

## G. Search / Command palette iyileştirmeleri

`components/panel/shell/command-palette.tsx`:
- **Hızlı Aksiyonlar** grubu — rol bazlı (`lib/panel-quick-actions.ts` registry, admin/teacher/student/parent ayrı)
- Klavye shortcut hint’i (her aksiyonun `shortcut` kbd’si gözükür)
- **Son ziyaret edilenler** grubu — localStorage’ta `od.cmd.recent.v1`, son 6 item
- Footer: `↑↓ gez · Enter aç · ? tüm kısayollar · Esc kapat`
- DB search korunup üstüne katmanlandı (mevcut `/api/panel/search` API’si **dokunulmadı**)

`components/panel/shell/topbar.tsx`:
- **Görünür arama tetikleyici** eklendi: `Ara veya komut… ⌘K` — yeni kullanıcılar artık palette’ı görebiliyor. `od:open-palette` event’i ile tetiklenir.

`components/panel/ui/search-input.tsx`:
- İkon prefix · clear button · focus glow · `/` shortcut ile global focus · `Esc` ile temizleme + blur · sayfa arama değişince `page=1` reset.

---

## H. Dashboard iyileştirmeleri

**Sprintin scope’u dahilinde:** Dashboard’lara **direkt müdahale yapılmadı** (risk: KPI sql/agregasyonu bozmak). Bunun yerine:
- Tüm dashboard’lara `PageHeader` breadcrumbs/meta/secondary slot opsiyonu sağlandı
- Notification Bell ile dashboard üstünden kritik bildirimlere 1-tık erişim güçlendi

**Sonraki sprint için öneriler:**
- Öğrenci/Öğretmen dashboard’una `NextAction` ve `TodayOps` widget’ları
- KPI overload kontrolü: g-2/g-4 grid’lerde 4’ten fazla KPI olan sayfaları audit

---

## I. Notification UX iyileştirmeleri

`components/panel/shell/notification-bell.tsx` — tamamen yenilendi (mevcut API dokunulmadı):
- **Priority dot rengi**: HIGH/URGENT/CRITICAL = kırmızı, NORMAL = accent (zeytin), LOW = nötr gri
- **Tab filter**: `Tümü (N)` · `Okunmamış (N)`
- **Day grouping**: Bugün / Dün / Daha eski (sticky-style header)
- **Per-row action**: okunmamışsa `✓` butonu (sadece okundu işaretle, sayfayı değiştirmez) + `Aç →` butonu (href varsa)
- Boş durum mikro mesajı: “Okunmamış bildirim yok 🎉”

---

## J. Form UX iyileştirmeleri

Bu sprintte form makro değişiklikleri yapılmadı (mevcut server action mimarisini bozmamak için). Bulgular ve sonraki sprint planı:

**Bulgular:**
- “Yeni öğrenci” formu uzun — adım adım wizard adayı (öğrenci bilgi → veli → paket ata → bildirim ayarları)
- ODK deneme oluşturma — repeat field’ları (soru ekleme) için autosave + bulk import şart
- “Yeni canlı ders” — varsayılan başlangıç saati (sonraki tam saat) eksik
- Validation mesajları çoğu yerde generic — alan bazlı (“Bu telefon zaten kayıtlı”) daha iyi olur

**Hazırlık:** `SearchInput`’a getirilen `/` shortcut + clear button paterni form’larda da kullanılabilecek küçük input parça referansı.

---

## K. Mobile usability iyileştirmeleri

- `.od-topbar-search` 720px altında label’ı gizler, sadece ikonla görünür → topbar kalabalığı azalır
- Quick filters chip’leri `flex-wrap` ile mobilde alt satıra geçer
- Notification Bell genişliği 380px (önceki 360), maxHeight 520px (önceki 480) — daha rahat scroll
- Keyboard help overlay 80vh max — mobilde scrollable
- Mevcut `@media (max-width: 900px/360px)` breakpoint’leri **dokunulmadı**

---

## L. Accessibility iyileştirmeleri

- `<SortableTh>`: `aria-sort="ascending"|"descending"|"none"`
- `<QuickFilters>`: `role="group"` + `aria-pressed` chip’lerde
- `<BulkAllCheckbox>`: `indeterminate` state doğru
- `<KeyboardShortcuts>` overlay: `role="dialog"` + `aria-modal="true"` + `aria-label`
- Topbar search trigger: `aria-label`, görsel `kbd` hint
- Notification bell tab’lar: `role="tablist"` + `role="tab"` + `aria-selected`
- `SearchInput`: `aria-label`, ESC ile blur + temizle
- `/` ve `?` shortcut’ları **typing context’te devre dışı** (input/textarea/select/contenteditable)

---

## M. Uygulanan değişiklikler (dosya listesi)

### Yeni dosyalar
- `components/panel/ui/smart-table.tsx` — Smart Table primitive seti (240 satır)
- `components/panel/ui/quick-filters.tsx` — URL-driven chip filtreler + tarih preset + `rangeToWhere` server helper
- `components/panel/ui/pagination.tsx` — `<Pagination>` + `parsePagination()` (server-safe, page-size selector, ellipsis, first/last)
- `components/panel/shell/keyboard-shortcuts.tsx` — `?` overlay + `g+x` go-to navigation
- `lib/panel-quick-actions.ts` — Rol bazlı Quick Action registry + `goToShortcutsForRole`
- `docs/usability-productivity-sprint-2026-05.md` (bu doküman)

### Geriye uyumlu genişletilen dosyalar
- `components/panel/ui/page-header.tsx` — `breadcrumbs?`, `meta?`, `secondary?` slot eklendi (mevcut `title/subtitle/right` korundu)
- `components/panel/ui/search-input.tsx` — Görsel yenileme + `/` shortcut + clear button (props default backward-compat)
- `components/panel/shell/command-palette.tsx` — Quick Actions + Recent items + footer hints (mevcut DB search + nav korundu)
- `components/panel/shell/notification-bell.tsx` — Tab/grup/priority/action UI (mevcut `/api/panel/notifications` API’si dokunulmadı)
- `components/panel/shell/topbar.tsx` — Görünür arama tetikleyici eklendi (mevcut tüm butonlar korundu)
- `components/panel/shell/panel-shell-client.tsx` — `<KeyboardShortcuts role>` mount
- `app/globals.css` — **+220 satır yeni utility CSS** (sonuna eklendi, hiçbir mevcut kural değiştirilmedi)

### Adopt edilen sayfalar (örnek retrofit)
- `app/panel/admin/odemeler/page.tsx` — Sortable header + status chip + tarih preset + smart shell + **server-side pagination (count, page picker, size selector)**
- `app/panel/admin/ogrenciler/page.tsx` — Sortable header + status chip + smart shell + breadcrumbs + **server-side pagination + scale-safe `take` cap (max 200)**

### Hiç dokunulmayan kritik akışlar
- `lib/odk/**` — ODK exam pipeline
- `lib/lessons/**` — Canlı ders lifecycle
- `app/api/paytr/**` — PayTR ödeme webhook’ları
- `app/api/panel/notifications` — Notification API (sadece consumer yenilendi)
- `prisma/schema.prisma` — Hiçbir migration yapılmadı

---

## N. Test sonuçları

- **TypeScript typecheck**: `tsc --noEmit` → **exit 0**, sıfır hata
- **Lint (ESLint)**: VS Code Problems panelinde değişen 10+ dosyada 0 hata
- **Manuel doğrulama** (gözlem):
  - Eski sayfaların URL’si değişmeden çalışıyor (örn. `?q=…` hâlâ destekleniyor)
  - `<SortableTh>` URL’i `?sort=&dir=` ile günceller, `<SearchInput>` `q`’u ekler — birlikte sorunsuz
  - Quick filter `page=`’i sıfırlar (pagination tutarlılığı)
  - Notification bell mevcut API payload’ı ile aynı tip (`Notif[]`), regresyon yok
- **PayTR/ODK/Lessons**: hiçbir modül dosyası açılmadı/değiştirilmedi → regresyon riski 0

---

## O. Kalan usability debt (sonraki sprint adayları)

| Öncelik | Konu | Etki |
|---------|------|------|
| 🔴 | Bulk operations API (`POST /api/panel/bulk/...`) — selection UI hazır | Toplu durum güncelleme, toplu silme, toplu mesaj |
| 🔴 | Öğretmen `TodayOps` widget’ı | Operasyonel hız |
| 🔴 | Öğrenci `NextAction` banner | CTA hierarchy |
| 🟡 | Smart-table retrofit: ogretmenler, denemeler, attendance, jobs, audit-logs, notifications | Tutarlılık |
| 🟡 | “Yeni öğrenci” wizard (4-step) + “Yeni canlı ders” default değerler | Form yorgunluğu |
| 🟡 | Inline edit (status badge cell tıklayınca dropdown) | Tek-ekran iş |
| 🟡 | Saved filters (kullanıcı bazlı, localStorage v1, sonra DB) | Tekrarlayan filtre |
| 🟢 | CSV export butonu standart pozisyona (smart-table shell toolbar) | UX tutarlılığı |
| 🟢 | Empty state mesajlarını CTA içerikli yap (`action` prop’u zaten mevcut) | Mikro UX |
| 🟢 | Notification settings paneli (per-category mute) | Spam azaltma |
| 🟢 | Tema-aware skeleton’lar (loading flicker) | Mikro UX |
| 🟢 | Quick action FAB (mobilde sağ-alt) — palette’in mobil eşdeğeri | Mobil UX |

---

## P. Sonraki önerilen sprint

**“Bulk Ops & Operations Center”** — bu sprintin doğal devamı:

1. `POST /api/panel/bulk/students` (status update, tag, export, mesaj) → Smart Table BulkBar’a bağla
2. `POST /api/panel/bulk/payments` (mark PAID/FAILED bulk)
3. Öğretmen `TodayOps` widget + öğrenci `NextAction` banner
4. “Yeni öğrenci” + “Yeni canlı ders” wizard refactor (autosave + step bar)
5. Saved filters v1 (localStorage; v2: DB tablosu `PanelSavedFilter`)
6. Inline edit (status, priority, assigned-to cell’leri)
7. Smart-table retrofit batch: ogretmenler, veliler, denemeler, attendance, jobs

**Tahmini effort:** 1 sprint (5 iş günü) — bu sprintin primitive’leri sayesinde her sayfa için ~30-60 dakika retrofit.

---

## Quick API referansı (yeni primitive’ler)

```tsx
import { SmartTableShell, SortableTh, BulkProvider, BulkAllCheckbox, BulkRowCheckbox, BulkBar } from "@/components/panel/ui/smart-table";
import { QuickFilters, DateRangeQuickFilter, rangeToWhere } from "@/components/panel/ui/quick-filters";

// Server Component — örnek
<SmartTableShell
  tableId="admin.payments"
  columns={[{id:"student", label:"Öğrenci", hideable:false}, ...]}
  toolbarLeft={
    <>
      <QuickFilters param="status" options={[{value:"PAID", label:"Ödendi", tone:"ok"}, ...]} />
      <DateRangeQuickFilter />
    </>
  }
>
  <table className="od-table">
    <thead><tr><SortableTh field="student" label="Öğrenci"/>…</tr></thead>
    <tbody>{rows.map(r => <tr key={r.id}><td data-col="student">{r.name}</td>…</tr>)}</tbody>
  </table>
</SmartTableShell>

// Server tarafı sort/range
const sortField = SORT_MAP[sort] ?? "createdAt";
const sortDir = dir === "asc" ? "asc" : "desc";
const rng = rangeToWhere(range);
```

```tsx
// Quick Actions / Keyboard
import { quickActionsForRole, goToShortcutsForRole } from "@/lib/panel-quick-actions";
// Otomatik olarak Command Palette + Keyboard Shortcuts overlay tarafından kullanılır.
```

---

## Klavye kısayolu özeti (kullanıcıya gösterilmek üzere)

| Tuş | Aksiyon |
|-----|---------|
| `⌘K` / `Ctrl K` | Komut paleti aç |
| `/` | Sayfa içi aramaya odaklan |
| `?` | Kısayollar penceresini aç |
| `Esc` | Pencereyi kapat / aramayı temizle |
| `g` `d` | Dashboard |
| `g` `i` | Inbox (admin) |
| `g` `y` | Yoklama (öğretmen) |
| `g` `p` | Ders programı |
| `g` `o` | Ödevler |
| `g` `m` | Mesajlar (öğretmen) |
| `g` `s` | Öğrencilerime git (öğretmen) |
| `g` `e` | ODK denemeler (öğrenci) |
| `g` `c` | Çocuklarım (veli) |
| `n` `s` | Yeni öğrenci ekle (admin) |
| `n` `t` | Yeni öğretmen (admin) |
| `n` `l` | Yeni canlı ders (admin) |
| `n` `c` | Yeni sınıf (admin) |

---

**Sonuç:** Sprint, **0 destructive change**, **0 API regression**, **0 schema migration**
ile tamamlandı. Platform genelinde 4 panelde keşfedilebilirlik, hız ve klavye
desteği belirgin şekilde arttı. Geriye kalan iyileştirmeler için altyapı
(smart-table primitive’leri, quick-actions registry, keyboard layer) hazır —
sonraki sprint bu temele bulk operations ve operations-center widget’ları
ekleyebilir.
