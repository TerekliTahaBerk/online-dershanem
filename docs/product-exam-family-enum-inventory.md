# Product/ExamFamily legacy enum inventory

Bu envanter 0103 refactor'ü başlamadan önce alınan kaynak taramasının anlık görüntüsüdür. Migration geçmişi ve `node_modules` hariç `ProductCode|CommerceProduct|CurriculumExam|OdkExamFamily` eşleşmeleri: **44 dosya / 145 kullanım yeri**.

| Dosya | Satır | Kullanım şekli |
|---|---:|---|
| lib/analytics/server.ts | 3 | Prisma enum tip importu |
| lib/analytics/server.ts | 322 | tip imzası / sorgu filtresi |
| lib/analytics/server.ts | 387 | tip imzası / sorgu filtresi |
| lib/analytics/filters.ts | 1 | Prisma enum tip importu |
| lib/analytics/filters.ts | 13 | tip imzası / sorgu filtresi |
| lib/analytics/filters.ts | 86 | tip imzası / sorgu filtresi |
| docs/enum-inventory.md | 8 | mimari dokümantasyon |
| docs/enum-inventory.md | 9 | mimari dokümantasyon |
| docs/adr/0002-product-code-commerce-product-neden-ayri.md | 5 | mimari dokümantasyon |
| docs/adr/0002-product-code-commerce-product-neden-ayri.md | 7 | mimari dokümantasyon |
| docs/adr/0003-curriculum-exam-odk-exam-family-neden-ayri.md | 1 | mimari dokümantasyon |
| docs/adr/0003-curriculum-exam-odk-exam-family-neden-ayri.md | 5 | mimari dokümantasyon |
| lib/mock-exams.ts | 1 | Prisma enum tip importu |
| lib/mock-exams.ts | 5 | exhaustive mapping / switch eşdeğeri |
| lib/mock-exams.ts | 37 | tip imzası / sorgu filtresi |
| lib/mock-exams.ts | 41 | tip imzası / sorgu filtresi |
| lib/mock-exams.ts | 60 | tip imzası / sorgu filtresi |
| components/odk/admin-exam-create.tsx | 5 | Prisma enum tip importu |
| components/odk/admin-exam-create.tsx | 12 | istemci bileşeni tipi / state / cast |
| components/odk/admin-exam-create.tsx | 43 | istemci bileşeni tipi / state / cast |
| components/odk/admin-exam-create.tsx | 67 | istemci bileşeni tipi / state / cast |
| components/odk/admin-exam-create.tsx | 168 | istemci bileşeni tipi / state / cast |
| lib/curriculum/catalog-cache.ts | 3 | Prisma enum tip importu |
| lib/curriculum/catalog-cache.ts | 30 | tip imzası / sorgu filtresi |
| lib/curriculum/catalog-cache.ts | 75 | tip imzası / sorgu filtresi |
| prisma/schema/auth.prisma | 24 | legacy model alanı / şema açıklaması |
| prisma/schema/auth.prisma | 27 | legacy model alanı / şema açıklaması |
| prisma/schema/system.prisma | 270 | legacy model alanı / şema açıklaması |
| prisma/schema/business.prisma | 183 | legacy model alanı / şema açıklaması |
| prisma/schema/business.prisma | 811 | legacy model alanı / şema açıklaması |
| prisma/schema/odk.prisma | 1 | enum tanımı |
| prisma/schema/odk.prisma | 287 | legacy model alanı / şema açıklaması |
| prisma/schema/odk.prisma | 418 | legacy model alanı / şema açıklaması |
| prisma/schema/odk.prisma | 440 | legacy model alanı / şema açıklaması |
| prisma/schema/commerce.prisma | 95 | enum tanımı |
| prisma/schema/commerce.prisma | 335 | legacy model alanı / şema açıklaması |
| lib/odk/exam-domain.ts | 1 | Prisma enum tip importu |
| lib/odk/exam-domain.ts | 7 | tip imzası / sorgu filtresi |
| lib/commerce/product-mapping.ts | 1 | Prisma enum tip importu |
| lib/commerce/product-mapping.ts | 11 | exhaustive mapping / switch eşdeğeri |
| lib/commerce/product-mapping.ts | 17 | exhaustive mapping / switch eşdeğeri |
| lib/commerce/product-mapping.ts | 31 | exhaustive mapping / switch eşdeğeri |
| lib/commerce/product-mapping.ts | 38 | tip imzası / sorgu filtresi |
| lib/commerce/product-mapping.ts | 44 | exhaustive mapping / switch eşdeğeri |
| lib/commerce/product-mapping.ts | 56 | exhaustive mapping / switch eşdeğeri |
| prisma/schema/education.prisma | 632 | legacy model alanı / şema açıklaması |
| prisma/schema/base.prisma | 26 | enum tanımı |
| prisma/schema/base.prisma | 35 | enum tanımı |
| lib/panel/student-home-actions.ts | 1 | Prisma enum tip importu |
| lib/panel/student-home-actions.ts | 13 | tip imzası / sorgu filtresi |
| lib/panel/student-home-actions.ts | 84 | tip imzası / sorgu filtresi |
| lib/panel/navigation.ts | 18 | Prisma enum tip importu |
| lib/panel/navigation.ts | 54 | tip imzası / sorgu filtresi |
| lib/panel/navigation.ts | 105 | tip imzası / sorgu filtresi |
| lib/panel/navigation.ts | 255 | tip imzası / sorgu filtresi |
| lib/panel/navigation.ts | 281 | tip imzası / sorgu filtresi |
| lib/panel/navigation.ts | 380 | tip imzası / sorgu filtresi |
| lib/panel/student-360.ts | 1 | Prisma enum tip importu |
| lib/panel/student-360.ts | 323 | tip imzası / sorgu filtresi |
| lib/panel/student-360.ts | 382 | tip imzası / sorgu filtresi |
| lib/panel/navigation.test.ts | 3 | regresyon testi tipi / fixture |
| lib/panel/navigation.test.ts | 16 | regresyon testi tipi / fixture |
| lib/panel/navigation.test.ts | 18 | regresyon testi tipi / fixture |
| lib/panel/navigation.test.ts | 22 | regresyon testi tipi / fixture |
| lib/panel/parent-scope.ts | 4 | Prisma enum tip importu |
| lib/panel/parent-scope.ts | 30 | tip imzası / sorgu filtresi |
| app/panel/odk/yonetim/sinavlar/page.tsx | 2 | Prisma enum tip importu |
| app/panel/odk/yonetim/sinavlar/page.tsx | 13 | sayfa filtresi / sorgu cast'i |
| app/panel/odk/yonetim/sinavlar/page.tsx | 37 | sayfa filtresi / sorgu cast'i |
| app/panel/odk/yonetim/sinavlar/page.tsx | 38 | sayfa filtresi / sorgu cast'i |
| lib/panel/student-360/dto.ts | 2 | Prisma enum tip importu |
| lib/panel/student-360/dto.ts | 31 | tip imzası / sorgu filtresi |
| lib/panel/student-360/dto.ts | 160 | tip imzası / sorgu filtresi |
| lib/panel/student-home-data.ts | 1 | Prisma enum tip importu |
| lib/panel/student-home-data.ts | 109 | tip imzası / sorgu filtresi |
| lib/odk/exam-templates.ts | 6 | Prisma enum tip importu |
| lib/odk/exam-templates.ts | 17 | tip imzası / sorgu filtresi |
| lib/odk/exam-templates.ts | 111 | tip imzası / sorgu filtresi |
| components/panel/mock-exam-workspace.tsx | 5 | istemci bileşeni tipi / state / cast |
| components/panel/mock-exam-workspace.tsx | 35 | istemci bileşeni tipi / state / cast |
| components/panel/mock-exam-workspace.tsx | 54 | istemci bileşeni tipi / state / cast |
| components/panel/mock-exam-workspace.tsx | 87 | istemci bileşeni tipi / state / cast |
| components/panel/mock-exam-workspace.tsx | 152 | istemci bileşeni tipi / state / cast |
| components/panel/mock-exam-workspace.tsx | 346 | istemci bileşeni tipi / state / cast |
| components/panel/panel-mobile-nav.tsx | 6 | Prisma enum tip importu |
| components/panel/panel-mobile-nav.tsx | 38 | istemci bileşeni tipi / state / cast |
| lib/student-success/types.ts | 8 | Prisma enum tip importu |
| lib/student-success/types.ts | 10 | exhaustive mapping / switch eşdeğeri |
| lib/student-success/types.ts | 27 | tip imzası / sorgu filtresi |
| lib/student-success/types.ts | 52 | tip imzası / sorgu filtresi |
| lib/student-success/types.ts | 70 | tip imzası / sorgu filtresi |
| lib/student-success/types.ts | 119 | tip imzası / sorgu filtresi |
| lib/student-success/types.ts | 141 | tip imzası / sorgu filtresi |
| lib/student-success/entitlements.ts | 5 | Prisma enum tip importu |
| lib/student-success/entitlements.ts | 7 | tip imzası / sorgu filtresi |
| lib/student-success/entitlements.ts | 11 | tip imzası / sorgu filtresi |
| lib/student-success/entitlements.ts | 15 | tip imzası / sorgu filtresi |
| lib/student-success/entitlements.ts | 19 | tip imzası / sorgu filtresi |
| lib/student-success/entitlements.ts | 23 | tip imzası / sorgu filtresi |
| lib/student-success/entitlements.ts | 27 | tip imzası / sorgu filtresi |
| lib/student-success/entitlements.ts | 32 | tip imzası / sorgu filtresi |
| lib/student-success/entitlements.ts | 35 | tip imzası / sorgu filtresi |
| lib/student-success/entitlements.ts | 38 | tip imzası / sorgu filtresi |
| lib/student-success/entitlements.ts | 40 | tip imzası / sorgu filtresi |
| lib/student-success/server/calendar-server.ts | 3 | Prisma enum tip importu |
| lib/student-success/server/calendar-server.ts | 17 | tip imzası / sorgu filtresi |
| lib/student-success/server/consumers/evidence-recorder.ts | 3 | Prisma enum tip importu |
| lib/student-success/server/consumers/evidence-recorder.ts | 7 | tip imzası / sorgu filtresi |
| lib/student-success/server/consumers/evidence-recorder.ts | 8 | exhaustive mapping / switch eşdeğeri |
| components/panel/panel-shell.tsx | 4 | Prisma enum tip importu |
| components/panel/panel-shell.tsx | 61 | istemci bileşeni tipi / state / cast |
| components/panel/admin-product-access-form.tsx | 5 | Prisma enum tip importu |
| components/panel/admin-product-access-form.tsx | 16 | istemci bileşeni tipi / state / cast |
| components/panel/admin-product-access-form.tsx | 20 | istemci bileşeni tipi / state / cast |
| components/panel/admin-product-access-form.tsx | 52 | istemci bileşeni tipi / state / cast |
| lib/student-success/server/progress-server.ts | 3 | Prisma enum tip importu |
| lib/student-success/server/progress-server.ts | 203 | exhaustive mapping / switch eşdeğeri |
| lib/student-success/server/event-processor.ts | 3 | Prisma enum tip importu |
| lib/student-success/server/event-processor.ts | 204 | tip imzası / sorgu filtresi |
| components/panel/panel-nav.tsx | 5 | Prisma enum tip importu |
| components/panel/panel-nav.tsx | 25 | istemci bileşeni tipi / state / cast |
| components/panel/create-user-form.tsx | 6 | Prisma enum tip importu |
| components/panel/create-user-form.tsx | 48 | istemci bileşeni tipi / state / cast |
| components/panel/create-user-form.tsx | 366 | istemci bileşeni tipi / state / cast |
| lib/auth/api-guards.ts | 4 | Prisma enum tip importu |
| lib/auth/api-guards.ts | 130 | tip imzası / sorgu filtresi |
| lib/auth/api-guards.ts | 151 | tip imzası / sorgu filtresi |
| lib/auth/roles.ts | 1 | Prisma enum tip importu |
| lib/auth/roles.ts | 68 | exhaustive mapping / switch eşdeğeri |
| lib/auth/roles.ts | 72 | tip imzası / sorgu filtresi |
| lib/auth/roles.ts | 73 | exhaustive mapping / switch eşdeğeri |
| lib/auth/roles.ts | 81 | exhaustive mapping / switch eşdeğeri |
| lib/auth/roles.ts | 87 | tip imzası / sorgu filtresi |
| lib/auth/product-entitlement-matrix.test.ts | 3 | regresyon testi tipi / fixture |
| lib/auth/product-entitlement-matrix.test.ts | 9 | regresyon testi tipi / fixture |
| lib/auth/product-entitlement-matrix.test.ts | 10 | regresyon testi tipi / fixture |
| lib/auth/products.ts | 3 | Prisma enum tip importu |
| lib/auth/products.ts | 8 | tip imzası / sorgu filtresi |
| lib/auth/products.ts | 10 | tip imzası / sorgu filtresi |
| lib/auth/products.ts | 28 | tip imzası / sorgu filtresi |
| lib/auth/guards.ts | 4 | Prisma enum tip importu |
| lib/auth/guards.ts | 96 | tip imzası / sorgu filtresi |
| lib/auth/guards.ts | 134 | tip imzası / sorgu filtresi |
| lib/auth/product-entitlements.ts | 1 | Prisma enum tip importu |
| lib/auth/product-entitlements.ts | 3 | tip imzası / sorgu filtresi |

## Enum adını taşımayan kapalı listeler

Aşağıdaki noktalar enum adını doğrudan içermediği için ana regex sayısına dahil değildir, fakat sonraki geçiş turunda ayrıca ele alınmalıdır.

| Dosya | Kullanım şekli |
|---|---|
| `lib/analytics/filters.ts` | Ürün ve sınav `Set` allowlist'leri |
| `lib/odk/admin-schemas.ts` | ODK Zod aile validasyonu |
| `lib/odk/answer-key-import.ts` | ODK cevap anahtarı aile validasyonu |
| `lib/odk/product-contract.ts` | ODK ürün sözleşmesi aile validasyonu |
| `lib/panel-events.ts` | Analitik olay sınav tipi validasyonu |
| `app/api/panel/analytics/export/route.ts` | Export ürün/sınav Zod allowlist'i |
| `app/api/panel/curriculum/versions/route.ts` | Müfredat sınav Zod allowlist'i |
| `app/api/panel/mock-exams/route.ts` | Deneme sınav Zod allowlist'i |
| `app/api/panel/users/route.ts` | Kullanıcı ürün Zod allowlist'i |
| `app/api/panel/users/[id]/products/route.ts` | Ürün güncelleme Zod allowlist'i ve döngüsü |
| `components/panel/create-user-form.tsx` | Kullanıcı ürün checkbox listesi |
| `components/panel/admin-product-access-form.tsx` | Ürün erişim checkbox listesi |
| `app/panel/yonetim/kullanicilar/[id]/page.tsx` | Yönetim ürün allowlist'i |
| `app/panel/yonetim/ogrenciler/page.tsx` | Öğrenci ürün filtre allowlist'i |
| `components/panel/student-adaptive-plan/PreferenceFields.tsx` | Sınav hedefi dropdown listesi |

## Bu turdaki pilot geçiş

- `app/panel/odk/yonetim/sinavlar/page.tsx`: ODK filtre ailesi registry'den okunuyor.
- `components/odk/admin-exam-create.tsx`: sınav ve seri oluşturma dropdown'ları sunucudan gelen registry ailesini kullanıyor.
- `app/panel/yonetim/kazanimlar/page.tsx`: legacy curriculum aileleri registry'den okunuyor.
- `components/panel/curriculum-manager.tsx`: müfredat dropdown'u registry verisini kullanıyor.

Kalan bütün ana tablo satırları ve ek kapalı listeler sonraki temizlik turunun kapsamındadır. Ödeme, auth, provisioning ve öğrenciye açık ürün listeleri bu pilotta özellikle değiştirilmemiştir.

