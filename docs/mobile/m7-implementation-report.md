# M7 uygulama raporu — Native öğretmen ve koç deneyimi

Tarih: 2026-10-10. Dal: `claude/loving-goodall-972n6c` (main'e birleştirilmedi, dağıtılmadı).

**Durum: uygulandı ve yerel olarak doğrulandı; gerçek cihaz / staging doğrulaması YOK.** Kalıcı M7 testi kullanıcı talimatıyla yazılmadı.

## Commit'ler

- Sunucu: personel okuma uçları, sözleşmeler, ortak yükleyiciler.
- Mobil: öğretmen / koç / Deneme Ligi ekranları, navigasyon.
- Belgeler.

## Adımlar

| Adım | Durum | Özet |
| --- | --- | --- |
| M7.0 İzin denetimi | COMPLETE | [m7-staff-permission-review.md](./m7-staff-permission-review.md): 9 bulgu; mod değiştirilmedi |
| M7.1 Kabuk ve çalışma alanları | COMPLETE | Bugün + Menü; çalışma alanına göre Bugün; ADMIN ve çalışma alanı olmayan öğretmen bilgi ekranı; menü bölümleri; detay rotaları + `StaffRouteGate` |
| M7.2 Sözleşmeler ve okuma modelleri | COMPLETE | `lib/mobile-contracts/staff.ts`; 15 GET ucu; web sayfaları aynı yükleyicileri kullanır |
| M7.3 Öğretmen Bugün, dersler, ders kapanışı | COMPLETE | `expectedVersion` + sabit `idempotencyKey`; 409 → yeniden yükle + bilinçli tekrar; ödev taslağı web |
| M7.4 Teslim değerlendirme + yardım | COMPLETE | Rubric tam; 409 / 404 ele alınır; yardım yanıtı izinli eylemlerle |
| M7.5 Koç Bugün + öğrenciler | COMPLETE | Mevcut dikkat nedenleri; öğrenci bağlamı yalnız bellekte |
| M7.6 Görüşmeler + notlar | COMPLETE | CREATE / SAVE / COMPLETE; not görünürlüğü açık, varsayılan INTERNAL |
| M7.7 Planlar | COMPLETE | Görev taşıma (plan haftası), öneri inceleme, plan onayı (mevcut uç) |
| M7.8 Deneme Ligi raporları | COMPLETE | Salt okunur `odk:report:read_related`; yönetim yok |
| M7.9 Doğrulama, belgeler, devir | COMPLETE (yerel) | [m7-validation-results.md](./m7-validation-results.md); gerçek cihaz NOT VERIFIED |

## Bilinçli sınırlar

- ADMIN mobilde yalnız web.
- Personel push'u yok.
- Çevrimdışı kuyruk yok.
- Mobilde olmayanlar (web devamı): ödev oluşturma / düzenleme, ders ödev taslağı, öğrenci listesi, materyaller, tekrar / telafi, müdahale kutusu, haftalık özetler, AI yardımcı.
- `STAFF_PRODUCT_ASSIGNMENTS` modu değiştirilmedi; enforce'a geçilmedi.

## Değişen web dosyaları

- `app/panel/ogretmen/ders/[id]/page.tsx` → `lib/panel/teacher-lesson-server.ts`
- `app/panel/ogretmen/yardim/page.tsx` → `lib/panel/teacher-help-server.ts`
- `app/panel/ogretmen/odevler/page.tsx` → `lib/panel/teacher-assignments-server.ts`
- `app/panel/ogretmen/yon/coach-workspace-data.ts` → `lib/kocum/coach-workspace-server.ts` (yeniden dışa aktarım)

## Açık konular (değiştirilmedi)

- M5 push üretime hazır değil.
- M6 P-1..P-4.
- M4 `correctOption` BLOCKED.
- S-1..S-9 (izin incelemesi).
- Önceden var olan birim / entegrasyon / E2E hataları ([m7-validation-results.md](./m7-validation-results.md)).

Belgeler: [m7-api-contracts.md](./m7-api-contracts.md), [m7-screen-migration.md](./m7-screen-migration.md), [m7-security-review.md](./m7-security-review.md), [m7-mutation-safety.md](./m7-mutation-safety.md), [m7-iphone-smoke-checklist.md](./m7-iphone-smoke-checklist.md), [m8-handoff.md](./m8-handoff.md).
