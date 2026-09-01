# ODK Exam Lifecycle

Online Deneme Kulübü sınav yaşam döngüsü.

## Durumlar (DB ↔ ürün dili)

| DB status | Ürün alias | Anlam |
|-----------|------------|-------|
| `DRAFT` | DRAFT | Taslak; içerik düzenlenebilir |
| `READY` | READY | Sürüm kilitli, planlanabilir |
| `SCHEDULED` | SCHEDULED | Zamanlandı |
| `LIVE` | LIVE | Sınav açık |
| `ENDED` | CLOSED | Süre bitti / kapandı |
| `SCORED` | REVIEW | Puanlandı, yönetim inceliyor |
| `RELEASED` | PUBLISHED | Sonuçlar yayınlandı |
| `ARCHIVED` | ARCHIVED | Arşiv |

## Explicit transitions

```text
DRAFT → READY → SCHEDULED → LIVE → ENDED → SCORED → RELEASED → ARCHIVED
         ↑_______|
```

- `DRAFT → RELEASED` **yasak**
- `ENDED → RELEASED` **yasak** (önce scoring)
- Scoring ≠ publication

## Operasyon akışı

1. Yönetim denemeyi oluşturur (şablon: LGS/TYT/AYT full veya matematik)
2. Sorular / PDF / cevap anahtarı / kazanımlar
3. Öğrenci ataması (snapshot)
4. READY → SCHEDULED → LIVE
5. Öğrenci çözer; event + timing loglanır
6. Teslim / AUTO_SUBMIT
7. Cron veya admin puanlar (`publicationStatus=HIDDEN`)
8. Yönetim inceler (integrity sinyalleri)
9. **Sonuçları Yayınla** → öğrenci/veli/öğretmen görür

## Exam lock

`LIVE` olduktan sonra kritik alanlar kilitlenir:

- question order / exam type / answer mapping

Override yalnız answer-key revision + rescore ile.

## Cron

`/api/cron/odk-exam-lifecycle`

- SCHEDULED → LIVE
- LIVE/SCHEDULED → ENDED
- expired attempts → AUTO_SUBMITTED
- ENDED exams → otomatik score (yayınlamaz)
