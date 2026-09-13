# Admin Panel Preview (View As)

Yöneticilerin kendi oturumlarından çıkmadan Öğrenci, Veli ve Öğretmen panellerini
görüntülemesini sağlayan **sunum katmanı**dır. Klasik impersonation değildir.

## Actor vs Subject

| Kavram | Anlamı |
|---|---|
| **Actor** | Gerçek kimlik. `getSession().role === "ADMIN"` her request'te korunur. |
| **Subject** | Paneli görüntülenen kullanıcı (`STUDENT` / `PARENT` / `TEACHER`). |

```ts
type PanelActorContext = {
  actor: SessionUser; // ADMIN
  preview?: { role: PreviewableRole; userId: string };
};
```

Authorization kararlarında actor ile subject karıştırılmaz:

- **Route girişi:** `requirePanelRole("STUDENT")` vb. ADMIN + geçerli preview
  varsa subject kimliğini döndürür (sayfa sorguları subject `userId` kullanır).
- **Gerçek oturum:** `getSession()` hâlâ ADMIN döner.
- **Mutation:** preview açıkken varsayılan olarak engellenir; actor her zaman admin'dir.

## Authorization yaklaşımı

1. Preview cookie (`od_panel_preview`) HMAC imzalıdır; payload'a güvenilmez.
2. Her request'te `resolvePreviewSubject` DB'den rol, status ve ilişki doğrular.
3. Cookie'deki `startedByAdminId` oturumdaki admin ile eşleşmelidir.
4. URL'den gelen userId ile erişim alınamaz; yalnız imzalı cookie + sunucu doğrulaması.
5. Non-admin preview başlatamaz (`admin:preview_panel` / `canUseAdminPanelPreview`).
6. Veri scope'u subject üzerinden akar:
   - Öğrenci: kendi entitlements / plan / ders
   - Veli: `resolveParentScope(parentUserId, …)`
   - Öğretmen: `teacherId` / grup scope helper'ları

Admin'in geniş scope'u teacher/student UI'ına sızdırılmaz.

## Read-only davranış

İlk sürümde preview **salt okunur**:

- `guardMutation` / `enforceMutation` preview açıkken `ADMIN_PREVIEW_READONLY` döner.
- Bildirim okundu, tercih değişimi, Dino ask, ödev/plan/check-in vb. engellenir.
- Offline write kapatılır.
- UI banner: "Yönetici önizlemesinde işlem yapılamaz."

Kontrollü "Yönetici işlemi" modu bilinçli olarak eklenmedi. Gerekirse:

```ts
actorUserId = admin.id
subjectUserId = student.id
source = "ADMIN_PREVIEW"
allowAdminPreviewWrite: true
```

şeklinde ayrı ve açık bir akış tasarlanmalıdır. Audit asla "öğrenci yaptı" dememelidir.

## Audit

| Event | Ne zaman |
|---|---|
| `ADMIN_PREVIEW_STARTED` | Preview cookie yazıldığında |
| `ADMIN_PREVIEW_ENDED` | Önizlemeden çıkıldığında |
| `ADMIN_PREVIEW_MUTATION_BLOCKED` | Preview içinde mutation denendiğinde |

Payload: admin id, subject id, preview role, notices, returnPath.

## Analytics

Gerçek kullanıcı metrikleri kirletilmez.

- Client `/api/panel/events` preview sırasında `admin_preview_page_viewed` yazar.
- `recordPanelProductEvent` preview aktifken student/teacher/parent event adlarını
  `admin_preview_page_viewed` olarak yeniden yazar.

## Cache / session güvenliği

- Preview cookie: `httpOnly`, `sameSite=lax`, TTL 2 saat, HMAC (`NEXTAUTH_SECRET`).
- `PanelShell` preview varken `unstable_noStore()` çağırır.
- Preview response'ları `Cache-Control: no-store` (API).
- Cache key'lerinde subject `userId` kullanılmalıdır; admin id ile subject verisi paylaşılmaz.
- Session cookie (`od_session`) değişmez; revoke/MFA admin oturumuna bağlıdır.

## Student / Parent / Teacher farkları

### Öğrenci
- Nav ve ürünler subject `productMembership` üzerinden.
- Admin ürünleri menüye sızmaz.
- Arşiv / davet bekleyen hesaplar banner notice ile açılabilir.

### Veli
- `resolveParentScope` ile çocuk seçimi; URL `studentId` yalnız bağlı çocuklarda geçerli.
- Parent-only veri sınırı korunur (öğretmen notları, internal intervention vb. sızmaz).

### Öğretmen
- Grup / öğrenci listeleri `teacherId = subject.userId` scope'unda.
- CRM / finance / admin-only state teacher UI'da gösterilmez.

## UI giriş noktaları

- Admin topbar: **Paneli Görüntüle**
- Yönetim ana sayfa: picker (+ `?onizleme=1` ile otomatik açılış)
- Student 360: **Öğrenci Panelini Gör**
- Kişi detayı: role göre **Öğrenci / Veli / Öğretmen Panelini Gör**
- Banner: **Öğrenciyi/Veliyi/Öğretmeni Değiştir**, **Önizlemeden Çık**

## Support rolüne genişleme

Bugün `canUseAdminPanelPreview` yalnız `ADMIN` döner; sabit permission adı:

```ts
ADMIN_PREVIEW_PERMISSION = "admin:preview_panel"
```

Support eklendiğinde:

1. Permission matrix'e `admin:preview_panel` ekle.
2. `canUseAdminPanelPreview` içinde role hardcode yerine matrix kontrolü yap.
3. Audit actor tipi / step-up kurallarını Support için gözden geçir.
4. Mutation engeli aynı kalmalı (actor ≠ subject).

## Admin öğretmen çalışma modu (ayrı özellik)

View As **değildir**. Her ADMIN kullanıcısının bir `TeacherProfile`'ı vardır;
yönetici **kendi** öğretmen paneline geçebilir ve **yazabilir**.

| | View As (önizleme) | Öğretmen çalışma modu |
|---|---|---|
| Kimlik | Başka kullanıcı (subject) | Aynı admin userId |
| Yazma | Hayır | Evet |
| Amaç | "Ne görüyor?" | Operasyonel öğretmen işi |
| Ters yön | — | Öğretmenin admin hesabı yok |

- Cookie: `od_admin_teacher_mode`
- API: `POST/DELETE /api/panel/admin-preview` değil → `/api/panel/admin-teacher-mode`
- UI: **Öğretmen paneline geç** / **Yönetim paneline dön**
- Yeni ADMIN hesabı açılırken `TeacherProfile` otomatik oluşturulur
- Eksik profiller `ensureAdminTeacherProfile` / `backfillAdminTeacherProfiles` ile tamamlanır
- View As ile karşılıklı dışlanır (biri açılınca diğeri cookie silinir)

Detay: bu dosya + `lib/auth/admin-teacher-mode.ts`.

## Dosyalar

| Dosya | Sorumluluk |
|---|---|
| `lib/panel/preview-context.ts` | Tipler, copy, permission adı |
| `lib/panel/preview-resolution.ts` | Subject DB doğrulama + arama |
| `lib/auth/admin-preview-core.ts` | Cookie imza, effective identity |
| `lib/auth/admin-preview.ts` | Start/end, resolved preview |
| `lib/auth/guards.ts` / `api-guards.ts` | Preview overlay |
| `lib/security/mutation-guard.ts` | Read-only engeli |
| `components/panel/admin-preview-*.tsx` | Banner, picker, deep-link |
| `app/api/panel/admin-preview/**` | Start/end/search API |

## Test checklist

- [x] Unit: cookie imza, permission, banner copy, actor/subject ayrımı
- [ ] Manuel: student/parent/teacher preview navigasyon + ürün menüsü
- [ ] Manuel: unrelated student isolation (teacher/parent)
- [ ] Manuel: mutation butonları 403 / banner mesajı
- [ ] Manuel: notification mark-read side-effect yok
- [ ] Manuel: analytics student event yazmıyor
- [ ] Manuel: non-admin / role mismatch / tampered cookie
