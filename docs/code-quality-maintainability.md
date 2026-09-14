# Kod kalitesi ve sürdürülebilirlik uygulama raporu

## Örtüşme kontrolü

- `package.json` içinde `postinstall: prisma generate` mevcut; codegen'e dokunulmadı.
- `scripts/lib/cli-logger.mjs` mevcut; logger yeniden kurulmadı, ortak redaction helper'ına bağlandı.

## En büyük route refactor dilimi

Bu turda en büyük 10 route'un yerel şema, deterministik hesaplama, hata eşleme, bildirim veya veri-snapshot işleri domain modüllerine çıkarıldı. DB mutation orkestrasyonu davranış değişikliği riskini azaltmak için aynı sırada bırakıldı.

| Route | Önce | Sonra | Çıkarılan sınır |
| --- | ---: | ---: | --- |
| `paytr/callback` | 426 | 401 | Callback parse ve test-failure çözümleme |
| `od/checkout/start` | 417 | 350 | Input contract, consent, line fingerprint |
| `panel/groups/[id]` | 391 | 310 | Action contract, lifecycle eşleme, bildirim servisi |
| `panel/groups/[id]/members` | 380 | 343 | Action contract, lifecycle eşleme, bildirim servisi |
| `panel/users/[id]/offboarding` | 371 | 266 | Snapshot sorgusu, blocker üretimi, input contract |
| `panel/users/bulk` | 370 | 311 | Bulk contract ve öğretmen offboarding snapshot'ı |
| `panel/lessons/[id]` | 318 | 267 | Action contract, scope etiketi, lifecycle eşleme |
| `panel/users/[id]` | 228 | 166 | Profil contract'ı, delete sayaç/blocker politikası |
| `panel/lessons` | 226 | 185 | Oluşturma contract'ı ve occurrence hesaplama |
| `panel/dino` | 225 | 205 | Request contract, kota clamp ve telemetri bantları |

Yeni doğrudan unit testler `lib/api/route-extractions.test.ts` içinde PayTR parse, checkout consent/fingerprint, Dino bantları ve kullanıcı-silme blocker'larını kapsar. API zarfı `lib/api/response.test.ts`, redaction ise `lib/security/redaction.test.ts` ile test edilir.

### Sonraki tur adayları

150+ satır olup ilk 10 dışında kalanlar: `panel/lessons/[id]/notes`, `panel/kocum/suggestions/[id]/review`, `panel/kocum/tasks`, `auth/login`, `cron/panel-reminders`, `panel/users/[id]/status`, `panel/assignments`, `panel/users`, `panel/kocum/tasks/[id]/complete`, `odk/admin/exams/[id]/assignments`, `panel/kocum/plans/[id]/copy`.

## Script redaction

Ortak hassas alan politikası `lib/security/redaction.mjs` içindedir ve audit payload'ı, uygulama logger'ı ve CLI logger tarafından kullanılır. Kapsam: e-posta, telefon, parola, token/access/refresh token, authorization, cookie, secret/API anahtarı/hash, T.C./kimlik numarası, ad-soyad, öğrenci adı ve veli adı. Anahtarsız metindeki e-posta, Türkiye cep telefonu ve Bearer token desenleri de maskelenir. Güvenlik garantisinin debug ayarıyla sessizce kapanmaması için eski `LOG_PII_MASK=0` kaçışı kaldırılmıştır.

`scripts/create-admin.ts` içindeki e-posta logları yapılandırılmış context'e geçirildi. Script artık ekrana geçici parola basmak yerine `ADMIN_PASSWORD` ister ve değeri loglamaz; böylece maskelenmiş, kullanılamaz bir hesap da üretmez. `scripts/check-repo-hygiene.mjs`, `scripts/` altında hassas isimli bir değişkenin template string veya doğrudan log argümanı olarak verilmesini artık build kapısında reddeder. Ortak CLI logger'ı kullanan 11 script merkezi redaction garantisini otomatik alır; doğrudan değişiklik gereken script sayısı 1'dir.

## Doğrulama

- `npm run lint`: geçti.
- `npm run typecheck`: geçti.
- `npm run test:unit`: 639/639 geçti.
- `npm run lint:hygiene`: geçti.
- `npm run test:integration`: izole ve migrate edilmiş geçici Postgres üzerinde 32/32 geçti; test kümesi ardından silindi.
