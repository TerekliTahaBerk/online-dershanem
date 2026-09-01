# Unified Calendar

Tek canonical calendar servisi üç ürünü birleştirir.

## Servis

```ts
getStudentCalendar({
  studentId,
  studentUserId,
  from,
  to,
  include: ["lessons", "assignments", "coachingTasks", "mockExams"],
})
```

## Event tipleri

```text
LESSON | ASSIGNMENT_DUE | COACHING_TASK | MOCK_EXAM | COACHING_SESSION | OTHER
```

## Kaynaklar

| Tip | Kaynak | Ürün |
| --- | --- | --- |
| LESSON | `Lesson` | OD |
| ASSIGNMENT_DUE | `Assignment.dueAt` | OD |
| COACHING_TASK | `WeeklyPlanTask` | OK |
| MOCK_EXAM | `OdkExam` | ODK |

## Unified Today

`buildTodayItems()` — priority sırası:

1. MOCK_EXAM (100)
2. LESSON (90)
3. ASSIGNMENT_DUE (80)
4. COACHING_TASK (70)

## API

- `GET /api/panel/student-success/calendar`
- `POST /api/panel/student-success/calendar` — bugün + what next

## iCal

`/api/panel/calendar/export` — dersler + (öğrenci/veli için) plan görevleri, ödev deadline'ları ve denemeler birleşik export edilir. Ürün etiketi `[Dershanem]`, `[Koçum]`, `[Deneme]` prefix ile görünür.

## Görsel ayrım

Her event `productLabel`: Dershanem | Koçum | Deneme Kulübü
