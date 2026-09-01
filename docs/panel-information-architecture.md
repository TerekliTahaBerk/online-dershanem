# Panel bilgi mimarisi (Part 1)

Bu not, panel navigasyonunun domain sözlüğü ve rol zihinsel modelleriyle
hizalandığı düzenlemeyi özetler. RBAC, feature flag, audit ve güvenlik
guard'ları değiştirilmedi; menü gizleme hâlâ güvenlik sınırı değildir.

## Terminoloji değişiklikleri

| Eski / çelişkili | Canonical |
| --- | --- |
| Eğitmen(ler) | Öğretmen(ler) |
| Koçluk Merkezi | Koçluk |
| Haftalık Plan / Koçluk planı | Plan (öğrenci) · Haftalık plan (öğretmen) |
| Gelişimim | Gelişim |
| Nasılım? | Check-in |
| İşler / Provisioning | Provisioning |
| Özellikler / Sistem | Özellikler |
| Dersler & Gruplar | Gruplar ve dersler |
| Ödevler (öğrenci menü) | Çalışmalar |
| Dersler → `/odevler` (öğretmen) | Dersler → `/takvim`, Çalışmalar → `/odevler` |

Route path'leri korunur (`/odevler`, `/egitmenler`, `/isler`). Etiket ile URL
bilinçli olarak ayrılabilir.

## Çözülen navigasyon sorunları

- Admin üst alanları: Bugün · Eğitim · **Öğrenci Başarısı** · Denemeler · Ticaret · Sistem
- Öğretmen: Dersler (takvim) ile Çalışmalar (ödev) karışıklığı giderildi
- Öğrenci: ürün blokları (DERSHANEM/KOÇUM) yerine zihinsel model bölümleri
- Veli: ürün yokken boş bölüm yok; Hesap altında ortak ayarlar
- Feature flag kapalıyken menü öğesi üretilmez
- Admin mobil "Operasyon" hedefi masaüstü ile hizalandı (önceden `/isler`'e gidiyordu)
- Mobil birincil aksiyon ≤ 4 kuralı korundu; flag'e bağlı yüzeyler menüye eklendi (telafi, AI yardımcı, haftalık özet)

## Geriye dönük uyumluluk

- Canonical path'ler aynı kaldı
- Alias redirect'ler (`next.config.ts`):
  - `/panel/yonetim/ogretmenler` → `/panel/yonetim/egitmenler`
  - `/panel/ogrenci/calismalar` → `/panel/ogrenci/odevler`
  - `/panel/ogretmen/calismalar` → `/panel/ogretmen/odevler`

## Mimari varsayımlar (sonraki işler)

1. **Tek kaynak:** `lib/panel/navigation.ts` + `lib/panel/domain-vocabulary.ts`
   (business `sections.ts` modeli). Yeni menü öğesi önce buraya eklenir.
2. **Etiket ≠ path:** URL slug'ları migration maliyetinden korunur; UI vocabulary
   üzerinden konuşur.
3. **Flag + ürün filtresi menüde, yetki sayfada:** `requireRole` /
   `requireProductRole` / `notFound()` guard'ları menüden bağımsız kalır.
4. **Rol zihinsel modelleri sabittir;** yeni özellik ilgili modele yerleşir
   (ör. öğretmen Koçluk / Ölçme / Kaynaklar).
5. **ODK** ayrı route ağacında kalır; menüde Denemeler bölümüne bağlanır.
6. **Öğrenci 360:** admin/öğretmen detay merkezi — bkz.
   [`docs/student-360-architecture.md`](./student-360-architecture.md).
7. **Grup 360:** admin eğitim operasyon merkezi — bkz.
   [`docs/group-360-architecture.md`](./group-360-architecture.md).
8. **Global search / command palette:** `/api/panel/admin-search` +
   `AdminCommandSearch` — bkz. [`docs/panel-global-search.md`](./panel-global-search.md).
9. **Öğretmen günlük çalışma alanı:** `/panel/ogretmen` Bugün akışı — bkz.
   [`docs/teacher-workspace.md`](./teacher-workspace.md).

## Testler

- Unit: `lib/panel/navigation.test.ts`
- E2E: `tests/e2e/panel-experience.spec.ts` (admin/öğrenci/öğretmen IA iddiaları)
