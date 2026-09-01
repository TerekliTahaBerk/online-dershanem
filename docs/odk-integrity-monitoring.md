# ODK Integrity Monitoring

## Amaç

Öğrenciyi otomatik suçlamak değil; **davranışsal integrity signals** üretmek.

UI dili:

- ❌ `CHEATER`
- ✅ `Integrity signals detected` / `İncelenmeli` / `Yüksek sinyal`

Automated invalidation **yok**. Admin karar verir.

## High-value events

`EXAM_STARTED`, `QUESTION_OPENED/CLOSED`, `ANSWER_SELECTED/CHANGED`, `QUESTION_FLAGGED`,
`SECTION_CHANGED`, `TAB_HIDDEN/VISIBLE`, `WINDOW_BLUR/FOCUS`, `FULLSCREEN_*`,
`COPY/PASTE_ATTEMPT`, `CONTEXT_MENU`, `NETWORK_*`, `EXAM_SUBMITTED`, `AUTO_SUBMITTED`

Mouse movement gibi low-value telemetry **kaydedilmez**.

## Risk seviyeleri

| Level | Label | Örnek |
|-------|-------|-------|
| NORMAL | Normal | Anlamlı sinyal yok |
| REVIEW | İncelenmeli | birkaç tab hide, blur, copy |
| HIGH | Yüksek sinyal | sık tab change, uzun blur, session/IP change |

Her zaman nedenler gösterilir:

```text
İncelenmeli
• 4 kez sekmeden ayrıldı
• toplam 3 dk 18 sn sınav ekranı arka planda kaldı
• 1 kez fullscreen kapatıldı
```

## Rol görünürlüğü

- **Admin:** full audit (timeline, events, session meta)
- **Teacher:** yalnız “Yönetim incelemesi mevcut”
- **Parent/Student:** raw integrity log yok

## Privacy (KVKK)

- Raw IP gerekmiyorsa `ipHash`
- Amaç: sınav bütünlüğü sinyali
- Erişim: admin audit
- Retention: ayrıntılı eventler sınırlı süre (aşağıya bakın)

## Retention

| Veri | Süre önerisi |
|------|--------------|
| Answers / scores / outcomes | uzun süreli |
| Aggregate sonuçlar | kalıcı |
| Detailed integrity events | 180 gün (opsiyonel purge job) |

Fullscreen / copy-paste client-side engeller güvenlik garantisi değildir; UI’da güvenlik iddiası kurulmaz.
