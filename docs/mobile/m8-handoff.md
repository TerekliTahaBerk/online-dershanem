# M8 devir notu — İleri mobil yetenekler

M7 tamamlandı (yerel doğrulama; gerçek cihaz yok). **M8'e başlanmadı.**

## 1. M7'den gelen temeller

| Temel | Yer | M8 kullanımı |
| --- | --- | --- |
| Personel sorgu / geçersiz kılma | `mobile/src/features/staff/shared.tsx` (`useStaffQuery`, `useInvalidateStaff`) | Personel önbelleğinin kalıcılaştırılması kararı (MD-13) |
| Sabit tekrar anahtarı | `useStableKey` | `offline-outbox` uyumlu `LESSON_CLOSE` kuyruğu için temel; kuyruk M8 kararıdır |
| Yazma hata eşlemesi | `writeError`, `WriteBanner` | 409 / 428 / ağ durumları |
| Tarih seçici | `DateTimeField` (`@react-native-community/datetimepicker`) | Takvim / hatırlatıcı |
| Derin bağlantı izin listesi | `navigation/route-map.ts` | Universal / App Links (MD-14) |

## 2. Ön koşullar ve açık kararlar

- **BLOCKED:** Üretim `STAFF_PRODUCT_ASSIGNMENTS` modu. Enforce öncesi OD yazma uçlarına `od:lesson:teach` (S-1).
- **Ürün kararı:** S-3 yardım kutusunun ürünü (Yön menüsü / OD yanıt).
- **Küçük düzeltmeler (ayrı onay):**
  - S-4 koç çalışma alanı plan ürün süzgeci;
  - S-5 web INTERNAL not süzgeci;
  - S-6 web teslim kuyruğu aktif kayıt;
  - S-7 PLAN_APPROVAL kaynağı.
- **Personel push'u:** kategori listesi, yük gizliliği, iş saatleri ve dağıtıcının TEACHER'a genişletilmesi ayrı onay ister.
- **Step-up mobilde:** bugün kullanılan uçlar step-up istemiyor. Gelecekte isteyen bir uç olursa mobil web devamı gösterir. Native step-up ayrı tasarım ister.

## 3. Önerilen kalıcı testler (talimatla yazılmadı)

- **Entegrasyon:**
  - `requireStaffApi` matrisi (ADMIN 403, rol / ürün / izin);
  - koç kapsamı (bitmiş atama, başka koç);
  - ders kapanış sürümü + tekrar;
  - `privateNote` / INTERNAL dışlama.
- **Mobil Jest:**
  - TEACHER eşlemesi (çalışma alanına göre);
  - `staffHref` menü kontrolü + web yedeği;
  - `useStableKey` belirsiz sonuçta anahtar koruma;
  - `StaffRouteGate`.

## 4. Açık kalanlar

- M5 push üretime hazır değil.
- M6 P-1..P-4.
- M4 `correctOption` BLOCKED.
- Önceden var olan test hataları: `public-marketing-products`, tarihe bağlı `adaptive-plan-product-policy`, `panel-experience:660`, E2E sıra kirliliği.
- Gerçek cihaz: [m7-iphone-smoke-checklist.md](./m7-iphone-smoke-checklist.md).

## 5. Değişmeyen kurallar

- ADMIN mobilde yalnız web.
- Ödeme / satın alma mobilde yok (MD-09).
- Yeni veritabanı, WebSocket veya ücretli servis yok.
- M9'a başlanmaz.
