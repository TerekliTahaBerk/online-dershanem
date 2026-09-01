# Unified Learning Architecture

Online Dershanem, Online Koçum ve Online Deneme Kulübü tek bir **Student Success Layer** üzerinde birleşir.

## Ürün döngüsü

```text
ÖĞREN (OD) → PLANLA (OK) → ÖLÇ (ODK) → YENİDEN PLANLA (OK) → YENİDEN ÖĞREN (OD)
```

## Mimari

```text
                    STUDENT
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   ONLINE         ONLINE         DENEME
   DERSHANEM       KOÇUM         KULÜBÜ
        │              │              │
        └──────────────┼──────────────┘
                       ▼
             STUDENT SUCCESS LAYER
   Curriculum · Evidence · Mastery · Events
   Calendar · Notifications · Recommendations
                       │
      ┌────────────────┼────────────────┐
      ▼                ▼                ▼
   STUDENT          TEACHER           PARENT
```

## Kod konumları

| Katman | Path |
| --- | --- |
| Domain (saf) | `lib/student-success/` |
| Sunucu | `lib/student-success/server/` |
| Event outbox | `CrossProductEventOutbox` |
| Evidence | `StudentProgressEvidence` |
| Mastery | `StudentOutcomeMastery` |
| Öneriler | `CrossProductRecommendation` |

## Temel kurallar

1. **Tek öğrenci kimliği** — `StudentProfile.id` tüm ürünlerde ortak.
2. **Duplicate task yok** — Assignment source of truth; Koçum `sourceType=ASSIGNMENT` projection.
3. **Human-in-the-loop** — Öneriler otomatik publish edilmez.
4. **Açıklanabilirlik** — Mastery ve risk kara kutu değil.

## API

- `GET /api/panel/student-success/calendar?studentId=&from=&to=`
- `POST /api/panel/student-success/calendar` — Unified Today (öğrenci)
- `GET /api/panel/student-success/progress/[studentId]?view=summary|outcomes|timeline`

## Cron

`/api/cron/cross-product-events` — outbox consumer (2 dk).

## Student 360

Gelişim sekmesi birleşik kazanım profilini gösterir (`unifiedOutcomes`).
