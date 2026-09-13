# ODK Result Publication

Scoring tamamlanması ile sonucu öğrenciye yayınlamak **aynı şey değildir**.

```text
scoreStatus = CALCULATED   (DB: attempt score exists, exam SCORED)
publicationStatus = HIDDEN | PUBLISHED
```

## Yayın önizleme

```text
312 öğrencinin sonucu yayınlanacak.
4 sonuç inceleme bekliyor.
2 scoring hatası var.
```

Admin isterse `excludeReviewRequired=true` ile review-required attempt’leri hariç tutabilir.

## Yayın sonrası

1. Exam `RELEASED`
2. Seçilen attempt score’ları `PUBLISHED`
3. İsteğe bağlı Online Koçum `WeeklyPlanSuggestion` (PENDING) — **otomatik plan publish yok**
4. Öğrenci / veli / öğretmen raporları görünür

## Yönetim ekranı

Deneme detayında “Sonuç inceleme ve yayın”:

- katılım / teslim / eksik
- ortalama + medyan net
- section averages
- öğrenci satırları (D/Y/B/net/süre/integrity/result)
