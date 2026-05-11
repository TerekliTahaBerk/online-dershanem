# OnlineDershanem — Panel Sistemi Master Plan

> Bu doküman OnlineDershanem'in 4 rollü (Öğrenci, Öğretmen, Veli, Admin) panel
> sistemi için **kalıcı vizyon ve mimari referansıdır**. Her faz tamamlandıkça
> ilgili bölümleri güncelleyin; eski parça notlar (`admin-panel-tasks.md`,
> `admin-student-panel-foundation.md`) buraya bağlanır.

Son güncelleme: **Faz 0 — Foundation** başlatıldı.

---

## 1. Vizyon

OnlineDershanem'i bir "admin paneli" olmaktan çıkarıp şu kapsamda bir
**Education Operating System**'e dönüştürmek:

- Eğitim Yönetim Sistemi (sınıflar, dersler, içerikler)
- Öğrenci Takip + CRM (tag, risk, performans)
- Muhasebe (gelir/gider, paket geliri, öğretmen maaşı)
- Paket & Abonelik Yönetimi
- İstatistik & Performans (rol bazlı dashboard)
- Inbox / Realtime Bildirim Omurgası

Tüm modüller **birbirine bağlı, dinamik ve filtrelenebilir** olacak. Admin paneli
sistemin tamamını merkezi olarak yönetir.

## 2. Roller ve Erişim Matrisi

| Özellik / Rol           | Admin | Öğretmen      | Veli         | Öğrenci |
| ----------------------- | :---: | :-----------: | :----------: | :-----: |
| Öğrenci CRUD            |  ✅   | sınırlı (kendi sınıfı) | ❌      |   ❌    |
| Öğretmen CRUD           |  ✅   | ❌            | ❌           |   ❌    |
| Sınıf yönetimi          |  ✅   | sınırlı       | ❌           |   ❌    |
| Paket fiyatı görme      |  ✅   | ❌            | ✅ (kendi)   |   ❌    |
| Muhasebe / Maaş         |  ✅   | sadece kendi maaşı | ❌      |   ❌    |
| Yoklama girme           |  ✅   | ✅ (kendi dersi) | ❌        |   ❌    |
| Ödev verme              |  ✅   | ✅            | ❌           |   ❌    |
| Performans görme        |  ✅   | ✅ (kendi öğr.)| ✅ (kendi çocuk) | ✅ (kendi) |
| Inbox & Bildirim        |  ✅   | ✅            | ✅           |   ✅    |

Roller `UserRole` enum'unda: `ADMIN | TEACHER | STUDENT | PARENT`.

## 3. Panel URL Haritası

| Panel       | URL prefix      | Layout dosyası             |
| ----------- | --------------- | -------------------------- |
| Admin       | `/admin`        | `app/admin/layout.tsx`     |
| Öğretmen    | `/ogretmen`     | `app/ogretmen/layout.tsx`  |
| Öğrenci     | `/panel`        | `app/panel/layout.tsx`     |
| Veli        | `/veli`         | `app/veli/layout.tsx` _(Faz 0 iskeleti)_ |

ODK paneli (`/odk/panel`, `/odk/admin`) bağımsız bir servis olarak korunur ve
`AccessService` enum + tag sistemi üzerinden erişim verilir.

## 4. Veri Mimarisi (Hedef)

Mevcut: `User`, `Student`, `Teacher`, `Package`, `StudentPackage`,
`StudentPackageEnrollment`, `Lesson`, `Course/Module/Content`, `StudentExamResult`,
`StudentMetricSnapshot`, `Notification`, `AuditLog`, ODK alt sistemi.

### Faz 0'da eklenenler

- `Parent` — veli kaydı, opsiyonel `User` linki (`role=PARENT`)
- `ParentStudent` — many-to-many; `relationship` ("Anne/Baba/Vasi"), `isPrimary`
- `Classroom` — sınıf/şube/seviye/kapasite
- `ClassroomTeacher` — sınıf ↔ öğretmen (lead flag, branş)
- `ClassroomStudent` — sınıf ↔ öğrenci (joinedAt/leftAt)
- `Tag` — genel etiket modeli (scope, color, system flag)
- `StudentTag` — öğrenci ↔ tag, `assignedById`, `expiresAt`
- `Attendance` — yoklama (lesson veya classroom session bağlamında)

### Faz 1+'da eklenecek (planlanan)

- `InboxMessage` — birleşik inbox omurgası (kategori, öncelik, conversationId)
- `Assignment`, `AssignmentSubmission` — ödev sistemi
- `Grade` / `TeacherComment` — not & yorum
- `AccountingEntry` — gelir/gider muhasebe defteri
- `TeacherPayroll` — öğretmen maaş kayıtları
- `Tag` extension: `TeacherTag`, `ParentTag` (scope üzerinden zaten destekli)

## 5. Yol Haritası — Fazlar

### ✅ Faz 0 — Foundation _(şu an)_
- Master plan dokümanı (bu dosya)
- `PARENT` rolü + `Parent`/`ParentStudent` modeli
- `Classroom`, `ClassroomTeacher`, `ClassroomStudent`
- `Tag`, `StudentTag`
- `Attendance` modeli + enum
- Migration: `0010_add_parent_role`, `0011_panel_foundation`
- Auth katmanı: `hasParentAccess` JWT/session claim
- `lib/panel-access.ts`: `parent` PanelKey
- `app/veli/` iskeleti (auth-gated placeholder dashboard)

### Faz 1 — Inbox & Realtime Spine _(1 hafta)_
- `InboxMessage` modeli (kategori: SYSTEM/FINANCE/EDUCATION/ANNOUNCEMENT/TEACHER)
- Mevcut `Notification` event'lerini Inbox'a yazan adapter
- Polling tabanlı realtime (5–15s interval, ileride Pusher/Ably/Socket.IO)
- Tüm panellerde `/inbox` sayfası + topbar bell counter
- Admin tarafı: toplu duyuru gönderme

### Faz 2 — Sınıflar (Classroom) _(2 hafta)_
- Admin sınıf CRUD + öğrenci/öğretmen atama UI
- Sınıf detay sekmeleri: Genel / Öğrenciler / Program / Performans / Yoklama / Ödevler
- Öğretmen panelinde "Sınıflarım" görünümü
- Öğrenci panelinde "Sınıfım" kartı
- `Lesson` modeline opsiyonel `classroomId` ekleme (grup dersi)

### Faz 3 — Tag + Öğrenci CRM Derinleşme _(2 hafta)_
- Tag yönetim ekranı (admin)
- Öğrenci listesinde tag filtresi + multi-select
- Öğrenci detayı sekmeleri: Eğitim Geçmişi / Notlar / Yorumlar / Dosyalar
- Risk skoru altyapısı (tag + metric snapshot kombinasyonu)
- Tag bazlı toplu mesaj/aksiyon

### Faz 4 — Veli Paneli + Yoklama + Ödev _(2–3 hafta)_
- Veli onboarding flow (admin tarafından davet → veli şifre belirleme)
- Veli dashboard: çocuk(lar) seçici, başarı/devamsızlık/ödeme kartları
- Yoklama UI: öğretmen panelinde tek tıkla mark
- `Assignment` + `AssignmentSubmission` modelleri
- Veli notification preferences

### Faz 5 — Muhasebe + Analytics _(2–3 hafta)_
- `AccountingEntry` (gelir/gider) + `TeacherPayroll`
- Recharts veya Tremor entegrasyonu
- Rol bazlı dashboard widgetları (KPI cards, trend charts, heatmap)
- PDF/Excel export
- Stripe-vari finans dashboard'u

### İleri Faz — Realtime + AI _(opsiyonel)_
- Socket.IO/Pusher gerçek realtime
- AI risk tahmini, ödeme gecikme tahmini
- WhatsApp/SMS entegrasyonu, Zoom köprüsü, QR yoklama

## 6. UI/UX Prensipleri

- **Dark-first**, premium SaaS hissiyatı (Linear, Notion, Stripe referans)
- Sol sidebar + sade topbar + global search (⌘K)
- Card-grid mantığı; `rounded-2xl`, subtle hover glow
- Framer Motion ile sayfa & modal geçişleri
- Tüm tablolar filtrelenebilir, kolon seçilebilir
- Mobile-first özellikle veli & öğrenci panelleri için

Tasarım sistemi (shadcn/ui + design tokens) **Faz 1 başında** introduce
edilecek; mevcut `pd-app`, `premium-sidebar` ve `components/ui/*` stilleri
yavaş yavaş bu sisteme migrate olacak.

## 7. Teknik Stack

- Next.js 15 (App Router) + React 18 + TypeScript
- Tailwind 3.4 → ileride shadcn/ui
- Prisma 6 + PostgreSQL (Vercel/Supabase)
- NextAuth v4 (JWT) — refresh token Faz 5+ değerlendirilecek
- Vercel Blob (storage), Resend (email)
- Recharts/Tremor (Faz 5)
- Polling realtime → Faz 1; Socket/Pusher → ileride

## 8. Değişiklik Kuralları

1. Her faz **kendi PR**'ı ile gelir; schema değişikliği varsa **kendi
   migration** dosyasıyla.
2. Her faz başında bu dokümanın "Faz X" bölümü güncellenir, "şu an" işareti
   bir sonrakine taşınır.
3. Yeni bir alt-modül eklendiğinde **Erişim Matrisi (§2)** ve **Veri
   Mimarisi (§4)** güncellenir.
4. RBAC kararları `lib/panel-access.ts` ve middleware tek kaynak; UI bunları
   tüketir, paralel mantık tanımlamaz.

## 9. Açık Sorular

- [ ] Veli ↔ Öğrenci her zaman many-to-many mi kalacak yoksa default 1:1
      sıkılaştırılacak mı? (Şu an many-to-many olarak modellendi.)
- [ ] Sınıf bazlı grup dersleri için `Lesson.classroomId` kolonu Faz 2'de mi
      eklenecek, yoksa ayrı `ClassroomSession` modeli mi olacak?
- [ ] InboxMessage `Notification` modelini tamamen değiştirecek mi yoksa
      yanında mı yaşayacak? (Önerim: yanında başlat, Faz 5 sonunda
      `Notification` deprecate edilir.)
- [ ] Muhasebe için Türkiye'ye özgü KDV/stopaj alanları gerek var mı?
