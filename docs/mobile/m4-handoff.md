# M4 devir notu — Deneme Ligi öğrenci deneyimi

M3, Yön Koçluk öğrenci deneyimini tamamladı. M4'e hiçbir şey başlatılmadı. Bu not M4'ün neye dayanabileceğini ve neyin Deneme Ligi'ne özel kalması gerektiğini anlatır.

## 1. Yeniden kullanılabilir temeller

| Temel | Yer | Not |
| --- | --- | --- |
| Ürün bağımsız veri katmanı | `mobile/src/features/shared/workspace-data.tsx` (`useWorkspaceQuery`, `useInvalidateWorkspace`, `WorkspaceRouteGate`, `QueryView`, `usePullToRefresh`, `useOnline`) | `WorkspaceProduct` tipi şu an `'OD' \| 'OK'`; M4 `'ODK'` ekler ve `features/odk/shared.tsx` ile ince sarmalayıcı yazar (OD/Yön ile aynı desen) |
| Sözleşmeler | `lib/mobile-contracts/{validate,student,yon}.ts` | Yeni dosya `lib/mobile-contracts/odk.ts` |
| Ortak yükleyici deseni | `lib/kocum/*-server.ts`, `lib/panel/*-server.ts` + `lib/mobile/*-views.ts` | Web sayfası + JSON ucu aynı yükleyici |
| Yazma kalıbı | `features/od/assignments/hooks.ts#keyForWrite`, `features/yon/hooks.ts` | UUID idempotency, belirsiz sonuçta anahtarı koruma, 409 → yeniden yükleme |
| Derin bağlantı kapısı | `route-map.ts` `ALLOWED_DEEP_LINK` (+ `od/...`, `yon/task/...`) | `odk/...` rotaları ayrı eklenmeli |

## 2. Navigasyon durumu

- **OD öğrencisi:** Tüm menü öğeleri native. İstisnalar `dino` ve `progress`; ikisi de web devam yolu.
- **Yön öğrencisi:** Tüm menü öğeleri native. İstisnalar `analiz`, `progress` ve `dino`; üçü de web devam yolu.
- **Deneme Ligi öğrencisi (`ODK`):** Tüm öğeler hâlâ `M4` yer tutucusu (`placeholderPhase`). `odk-exams` id'si OD ve Yön çalışma alanında da menüde görünebilir; oradan Deneme Ligi'ne geçiş ayrı ele alınmalı.
- **Dış denemeler ayrımı:** "Dış denemeler" (`mock-exams`, `external-mock-exams`) Deneme Ligi DEĞİLDİR. M4 bu ekranı yeniden kullanmamalı.

## 3. Ayrı kalması gerekenler

- **Plan görevleri:** Deneme Ligi denemeleri Yön plan görevi tamamlamasına karışmaz. Yön Planım yükleyicisi mobilde ODK sınavlarını okumaz.
- **Sınav çözme:** Süre, cevap kaydı ve teslim mobilde yeni bir güvenlik incelemesi gerektirir (MD-08).

## 4. Açık kalanlar (M3'ten)

- **Gerçek cihaz duman testi** (iOS + Android): Yön Bugün, görev tamamlama formu (klavye), değişiklik talebi ve görüşme talebi alt sayfaları, check-in `Switch`'leri, görüşme bağlantısının açılması.
- **Ortak haftalık özet (BLOCKED):** Yön-only öğrenci için politika kararı bekliyor (bkz. [m3-security-review.md](./m3-security-review.md) §5).
- **`ACCEPT`:** Koçun önerdiği saati mobilde onaylama ürün kararı bekliyor.
- **Önceden var olan E2E hataları:** `weekly-digests/generate` idempotency 500; `setup` saat çakışması; `kocum-lifecycle` → `panel-experience` sıra kirliliği. Ayrıntı: [m3-test-results.md](./m3-test-results.md).
- **`mobile.yml` CI işi:** Bu dal için PR'da koşmalı.

## 5. Önerilen testler (M3'te kullanıcı talimatıyla yazılmadı)

- **Entegrasyon:**
  - `student/yon`, `plan`, `coaching` ve `check-in` uçları için şunlar:
    - Rol ve ürün kapısı (OD-only / ODK-only → 404).
    - Bayrak kapalı → `FEATURE_DISABLED`.
    - `privateNote` ve INTERNAL notun yanıtta olmaması.
    - Taslak planda `tasks: []`.
    - Web yükleyicisiyle birebir sayılar.
- **Mobil Jest:**
  - Yön Bugün durumları.
  - Görev tamamlama 409.
  - Görüşme talebinde UUID'nin korunması.
  - Check-in haftalık hak ve açık yardım isteği.
  - `YonRouteGate` ve derin bağlantı.
- **E2E (mobil API):** Bearer ile Yön okuma uçları; görev tamamlama tekrar (NOOP) ve 409.
