# Cross-Product Permissions

## Roller

| Rol | Kapsam |
| --- | --- |
| ADMIN | Tüm ürünler, tüm öğrenciler |
| TEACHER | Atanmış grup/koç öğrencileri |
| PARENT | Bağlı öğrenci, parent-safe veri |
| STUDENT | Kendi verisi |

## Teacher capability

`TeacherProfile.isCoach` — koçluk yeteneği (ayrı UserRole değil).

Öğretmen OD ilişkisi olabilir, OK erişimi olmayabilir — business rule ile scope.

## Presenter katmanı

Sunucu tarafı DTO:

- `AdminStudentSummary`
- `TeacherStudentSummary` (+ learningSignals)
- `ParentStudentSummary` (internal alan yok)
- `StudentSelfSummary`

Frontend'e güvenilmez — `presentForParent()` admin alanlarını strip eder.

## API guard

- `requireApiOdRole` — OD panel
- `requireApiProductRole("OK")` — Koçum
- `requireApiProductRole("ODK")` — Deneme

Student success API'leri role + yatay erişim kontrolü yapar (`resolveStudentAccess`).

## Entitlement vs feature flag

- **Product entitlement** — öğrenci ürüne sahip mi?
- **Feature flag** — özellik sistemde açık mı?

UI: ikisi de true olmalı.

## Test matrisi

- student A → student B verisi göremez
- parent yalnız bağlı student
- teacher yalnız assigned student
- unpublished exam result parent'a sızmaz
