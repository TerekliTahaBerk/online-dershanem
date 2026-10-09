# M2 ekran geçişi

Tüm OD ekranları için ortak noktalar:
- **Veri:** TanStack Query (`useOdQuery`); anahtar `['user', userId, 'workspace', 'OD', kaynak, parametreler]`, önbellek yalnız bellekte.
- **Durumlar:** `QueryView` ile yükleniyor (iskelet), çevrimdışı, bayat veri, hata, özellik kapalı ve erişim yok.
- **Etkileşim:** Aşağı çekip yenileme; M1 primitives; OD vurgusu tema üzerinden.
- **Eski köprü:** `useLegacySession` yok.

| Menü id | Eski dosya | Yeni / güncel dosya | Web referansı | API | Bayrak | Yetki | Sonuç | Bilinen sınırlama |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `today` | `features/od/od-home.tsx` (eski, üç ürün karışık) | `features/od/od-home.tsx` | `app/panel/ogrenci/page.tsx` (OD kapsamı) | `GET student/home?scope=OD` | `reviewQueue`, `recoveryPackage`, `progressInsights` (sunucuda) | OD + STUDENT | REBUILD ✅ | Dino açıklaması yok; "Şimdi"de ödev adayı yok (web planında da yok) |
| `assignments` | `features/od/od-assignments.tsx` (Yön plan bölümü vardı) | `features/od/od-assignments.tsx`, `assignments/{model,hooks,assignment-detail}.tsx`, rota `od/assignment/[id]` | `app/panel/ogrenci/odevler` + `StudentAssignmentList` | `assignments?scope=OD`, progress PATCH, submissions POST | `assignmentEvidence` | OD + STUDENT; detay `OdRouteGate` | REFACTOR ✅ | Çevrimdışı kuyruk yok (MD-13, M8) |
| `lessons` | `features/od/od-lessons.tsx` | `features/od/od-lessons.tsx`, `lessons/lesson-detail.tsx`, rota `od/lesson/[id]` | `app/panel/ogrenci/takvim` + `takvim/[id]` | `student/lessons`, `student/lessons/[id]` | `recoveryPackage` (detayda telafi) | OD + STUDENT; kayıtlı grup | REFACTOR + NEW ✅ | `.ics` dışa aktarma mobilde yok |
| `materials` | `features/od/od-materials.tsx` | `features/od/od-materials.tsx`, `use-material-opener.ts`, `lib/files/material-files.ts` | `app/panel/ogrenci/materyaller` | `materials`, `materials/[id]/file` | `accessibilityProfile`, `offlineMode` (sunucu sıralaması) | OD; dosya kapsamı sunucuda | KEEP + REFACTOR ✅ | Önizleme sistem paylaşım ekranıyla |
| `analiz` | `features/od/od-progress.tsx` (eski `student/progress`) | `features/od/od-progress.tsx` | `app/panel/ogrenci/analiz` | `student/insights`, `weekly-goal` | `progressInsights` | OD + STUDENT | REBUILD ✅ | Grafik yok; eğilim metin ve satırlarla |
| `progress` | aynı | açık web devam yolu (`LATER`) | `app/panel/ogrenci/gelisim` | — | yalnız `progressInsights` kapalıyken menüde | — | WEB | Eski uç yeni ekranda kullanılmaz |
| `mock-exams` | `features/shared/external-mock-exams.tsx` | aynı dosya (yeniden yazıldı) | `app/panel/ogrenci/denemeler` | `mock-exams[?deneme=]` | `mockExamAnalysis` | OD veya OK + STUDENT | REFACTOR ✅ | Deneme girişi web'de |
| `review-recovery` | — (M1 yer tutucu) | `features/od/od-review-recovery.tsx`, rota `od/review-recovery` | `app/panel/ogrenci/{tekrar,telafi}` | `student/review-queue`, `review-queue/[id]/{respond,defer}`, `student/recovery`, `recovery-packages/[id]/…` | `reviewQueue`, `recoveryPackage` | OD + STUDENT | NEW ✅ | Telafi materyalinin dosya adı bilinmiyor |
| `weekly-digest` | — (M1 yer tutucu) | `features/od/od-weekly-digest.tsx` | `app/panel/ogrenci/haftalik` | `student/weekly-digest`, `weekly-digests/[id]/feedback` | `parentWeeklyDigest` | OD + STUDENT | NEW ✅ | — |
| `check-in` | yer tutucu | açık web devam yolu (`LATER`) | `app/panel/ogrenci/check-in` | — | `studentCheckIn` | OD veya OK | WEB | OD + Yön ortak form; M3 ile karar |
| `dino` | yer tutucu | açık web devam yolu (`LATER`) | `app/panel/ogrenci/dino` | — | `dinoAi` | — | WEB | Ayrı ürün kararı |

## Navigasyon

- `navigation/native-screens.ts`:
  - `od-review-recovery` ve `od-weekly-digest` anahtarları eklendi.
  - `check-in`, `dino` ve `progress` OD'de `LATER` olarak işaretlendi.
  - Yön, Deneme Ligi ve veli eşlemeleri değişmedi.
- `navigation/od-targets.ts`: Sunucu hedefini yetkili menüye göre native rotaya çevirir.
- `navigation/route-map.ts`:
  - Bildirim web yolları `/panel/ogrenci/takvim/<id>`, `/tekrar` ve `/telafi` detaya eşleniyor.
  - Derin bağlantı izin listesine `od/lesson/<id>`, `od/assignment/<id>` ve `od/review-recovery` eklendi.
- `(app)/_layout.tsx`: Detay rotaları başlıklı yığın ekranları olarak tanımlandı (Android geri tuşu ve iOS kaydırma hareketi yığından geliyor).
