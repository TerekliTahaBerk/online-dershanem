# Curriculum Domain

Tek akademik taksonomi tüm ürünlerde ortak `LearningOutcome` ID'leri kullanır.

## Hiyerarşi

```text
CurriculumVersion (LGS | TYT | AYT | YDT)
  └─ CurriculumSubject
       └─ CurriculumUnit
            └─ LearningOutcome
                 ↔ CurriculumSkill (OutcomeSkill)
```

## Evidence bağlantıları

| Entity | Model | Outcome link |
| --- | --- | --- |
| Ders | `LessonOutcome` | Many-to-one |
| Ödev | `AssignmentOutcome` | Many-to-many |
| ODK soru | `OdkQuestionOutcome` | Many-to-many |
| Progress evidence | `StudentProgressEvidence` | Unified layer |

## Kurallar

- String isim eşleştirmesi **yasak** — canonical outcome ID kullan.
- Bir entity birden fazla outcome taşıyabilir.
- Free-text `topic` alanları UI için; analiz outcome ID ile yapılır.

## Migration / backfill

1. Mevcut `LessonOutcome`, `AssignmentOutcome`, `OdkQuestionOutcome` korunur.
2. Event consumer `evidence-recorder` yeni `StudentProgressEvidence` satırları üretir.
3. `mastery-rescore` consumer outcome mastery snapshot günceller.

## Admin

`/panel/yonetim/kazanimlar` — curriculum yönetimi.
