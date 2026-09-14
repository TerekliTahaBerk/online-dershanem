# KPSS — Adaptif Çalışma Planı Motoru (Görev 6)

Bu not, haftalık plan motorunun ürün-bazlı hale getirilmesini ve KPSS
dallanmasının hangi veriye dayandığını kaydeder.

## 1. Plan artık bir ürüne aittir

`WeeklyPlan` bu görevden önce hangi ürüne ait olduğunu **hiçbir yerde
tutmuyordu**. Ürün bilgisi yalnız API katmanındaki sabit
`requireApiProductRole("OK", …)` çağrılarından geliyordu; bir plan satırına
bakıp "bu hangi ürünün planı?" sorusunu yanıtlamak mümkün değildi.

`WeeklyPlan.productRefId` (zorunlu FK → `Product`) bunu veriye taşır.
Migration `0109_weekly_plan_product_identity` mevcut tüm satırları `OK`
(Online Koçum) ürününe backfill eder: o güne kadar üretilmiş her plan,
tanımı gereği bir Online Koçum planıdır.

Alan **zorunlu** seçildi. Nullable bırakmak, plan yazan yeni bir kod yolunun
ürünü sessizce boş geçmesine izin verirdi; zorunlu FK sayesinde Prisma tipi
her yazma yolunu derleme zamanında durdurur.

## 2. Onay akışı ürün politikasına bağlandı

`Product.requiresPlanApproval` (varsayılan `true`):

| Ürün | `requiresPlanApproval` | Planın doğuş durumu |
| --- | --- | --- |
| OD / OK / ODK | `true` | `DRAFT` — koç/öğretmen onayı bekler |
| KPSS | `false` | `APPROVED` + `autoApproved = true` |

Yeni bir "öğretmensiz" ürün eklendiğinde **kod değişmez**, ürün satırı değişir.

Otomatik onayda `approvedById` bilerek `NULL` bırakılır: sistem onayını gerçek
bir kullanıcı kimliğine bağlamak denetim kaydını yalan söyletirdi. "Kim
onayladı?" sorusunun cevabı `autoApproved` bayrağıdır. Öğrenciye gösterilen
metin de buna uyar — otomatik onaylı planda "Koçun tarafından onaylandı"
değil, "Planın hazır" yazar (`planStatusLabel`).

Karar mantığı saf ve test edilebilir: `lib/kocum/plan-approval.ts`.

### Yeniden üretim kilidi

Koç onaylı bir OK planı kilitlidir (mevcut davranış): öğrenci önce değişiklik
ister. Otomatik onaylı planda kilitleyecek bir insan kararı **yoktur** —
`canRegeneratePlan` bu ayrımı yapar. Ayrım olmasaydı KPSS öğrencisi ilk
plandan sonra haftasını bir daha dengeleyemezdi.

## 3. KPSS plan girdisi — durum: GERÇEK veri

> Bu adım placeholder **değildir**. Girdi, Görev 3'te üretilen gerçek
> `OdkAttemptOutcomeScore` satırlarından okunur.

`lib/kpss/adaptive-plan-server.ts` → `collectKpssPlanCandidates`:

- Kapsam **KPSS sınav ailelerine kilitlidir** (`ExamFamily.product.code = "KPSS"`).
  Adayın başka bir üründe (ör. ODK/TYT) girdiği deneme KPSS planını beslemez;
  bu davranış entegrasyon testiyle kanıtlanır.
- Kanıt penceresi son `KPSS_ATTEMPT_WINDOW` (5) deneme; sınav başına yalnız en
  son teşebbüs sayılır.
- Zayıflık kararı yeniden yazılmaz: ODK raporlamasının halihazırda test edilmiş
  sinyal motoru (`buildOutcomeTrends` + `buildWeakOutcomeSignals`) kullanılır.
- En düşük doğruluk oranına sahip kazanımlar haftanın ilk görevleri olur.

### Bu bir dallanmadır, yerine geçme değil

`collectPlanCandidates` (Online Koçum'un `Assignment` tabanlı girdisi) **tek
satır değişmedi** ve KPSS yolunda hiç çağrılmaz. Çekirdek zamanlama/kapasite
çözücüsü (`buildAdaptiveWeek`, `ruleVersion: "adaptive-v1"`) iki üründe de
aynıdır — değişen yalnız çözücüye giren aday listesidir.

## 4. Sınav tarihine göre geri sayım

**Yeni alan eklenmedi.** `StudentPlanPreference.nextExamAt` (+ `examLabel`)
zaten vardı ve plan motoru bunu `EXAM_APPROACHING` adayları için kullanıyordu.
`StudentProfile`'a ya da yeni bir `KpssCandidateProfile` modeline alan eklemek,
mevcut ve doğru çalışan bir alanı ikizlemek olurdu — daha az invaziv olan,
var olanı kullanmaktır.

`examCountdownCapacity` (saf fonksiyon, `lib/adaptive-plan.ts`) **yalnız
`productRefId` KPSS olan planlarda** devrededir:

| Sınava kalan | Kademe | Günlük dakika | Günlük görev |
| --- | --- | --- | --- |
| yok / geçmiş | `NONE` | ×1 | +0 |
| ≥ 8 hafta | `FAR` | ×1 | +0 |
| 4–8 hafta | `APPROACHING` | ×1.15 | +0 |
| 1–4 hafta | `NEAR` | ×1.3 | **+1** |
| < 1 hafta | `FINAL_WEEK` | ×1.5 | **+1** |

Fonksiyon kapasiteyi **asla düşürmez** ve üst sınırları aşmaz
(`EXAM_COUNTDOWN_MAX_MINUTES_PER_DAY`, `EXAM_COUNTDOWN_MAX_TASKS_PER_DAY`):
geri sayım paniği, öğrenciyi hiç açmayacağı bir listeyle baş başa bırakmamalı.

OK planları bu fonksiyona **hiç uğramaz**; kapasiteleri tercih ekranındaki
değerlerin aynısıdır.

## 5. Okuma yollarında ürün süzgeci

Plan artık tek ürünlü olmadığı için, ürüne duyarsız `weeklyPlan` sorguları
yanlış planı gösterebilirdi. Süzgeç eklenen yerler:

- `lib/panel/parent-calm-server.ts` → `productRef: { code: "OK" }`.
  Bu ekran **veliye** açıktır ve KPSS veli-free bir üründür (Görev 4). Süzgeç
  olmadan "en son plan" sorgusu bir KPSS planına düşebilirdi.
- `lib/panel/teacher-workspace-server.ts`, `lib/panel/teacher-roster-server.ts`,
  `app/panel/ogretmen/plan/page.tsx`, `lib/panel/admin-operations-center-server.ts`
  → `productRef: { requiresPlanApproval: true }`. Bunlar insan onayı
  kuyruklarıdır; otomatik onaylı bir planın burada "onayla" düğmesiyle
  görünmesi, uçta 409 ile reddedilen bir düğme demek olurdu.

## 6. KPSS satış kilidi

Bu görev KPSS'yi satışa açmaz ve mevcut kilidi **gevşetmez**:

- Plan sayfası ve plan üretim ucu KPSS'ye `hasProductCodeAccess` üzerinden
  bakar; bu yol registry ürünleri için `Product.isActive` şartını uygular.
  `isActive = false` iken hiçbir KPSS öğrencisi plan üretemez ve sayfayı açamaz.
- KPSS, paket kurucu kart haritasında (`BUILDER_PRODUCT_REGISTRY_CODE`) hâlâ
  **yoktur** (Görev 5, Adım 3).

> **Dikkat — deponun mevcut durumu:** Hiçbir migration KPSS `Product` satırını
> oluşturmaz; satır yalnız `scripts/seed-kpss-product.mjs` çalıştırılan
> ortamlarda vardır ve bu script satırı `isActive: true` ile yazar. Yani
> üretimdeki kilit "`isActive = false` olarak kaydedilmiş bir satır" değil,
> **satırın ve KPSS üyeliklerinin hiç açılmamış olmasıdır**; `isActive = false`
> ise elde duran kill-switch'tir. Bu görev bu durumu değiştirmedi.
