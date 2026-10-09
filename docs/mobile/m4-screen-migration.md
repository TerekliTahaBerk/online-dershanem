# M4 ekran geçişi — Deneme Ligi (ODK) öğrenci

Ortak noktalar:
- **Veri:** `useOdkQuery`. Anahtar: `['user', userId, 'workspace', 'ODK', kaynak, {examId, view}]`. Önbellek yalnız bellekte tutulur. Sonuç verisi ekrandan çıkınca 1 dk sonra bellekten atılır.
- **Yenileme:** Ön plana dönüşte (M1 `focusManager`), çalışma alanı değişiminde ve aşağı çekince. Yoklama (polling) yok.
- **Görünüm:** Vurgu Deneme Ligi moru `#5B2599`, yalnız etiket ve seçili öğede. Durum renkleri semantik tonlardan. Sayılar Manrope tabular.

| Menü id | Çalışma alanı | Eski | Yeni | Web referansı | API | Sonuç |
| --- | --- | --- | --- | --- | --- | --- |
| `today` | ODK | yer tutucu (M4) | `features/odk/odk-home.tsx` | `components/odk/student-dl-home.tsx` | `odk/student/home` | NEW ✅ |
| `odk-exams` | ODK | yer tutucu | `features/odk/odk-exams.tsx` | `app/panel/odk/ogrenci/denemeler` | `odk/student/exams?gorunum=` | NEW ✅ |
| — (detay) | ODK | — | `features/odk/exam-detail.tsx`, rota `odk/exam/[id]` | `denemeler/[id]` | `odk/student/exams/[id]` | NEW ✅ |
| — (sonuç) | ODK | — | `features/odk/exam-result.tsx` + `result-questions.tsx`, rota `odk/exam/[id]/result` | `denemeler/[id]/sonuc` | `odk/student/exams/[id]/result`, `…/answer-key` | NEW ✅ |
| — (sınav) | ODK | — | native DEĞİL; web devam yolu | `denemeler/[id]/coz` | — | WEB (kapsam dışı) |
| `odk-exams` | OD / OK | yer tutucu | `features/odk/odk-switch.tsx` (çalışma alanı geçişi) | — | `active-product` (M1) | NEW ✅ — OD dış denemeleri değil |
| `assignments`, `analiz`, `progress`, `check-in`, `weekly-digest`, `dino` | ODK | yer tutucu (M4) | açık web devam yolu (`LATER`) | — | — | WEB |

## Navigasyon

- **`native-screens.ts`:**
  - `ODK_STUDENT = { today: 'odk-home', 'odk-exams': 'odk-exams' }`. ODK öğrencisinde eşlenmemiş her öğe `LATER` olur.
  - OD ve OK'ta `odk-exams` → `odk-switch`.
  - `M4` fazı kaldırıldı.
- **`route-map.ts`:**
  - **Bildirim / web yolu eşlemesi:**
    - `/panel/odk/ogrenci/denemeler/<id>` ve `…/coz` → `/odk/exam/<id>`.
    - `…/sonuc` → `/odk/exam/<id>/result`.
    - Eşleme yalnız `odk-exams` yetkili menüdeyken yapılır.
  - **Derin bağlantı izin listesi:** `odk/exam/<id>` ve `odk/exam/<id>/result` eklendi.
- **`app/(app)/_layout.tsx`:** "Deneme" ve "Sonuç" başlıklı yığın ekranları eklendi (native geri hareketi).
- **`OdkRouteGate`:** Rota yalnız Deneme Ligi çalışma alanında ve `odk-exams` menüdeyken açılır. Kimlikte yalnız `[\w-]{1,64}` kabul edilir. Asıl yetki sunucuda her istekte yeniden doğrulanır.
- **`use-nav-target.ts`:** Değişmedi. ODK hedefleri merkezi `targetForNavId` ve `mapNotificationHref` üzerinden çözülür.
