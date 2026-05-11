# OnlineDershanem — Panel Sistemi Production Rebuild Master Plan

> Bu doküman mevcut amatör panel sistemini sıfırdan, **production-grade SaaS Education Operating System** seviyesinde yeniden inşa etmek için yazılmıştır.
>
> Veri korunur, schema migration-safe ilerler. UI/UX, component mimarisi, route mantığı, RBAC, state management ve API katmanı **sıfırdan** yeniden tasarlanır.
>
> Eski referanslar:
> - `docs/panel-system-master-plan.md` (faz planı — kısmen geçerli, bazı varsayımları bu doküman geçersiz kılar)
> - `docs/admin-panel-tasks.md`, `docs/admin-student-panel-foundation.md` (legacy, arşivlenir)
>
> **Bu doküman tek kaynak (source of truth)'tır.**

---

## A. Mevcut Sistem Analizi

### A.1 Backend / Database

| Alan | Durum | Not |
|---|---|---|
| Prisma schema | ✅ Olgun (1533 satır) | Domain modelleri zaten var: Student, Teacher, Parent, Classroom, Lesson, Course/Module/Content, Package, StudentPackageEnrollment, Assignment, Attendance, AccountingEntry, TeacherPayroll, InboxMessage, Notification, AuditLog, ODK subsystem |
| Migrations | ✅ Düzenli | `prisma/migrations/` aktif kullanılıyor |
| Indexing | ⚠️ Kısmi | Çoğu model'de indeks var ama `Lesson.scheduledAt`, `InboxMessage`, `Attendance` için sorgu paterni-spesifik composite index review gerekli |
| Auth | ✅ NextAuth v4 (JWT) | Token claims (`isAdmin`, `hasStudentAccess`, `hasTeacherAccess`, `hasParentAccess`, `hasOdAccess`, `hasOdkAccess`) düzgün set edilmiş |
| Server actions / API | ⚠️ Karışık | `app/admin/actions.ts`, `app/panel/actions.ts`, `app/ogretmen/actions.ts` + REST endpoint'ler bir arada; pattern tutarsız |
| Validation | ⚠️ Kısmi | `lib/validators.ts` var, Zod kullanılıyor ama bazı action'lar bypass ediyor |
| Audit logging | ⚠️ Var ama az kullanılıyor | `lib/audit.ts` mevcut, sadece bazı kritik mutasyonlarda çağrılıyor |
| Rate limiting | ✅ DB-backed | `RateLimitEntry` modeli + `lib/rate-limit.ts` |
| Email | ✅ Outbox pattern | `EmailOutbox` modeli ile retry-safe |

### A.2 Frontend

| Alan | Durum | Not |
|---|---|---|
| App Router structure | ⚠️ Var ama düzensiz | 4 panel klasörü paralel, layout'lar tutarsız |
| Component library | ❌ **Yok denecek kadar az** | `components/admin/` 1 dosya, `components/panel/` boş, `components/ui/` 13 dosya (button/skeleton/container vb.) — shadcn yok |
| Design system | ❌ Yok | Tasarım token'ı yok, sadece Tailwind ham kullanımı |
| Layout system | ⚠️ Tek dosya | `components/layout/premium-sidebar.tsx` — global topbar/breadcrumb/command-menu yok |
| State management | ❌ Yok | Tanstack Query yok, her sayfa server component + form actions; client-side cache stratejisi yok |
| Forms | ⚠️ Native | React Hook Form yok, native form action + Zod kullanılıyor |
| Tables | ❌ Ham HTML | Tanstack Table yok, sıralama/pagination/filtreleme manuel |
| Charts | ❌ Yok | Recharts/Tremor yok — istatistik sayfaları placeholder |
| Animations | ⚠️ framer-motion var | Kullanım minimum |
| Dark mode | ⚠️ Manuel | Theme system yok, `next-themes` yok |
| Accessibility | ❌ Eksik | Radix primitives yok, focus management yok |
| Loading/Error/Empty states | ⚠️ Tutarsız | `loading.tsx`/`error.tsx` her route'da değil |

### A.3 RBAC & Security

| Alan | Durum |
|---|---|
| `lib/panel-access.ts` | ✅ İyi yazılmış, korunabilir |
| `lib/permissions.ts` | ✅ Fiyat maskeleme helper'ları doğru |
| `lib/auth-guards.ts` | ⚠️ Var ama her sayfa farklı şekilde çağırıyor |
| Middleware | ❌ **Yetersiz** — sadece `/admin`, `/api/admin`, `/odk/admin` için `isAdmin` bakıyor. `/panel`, `/ogretmen`, `/veli`, `/api/panel` korumasız middleware'de |
| Server-side enforcement | ⚠️ Action başına manuel `requireAdmin()` çağrıları, unutulma riski yüksek |
| API rate limit | ⚠️ Sadece login'de |

---

## B. Mevcut Problemlerin Listesi

### B.1 Mimari problemler
1. **Component reuse yok** — her panelde duplicate kart/tablo/form kodu.
2. **Design system yok** — spacing/typography/color token'ı yok, "premium" hissi tek başına Tailwind ile yamanmaya çalışılıyor.
3. **Layout bölünmüş** — 4 panel'in 4 ayrı layout'u var, paylaşılan shell yok (sidebar/topbar/breadcrumb tekrar tekrar yazılıyor).
4. **Server-only flow** — client-side cache yok, her etkileşim full page reload veya `revalidatePath` (UX yavaş ve flicker'lı).
5. **Form mimarisi yok** — RHF + Zod resolver yok, error state'leri elle yönetiliyor.
6. **Tablo standardı yok** — sıralama/filtreleme/pagination her sayfada farklı.

### B.2 UX problemleri
7. **Inbox bell counter yok**, real-time bildirim yok, polling yok.
8. **Global search (⌘K) yok**.
9. **Breadcrumb yok**, "geri dön" navigasyonu zayıf.
10. **Empty state'ler placeholder veya boş** — onboarding hissi yok.
11. **Mobil responsive eksik** — özellikle veli/öğrenci panelinde.
12. **Loading state'ler `loading.tsx`'te ham spinner** — skeleton yok.
13. **Dashboard widget tabanlı değil** — kullanıcı kendi layout'unu seçemiyor.

### B.3 Güvenlik problemleri
14. **Middleware sadece `/admin`'i koruyor** — `/panel/api/*` rotaları handler içi guard'a güveniyor.
15. **Audit log seyrek** — kim ne sildi/güncelledi tam izlenemiyor.
16. **DTO validation tutarsız** — bazı endpoint'ler raw body okuyor.
17. **Refresh token yok** — JWT 30 gün, expire olunca sessiz logout.
18. **CSRF/origin check sadece NextAuth tarafında**.

### B.4 Performans problemleri
19. **N+1 sorguları** — student listesinde her satır için ayrı `include`.
20. **Hiçbir tablo virtualized değil**.
21. **Bundle splitting manuel değil** — admin dashboard tek route bundle.
22. **Görseller `next/image` ile optimize değil** çoğu yerde.

### B.5 Operasyonel problemler
23. **Reports/exports yok** — Excel/PDF export yok.
24. **Bulk actions yok** — toplu öğrenci taglemek/mesaj atmak yok.
25. **Permission UI yok** — admin permission matrisini DB'den değil hard-coded enum'dan okuyor.

---

## C. Yeni Sistem Mimarisi (High Level)

```
┌──────────────────────────────────────────────────────────────────────┐
│                        OnlineDershanem OS                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │
│  │   Admin    │  │  Teacher   │  │  Student   │  │   Parent   │    │
│  │   Shell    │  │   Shell    │  │   Shell    │  │   Shell    │    │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘    │
│        │               │               │               │            │
│  ┌─────┴───────────────┴───────────────┴───────────────┴──────┐    │
│  │              SHARED APP SHELL (AppShell)                   │    │
│  │  Sidebar · Topbar · Breadcrumb · CommandMenu · NotifyCtr   │    │
│  └────────────────────────────┬───────────────────────────────┘    │
│                               │                                    │
│  ┌────────────────────────────┴───────────────────────────────┐    │
│  │              DESIGN SYSTEM (od-ui)                         │    │
│  │  Tokens · Primitives (shadcn) · DataTable · Forms · Charts │    │
│  └────────────────────────────┬───────────────────────────────┘    │
│                               │                                    │
│  ┌────────────────────────────┴───────────────────────────────┐    │
│  │              DATA LAYER (TanStack Query + Server Actions)  │    │
│  │  · per-domain hooks (useStudents, useClassrooms, ...)      │    │
│  │  · optimistic updates · cache invalidation policy          │    │
│  └────────────────────────────┬───────────────────────────────┘    │
│                               │                                    │
│  ┌────────────────────────────┴───────────────────────────────┐    │
│  │              SERVICE LAYER (lib/services/*)                │    │
│  │  Pure functions over Prisma · DTO + Zod · permission gates │    │
│  └────────────────────────────┬───────────────────────────────┘    │
│                               │                                    │
│  ┌────────────────────────────┴───────────────────────────────┐    │
│  │     RBAC (lib/rbac/*) · Audit · RateLimit · Validation     │    │
│  └────────────────────────────┬───────────────────────────────┘    │
│                               │                                    │
│  ┌────────────────────────────┴───────────────────────────────┐    │
│  │         PRISMA · PostgreSQL · Vercel Blob · Resend         │    │
│  └────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

### Modüler domain yapısı (`lib/services/`)

```
lib/
  services/
    auth/
    users/
    students/        (CRM odaklı)
    teachers/
    parents/
    classrooms/
    lessons/
    assignments/
    attendance/
    packages/
    payments/
    accounting/
    inbox/
    notifications/
    statistics/
    reports/
    audit/
  rbac/
    policies.ts      (per-action permission rules)
    enforce.ts       (server-side guard wrapper)
    matrix.ts        (single source of truth, UI tüketir)
  query/
    keys.ts          (TanStack query keys)
    invalidation.ts  (cache invalidation rules)
```

---

## D. Yeni Database Yapısı

### D.1 Korunan modeller (mevcut, dokunulmayacak)
`User`, `Student`, `Teacher`, `Parent`, `ParentStudent`, `Classroom`, `ClassroomTeacher`, `ClassroomStudent`, `Lesson`, `Course`, `CourseModule`, `CourseContent`, `Package`, `StudentPackage`, `StudentPackageEnrollment`, `Camp`, `LeadSubmission`, `PurchaseIntent`, `PurchaseEvent`, `Notification`, `InboxMessage`, `AuditLog`, `Attendance`, `Tag`, `StudentTag`, `Assignment`, `AssignmentSubmission`, `AccountingEntry`, `TeacherPayroll`, `StudentNote`, `TeacherComment`, `StudentFile`, ODK subsystem (`OdkExam`, `OdkOrder`, `OdkPayment`, vb.), `EmailOutbox`, `RateLimitEntry`, `VerificationCode`.

### D.2 Yeni eklenecek modeller (migration-safe, additive)

```prisma
// Permission sistemi DB-driven olsun (hard-coded değil)
model Permission {
  id          String   @id @default(cuid())
  key         String   @unique  // "students.read", "payments.write"
  description String
  category    String              // "students", "payments", ...
  createdAt   DateTime @default(now())
}

model RolePermission {
  role         UserRole
  permissionId String
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  createdAt    DateTime @default(now())
  @@id([role, permissionId])
}

// Per-user override (örn. öğretmene "accounting.read" özel ver)
model UserPermissionOverride {
  userId       String
  permissionId String
  granted      Boolean  // true=ekle, false=çıkar
  reason       String?
  createdAt    DateTime @default(now())
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  @@id([userId, permissionId])
}

// Saved filters / segments (CRM segment, finance filter)
model SavedView {
  id        String   @id @default(cuid())
  ownerId   String
  scope     String   // "students", "payments", ...
  name      String
  filter    Json
  isShared  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  owner     User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  @@index([ownerId, scope])
}

// Refresh token (sessiz logout sorununu çözer)
model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  revokedAt DateTime?
  userAgent String?
  ip        String?
  createdAt DateTime @default(now())
  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, revokedAt])
}

// Dashboard widget layout (kullanıcı bazlı)
model DashboardLayout {
  userId    String   @id
  panel     PanelKey
  layout    Json     // [{ id, x, y, w, h, widget }]
  updatedAt DateTime @updatedAt
  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum PanelKey { ADMIN STUDENT TEACHER PARENT }

// Realtime/event log (Postgres LISTEN/NOTIFY için pivot, ileride Pusher/Ably)
model RealtimeEvent {
  id        String   @id @default(cuid())
  channel   String   // "user:<id>", "classroom:<id>", "global"
  type      String
  payload   Json
  createdAt DateTime @default(now())
  @@index([channel, createdAt])
}
```

### D.3 İndeks stratejisi (review)

Eklenecek composite indexler:
- `Lesson(classroomId, scheduledAt, status)` — class detay sayfası
- `InboxMessage(recipientUserId, category, readAt)` — kategori filtresi
- `AccountingEntry(occurredAt, type, category)` — finans dashboard
- `Attendance(classroomId, sessionDate, status)` — sınıf yoklama özeti
- `AssignmentSubmission(assignmentId, status, submittedAt)` — ödev takibi
- `Student` üzerinde GIN trigram index (full-text search için, raw SQL migration)

### D.4 Migration stratejisi
Tüm değişiklikler **additive**. Bkz. **§L Migration Strategy**.

---

## E. Frontend Architecture

### E.1 Klasör yapısı (yeni)

```
app/
  (marketing)/                  # public site (mevcut /, /paketler, /blog, ...)
  (auth)/                       # /giris, /kayit, /sifremi-unuttum
  (app)/
    layout.tsx                  # AppShell (Sidebar + Topbar + Providers)
    admin/
      layout.tsx                # admin guard
      page.tsx                  # dashboard
      ogrenciler/
      ogretmenler/
      veliler/
      siniflar/
      dersler/
      odevler/
      paketler/
      odemeler/
      muhasebe/
      inbox/
      istatistikler/
      raporlar/
      ayarlar/
      izinler/
      audit/
    ogretmen/...
    panel/...                   # öğrenci
    veli/...
  api/
    v1/
      students/
      classrooms/
      lessons/
      ...
components/
  ui/                           # shadcn primitives (button, input, dialog, ...)
  data/
    DataTable.tsx               # tanstack table wrapper
    DataTableToolbar.tsx
    DataTableFilters.tsx
    DataTablePagination.tsx
  forms/
    Form.tsx                    # RHF wrapper
    fields/                     # TextField, SelectField, DateField, ...
  charts/
    LineChart.tsx
    AreaChart.tsx
    DonutChart.tsx
    Heatmap.tsx
    KpiCard.tsx
  shell/
    AppShell.tsx
    Sidebar.tsx
    Topbar.tsx
    Breadcrumb.tsx
    CommandMenu.tsx             # ⌘K
    NotificationCenter.tsx
    UserMenu.tsx
    PanelSwitcher.tsx
  domain/
    students/
      StudentTable.tsx
      StudentDetailTabs.tsx
      StudentTagsCell.tsx
      StudentNoteList.tsx
    classrooms/
    lessons/
    payments/
    inbox/
    ...
  feedback/
    EmptyState.tsx
    ErrorState.tsx
    LoadingSkeleton.tsx
hooks/
  use-students.ts               # TanStack Query hooks
  use-classrooms.ts
  use-inbox.ts
  use-permissions.ts
  use-command-menu.ts
  use-realtime.ts
lib/
  services/...
  rbac/...
  query/...
  utils/
    cn.ts
    formatters.ts
    dates.ts
```

### E.2 Server / Client ayrımı kuralları
- **Server components**: liste sayfaları'nın **ilk render'ı** (SEO ve hızlı first paint için).
- **Client components**: tablolar (sıralama/filtreleme/pagination), formlar, dialog'lar, chart'lar, command menu.
- **Server Actions**: tüm mutation'lar (create/update/delete) → client'tan TanStack Query mutation ile çağrılır, optimistic update + invalidate.
- **API Routes (`/api/v1/*`)**: sadece dış sistemler (mobile app, webhook, cron, ODK exam runtime) için.

### E.3 Component prensipleri
- Her primitive shadcn'den, custom override `components/ui/`'da.
- Domain component'ler **dumb** — sadece props alır, hook'lar üzerinden data tüketir.
- Hiçbir component 250 satırı geçmesin → bölünür.
- Storybook (Faz 2'de) ile her primitive için story zorunlu.

---

## F. Backend Architecture

### F.1 Service Layer (`lib/services/`)
Her domain için:
```
lib/services/students/
  index.ts          # public API (re-exports)
  schemas.ts        # Zod input/output schemas
  queries.ts        # read functions (list, get, search, filters)
  mutations.ts      # create/update/delete + audit + inbox emit
  policies.ts       # bu domain için RBAC kuralları
  selectors.ts      # Prisma select objects (reusable)
```

Kural: **Hiçbir route handler veya server action Prisma'ya direkt erişmez**. Her şey service layer üzerinden geçer. Bu;
- N+1 önler (selector'lar reuse edilir),
- audit log otomatik yazılır,
- permission check tek noktadan,
- testlenebilir.

### F.2 Server Action standardı
```ts
// app/(app)/admin/ogrenciler/actions.ts
"use server";
import { defineAction } from "@/lib/rbac/define-action";
import * as students from "@/lib/services/students";
import { studentUpdateSchema } from "@/lib/services/students/schemas";

export const updateStudent = defineAction({
  input: studentUpdateSchema,
  permission: "students.write",
  audit: { entityType: "Student", action: "update" },
  handler: async ({ input, ctx }) => students.update(input, ctx),
});
```

`defineAction` wrapper:
1. Session'ı resolve eder, yoksa redirect.
2. Permission'ı `lib/rbac/enforce.ts` ile check eder.
3. Input'u Zod ile parse eder, hata varsa typed error döner.
4. Handler'ı çağırır, Prisma transaction'a sarar.
5. `AuditLog` yazar.
6. İlgili `RealtimeEvent`'leri emit eder.
7. Hata olursa structured error döner (TanStack mutation `onError` ile yakalar).

### F.3 API Routes (`/api/v1/*`)
- Versioned: `/api/v1/...`
- OpenAPI doc auto-generation (Faz 5, `zod-to-openapi`)
- Tüm endpoint'ler:
  - `Authorization: Bearer <jwt>` veya cookie session
  - Zod input parse
  - Permission check
  - Pagination: `?page=&pageSize=&sort=&order=&q=&filter[...]=`
  - Standart response envelope:
    ```json
    { "data": ..., "meta": { "page": 1, "pageSize": 25, "total": 142 } }
    ```
  - Error envelope:
    ```json
    { "error": { "code": "FORBIDDEN", "message": "...", "fields": {...} } }
    ```

---

## G. Design System (`od-ui`)

### G.1 Token'lar (`app/globals.css` + Tailwind config)
```css
:root {
  /* color */
  --od-bg:        220 16% 6%;     /* dark default */
  --od-surface:   222 14% 9%;
  --od-elev-1:    222 14% 12%;
  --od-elev-2:    222 14% 15%;
  --od-border:    222 12% 22%;
  --od-text:      210 20% 96%;
  --od-text-mute: 218 10% 65%;
  --od-brand:     158 70% 48%;    /* primary green */
  --od-brand-fg:  160 80% 95%;
  --od-accent:    250 90% 70%;
  --od-success:   145 65% 50%;
  --od-warn:      40  92% 58%;
  --od-danger:    0   75% 60%;

  /* radius */
  --od-radius-sm: 6px;
  --od-radius:    10px;
  --od-radius-lg: 16px;
  --od-radius-xl: 24px;

  /* spacing scale → tailwind 4-based */
  /* typography → "Geist" (var) + monospace "Geist Mono" */
}
```

### G.2 Typography scale
| Token | Size | Line | Use |
|---|---|---|---|
| `text-display` | 36/44 | 1.1 | Page hero (rare) |
| `text-h1` | 28/36 | 1.2 | Page title |
| `text-h2` | 22/30 | 1.25 | Section title |
| `text-h3` | 18/26 | 1.3 | Card title |
| `text-body` | 14/22 | 1.5 | Default |
| `text-small` | 13/20 | 1.45 | Meta |
| `text-tiny` | 12/18 | 1.4 | Badge / tag |

### G.3 Primitive matrisi (shadcn'den)
Button, Input, Textarea, Select, Combobox, Checkbox, RadioGroup, Switch, Slider, Dialog, Sheet, Drawer, Popover, Tooltip, DropdownMenu, ContextMenu, Tabs, Accordion, Collapsible, Toast, AlertDialog, Calendar, DatePicker, Command (⌘K), HoverCard, ScrollArea, Separator, Skeleton, Progress, Avatar, Badge, Card, Table.

### G.4 Composite (od-domain)
- `KpiCard` (label + value + delta + sparkline)
- `DataTable` (Tanstack Table + toolbar + filters + pagination + column visibility + row selection + bulk actions)
- `FilterBar` (tag, date range, multi-select, saved views)
- `EmptyState` (icon + title + description + CTA)
- `PageHeader` (breadcrumb + title + actions slot)
- `StatGrid` (responsive KPI grid)
- `EntityLink` (linkable entity badge: student/teacher/class/payment)

### G.5 Animation
- Framer Motion: route transition (`AnimatePresence`), modal mount/unmount, tab indicator slide.
- `motion-safe:` Tailwind variant ile prefers-reduced-motion respect.

### G.6 Dark mode
- `next-themes` ile `class`-based (`dark:` Tailwind variant).
- Default: dark. Light mode opsiyonel (Faz 3).

---

## H. Dashboard Structures

Her panel **widget tabanlı**. Layout `DashboardLayout` modelinde saklanır, `react-grid-layout` ile drag-resize (Faz 3+).

### H.1 Admin Dashboard
**Üst sıra (KPI)**:
- Aktif Öğrenci · Bu Ay Yeni Kayıt · Aylık Gelir · Bekleyen Ödeme · Bugünkü Dersler · Açık Inbox

**Orta sıra (Charts)**:
- 30 günlük gelir trendi (AreaChart)
- Aktif kullanıcı dağılımı (DonutChart: rol bazlı)
- Sınıf doluluk oranı (BarChart)
- Yoklama heatmap (haftalık × sınıf)

**Alt sıra (Feeds)**:
- Realtime activity feed (son 50 olay — InboxMessage + AuditLog kompoze)
- Geciken ödemeler tablosu
- Risk skoru yüksek öğrenciler

### H.2 Teacher Dashboard
- Bugünkü programım (timeline)
- Aktif sınıflarım (kart grid)
- Bekleyen ödevler
- Öğrenci performans heatmap (kendi öğrencileri)
- Bu ayın maaş kartı (kendi)
- Inbox

### H.3 Student Dashboard
- Sıradaki ders kartı (canlı link + geri sayım)
- Bu hafta ödevlerim
- Devamsızlık özeti
- Deneme net trendi
- Aktif paketim (fiyat **gizli** — `permissions.canSeeOwnedPackagePrice` enforce)
- Inbox

### H.4 Parent Dashboard
- Çocuk seçici (multi-child)
- Çocuğun bugünkü programı
- Devamsızlık alarmları
- Ödeme durumu (fiyat **görünür**)
- Öğretmen yorumları
- Inbox

---

## I. Route Architecture

```
/                                   public landing
/paketler, /blog, /sss, ...         public marketing
/giris, /kayit, /sifremi-unuttum    auth
/panel-secimi                       multi-panel chooser

/admin                              admin shell (RBAC: ADMIN)
  ├── /                             dashboard
  ├── /ogrenciler                   list
  ├── /ogrenciler/[id]              detail (tabs: general/education/packages/payments/attendance/notes/files/stats/history)
  ├── /ogretmenler[/[id]]
  ├── /veliler[/[id]]
  ├── /siniflar[/[id]]              tabs: students/teachers/schedule/attendance/assignments/analytics
  ├── /dersler                      list + calendar view
  ├── /odevler[/[id]]
  ├── /paketler[/[id]]              CRUD + analytics
  ├── /odemeler                     list + invoice + export
  ├── /muhasebe                     defter + raporlar + payroll
  ├── /inbox                        unified inbox
  ├── /istatistikler                multi-tab analytics
  ├── /raporlar                     export builder
  ├── /izinler                      permission matrix UI (RolePermission + UserPermissionOverride)
  ├── /audit                        AuditLog explorer
  └── /ayarlar                      org settings, branding, integrations

/ogretmen                           teacher shell
  ├── /                             dashboard
  ├── /siniflarim[/[id]]
  ├── /dersler                      kendi dersleri
  ├── /ogrencilerim[/[id]]          (read-only detail, sınırlı sekmeler)
  ├── /yoklama                      hızlı yoklama UI
  ├── /odevler[/[id]]               oluştur/değerlendir
  ├── /takvim
  ├── /inbox
  └── /profil                       (kendi maaş kayıtları burada)

/panel                              student shell
  ├── /                             dashboard
  ├── /sinifim
  ├── /dersler                      live + geçmiş
  ├── /odevler                      pending + submitted
  ├── /devamsizlik
  ├── /denemelerim                  exam results
  ├── /ogretmenlerim
  ├── /paketim                      (fiyat gizli)
  ├── /takvim
  ├── /inbox
  └── /profil

/veli                               parent shell
  ├── /                             dashboard
  ├── /cocuklarim[/[studentId]]
  ├── /dersler
  ├── /odevler
  ├── /devamsizlik
  ├── /odemeler                     fiyat görünür
  ├── /inbox
  └── /profil

/odk/panel, /odk/admin              ODK alt servisi (mevcut, korunur)
/api/v1/*                           REST (versioned)
/api/auth/*                         NextAuth
/api/cron/*                         scheduled jobs (mevcut)
```

### Middleware (yeni)
```ts
// middleware.ts — TÜM panel route'larını korur
matcher: [
  "/admin/:path*", "/api/v1/admin/:path*",
  "/ogretmen/:path*", "/api/v1/teacher/:path*",
  "/panel/:path*", "/api/v1/student/:path*",
  "/veli/:path*", "/api/v1/parent/:path*",
  "/odk/admin/:path*", "/odk/panel/:path*",
  "/api/v1/me/:path*",
]
```
Authorize callback: yol prefiksine göre token claim'i match eder, fail ise `/giris?callbackUrl=...`.

---

## J. API Architecture

### J.1 Standardize edilmiş endpoint'ler
| Method | Path | Permission |
|---|---|---|
| GET | `/api/v1/students?page=&q=&filter[tag]=...` | `students.read` (scope: own/all) |
| POST | `/api/v1/students` | `students.write` |
| GET | `/api/v1/students/:id` | `students.read` |
| PATCH | `/api/v1/students/:id` | `students.write` |
| DELETE | `/api/v1/students/:id` | `students.delete` |
| GET | `/api/v1/students/:id/timeline` | `students.read` |
| POST | `/api/v1/students/:id/notes` | `students.notes.write` |
| GET | `/api/v1/classrooms` | `classrooms.read` |
| ... | _(her domain için aynı pattern)_ | |
| GET | `/api/v1/me/inbox` | self |
| POST | `/api/v1/me/inbox/:id/read` | self |
| GET | `/api/v1/search?q=...&types=student,teacher,class` | scope-aware |

### J.2 Pagination contract
```
?page=1&pageSize=25&sort=createdAt&order=desc&q=ali
&filter[status]=ACTIVE,AT_RISK
&filter[tag]=vip
&filter[date.gte]=2026-01-01
```

### J.3 Webhook & cron
- Mevcut `/api/cron/*` korunur.
- Yeni `/api/webhooks/payment/*` (PayTR, future Stripe) — signature verify, idempotency key DB'de tutulur.

### J.4 Realtime layer
- **Faz 1**: TanStack Query polling (5–15s) + ETag/If-None-Match → bandwidth efficient.
- **Faz 4**: Pusher Channels veya Ably entegrasyonu. `RealtimeEvent` modeli pivot olarak kullanılır.
- `useRealtimeChannel("user:<id>")` hook'u → invalidate ilgili query keys.

---

## K. Permission System

### K.1 İki katmanlı
1. **Role bazlı** (`RolePermission`) — varsayılan yetki seti.
2. **Override** (`UserPermissionOverride`) — admin tek tek ekler/çıkarır.

### K.2 Permission key namespace
```
auth.*           login, refresh, logout
users.*          read, write, delete, impersonate
students.*       read, read.own, read.classroom, write, delete, notes.*, files.*, tags.*
teachers.*
parents.*
classrooms.*     read, write, delete, attendance.write, assignment.write
lessons.*        read, write, attendance.write
assignments.*    read, write, grade, submit (öğrenci)
packages.*       read, write, price.read
payments.*       read, write, refund, export
accounting.*     read, write, payroll.*
inbox.*          read.own, write.broadcast
notifications.*
statistics.*     dashboard.read, export
settings.*
audit.read
permissions.write
```

### K.3 Scope sistemi
Bir kullanıcının "read" hakkı tüm kayıtlara mı, yoksa sadece kendi/sınıfı mı?
```ts
type Scope = "own" | "classroom" | "all";
function studentReadScope(user): Scope { ... }
```
Service layer her query'de scope'a göre `where` clause ekler:
```ts
const where = applyStudentScope(baseWhere, ctx.user);
```

### K.4 Enforce wrapper
```ts
// lib/rbac/enforce.ts
export async function enforce(ctx, key: string, resource?: { ... }) {
  const allowed = await canDo(ctx.user, key, resource);
  if (!allowed) throw new ForbiddenError(key);
}
```

### K.5 UI tüketimi
```tsx
const { can } = usePermissions();
{can("payments.refund") && <RefundButton />}
```
Hook backend'e değil, JWT claim'inden gelen permission set'ine bakar (cache'li).

---

## L. Migration Strategy

### L.1 Veri korunur
- **Hiçbir DROP TABLE yok.**
- **Hiçbir destructive ALTER yok.**
- Tüm migration'lar additive: yeni tablo, yeni kolon (nullable veya default'lu), yeni index.

### L.2 Migration sırası
1. **`0030_permission_system`** — `Permission`, `RolePermission`, `UserPermissionOverride` + seed (mevcut hard-coded kuralları DB'ye taşı).
2. **`0031_saved_views`** — `SavedView`.
3. **`0032_refresh_tokens`** — `RefreshToken`.
4. **`0033_dashboard_layouts`** — `DashboardLayout` + `PanelKey` enum.
5. **`0034_realtime_events`** — `RealtimeEvent`.
6. **`0035_index_optimizations`** — composite index'ler + GIN trigram (raw SQL).
7. _(opsiyonel)_ **`0036_deprecate_notification`** — `Notification` modelinin yeni event'lere dair INSERT'leri durdurulur, read-only kalır. 90 gün sonra arşivlenir.

### L.3 Veri seed
- `prisma/seeds/permissions.ts` — namespace permission listesi
- `prisma/seeds/role-permissions.ts` — varsayılan rol→permission map'i
- Idempotent: var olan kayıtları upsert eder.

### L.4 Backfill
- Mevcut admin user'ları otomatik tüm permission'ları alır (cron + script: `scripts/backfill-admin-permissions.ts`).
- Mevcut `StudentTag`'ler için sistem tag'leri seed (`riskli`, `vip`, `yeni`) idempotent.

### L.5 Geri dönüş (rollback)
Her migration için `down.sql` yazılır. Production'da `prisma migrate resolve` ile yönetim.

---

## M. Refactor Strategy (Frontend Rebuild)

Eski UI **silinmeden** paralel inşa edilir, sonra route swap yapılır.

### Faz 0 — Foundation (1 hafta)
- [ ] Bağımlılıklar: `@tanstack/react-query`, `@tanstack/react-table`, `react-hook-form`, `@hookform/resolvers`, `recharts`, `cmdk`, `next-themes`, `sonner`, `@radix-ui/*` (shadcn ne gerekirse), `class-variance-authority`, `tailwind-merge`, `react-grid-layout` (faz 3 için ileride), `date-fns`, `zod-to-openapi` (faz 5).
- [ ] `tailwind.config.ts` token'lar, `globals.css` CSS variables, dark mode `class`.
- [ ] `components/ui/` — shadcn primitives kurulumu (CLI ile yaratılır).
- [ ] `components/shell/AppShell.tsx`, `Sidebar.tsx`, `Topbar.tsx`, `Breadcrumb.tsx`, `CommandMenu.tsx`, `NotificationCenter.tsx`.
- [ ] `lib/query/QueryProvider.tsx`, `lib/rbac/enforce.ts`, `lib/rbac/define-action.ts`.
- [ ] Migration `0030_permission_system` + seed.
- [ ] Yeni middleware (tüm panel'leri kapsar).

### Faz 1 — Admin Rebuild (2 hafta)
- [ ] `app/(app)/admin/layout.tsx` AppShell'i kullanır.
- [ ] Dashboard widget'ları (KPI cards + 4 chart + 2 feed).
- [ ] Students module: list (DataTable) + detail (tabs) + bulk actions + saved views.
- [ ] Inbox module: list + detail + bulk read/archive + compose (broadcast).
- [ ] Permissions UI (`/admin/izinler`): rol matrisi + per-user override.
- [ ] Audit explorer.

### Faz 2 — Classroom + Lesson + Attendance (1.5 hafta)
- [ ] Classroom CRUD + detail tabs.
- [ ] Lesson calendar view (`react-big-calendar` veya custom).
- [ ] Attendance fast-mark UI (öğretmen için).
- [ ] Assignment module (CRUD + grading).

### Faz 3 — Teacher + Student + Parent panels (2 hafta)
- [ ] Teacher shell (öğretmen sınırlı görünüm).
- [ ] Student shell (öğrenci panel — fiyat maskeli).
- [ ] Parent shell (multi-child seçici).

### Faz 4 — Payments + Accounting + Reports (2 hafta)
- [ ] Payments list (filter + export Excel/PDF).
- [ ] Accounting ledger + monthly reports.
- [ ] Teacher payroll workflow (DUE → PAID → AccountingEntry otomatik).
- [ ] Realtime layer (Pusher/Ably).

### Faz 5 — Statistics + Reports Builder + Polish (1 hafta)
- [ ] Tremor/Recharts dashboard'lar tüm rollerde.
- [ ] Custom report builder (filtre + kolon seç + schedule export).
- [ ] OpenAPI doc.
- [ ] Storybook publish.
- [ ] Performance audit (Lighthouse / Vercel Analytics).
- [ ] Eski `app/admin/*`, `app/panel/*`, `app/ogretmen/*`, `app/veli/*` route'larını yeni `(app)/` group'a taşı, redirect'ler ekle.

### Eski kod silme
- Faz 5 sonu: 2 hafta gözlem → eski component'ler ve action'lar silinir.

---

## N. Performance Strategy

| Alan | Aksiyon |
|---|---|
| **Bundle** | Route segments, dynamic import (`next/dynamic`) ağır component'ler için (Charts, CommandMenu, Calendar). |
| **Data fetching** | TanStack Query + ETag/If-None-Match (Next.js Route Handlers'ta `cache` header). |
| **Tablolar** | Tanstack Virtual (windowing) 100+ satırda. |
| **Prisma** | Selector reuse, `select` ile sadece gereken alanlar; aggregate query'ler için `groupBy`/raw SQL. |
| **Connection pool** | `@prisma/extension-accelerate` zaten var; PgBouncer ayarları gözden geçir. |
| **Images** | Tüm görseller `next/image`, `priority` sadece LCP için. |
| **Fonts** | `geist` zaten var, `display=swap`. |
| **Edge** | Public marketing route'ları `runtime: "edge"` (mümkün olanlar). |
| **Caching** | `revalidateTag` ile fine-grained (örn. `students:list`). Mutation sonrası ilgili tag'ler invalidate. |
| **Polling intervalleri** | Inbox: 15s · Dashboard KPIs: 60s · Tablolar: stale-while-revalidate (no polling). |

---

## O. Security Strategy

| Alan | Aksiyon |
|---|---|
| **Middleware** | Tüm panel + API rotaları için RBAC matcher. |
| **Server-side enforcement** | `defineAction` + `defineRoute` wrapper'larında zorunlu permission. |
| **Refresh token** | `RefreshToken` modeli + 30 gün rotation; access token 15 dk. |
| **Rate limit** | Login (mevcut) + tüm `/api/v1/*` route'lar 60req/min/user; brute-force endpoint'lerinde sıkı (5/dk). |
| **CSRF** | NextAuth + Server Action origin check (Next.js 15 default). |
| **DTO validation** | Zod her input'ta zorunlu (wrapper enforce eder). |
| **Audit log** | `defineAction` her mutation'da otomatik. |
| **PII masking** | Loglarda telefon/email mask. |
| **File uploads** | Vercel Blob + signed URL + MIME whitelist + size limit. |
| **Secrets** | `.env` örnekleri `.env.example`'da; production'da Vercel encrypted env. |
| **Headers** | `next.config.ts` → CSP, HSTS, X-Frame-Options, Referrer-Policy. |
| **Permission UI önemsizdir** — backend her zaman tekrar check eder. |

---

## P. Implementation Roadmap (Özet)

| Faz | Süre | Çıktı | Migration |
|---|---|---|---|
| **0** | 1 hafta | Bağımlılıklar, tokens, AppShell iskeleti, RBAC altyapısı | `0030_permission_system` |
| **1** | 2 hafta | Admin paneli baştan: Dashboard + Students + Inbox + Permissions UI + Audit | `0031`, `0032` |
| **2** | 1.5 hafta | Classroom + Lesson + Attendance + Assignment modülleri | _yok_ |
| **3** | 2 hafta | Teacher + Student + Parent shell'leri | `0033_dashboard_layouts` |
| **4** | 2 hafta | Payments + Accounting + Reports + Realtime | `0034_realtime_events`, `0035_index_optimizations` |
| **5** | 1 hafta | Statistics + Report Builder + OpenAPI + Polish + cleanup | `0036_deprecate_notification` (opsiyonel) |
| **TOPLAM** | **9.5 hafta** | Production-ready Education OS | 6 migration |

### Tüm fazlar boyunca enforce edilen kurallar
1. Hiçbir destructive DB değişikliği yapılmaz.
2. Eski route'lar silinmez, paralel yeni route'lar `(app)/` group'unda inşa edilir; Faz 5 sonu redirect + cleanup.
3. Her PR:
   - Permission key'lerini `lib/rbac/matrix.ts`'e ekler (varsa)
   - Audit log'unu kontrol eder
   - Storybook story'sini günceller (Faz 1+ için)
   - Type-check + lint + build pass
4. Her faz sonu **bu dokümana** "Faz N tamamlandı" notu eklenir.

---

## Açık Kararlar (User Onayı Bekleniyor)

- [x] **Faz 0 hemen başlasın mı?** → ✅ Onaylandı, tamamlandı.
- [x] **Yeni route grubu**: `/v2/<panel>/...` URL prefix'i seçildi (paralel inşa, Faz 5 sonu cutover).
- [x] **Realtime**: Pusher Channels seçildi.
- [x] **Renk paleti**: Sitedeki **pastel paleti** kullanılıyor — olive accent (`#3A4A2C`) + sky/yellow/mint/blush/lavender pastel secondary'ler. shadcn değil, custom `od-*` design system.
- [x] **Tema**: Light + Dark (ikisi de `globals.css`'de zaten tanımlı, `next-themes` ile bağlandı).
- [x] **Mobile API** (`/api/mobile/*`) korunur, dokunulmaz.
- [x] **Storybook** Faz 1 başında kurulacak.

---

## Faz 0 — Tamamlandı (2026-05-11)

### ✅ Eklenenler

**Bağımlılıklar (29 yeni paket)**
- TanStack: `@tanstack/react-query`, `@tanstack/react-query-devtools`, `@tanstack/react-table`, `@tanstack/react-virtual`
- Form: `react-hook-form`, `@hookform/resolvers`
- Tema: `next-themes`
- Komut menüsü: `cmdk`
- Toast: `sonner`
- Chart: `recharts`
- Tarih: `date-fns`
- Stil: `clsx`, `tailwind-merge`, `class-variance-authority`
- Radix primitives: `@radix-ui/react-{dialog,dropdown-menu,popover,tooltip,tabs,avatar,checkbox,switch,select,separator,scroll-area,slot,label}`
- Realtime: `pusher-js`, `pusher`

**Design tokens** (`tailwind.config.ts` + `globals.css`)
- Sitedeki tüm pastel renkler (`pastel.sky`, `pastel.yellow`, `pastel.mint`, `pastel.blush`, `pastel.lavender`) Tailwind class'larına expose edildi.
- `od-*` semantic tokens (bg, surface, ink, border, accent, sidebar...) — light & dark theme-aware.
- Typography scale (`text-od-h1` … `text-od-tiny`), shadow scale (`shadow-od-sm/md/lg/xl`), animation keyframes.
- `darkMode: ["class", '[data-theme="dark"]']` — sitedeki mevcut `data-theme` attribute'ı respect ediliyor.

**Component library — `components/od/`**
- `ui/` — Button, Card, Input, Textarea, Label, Badge, Skeleton, Separator, Dialog, DropdownMenu, Tooltip, Tabs, Avatar, ScrollArea, Command (⌘K), Popover, Toaster (15 dosya).
- `shell/` — AppShell, Sidebar (4 panel manifest), Topbar (search/theme/user/notifications), Breadcrumb (auto-segment-aware), CommandMenu (provider + dialog), nav-manifest (RBAC-gated).
- `data/` — DataTable (TanStack Table wrapper: sorting, filter, pagination, global search, toolbar, empty/loading state).
- `charts/` — KpiCard, LineChart, AreaChart, DonutChart (Recharts wrapper, pastel default palette).
- `feedback/` — EmptyState, ErrorState (5 pastel tone variant).
- `domain/students/` — StudentsTable (örnek olarak production-ready bir tablo).
- `providers/` — ThemeProvider (next-themes), AppProviders (theme + query + tooltip + toaster).
- `page-header.tsx` — Standart sayfa başlığı.

**RBAC sistemi — `lib/rbac/`**
- `matrix.ts` — 60+ permission key namespace + `defaultRolePermissions` map (ADMIN/TEACHER/STUDENT/PARENT).
- `enforce.ts` — `resolveUserPermissions()` (DB + override merge), `enforce()`, `ForbiddenError`.
- `define-action.ts` — Server action wrapper: auth + permission + Zod input + audit + structured `ActionResult<T>`.
- `policies.ts` — Scope helpers (`studentScope`, `applyStudentScope`).
- `index.ts` — Barrel.

**Service layer — `lib/services/students/`** (template; diğer domain'ler aynı pattern'le Faz 1+'da)
- `schemas.ts` — Zod input/filter schemas.
- `selectors.ts` — Reusable Prisma `select` (N+1 önler).
- `queries.ts` — `listStudents`, `getStudent` (scope-aware).
- `mutations.ts` — `createStudent`, `updateStudent`, `deleteStudent`.

**Query layer — `lib/query/`**
- `QueryProvider.tsx` — TanStack Query client (server-safe singleton, devtools dev-only, smart retry).
- `keys.ts` — Hierarchical query key factory (12 domain).

**Hook'lar — `hooks/`**
- `use-permissions.ts` — Client-side `can(key)` (UI-only, backend her zaman re-validate).

**Database — `prisma/schema.prisma` + migration**
- Yeni modeller (additive): `Permission`, `RolePermission`, `UserPermissionOverride`, `RefreshToken`, `SavedView`, `DashboardLayout` (+ `DashboardPanelKey` enum), `RealtimeEvent`.
- `User`'a back-relation alanları eklendi.
- Migration: `prisma/migrations/0017_rebuild_permission_system/migration.sql` — sadece `CREATE` ifadeleri, mevcut veri kesinlikle dokunulmadı.
- Seed: `prisma/seeds/permissions.ts` — `lib/rbac/matrix.ts`'ten idempotent upsert.

**Middleware — `middleware.ts` (yeniden yazıldı)**
- Tüm panel + API rotalarını kapsar: `/admin`, `/v2`, `/ogretmen`, `/panel`, `/veli`, `/odk/admin`, `/odk/panel`, `/api/admin`, `/api/v1/{admin,teacher,student,parent,me}`, `/api/odk/*`.
- Her prefix için uygun token claim match'i — "unutulmuş guard" riski sıfırlandı.

**Demo route — `app/v2/`**
- `app/v2/layout.tsx` — global provider mount point.
- `app/v2/admin/layout.tsx` — auth guard + AppShell mount.
- `app/v2/admin/page.tsx` — Dashboard demo (6 KPI card pastel tone, AreaChart gelir trendi, DonutChart kullanıcı dağılımı, EmptyState feed örnekleri — tümü canlı Prisma query'den).
- `app/v2/admin/ogrenciler/page.tsx` — Students CRM tablo demo (DataTable + tag/status badge'ler pastel renklerle, action menü).

### ⚠️ Sırada (Faz 0 sonrası operatör tarafından çalıştırılacak)

```bash
# 1. Migration'ı uygula (DATABASE_URL gerekli)
npx prisma migrate deploy
#    veya geliştirmede:
npx prisma migrate dev

# 2. Permission seed
npx tsx prisma/seeds/permissions.ts

# 3. Geliştirmeyi başlat
npm run dev
#    sonra http://localhost:3000/v2/admin (admin user ile giriş)
```

### 🔍 Kontrol kriterleri (kabul testleri)

- [x] `npx tsc --noEmit` → 0 hata.
- [ ] Migration deploy edildiğinde mevcut veri korunuyor (test gerekli).
- [ ] `/v2/admin` admin user ile açılıyor, AppShell + sidebar + topbar görünüyor.
- [ ] `/v2/admin/ogrenciler` mevcut student data ile yükleniyor.
- [ ] Theme toggle (top-right) light/dark arasında geçiş yapıyor, pastel renkler iki temada da uyumlu.
- [ ] ⌘K command menü açılıyor, navigation çalışıyor.
- [ ] `/admin` (eski) yine erişilebilir — paralel çalışma korunuyor.

### 📌 Faz 1 — Sırada

Önceki roadmap'teki Faz 1 (Admin Rebuild — 2 hafta) başlatılır. Hedef: Tüm `/v2/admin/*` modüllerini (Inbox, Students full detail tabs, Teachers, Parents, Classrooms, Lessons, Assignments, Packages, Payments, Accounting, Statistics, Reports, Permissions UI, Audit, Settings) production-grade olarak inşa etmek. Storybook bu fazın başında kurulur.

---

## Faz 1 — Sprint 1 Tamamlandı (2026-05-11)

İlk dilim üç stratejik modülü teslim eder ve canlı API/RBAC döngüsünü tamamlar:

### Inbox modülü (`/v2/admin/inbox`)
- `lib/services/inbox/{schemas,queries,mutations,index}.ts` — Zod şema (`inboxListFilterSchema`, `inboxBroadcastSchema`, `inboxIdsSchema`), liste sorgusu (admin başka kullanıcı gözünden bakabilir), 5 mutation (`markInboxRead`, `archiveInbox`, `unarchiveInbox`, `deleteInbox`, `broadcastInbox`) — hepsi `defineAction` üzerinden RBAC + audit log.
- `app/v2/admin/inbox/page.tsx` — Server component, `searchParams` (unread/archived/category/q/page) destekli.
- `components/od/domain/inbox/inbox-client.tsx` — Pastel kategori/öncelik rozetleri, çoklu seçim + bulk actions (okundu/arşivle/sil), arama, filtre.
- `app/v2/admin/inbox/yeni-duyuru/page.tsx` + `broadcast-form.tsx` — Role/kategori/öncelik seçimi, başlık+gövde+href, `broadcastInbox` action ile toplu gönderim.
- Topbar bell badge'i artık `/api/v1/me/inbox/unread` üzerinden 30 sn polling ile gerçek sayıyı gösteriyor.

### Permission Matrix UI (`/v2/admin/izinler`)
- `lib/services/permissions/{schemas,queries,mutations,index}.ts` — `toggleRolePermission`, `setUserOverride`, `removeUserOverride`, `resolveEffectivePermissions(userId, role)`.
- `app/v2/admin/izinler/page.tsx` — `requirePagePermission("permissions.read")` korumalı.
- `components/od/domain/permissions/permission-matrix.tsx` — Kategori grupları, satırda izin + 4 rol kolonu, optimistic toggle, ADMIN değiştirilemez (her zaman tüm izinler), arama.
- `hooks/use-permissions.ts` artık `/api/v1/me/permissions`'dan canlı çekiyor — `UserPermissionOverride`'lar UI'da etkili.

### Audit Explorer (`/v2/admin/audit`)
- `app/v2/admin/audit/page.tsx` — `requirePagePermission("audit.read")`, entityType/action/q/page filtreleri.
- `components/od/domain/audit/audit-table.tsx` — Action'a göre pastel tone (create=mint, update=sky, delete=blush…), expandable satır (full timestamp + JSON payload), 50/sayfa pagination.

### API endpoint'leri
- `GET /api/v1/me/inbox/unread` → `{ count }`
- `GET /api/v1/me/permissions` → `{ permissions: PermissionKey[], role, fallback? }`

### Validation
- `npx tsc --noEmit` → **EXIT=0** (zero errors)
- Migration `0017_rebuild_permission_system` deploy edildi (Faz 0 sonu)
- Seed çalıştı: 68 permission + 4 rol-permission seti yazıldı
  - ADMIN: 68 / TEACHER: 20 / STUDENT: 8 / PARENT: 9

### Eklenen dosyalar (Faz 1 Sprint 1)
```
lib/services/inbox/{schemas,queries,mutations,index}.ts
lib/services/permissions/{schemas,queries,mutations,index}.ts
app/v2/admin/inbox/page.tsx
app/v2/admin/inbox/yeni-duyuru/page.tsx
app/v2/admin/izinler/page.tsx
app/v2/admin/audit/page.tsx
app/api/v1/me/inbox/unread/route.ts
app/api/v1/me/permissions/route.ts
components/od/domain/inbox/inbox-client.tsx
components/od/domain/inbox/broadcast-form.tsx
components/od/domain/permissions/permission-matrix.tsx
components/od/domain/audit/audit-table.tsx
```

### Sırada — Faz 1 Sprint 2
1. **Students detail page** (sekmeli) — general / education / packages / payments / attendance / notes / files / stats / history
2. **Teachers, Parents, Classrooms** modülleri — list + create/edit + detail aynı pattern
3. **Lessons + Assignments** — takvim entegrasyonu, ödev gönderimi
4. **Packages + Payments + Accounting** — finans modülü (öğrenci paket fiyatlarını görmüyor)
5. **Storybook** kurulumu (UI primitives + domain componentler)

---

## Faz 1 — Sprint 2 Tamamlandı (2026-05-11)

Tüm Admin panel modüllerinin v2 list+detail sayfaları artık ayakta. Her sayfa `requirePagePermission(...)` ile RBAC kapısından geçer, pastel tone'lu badge'ler ve EmptyState pattern'ini kullanır.

### Eklenen sayfalar

| Modül | Rota | Açıklama |
|---|---|---|
| **Students Detail** | `/v2/admin/ogrenciler/[id]` | 9 sekmeli profil: Genel · Eğitim · Paketler · Ödemeler · Yoklama · Ödevler · Notlar · Dosyalar · Geçmiş (audit log) |
| **Teachers** | `/v2/admin/ogretmenler` | Liste + ders/sınıf sayısı |
| **Parents** | `/v2/admin/veliler` | Liste + bağlı öğrenci rozetleri |
| **Classrooms** | `/v2/admin/siniflar` | Pastel kart grid + kapasite/öğretmen/ders sayıları |
| **Lessons** | `/v2/admin/dersler` | Son 100 ders + Google Meet link + status renklendirme |
| **Assignments** | `/v2/admin/odevler` | Ödev listesi + hedef (sınıf/öğrenci/genel) + gönderim sayısı |
| **Packages** | `/v2/admin/paketler` | Pastel paket kartları + fiyat + aktif öğrenci sayısı |
| **Payments** | `/v2/admin/odemeler` | 3 KPI (30g gelir / işlem / bugün) + INCOME satırları |
| **Accounting** | `/v2/admin/muhasebe` | 4 KPI (30g gelir/gider/net + tüm zaman net) + tüm hareketler |

### StudentDetailTabs özellikleri
- Header card: avatar (initial), iletişim/lokasyon ikonları, status + class + tag rozetleri
- 9 tab — paralel `Promise.all` ile tek render'da fetch
- Yoklama: PRESENT/ABSENT/LATE pastel rozetler
- Ödevler: GRADED/SUBMITTED/LATE/MISSED renk eşlemesi
- Audit history: entityType=Student, entityId=studentId filtresi
- Tüm tutarlar `Intl.NumberFormat("tr-TR", "TRY")` ile formatlanır (kurus → TL)

### Validation
- `npx tsc --noEmit` → **EXIT=0** (10 yeni sayfa, sıfır hata)
- Tüm sayfalar `requirePagePermission` korumalı; izin yoksa 403 / redirect

### Eklenen dosyalar (Faz 1 Sprint 2)
```
app/v2/admin/ogrenciler/[id]/page.tsx
app/v2/admin/ogretmenler/page.tsx
app/v2/admin/veliler/page.tsx
app/v2/admin/siniflar/page.tsx
app/v2/admin/dersler/page.tsx
app/v2/admin/odevler/page.tsx
app/v2/admin/paketler/page.tsx
app/v2/admin/odemeler/page.tsx
app/v2/admin/muhasebe/page.tsx
components/od/domain/students/student-detail-tabs.tsx
```

### Sırada — Faz 1 Sprint 3 (mutations & forms)
1. **Create/Edit formları** — Students, Teachers, Parents, Classrooms, Packages, Lessons (RHF + Zod + defineAction)
2. **Detail sayfaları** — Teachers/Parents/Classrooms/Packages için (Students gibi sekmeli)
3. **Bulk actions** — Students table seçim + tag ekle/sil + status değiştir
4. **Statistics & Reports** — `/v2/admin/istatistikler`, `/v2/admin/raporlar` (chart-heavy)
5. **Settings** — `/v2/admin/ayarlar` (sistem yapılandırma)
6. **Storybook** kurulumu


---

## Faz 1 — Sprint 3 Tamamlandı (2026-05-11)

> Mutation/Action layer + reusable form sistemi + analytics & sistem sayfaları.
> CRUD halkasının "Create" ucu kapatıldı, list sayfalarına "Yeni" CTA'ları eklendi.

### Eklenen servis modülleri (defineAction pattern)

| Modül | Aksiyonlar | Audit entity |
|---|---|---|
| `lib/services/students/actions.ts` | createStudentAction · updateStudentAction · deleteStudentAction | Student |
| `lib/services/teachers/actions.ts` | createTeacherAction · updateTeacherAction · deleteTeacherAction | Teacher |
| `lib/services/classrooms/actions.ts` | createClassroomAction · updateClassroomAction · deleteClassroomAction | Classroom |
| `lib/services/packages/actions.ts` | createPackageAction · updatePackageAction · deletePackageAction | Package |

Her aksiyon: Zod input → `requirePermission(...)` → Prisma write → `writeAudit(...)` → `revalidatePath(...)` → `ActionResult<T>`.

### AutoForm — şema-yönetimli reusable form

`components/od/forms/auto-form.tsx`:
- `FieldDef[]` config: `text` · `email` · `url` · `number` · `textarea` · `select` · `checkbox`
- Otomatik label/required/placeholder/help-text rendering
- `useTransition` + `toast` + `setErrors(res.error.fields)` pattern
- VALIDATION error code → field-level inline error mesajları
- Tüm "yeni X" sayfaları artık 5–10 satır AutoForm config ile yazılıyor

### Eklenen sayfalar (Sprint 3)

| Sayfa | Rota | İçerik |
|---|---|---|
| **Student — Yeni** | `/v2/admin/ogrenciler/yeni` | StudentForm (manuel layout, gelişmiş alanlar) |
| **Student — Düzenle** | `/v2/admin/ogrenciler/[id]/duzenle` | StudentForm (initialValues prefill) |
| **Teacher — Yeni** | `/v2/admin/ogretmenler/yeni` | AutoForm (ad · email · tel · branş · maaş %) |
| **Classroom — Yeni** | `/v2/admin/siniflar/yeni` | AutoForm (ad · seviye select · kapasite · açıklama) |
| **Package — Yeni** | `/v2/admin/paketler/yeni` | AutoForm (ad · tip · fiyat · ay · ders saati · aktif) |
| **Statistics** | `/v2/admin/istatistikler` | 6 KPI · 30g günlük gelir AreaChart · Status/Exam DonutChart'lar |
| **Reports** | `/v2/admin/raporlar` | 6 rapor kartı (Öğrenci/Ödeme/Yoklama/Ödev/Sınıf/Muhasebe) |
| **Settings** | `/v2/admin/ayarlar` | RBAC/Audit/Inbox link kartları + sistem bilgi tablosu |

### List sayfa CTA güncellemeleri
Tüm liste sayfalarına `PageHeader actions` slotu içinde "Yeni X" `<Button variant="primary">` eklendi:
- `/v2/admin/ogrenciler` → /yeni
- `/v2/admin/ogretmenler` → /yeni
- `/v2/admin/siniflar` → /yeni
- `/v2/admin/paketler` → /yeni

### Validation
- `npx tsc --noEmit` → **EXIT=0** (14 yeni dosya + 4 list güncellemesi, sıfır hata)
- Enum doğrulamaları: ClassroomLevel (`MIXED|TYT|AYT|LGS|YDT`), PackageType (`COURSE|EXAM`) Prisma şemasıyla birebir
- AreaChart props doğrulandı: `series={[{ key, label, color? }]}` (NOT `dataKeys`)

### Eklenen dosyalar (Faz 1 Sprint 3)
```
lib/services/students/actions.ts
lib/services/teachers/{schemas,actions}.ts
lib/services/classrooms/{schemas,actions}.ts
lib/services/packages/{schemas,actions}.ts
components/od/forms/auto-form.tsx
components/od/domain/students/student-form.tsx
app/v2/admin/ogrenciler/yeni/page.tsx
app/v2/admin/ogrenciler/[id]/duzenle/page.tsx
app/v2/admin/ogretmenler/yeni/page.tsx
app/v2/admin/siniflar/yeni/page.tsx
app/v2/admin/paketler/yeni/page.tsx
app/v2/admin/istatistikler/page.tsx
app/v2/admin/raporlar/page.tsx
app/v2/admin/ayarlar/page.tsx
```

### Sırada — Faz 1 Sprint 4 (detail/edit completion + bulk + storybook)
1. **Detail sayfaları** — Teacher/Parent/Classroom/Package (Student gibi sekmeli profil)
2. **Edit sayfaları** — Teacher/Classroom/Package için `/[id]/duzenle` (AutoForm + initialValues)
3. **Lessons & Assignments formları** — Yeni/Düzenle (target type — class/student/general — koşullu alanlar)
4. **Bulk actions** — Students tablosunda multi-select + tag toggle + status değiştirme
5. **Storybook 8** kurulumu — `components/od/ui/*` ve `domain/*` için story'ler
6. **PDF/Excel export** — Reports sayfasındaki kartlar için sunucu-tarafı export endpoint'leri

---

## Faz 1 — Sprint 4 Tamamlandı (2026-05-11)

> Detail/Edit halkasının kapatılması + Lessons & Assignments mutation katmanı.
> Her admin entity artık liste / yeni / detay / düzenle dört ayağıyla tam.

### Eklenen edit sayfaları (3)

| Rota | Aksiyon | Pattern |
|---|---|---|
| `/v2/admin/ogretmenler/[id]/duzenle` | `updateTeacherAction` | AutoForm + initial + extra={id} |
| `/v2/admin/siniflar/[id]/duzenle` | `updateClassroomAction` | AutoForm + initial + extra={id} |
| `/v2/admin/paketler/[id]/duzenle` | `updatePackageAction` | AutoForm + initial + extra={id} |

### Eklenen detail sayfaları (4)

| Rota | İçerik |
|---|---|
| `/v2/admin/ogretmenler/[id]` | Genel kart (status/email/phone/bio) · Sayılar (ders/ödev/sınıf) · Sınıf listesi · Son 10 ders |
| `/v2/admin/veliler/[id]` | İletişim · Bağlı öğrenci kartları (link, ilişki, birincil rozet) |
| `/v2/admin/siniflar/[id]` | 4 KPI · Öğretmen listesi · Öğrenci listesi · Son dersler · Açıklama |
| `/v2/admin/paketler/[id]` | 4 KPI · Aktif öğrenci atamaları · Son dersler · PayTR link · Açıklama |

### Yeni service modülleri

| Modül | Aksiyonlar | Notlar |
|---|---|---|
| `lib/services/lessons/{schemas,actions}.ts` | create/update/delete | `z.coerce.date()` ile datetime-local input desteği |
| `lib/services/assignments/{schemas,actions}.ts` | create/update/delete | classroomId/studentId mutually-exclusive (boş = genel) |

### Yeni form sayfaları

| Sayfa | Özellik |
|---|---|
| `/v2/admin/dersler/yeni` | Server-side fetched select options: 500 öğrenci · aktif öğretmen/sınıf/paket · datetime-local + duration |
| `/v2/admin/odevler/yeni` | Aynı pattern + classroom **veya** student select (helpText ile yönlendirme) |

### AutoForm genişletmesi
`FieldDef.type` union'ına eklendi:
- `"date"` · `"datetime-local"` · `"tel"`

### List sayfa CTA güncellemeleri (yeni)
- `/v2/admin/dersler` → /yeni
- `/v2/admin/odevler` → /yeni

### Validation
- `npx tsc --noEmit` → **EXIT=0** (11 yeni dosya + 2 list güncellemesi + 1 AutoForm tip genişletmesi)
- Permission key doğrulaması: `assignments.delete` matrix'te yok → `assignments.write` kullanıldı
- Enum doğrulaması: `LessonStatus = SCHEDULED|COMPLETED|CANCELLED` (sadece 3 değer)

### Eklenen dosyalar (Faz 1 Sprint 4)
```
app/v2/admin/ogretmenler/[id]/page.tsx
app/v2/admin/ogretmenler/[id]/duzenle/page.tsx
app/v2/admin/veliler/[id]/page.tsx
app/v2/admin/siniflar/[id]/page.tsx
app/v2/admin/siniflar/[id]/duzenle/page.tsx
app/v2/admin/paketler/[id]/page.tsx
app/v2/admin/paketler/[id]/duzenle/page.tsx
app/v2/admin/dersler/yeni/page.tsx
app/v2/admin/odevler/yeni/page.tsx
lib/services/lessons/schemas.ts
lib/services/lessons/actions.ts
lib/services/assignments/schemas.ts
lib/services/assignments/actions.ts
```

### Sırada — Faz 1 Sprint 5
1. **Lessons & Assignments edit sayfaları** (`/[id]/duzenle`)
2. **Bulk actions** — Students tablosu seçim + tag/status toggle (Sprint 4'ten taşındı)
3. **Parents için CRUD** — `lib/services/parents/*` + form sayfaları (yeni/düzenle/detay)
4. **Storybook 8** kurulumu + `components/od/ui/*` story'leri
5. **PDF/Excel export** — Reports sayfası kartları için endpoint'ler
6. **AutoForm — async select** — büyük listeler için debounced server search

---

## Faz 1 — Sprint 5 Tamamlandı (2026-05-11)

> CRUD halkasının son entitisi (Parents) tamamlandı; Lessons & Assignments için
> edit ekranları eklendi. Artık tüm 7 admin entity'si (Students, Teachers,
> Parents, Classrooms, Packages, Lessons, Assignments) liste/yeni/detay/düzenle
> dört ayağıyla tam.

### Yeni service modülü — Parents

| Aksiyon | Permission | Açıklama |
|---|---|---|
| `createParentAction` | `parents.write` | phone → phoneKey otomatik normalize (son 10 hane) |
| `updateParentAction` | `parents.write` | phoneKey re-compute on phone change |
| `deleteParentAction` | `parents.delete` | — |
| `linkParentStudentAction` | `parents.write` | upsert ParentStudent (ilişki + isPrimary) |
| `unlinkParentStudentAction` | `parents.write` | ParentStudent kompozit key delete |

### Eklenen sayfalar

| Rota | Açıklama |
|---|---|
| `/v2/admin/veliler/yeni` | AutoForm — ad/tel/email/notlar |
| `/v2/admin/veliler/[id]/duzenle` | AutoForm + initial prefill |
| `/v2/admin/dersler/[id]/duzenle` | Server-side fetched options + datetime-local prefill (`toLocalInput` helper) |
| `/v2/admin/odevler/[id]/duzenle` | classroom/student select + dueAt prefill |

### CTA güncellemeleri
- `/v2/admin/veliler` → "Yeni Veli" buton
- `/v2/admin/veliler/[id]` → "Düzenle" buton

### Helper pattern — datetime-local prefill
```ts
function toLocalInput(d: Date | null) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
```
HTML `<input type="datetime-local">` ISO string kabul etmediği için zorunlu —
edit sayfalarında yeniden kullanılabilir.

### Validation
- `npx tsc --noEmit` → **EXIT=0** (8 yeni dosya + 2 list/detay güncellemesi)
- Phone normalize edge case: empty/null girildiğinde phoneKey de null

### Eklenen dosyalar (Faz 1 Sprint 5)
```
lib/services/parents/schemas.ts
lib/services/parents/actions.ts
app/v2/admin/veliler/yeni/page.tsx
app/v2/admin/veliler/[id]/duzenle/page.tsx
app/v2/admin/dersler/[id]/duzenle/page.tsx
app/v2/admin/odevler/[id]/duzenle/page.tsx
```

### CRUD tamlık tablosu (Faz 1 sonu)

| Entity | Liste | Yeni | Detay | Düzenle | Service |
|---|:-:|:-:|:-:|:-:|:-:|
| Students | ✅ | ✅ | ✅ (9 tab) | ✅ | ✅ |
| Teachers | ✅ | ✅ | ✅ | ✅ | ✅ |
| Parents | ✅ | ✅ | ✅ | ✅ | ✅ |
| Classrooms | ✅ | ✅ | ✅ | ✅ | ✅ |
| Packages | ✅ | ✅ | ✅ | ✅ | ✅ |
| Lessons | ✅ | ✅ | — | ✅ | ✅ |
| Assignments | ✅ | ✅ | — | ✅ | ✅ |

### Sırada — Faz 1 Sprint 6 / Faz 2 hazırlığı
1. **Lessons & Assignments detail sayfaları** — başlık + meta + (assignment için) submission tablosu
2. **Bulk actions** — Students tablosunda multi-select + tag toggle + status değiştirme (DataTable selectable patch)
3. **Parent ↔ Student bağ yönetimi UI** — veli detay sayfasında "Öğrenci ekle" combobox + unlink butonları
4. **AutoForm — async select** — büyük listeler için debounced server search
5. **Storybook 8** kurulumu + `components/od/ui/*` story'leri
6. **PDF/Excel export** — Reports sayfası kartları için endpoint'ler

---

## Faz 1 — Sprint 6 Tamamlandı (2026-05-11)

> Detail eksiklerinin kapatılması (Lessons & Assignments) + Students bulk
> actions toolbar'ı + ParentStudent bağ yönetimi UI. Faz 1 CRUD haritası
> %100 tamam.

### Eklenen detail sayfaları (2)

| Rota | İçerik |
|---|---|
| `/v2/admin/dersler/[id]` | Status badge · 4 ilişki kartı (öğrenci/öğretmen/sınıf/paket) · Notlar · Yoklama listesi · Düzenle CTA |
| `/v2/admin/odevler/[id]` | Status + target type (Sınıf/Tek/Genel) · 3 ilişki kartı · Açıklama · Eklenti · Submission tablosu (status/puan/gönderim/notlama) |

### Bulk actions — Students

`lib/services/students/bulk-actions.ts`:

| Aksiyon | Permission | İşlev |
|---|---|---|
| `bulkUpdateStudentStatusAction` | `students.write` | `updateMany` ile durum değiştirme |
| `bulkToggleStudentTagAction` | `students.write` | `createMany skipDuplicates` (add) / `deleteMany` (remove) |
| `bulkDeleteStudentsAction` | `students.delete` | `deleteMany` (max 200) |

UI: `components/od/domain/students/students-bulk-bar.tsx`
- Pastel sky banner — seçim sayısı + Durum/Etiket dropdown + Sil
- Confirm dialog ile silme koruması
- `useTransition` + `toast` + `router.refresh()`

`students-table.tsx` güncellemeleri:
- Yeni "select" kolonu (header checkbox = toggle all)
- Local `selected` state + `selectedIds` memo
- Üst toolbar'a `<StudentsBulkBar>` mount
- `tags` prop'u opsiyonel (varsayılan boş)
- "Yeni Öğrenci" butonu artık `/yeni` rotasına link

`/v2/admin/ogrenciler/page.tsx`:
- `Promise.all` ile students + STUDENT scope'lu tag'ler paralel fetch
- `<StudentsTable data={students} tags={tags} />`

### ParentStudent bağ yönetimi — UI

`components/od/domain/parents/parent-students-manager.tsx`:
- Server Action wrapper (`linkParentStudentAction` / `unlinkParentStudentAction`)
- Öğrenci search input (client-side filter, ilk 50 sonuç)
- İlişki ("Anne/Baba/Vasi") + birincil iletişim checkbox
- Bağlı öğrenciler listesi + tek-tıkla Trash2 unlink butonu
- `router.refresh()` ile server state senkron

`/v2/admin/veliler/[id]/page.tsx` yeniden yapılandırıldı:
- Tüm öğrenci listesini paralel fetch (1000 cap)
- İletişim kartı + manager component
- Düzenle CTA korundu

### Validation
- `npx tsc --noEmit` → **EXIT=0** (5 yeni dosya + 3 güncellenmiş sayfa + students-table çekirdek refactor)
- `prisma.studentTag.createMany({ skipDuplicates: true })` ile race-safe etiket ekleme
- `Tag.scope = "STUDENT"` filtresi ile yalnızca öğrenci tag'leri toolbar'da görünür

### Eklenen dosyalar (Faz 1 Sprint 6)
```
lib/services/students/bulk-actions.ts
app/v2/admin/dersler/[id]/page.tsx
app/v2/admin/odevler/[id]/page.tsx
components/od/domain/students/students-bulk-bar.tsx
components/od/domain/parents/parent-students-manager.tsx
```

### Güncellenen dosyalar
```
components/od/domain/students/students-table.tsx  (selection col + bulk bar mount + Link to /yeni)
app/v2/admin/ogrenciler/page.tsx                  (tags fetch + prop pass)
app/v2/admin/veliler/[id]/page.tsx                (manager mount, all-students fetch)
```

### CRUD tamlık tablosu (Faz 1 sonu — güncel)

| Entity | Liste | Yeni | Detay | Düzenle | Bulk | Service |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Students | ✅ | ✅ | ✅ (9 tab) | ✅ | ✅ status/tag/delete | ✅ |
| Teachers | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| Parents | ✅ | ✅ | ✅ + link manager | ✅ | — | ✅ |
| Classrooms | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| Packages | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| Lessons | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| Assignments | ✅ | ✅ | ✅ + submissions | ✅ | — | ✅ |

### Sırada — Faz 2 hazırlığı
1. **Storybook 8** kurulumu + `components/od/ui/*` story'leri
2. **PDF/Excel export** — Reports sayfası kartları için endpoint'ler (`@react-pdf/renderer` + `xlsx`)
3. **AutoForm — async select** — debounced server search ile büyük öğrenci/öğretmen listeleri
4. **Filter UI** — Students tablosunda durum/sınıf/etiket multi-select filter chip'ler
5. **Faz 2: Teacher Panel** — `/v2/teacher/*` rotaları, RBAC `*.read.own` filter pattern
6. **Faz 2: Student Panel** — `/v2/student/*` ödev/ders/yoklama görünümleri
