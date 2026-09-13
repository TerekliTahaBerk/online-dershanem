# Dino AI context architecture (Part 13)

Dino, ayrı bir chatbot değil. Panelde **zaten görünen ve yetkili olunan**
kayıtları açıklayan isteğe bağlı yardımcı katmandır.

Prompt sürümü: `dino-v2`

## Ana prensip

> Dino yeni gerçek üretmez. Panel verisini açıklar.

Deterministik özet her zaman birincil kaynaktır. Model çağrısı başarısız olsa
bile kullanıcı dayanak satırlarını görür; sistem “model konuşmuş gibi”
davranmaz.

## Non-goals

- Serbest metin sohbet / prompt injection yüzeyi
- Yeni görev, plan değişikliği, risk skoru veya teşhis üretmek
- Panelde görünmeyen veriyi (iç not, ödeme, başka öğrenci, admin meta) modele açmak
- Her ekranda floating chat balonu

## Mimari

| Katman | Dosya | Görev |
| --- | --- | --- |
| Soru kataloğu | `lib/dino.ts` | Allowlist sorular · scope · çıktı şeması · fallback |
| Rol allowlist | `lib/panel/dino-allowlist.ts` | Kaynak türü izin / deny |
| Context builder | `lib/panel/dino-source.ts` | Deterministik satırlar · redaksiyon · hash |
| Deterministik UX | `lib/panel/dino-explanations.ts` | AI öncesi gerekçe cümleleri |
| Gateway | `lib/dino-gateway.ts` | Gemini kapıları · maliyet · doğrulama |
| API | `app/api/panel/dino/route.ts` | Rol · scope · kota · audit |
| Contextual UI | `components/panel/dino-explanation-action.tsx` | Ekran içi “açıkla” |

```
Kullanıcı seçili soru (serbest metin yok)
  → rol + feature flag + rate limit
  → kapsam doğrulama (oturumdan student/roster)
  → prepareDinoSource (scope collectors)
  → audience allowlist + max sources
  → redaksiyon / injection tarama
  → günlük kota
  → generateDinoAnswer (veya dürüst fallback)
  → citation allowlist doğrulama
  → DinoAnswer + audit
```

## Deterministic before AI

Her `DinoScope` ham DB dump göndermez; Türkçe yapılandırılmış satırlar üretir:

| Scope | Dayanak |
| --- | --- |
| `WEEK` | katılım · plan görevleri · ödev geçmişi |
| `PLAN` | plan durumu · reasonCode gerekçeleri |
| `REVIEW` | tekrar kuyruğu · kazanım maddeleri |
| `LAST_EXAM` | son deneme netleri · delta |
| `SUBJECT_TREND` | ders net eğilimi |
| `OUTCOMES` | aktif kazanım tekrarları |
| `COACHING` | paylaşılan odak/not · hedefler (`privateNote` yok) |
| `TEACHER_ATTENTION` | öğretmen dikkat kutusu (roster) |
| `GROUP_WEEK` | öğretmen gruplarının 14 günlük özeti |
| `MEETING_DRAFT` | hafta + coaching + kendi ders notu + açık müdahale |

Contextual UI önce `dino-explanations` cümlesini gösterir; Dino isteğe bağlıdır.

## Rol soruları

### Öğrenci

- Bu hafta neye çalışmalıyım? → `PLAN`
- Derslerimde neden gerileme var? → `SUBJECT_TREND`
- Hangi konuları tekrar etmeliyim? → `REVIEW`
- Planım neden böyle? → `PLAN`
- Son denememi açıkla → `LAST_EXAM`

### Veli

Yalnız `resolveParentScope` ile bağlı çocuk. Panelde gördüğü sakin yüzeyle aynı:

- Bu hafta çocuğum nasıl gidiyor?
- En çok desteğe nerede ihtiyacı var?
- Son denemede ne değişti?

### Öğretmen

Yalnız aktif grup kaydı olan öğrenciler. Roster soruları `studentId` istemez.

- Bugün hangi öğrencilerle ilgilenmeliyim?
- Bu öğrencinin risk nedenlerini özetle
- Bu grubun son iki haftasını özetle
- Öğrenci için görüşme taslağı hazırla

Yabancı `studentId` → 404 (yatay erişim yok).

## Citations / grounding

- Model yalnız gönderilen kaynak `id` değerlerini citation olarak dönebilir.
- Uydurma citation → `UNSUPPORTED_CITATION` → fallback.
- UI “Dayanaklar” satırında `sourceRefs.label` gösterir (ör. Ödev geçmişi).

## Privacy allowlist

| Rol | Girebilir | Girmez |
| --- | --- | --- |
| STUDENT | kendi plan/ödev/ders/deneme/tekrar/outcome | öğretmen notu, ödeme, başka öğrenci, admin risk meta |
| PARENT | katılım/plan/ödev/deneme/eğilim/paylaşılan koç | öğretmen notu, `privateNote`, check-in serbest metin, müdahale, ödeme |
| TEACHER | yetkili öğrenci + kendi notları + dikkat kutusu | ödeme, veli-özel veri, admin-only meta, yetkisiz öğrenci |

Deny kategorileri: `INTERNAL_NOTES`, `PRIVATE_COACH_NOTE`, `PAYMENT_INFO`,
`OTHER_STUDENTS`, `ADMIN_ONLY_RISK_METADATA`, `PARENT_PRIVATE_DATA`,
`STUDENT_CHECKIN_FREE_TEXT`.

## Cost & fallback

| Kontrol | Varsayılan |
| --- | --- |
| `DINO_MAX_SOURCES` | 8 |
| `DINO_MAX_SOURCE_CHARS` | 280 |
| `DINO_MAX_OUTPUT_TOKENS` | 500 |
| Rate limit | 20 / 15 dk / kullanıcı |
| Günlük istek | `DINO_MAX_DAILY_REQUESTS` (15) |
| Günlük maliyet | `DINO_MAX_DAILY_MICRO_USD` |
| Provider | `DINO_PROVIDER=gemini` + dış aktarım onayı + maliyet oranları |

Kapı eksik / timeout / şema hatası / injection / boş kaynak / kota → dürüst
fallback. `requestKey` ile idempotent replay (aynı istek tekrar maliyet yazmaz).

## UX

Contextual actions tercih edilir; global balon yok.

| Ekran | Action |
| --- | --- |
| Öğrenci ana / NBA | Bu neden öneriliyor? |
| Öğrenci plan | Bu plan neden böyle? |
| Deneme sonucu | Bu sonuç ne söylüyor? |
| Veli sakin ana | Bu haftayı açıkla · destek · deneme |
| Öğretmen Bugün | Bugün hangi öğrencilerle ilgilenmeliyim? |
| Öğrenci 360 (öğretmen) | Bu öğrenciyi özetle |

Chip tabanlı `/panel/*/dino` sayfaları isteğe bağlı katalog yüzeyi olarak kalır.

## Testler

- `lib/dino.test.ts` — rol soru izolasyonu, citation, unsafe dil, fallback
- `lib/panel/dino-allowlist.test.ts` — parent privacy, teacher-only süzme, empty context, unsupported claim, roster requiresStudent
- `lib/dino-explanations.test.ts` — deterministic-before-AI

## Feature flag / geri alma

1. `DINO_PROVIDER=fallback` → dış çağrı durur, dayanaklar kalır
2. `PANEL_FEATURE_DINO_AI=false` → yüzey 404
