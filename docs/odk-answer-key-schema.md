# ODK Answer Key Schema

## schemaVersion: `1.0`

```json
{
  "schemaVersion": "1.0",
  "examType": "TYT",
  "sections": [
    {
      "code": "TURKCE",
      "answers": {
        "1": "A",
        "2": "C",
        "3": "D"
      }
    },
    {
      "code": "MAT",
      "answers": {
        "1": "B",
        "2": "E"
      }
    }
  ]
}
```

## Import akışı

1. Admin JSON paste/upload
2. **Preview** (DB yazılmaz)
   - schema validation
   - question count / missing / duplicate
   - valid options A–E
   - unknown section
3. Özet: `120 soru bulundu. 120 geçerli. 0 hata.`
4. Admin onayıyla **commit**

Raw payload `OdkImportAudit` içinde saklanır (`payloadHash` + `rawPayload`).

## Versioning / LIVE sonrası

LIVE olduktan sonra doğrudan overwrite kritik işlemdir:

- `OdkAnswerKeyRevision` (eski → yeni, reason, actor)
- ardından **Rescore** job

Published sonuçlar değişecekse ayrıca confirmation gerekir.
