# Outcome Mastery

Öğrenci × kazanım durumu evidence'lardan türetilir.

## Durumlar

```text
NOT_STARTED → INTRODUCED → PRACTICING → DEVELOPING → MASTERED
                                    ↘ NEEDS_REVIEW
```

## Hesaplama

Merkezi servis: `lib/student-success/mastery.ts`

Weighted signals:

| Kaynak | Ağırlık |
| --- | --- |
| TEACHER_ASSESSMENT | 1.0 |
| MOCK_EXAM | 0.9 |
| ASSIGNMENT | 0.75 |
| COACHING_TASK | 0.6 |
| REVIEW | 0.55 |
| LESSON | 0.4 |

Recency: 21 gün yarı ömür.

## Açıklanabilirlik

Her durum `explanation[]` satırları taşır:

```text
Deneme: Son denemede 3 sorudan 2 yanlış.
Ödev: Son ödevde başarı %58.
Tekrar: Kazanım 18 gündür tekrar edilmedi.
```

## Snapshot

`StudentOutcomeMastery` — cache/snapshot; source evidence silinmez.

`OUTCOME_MASTERY_CHANGED` event'i durum değişiminde üretilir.

## Vanity score yok

Tek "Student Success Score" üretilmez; alt sinyaller ayrı gösterilir.
