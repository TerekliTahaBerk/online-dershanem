# Automation Rules mimarisi (Part 12)

İşletme / yönetim paneli için **görünür, kontrollü** event-driven otomasyon.
Amaç tekrarlayan operasyon işlerini otomatikleştirmek; kontrolsüz “sihirli”
workflow motoru kurmamak.

Kural sürümü: `automation-rules-v1`

## Non-goals

- Serbest kod / webhook / dış CRM mutasyonu (agresif aksiyonlar)
- Complex no-code workflow builder (dallanma, döngü, gecikmeli zincir)
- Öğretmen/öğrenci self-service otomasyon
- Instagram AI’nin serbest otomasyonla birleştirilmesi (legacy aksiyonlar ayrı allowlist)

## Kararlar

- Otomasyonlar Zod allowlist tetikleyici + koşul + aksiyon ile sınırlıdır.
- Kurallar `BusinessUnit` kapsamındadır; `automation:read` / `automation:write`
  (manage) mevcut işletme RBAC matrisi ile uyumludur.
- Her çalıştırma `AutomationExecution` satırı üretir: matched · actions · result · error.
- Dry-run aksiyon uygulamaz; log’a `dry_run=true` yazar.
- Recursion: `AsyncLocalStorage` derinlik > 1 ise emit bloklanır.
- Duplicate: `(ruleId, eventId)` unique — aynı olay aynı kuralda bir kez.
- Rate limit: kural başına saatte 30 canlı çalıştırma.
- Maksimum aksiyon / kural: 5.
- Audit: kural create / enable / disable / dry-run.

## Mimari

| Katman | Dosya | Görev |
| --- | --- | --- |
| Tanımlar | `lib/automation/definitions.ts` | trigger · action · template katalogu |
| Şema | `lib/automation/schemas.ts` | Zod doğrulama |
| Koşul | `lib/automation/conditions.ts` | saf AND eşleşme |
| Güvenlik | `lib/automation/safety.ts` | recursion · rate · budget · eventId |
| Motor | `lib/automation/engine.ts` | emit · dry-run · aksiyon uygulama |
| Tarama | `lib/automation/scans.ts` | saatlik poll tetikleyicileri |
| Eğitim emit | `lib/automation/emit-helpers.ts` | aktif kuralı olan birimlere yayın |
| Uyumluluk | `lib/business/automation.ts` | Instagram CRM re-export |
| UI | `/panel/yonetim/isletme/otomasyon-kurallari` | form editor · liste · dry-run |

```
Domain olay / scan
  → emitAutomationEvent(trigger, context)
  → aktif kurallar (trigger + alias)
  → conditionsMatch?
  → claim execution (eventId idempotency)
  → apply actions (veya dry-run)
  → AutomationExecution + lastRunAt/runCount
```

## Tetikleyiciler (v1)

| Trigger | Kaynak |
| --- | --- |
| `lead_created` | manuel lead create |
| `lead_stage_changed` | stage transition |
| `order_paid` | `AUTOMATE_PAYMENT_COMPLETED` (alias: `PAYMENT_COMPLETED`) |
| `provisioning_failed` | OD/ODK provisioning catch |
| `student_invite_pending` | saatlik scan |
| `student_risk_created` | intervention episode create |
| `intervention_overdue` | saatlik scan |
| `lesson_missed` | ders kapanışı ABSENT |
| `assignment_overdue` | saatlik scan |
| `weekly_digest_ready` | digest publish |

Legacy Instagram: `NEW_MESSAGE`, `HOT_LEAD`, `COMPLAINT`, `UNANSWERED_HOT_LEAD`, `PAYMENT_COMPLETED`.

## Koşullar

AND birleşimi. Örnekler: `source=instagram`, `product=ODK`, `severity=high`,
`ownerEmpty=true`, `stage`, legacy `temperature` / `intent`.

## Aksiyonlar (v1)

| Aksiyon | Etki |
| --- | --- |
| `create_task` | LeadTask |
| `assign_owner` | lead/conversation assignedUserId |
| `send_internal_notification` | panel bildirimi (+ e-posta tercihi) |
| `create_intervention` | InterventionCase (`TEACHER_OBSERVED` vb.) |
| `send_approved_template_email` | yalnız `APPROVED_EMAIL_TEMPLATES` |
| `add_tag` | lead/conversation tags |

Legacy Instagram aksiyonları korunur (`SUGGEST_AI_REPLY`, `STOP_AI`, …).

## Rule model

`name · triggerType · conditions · actions · isActive · createdByUserId · lastRunAt · runCount`

## Execution log

`rule · eventId · matched · dryRun · executed actions (details) · result · errorCode`

## Dry-run

Admin, kuralı aktif etmeden örnek event alanlarıyla dry-run çalıştırır.
UI yönlendirmesi: `?dryRun=&matched=&rule=`.

## İzinler

| İzin | Rol |
| --- | --- |
| `automation:read` | SUPER_ADMIN, ADMIN, VIEWER |
| `automation:write` (manage) | SUPER_ADMIN, ADMIN |

Sayfa: `otomasyon-kurallari` → read. Mutation’lar write ister.

## Test

`lib/automation/automation.test.ts`: trigger katalogu, condition no-match,
aksiyon bütçesi, recursion, disabled, rate limit, onaylı şablon, fail-closed koşul.
