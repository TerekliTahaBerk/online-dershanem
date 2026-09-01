# Recommendation Engine

Deterministic rule-based öneriler — ilk sürüm.

## Lifecycle

```text
SUGGESTED → ACCEPTED → APPLIED
         ↘ DISMISSED
         ↘ EXPIRED
```

Kim karar verdi: `decidedById`, `decidedAt`

## Kurallar

`lib/student-success/recommendations.ts`

| Koşul | Öneri |
| --- | --- |
| Mock exam accuracy < 55%, ≥2 soru | OUTCOME_REPEAT |
| Assignment accuracy < 60% | QUESTION_SET |
| Lesson missed | RECOVERY_PACKAGE |
| Plan completion < 50% + OK entitlement | COACH_REVIEW |

## Human-in-the-loop

- Öneri otomatik plana yazılmaz
- `WeeklyPlanSuggestion` (PENDING) veya `CrossProductRecommendation` (SUGGESTED)
- Koç/öğretmen onayı gerekir

## Source tracking

Her öneri:

- `sourceType`: MOCK_EXAM | LESSON_CLOSE | ASSIGNMENT | RECOVERY | …
- `sourceId`: kaynak entity
- `rationale`: "Neden oluşturuldu?"

## ODK → Koçum

`mock-exam-coach-bridge` consumer → `WeeklyPlanSuggestion` (MOCK_EXAM_FOLLOWUP)

OK entitlement yoksa yalnız Student 360 analysis.

## Feedback

ACCEPTED/DISMISSED kararları recommendation quality ölçümü için saklanır.
