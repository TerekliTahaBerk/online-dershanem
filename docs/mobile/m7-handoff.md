# M7 devir notu — Öğretmen ve koç (personel) deneyimi

M6 tamamlandı (yerel doğrulama; gerçek cihaz yok). **M7'ye başlanmadı.**

## 1. Yeniden kullanılabilir mobil temeller

| Temel | Yer | M7 kullanımı |
| --- | --- | --- |
| Ekran primitives | `mobile/src/design/primitives/*` (`Screen`, `PageHeader`, `Section`, `Row`, `StatusBadge`, `SegmentedTabs`, `BottomSheet`, `Banner`, `EmptyState`, `ErrorState`, `Skeleton`) | Personel ekranları |
| Sorgu durumu → ekran durumu | `features/shared/workspace-data.tsx#QueryView` | Aynen |
| Bağlam sağlayıcı deseni | `features/parent/parent-context.tsx` | Öğretmen "öğrenci / grup bağlamı" için örnek: seçim yalnız bellekte, sunucu her istekte yeniden çözer, `NOT_FOUND` → seçimi bırak + önbelleği sil |
| Kimlik eşleşme koruması | `features/parent/parent-shared.tsx#ParentQueryView` | Seçili öğrenci / grup kimliği yanıtla eşleşmezse çizme |
| Ortak JSON kapısı | `lib/panel/parent-api.ts` | Personel için eşdeğeri `lib/panel/teacher-scope.ts` + `requireApiStaff…` üzerine kurulmalı |
| Menü kimliği → native ekran | `navigation/native-screens.ts` | TEACHER / ADMIN bugün `placeholder` (M7 / WEB) |

## 2. Rol ve kapı durumu

- **TEACHER / ADMIN:** mobilde yalnız bilgi ana sayfası (`StaffHomeScreen`) ve hesap var. Sekmeler öğrenci veya veli ekranına düşmez.
- **Personel ürün izinleri:** `effectiveStaffPermissions` ve `STAFF_PRODUCT_ASSIGNMENTS` modu (shadow / enforce). Bootstrap `capabilities.staffPermissions` döndürüyor. Üretimdeki modun netleşmesi M7 ön koşuludur (roadmap).
- **MFA:** ayrıcalıklı personel için MFA zorunlu (`userRequiresMfa`). Mobil MFA kapısı M1'de var; adım-yükseltme (`STEP_UP_REQUIRED`) gerektiren mutasyonlar M7'de ele alınmalı.
- **Push:** M5 dağıtıcısı yalnız STUDENT / PARENT'a gönderir. Personel push'u ayrı onay ister: kategori listesi, yük gizliliği, iş saatleri.

## 3. Öğrenci bağlamı (personel)

- **Kapsam kaynağı:** `teacherGroupIds` (grup öğretmeni) ve `coachAssignment` (koç). Her uç, öğrenciyi bu kapsamda çözmeli.
- **Kimlik:** `StudentProfile.id` ile `User.id` ayrımı M6'daki gibi sunucuda korunmalı (ODK raporu `User.id` bekler).
- **Görünürlük:** öğretmen projeksiyonları `audience: "teacher"` / `teacherReports` haklarıyla ayrıdır. Veli projeksiyonu (`parent_calm`) asla personel için kullanılmamalı. Tersi de geçerli.

## 4. Ders ve koçluk iş akışları (M7 kapsamı adayları)

| İş akışı | Durum |
| --- | --- |
| Ders kapatma / yoklama | Web uçları ve `quickLessonClose` bayrağı mevcut |
| Ödev oluşturma / değerlendirme | Web uçları mevcut |
| Koç görüşmesi | `POST /api/panel/coaching-sessions/[id]` — SAVE / COMPLETE (öğretmen), REQUEST (öğrenci / veli), ACCEPT (öğrenci) |
| Koç notları | Görünürlük `INTERNAL` / `STUDENT_VISIBLE` / `PARENT_VISIBLE`. M6 veli projeksiyonu yalnız `PARENT_VISIBLE` okur; personel ekranları görünürlüğü açıkça göstermeli |
| Plan onayı | `WeeklyPlan` DRAFT → APPROVED. Veli yalnız APPROVED + OK görür (M6) |

## 5. M6'dan açık kalanlar

- **P-1 BLOCKED:** haftalık özet geri bildirimi yalnız OD üyeliği olan velilere açık (`requireApiOdRole`). Yalnız OK / ODK velisi için ürün / güvenlik kararı.
- **P-2:** veli koçluk saat değişikliği talebi mobilde yok (web devam yolu).
- **P-3:** veli koçluk katılım bağlantısı mobilde yok.
- **P-4:** `loadParentCalmHome` plan yüzdesi taslak planı sayabilir. Öneri: `status: "APPROVED"` süzgeci (web + mobil aynı yükleyici; küçük değişiklik, ayrı onay).
- **Paket görüşmesi talebi:** server action; mobil sözleşmesi yok.
- **Kalıcı testler** (talimatla yazılmadı; önerilir):
  - Entegrasyon: `requireParentChild` matrisi (bağlı değil / bitmiş / akademik kapalı / KPSS / başka aile), ODK rapor kimlik dönüşümü, koçluk ürün süzgeci, özel ders notu dışlama.
  - Mobil Jest: `ParentContextProvider` (varsayılan seçim, yetki düşmesi, çocuk değişiminde önbellek silme), `ParentQueryView` kimlik koruması, push çocuk çözümü (`parentStudentIdFromHref`, belirsiz → bildirim kutusu).
- **Gerçek cihaz:** [m6-iphone-smoke-checklist.md](./m6-iphone-smoke-checklist.md).
- **Önceden var olanlar:**
  - M4 `correctOption` web politikası (BLOCKED).
  - `public-marketing-products` birim testi.
  - Tarihe bağlı `adaptive-plan-product-policy` entegrasyon testleri (M5 tabanında da başarısız).
  - E2E sıra kirlilikleri.

## 6. Değişmeyen kurallar

- Personel push'u yok (M7'de ayrı karar).
- Ödeme / satın alma mobilde yok (MD-09).
- Yeni veritabanı, WebSocket veya ücretli servis yok.
