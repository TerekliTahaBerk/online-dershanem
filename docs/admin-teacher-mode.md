# Admin öğretmen çalışma modu

Yöneticilerin **aynı hesapla** öğretmen paneline geçmesini sağlar.

## Model

- `User.role` ADMIN kalır (`getSession()` değişmez).
- Her ADMIN için `TeacherProfile` vardır (hesap açılışında + lazım olunca upsert).
- Öğretmenlerin yönetici hesabı **yoktur** (tek yönlü).
- Ayrı TEACHER user yaratılmaz (e-posta çakışması / MFA kopyası yok).

## Geçiş

1. Topbar: **Öğretmen paneline geç**
2. `TeacherProfile` garanti edilir, `od_admin_teacher_mode` cookie yazılır
3. `/panel/ogretmen` açılır; guard'lar TEACHER isterken aynı `userId` ile etkili oturum döner
4. **Yönetim paneline dön** cookie'yi siler

## Yazma ve audit

- View As'tan farklı olarak mutation **açıktır**.
- Audit `actorUserId` = admin kullanıcı id'si (aynı kişi).
- Grup/ders atamaları bu admin `userId`'sine `teacherId` olarak bağlanmalıdır.

## View As ile ilişki

Birbirini dışlar. Biri başlatılınca diğerinin cookie'si silinir.

| Özellik | Bu mod | View As |
|---|---|---|
| Subject | Kendisi | Başka kullanıcı |
| Yazma | Evet | Hayır |
| Rol cookie | teacher mode | preview |

## Kod

- `lib/auth/admin-teacher-mode-core.ts` — cookie imza
- `lib/auth/admin-teacher-mode.ts` — start/end/ensure profile
- `app/api/panel/admin-teacher-mode/route.ts`
- `components/panel/admin-teacher-mode-controls.tsx`
