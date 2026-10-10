# M3 ekran geçişi — Yön Koçluk (OK) öğrenci

Ortak noktalar:
- **Veri:** `useYonQuery`. Anahtar: `['user', userId, 'workspace', 'OK', kaynak, parametreler]`. Önbellek yalnız bellekte tutulur.
- **Durumlar:** `QueryView` ile yükleniyor, çevrimdışı, bayat veri, hata, özellik kapalı ve erişim yok.
- **Etkileşim:** Aşağı çekip yenileme. Vurgu Yön mavisi `#0754C9`, tema üzerinden gelir.
- **Eski kod:** Legacy kod yok.

| Menü id (OK) | Eski | Yeni dosya | Web referansı | API | Bayrak | Sonuç |
| --- | --- | --- | --- | --- | --- | --- |
| `today` | yer tutucu (M3) | `features/yon/yon-today.tsx` | `app/panel/ogrenci/yon` | `student/yon` | `adaptivePlan` (yalnız tamamlama), `studentCheckIn` | NEW ✅ |
| `assignments` | yer tutucu (OD'ye düşmüyordu) | `features/yon/yon-work.tsx` | (Yön plan görevleri) | `student/plan` | `adaptivePlan` | NEW ✅ — OD ekranı/ucu değil |
| `coaching` | yer tutucu | `features/yon/yon-coaching.tsx` | `app/panel/ogrenci/kocluk` | `student/coaching`, `coaching-sessions/[id]` (REQUEST) | — | NEW ✅ |
| `plan` | yer tutucu | `features/yon/yon-plan.tsx` + `task-detail.tsx` (rota `yon/task/[id]`) | `app/panel/ogrenci/plan` | `student/plan`, `kocum/tasks/[id]/complete`, `adaptive-plan/[id]/request-change`, `adaptive-plan/preferences` | `adaptivePlan` (menüde yalnız açıkken) | NEW ✅ |
| `goals` | `features/ok/ok-goals.tsx` (legacy) | `features/yon/yon-goals.tsx` | `app/panel/ogrenci/hedefler` | `student/goals` | — | REBUILD ✅, legacy silindi |
| `check-in` | yer tutucu (OD'de `LATER`) | `features/shared/check-in.tsx` (OD + OK) | `app/panel/ogrenci/check-in` | `student/check-in`, `student-check-ins`, `student-help-requests/[id]/feedback` | `studentCheckIn` | NEW ✅ |
| `weekly-digest` | yer tutucu | `features/yon/yon-weekly.tsx` (+ M2 `WeeklyDigestContent`) | `plan` koç özeti + `haftalik` | `student/plan` (koç özeti), `student/weekly-digest` (yalnız OD üyeliğiyle) | `adaptivePlan`, `parentWeeklyDigest` | NEW ✅ |
| `mock-exams` | `external-mock-exams` | değişmedi | `denemeler` | `mock-exams` | `mockExamAnalysis` | KEEP ✅ (Deneme Ligi değil) |
| `analiz` / `progress` | yer tutucu | açık web devam yolu (`LATER`) | `analiz` / `gelisim` | — | — | WEB (OD verisine dayanır) |
| `dino` | yer tutucu | açık web devam yolu (`LATER`) | `dino` | — | `dinoAi` | WEB |
| bilinmeyen id | M3 yer tutucu | `LATER` yer tutucu | — | — | — | güvenli taraf |

## OD tarafındaki değişiklik

- **`check-in`:** OD menüsünde artık ortak native ekrana gidiyor (`OD_WEB_ONLY` listesinden çıkarıldı).
- **`dino` ve `progress`:** `LATER` olarak kaldı.

## Navigasyon

- **`navigation/native-screens.ts`:**
  - `OK_STUDENT` eşlemesi genişletildi.
  - `OK_WEB_ONLY` eklendi.
  - `M3` fazı kaldırıldı; Yön'de bilinmeyen öğe `LATER` oluyor.
- **`features/shell/native-screen-view.tsx`:** Yön ekranları ve `check-in` eklendi; `ok-goals` kaldırıldı.
- **`navigation/route-map.ts`:** Derin bağlantı izin listesine `yon/task/<id>` eklendi. Sorgu dizesi atılır.
- **Bildirimler:** `/panel/ogrenci/kocluk`, `/plan` ve `/hedefler` yolları menü `webPath` eşleşmesiyle (M1 mekanizması) ilgili sekmeye veya ekrana gider.
- **`app/(app)/_layout.tsx`:** `yon/task/[id]` başlıklı yığın ekranı ("Görev").
- **`YonRouteGate`:** `/yon/...` rotaları yalnız Yön çalışma alanında ve "Planım" yetkili menüdeyken açılır. Aksi halde güvenli boş durum gösterilir. Kimlikte yalnız URL-güvenli karakterler kabul edilir.
