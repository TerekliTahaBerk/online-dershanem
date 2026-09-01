# ODK Scoring

## Net formülü (config)

```text
net = max(0, doğru - yanlış / penalty)
```

| Policy code | Family | Penalty |
|-------------|--------|---------|
| `LGS_MATH_V1` / `LGS_FULL_V1` | LGS | 3 |
| `YKS_MATH_V1` / `TYT_FULL_V1` / `AYT_FULL_V1` | TYT/AYT | 4 |

Boş cezasızdır. Section nets toplanır (`sectionBreakdown` JSON).

## scoreStatus vs publicationStatus

| Kavram | Anlam |
|--------|-------|
| Scoring calculated | `OdkAttemptScore` oluştu |
| `publicationStatus=HIDDEN` | öğrenci görmez |
| Exam `SCORED` (REVIEW) | yönetim inceliyor |
| Exam `RELEASED` + `PUBLISHED` | öğrenci/veli/öğretmen görür |

## Rescore

Answer key düzeltmesi sonrası:

1. Impact preview: `N öğrenci yeniden puanlanacak`
2. Published değişecekse confirmation
3. Background-safe rescore (`scoreOdkExam(..., { rescore: true })`)

## Zaman analizi girdileri

`OdkAttemptQuestionTiming.activeDurationMs` visibility-aware:

- `document.visibilityState !== "visible"` iken süre sayılmaz
