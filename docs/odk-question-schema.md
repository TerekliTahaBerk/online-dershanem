# ODK Question Schema

## Model

```text
Exam
 └ Section
     └ Question
```

### Section

- `code`, `title`, `position`, `questionCount`
- `durationMinutes?`, `questionStart`, `questionEnd`

### Question

- `questionNumber` (section-local)
- `bookletCode` (default `A`) + `bookletQuestionNumber`
- `canonicalQuestionNumber` (booklet mapping hedefi)
- `contentType`: `BOOKLET_PDF` | `IMAGE_URL` | `RICH_CONTENT`
- `assetUrl?`
- `correctOption` (canonical)
- `difficulty`, `bookletPage`
- outcomes → `LearningOutcome` katalog kaydı

## İçerik stratejisi

İlk aşamada soru metni author etmek zorunlu değil:

- tek PDF kitapçık + optical cevap
- veya soru başına image URL
- rich content gelecekte

Tek PDF olsa bile her soru için logical record tutulur.

## Booklet mapping

```text
Booklet A Q1 → canonical Question 17
```

Cevap anahtarı **canonical** soru üzerinden tutulur. Architecture booklet-ready; v1 tek kitapçık (`A`) ile çalışır.
