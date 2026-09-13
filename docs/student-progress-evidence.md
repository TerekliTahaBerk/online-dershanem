# Student Progress Evidence

Birleşik progress kanıt modeli — outcome mastery'nin kaynağı.

## Evidence kaynakları

```text
LESSON
ASSIGNMENT
COACHING_TASK
MOCK_EXAM
REVIEW
TEACHER_ASSESSMENT
```

## Model

`StudentProgressEvidence`:

- `studentId`, `outcomeId`, `sourceType`, `sourceId`
- `productCode` — OD | OK | ODK
- `summary` — insan okunur
- `metrics` — JSON (questionCount, correctCount, evidenceType, …)
- `occurredAt`

Unique: `(studentId, outcomeId, sourceType, sourceId)` — idempotent upsert.

## Üretim

Event consumer `evidence-recorder`:

- `LESSON_COMPLETED` → lesson outcomes
- `ASSIGNMENT_COMPLETED` → assignment outcomes
- `MOCK_EXAM_RESULT_PUBLISHED` → ODK attempt outcome scores

## Örnek

```text
Outcome: TYT.MAT.PROBLEM.01

Lesson: "Yüzde problemleri işlendi."
Assignment: "32/40 doğru"
Mock Exam: "1/3 doğru"
```

## Student 360

Gelişim sekmesinde birleşik kazanım profili bu evidence'lardan beslenir.
