# ODK Outcome (Kazanım) Schema

## schemaVersion: `1.0`

```json
{
  "schemaVersion": "1.0",
  "questions": [
    {
      "section": "MAT",
      "question": 1,
      "outcomes": [
        {
          "code": "TYT.MAT.PROBLEM.01",
          "name": "Problem durumlarını matematiksel ifadelerle çözer",
          "topic": "Problemler",
          "subtopic": "Yüzde Problemleri",
          "isPrimary": true
        }
      ]
    }
  ]
}
```

## Kurallar

- Her soru ≥1 kazanım; tam 1 primary
- Kodlar mümkün olduğunca `LearningOutcome` kataloğuna bağlanır
- Aynı kazanım string’i her exam’de çoğaltılmaz
- Duplicate outcome / missing question / invalid structure → preview error

## Analiz çıktısı

Her kazanım için:

- toplam soru, doğru, yanlış, başarı %, aktif süre

Online Koçum entegrasyonu zayıf kazanımlardan **suggestion** üretebilir; otomatik plan publish etmez.
