# Panel bilgi mimarisi (Part 1 — güncelleme)

Bu not, panel navigasyonunun domain sözlüğü ve rol zihinsel modelleriyle
hizalandığı düzenlemeyi özetler. RBAC, feature flag, audit ve güvenlik
guard'ları değiştirilmedi; menü gizleme hâlâ güvenlik sınırı değildir.

## Admin üst alanları (sade)

| Bölüm | İçerik |
| --- | --- |
| **Bugün** | Operasyon merkezi, Operasyon, Provisioning |
| **Kişiler** | Tek hub: `/panel/yonetim/kisiler` (Öğrenciler / Öğretmenler / Veliler sekmeleri) |
| **Eğitim** | Gruplar, Dersler, Takvim, Ödev, Koçluk (+ kazanımlar flag) |
| **Denemeler** | ODK planlama / canlı ops / raporlar |
| **Sistem** | Siparişler, Analitik, Özellikler, İşlem geçmişi, Operasyon raporları |

Liste → Detay → Contextual action: Kişiler → Student 360 / kişi detayı.

## Terminoloji

| Eski / çelişkili | Canonical |
| --- | --- |
| Eğitmen(ler) | Öğretmen(ler) |
| Koçluk Merkezi | Koçluk |
| Ödevler (öğrenci menü) | Çalışmalar |
| `/kullanicilar` | `/kisiler` (alias redirect) |

## Yeni domain yetenekleri

- **StudentTeacherAssignment** — branş bazlı öğrenci↔öğretmen ilişkisi (yinelenmez)
- **ParentStudent** genişletmesi — primaryContact, canViewAcademic/Payments, active
- **LessonSeries** tekrar kuralları — weekdays, süre, oluşum önizleme + çakışma
- **Arşiv etki analizi** — `/api/panel/users/[id]/archive-impact`
- Veli: `/panel/veli/ogretmenler`, `/panel/veli/odevler` (salt okunur)

## Testler

- Unit: `lib/panel/navigation.test.ts`, `lib/panel/people-ops.test.ts`
- Mevcut lifecycle / assignment / preview testleri korunur
