# M6 uygulama raporu — Native veli deneyimi

**Durum:** UYGULANDI + YEREL OLARAK DOĞRULANDI. Cihaz / staging doğrulaması YOK. **Üretim: NO-GO** (bkz. §6).
**Dal:** `claude/loving-goodall-972n6c`. M2–M5 de bu dalda; `main`'e birleştirilmedi.
**Kapsam dışı:** M7 / M8 / M9, ödeme / satın alma, personel mesajlaşma, yeni mutasyon, şema değişikliği.
**Test politikası:** Yeni otomatik test commit'lenmedi. M6'nın bilinçli değiştirdiği davranışa dayanan 3 eski mobil beklenti güncellendi ([m6-validation-results.md](./m6-validation-results.md) §5).

## 1. Alt fazlar

Sütunlar: **Uyg.** = uygulandı, **Yerel** = yerelde doğrulandı, **Cihaz** = cihaz veya staging'de doğrulandı.

| Faz | Durum | Uyg. | Yerel | Cihaz |
| --- | --- | --- | --- | --- |
| M6.0 Taban ve kaynak denetimi | COMPLETE | ✅ | ✅ | — |
| M6.1 Güvenli veli kapsamı ve çocuk seçici | COMPLETE (sunucu) / PARTIAL (cihaz) | ✅ | ✅ probe | ❌ |
| M6.2 Sözleşmeler ve ortak yükleyiciler | COMPLETE | ✅ | ✅ | ❌ |
| M6.3 Veli Bugün | COMPLETE | ✅ | ✅ | ❌ |
| M6.4 Dersler, ödevler, öğretmenler | COMPLETE | ✅ | ✅ | ❌ |
| M6.5 Gelişim ve Yön Koçluk | COMPLETE | ✅ | ✅ | ❌ |
| M6.6 Deneme Ligi raporu ve dış denemeler | COMPLETE | ✅ | ✅ | ❌ |
| M6.7 Haftalık özet ve geri bildirim | PARTIAL (P-1 BLOCKED: yalnız OK / ODK velisi geri bildirim veremez) | ✅ | ✅ | ❌ |
| M6.8 Hesap, navigasyon, push | COMPLETE (kod) / NOT VERIFIED (push, cihaz) | ✅ | ✅ saf yardımcılar | ❌ |
| M6.9 Doğrulama, belgeler, devir | COMPLETE | ✅ | ✅ | — |

## 2. Sunucu

**Kapı:** `lib/panel/parent-api.ts`. `requireParentChild` fonksiyonu `resolveParentScope` kuralını JSON 404 `CHILD_NOT_FOUND` ile uygular.

**Ortak yükleyiciler** (web sayfaları da kullanır):

| Dosya | Not |
| --- | --- |
| `lib/panel/parent-lessons-server.ts` | Yalnız ortak not konusu, alanlar tek tek seçilir |
| `lib/panel/parent-assignments-server.ts` | Kanonik durum |
| `lib/panel/parent-coaching-server.ts` | APPROVED + **OK süzgeci** (KPSS planı düzeltmesi), PARENT_VISIBLE notlar, salt okunur görüşmeler |
| `lib/panel/parent-digest-server.ts` | Yalnız PUBLISHED; otomatik yaklaşanlar ayrı |

**Projeksiyonlar:** `lib/mobile/parent-views.ts`. Alan izin listesi, ISO tarihler, `navId` hedefleri ve personel e-posta maskeleme burada.

**Sözleşme:** `lib/mobile-contracts/parent.ts`. Hata kataloğuna `CHILD_NOT_FOUND` eklendi.

**Uçlar** (ayrıntı [m6-api-contracts.md](./m6-api-contracts.md)):

- `/api/panel/parent/{children,home,lessons,assignments,teachers,insights,coaching,digests,external-exams,account}`
- `/api/odk/parent/report`

**Web sayfaları:** `app/panel/veli/{takvim,odevler,kocluk,haftalik}` ortak yükleyicilere taşındı. Görünüm değişmedi; koçlukta KPSS planı artık seçilmiyor.

## 3. Mobil

- **Veli bağlamı** (`mobile/src/features/parent/parent-context.tsx`):
  - seçim yalnız bellekte;
  - açık seçim yoksa ilk çocuk varsayılır;
  - erişim düşünce sessiz geçiş yok;
  - çocuk değişince önceki çocuğun önbelleği silinir.
  - `(app)/_layout.tsx` içinde PushRuntime ve Stack'i sarar; veli dışı rollerde geçirgendir.
- **Kabuk** (`parent-shared.tsx`):
  - durumlar: çocuk yok / hazırlanıyor (PREPARING) / seçim gerekli / erişim değişti;
  - "Öğrenci: Ad" satırı ve alt sayfa seçici;
  - yanıt `studentId` koruması;
  - yalnız yetkili menü hedefleri.
- **Ekranlar:** `parent-home`, `parent-lessons`, `parent-assignments` (salt okunur), `parent-teachers`, `parent-insights`, `parent-coaching`, `parent-odk-reports`, `parent-external-exams`, `parent-weekly` (geri bildirim), `parent-account`.
- **Navigasyon:**
  - `native-screens.ts` veli eşlemesi; eşlenmemiş öğe web devam yoludur;
  - `route-map.ts` veli çalışma alanı eşlemesi ve `parentStudentIdFromHref`.
- **Push** (`push-runtime.tsx`): veli hedefi için çocuk, bildirim kaydından çözülür ve güncel listeyle yeniden doğrulanır. Belirsiz ya da yetkisiz durumda bildirim kutusu açılır.

## 4. Değişen / eklenen dosyalar

**Yeni:**
- `lib/mobile-contracts/parent.ts`, `lib/mobile/parent-views.ts`
- `lib/panel/parent-{api,lessons-server,assignments-server,coaching-server,digest-server}.ts`
- 10 adet `app/api/panel/parent/*/route.ts`, `app/api/odk/parent/report/route.ts`
- `mobile/src/lib/api/parent.ts`, `mobile/src/features/parent/*` (12 dosya)
- 8 belge

**Değişen:**
- `app/panel/veli/{takvim,odevler,kocluk,haftalik}/page.tsx`
- `lib/mobile-contracts/api.ts`
- `mobile/src/{app/(app)/_layout.tsx, features/push/push-runtime.tsx, features/shell/native-screen-view.tsx, lib/api/errors.ts, lib/query/keys.ts, navigation/native-screens.ts, navigation/route-map.ts}`
- 2 mobil test dosyasında eski beklenti
- roadmap, migration-decisions (MD-22)

## 5. Kararlar

MD-22: [m6-parent-scope-security.md](./m6-parent-scope-security.md), [m6-privacy-review.md](./m6-privacy-review.md).

## 6. GO / NO-GO

| Hedef | Karar | Neden |
| --- | --- | --- |
| Staging'de iç test | **GO** | Sunucu sınırları probe ile doğrulandı, regresyon paketleri geçti |
| Üretim | **NO-GO** | Gerçek iPhone / Android testi yok, kalıcı testler yok, P-1 kararı bekliyor, M5 push üretimde kapalı, M2–M6 `main`'e birleşmedi |
