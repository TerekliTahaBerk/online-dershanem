# Build kimliği ve sürüm eşleşmesi

Production'ın `main` ile aynı commit'te olup olmadığı tahmine bırakılmaz.
Deploy edilen artefakt kendi kimliğini taşır; "hangi sürüm yayında?" sorusunun
tek bir cevabı vardır ve dört yüzeyin dördü de aynı değeri gösterir.

## Nerede görünür

| Yüzey | Nasıl bakılır | Ne gösterir |
| --- | --- | --- |
| Yanıt başlıkları | `curl -sI https://www.onlinedershanem.com/` | `x-build-sha`, `x-build-version`, `x-build-ref`, `x-build-time` |
| Sürüm ucu | `curl -s https://www.onlinedershanem.com/api/version` | Tam kimlik + `stamp` |
| Sağlık uçları | `/api/health`, `/api/health/ready`, `/api/health/live`, `/api/smoke` | Yanıtın `build` alanı |
| Site footer | Sayfanın altı | `v0.1.1 · 47d8d28` damgası; tam SHA tooltip'te |

Footer damgası destek kayıtları içindir: ekran görüntüsü tek başına hangi build'in
konuşulduğunu söyler. Başlıklar ve `/api/version` otomasyon içindir.

Bu alanların hiçbiri gizli bilgi içermez — yalnızca commit SHA, sürüm, branch adı
ve build zamanı. Depo özel olsa da SHA tek başına içerik açığa çıkarmaz.

## Değerler nereden gelir

`lib/build-info.ts` tek kaynaktır ve `process.env`'i şu öncelikle okur:

1. `APP_BUILD_*` — build hattının açıkça verdiği değerler (container, `vercel.json`).
2. `VERCEL_GIT_COMMIT_SHA` / `VERCEL_GIT_COMMIT_REF` — Vercel sistem değişkenleri.
3. `GITHUB_SHA` / `GITHUB_REF_NAME` — CI içinde çalışırken.

`next.config.ts` bu değerleri build sırasında bir kez çözer, `env` bloğuyla
artefaktın içine gömer ve aynı değerleri `x-build-*` başlıklarına yazar. Gömme
runtime `process.env`'e bağımlılığı kaldırır: container'ın `node server.js`'i de,
Vercel fonksiyonu da aynı sabiti okur.

`APP_BUILD_TIME` bilerek `next.config.ts` içinde üretilmez. Next bu dosyayı build
sırasında birden çok süreçte değerlendirir; `new Date()` her değerlendirmede başka
bir değer verir ve aynı build başlıkta bir, gövdede başka bir zaman bildirirdi.
Zaman damgasını build hattı verir (`vercel.json` buildCommand, `Dockerfile`);
verilmezse alan `null` kalır — yanlış bir değer üretmekten iyidir.

Container build'inde değerler `--build-arg BUILD_SHA=... BUILD_REF=... BUILD_RELEASE=...
BUILD_VERSION=...` ile geçer; `Dockerfile` bunları hem `APP_BUILD_*` ENV'ine hem de
`org.opencontainers.image.revision` / `.version` etiketlerine yazar.

## Sapma kontrolü

`scripts/check-production-version.mjs` yayındaki commit'i beklenen commit ile
karşılaştırır:

```bash
npm run verify:production-version                                  # main'in ucuna karşı
npm run verify:production-version -- --url https://preview.example  # başka hedef
npm run verify:production-version -- --expected <sha> --warn-only
```

Çıkış kodları: `0` eşleşti, `1` sapma var, `2` kimlik okunamadı.

`Production Health` iş akışı (`.github/workflows/production-health.yml`) bunu 15
dakikada bir çalıştırır. Sağlıklı ama eski bir deploy da "yeşil" göründüğü için
sürüm kontrolü ayrı bir sinyaldir. Bir merge'ün deploy'u uçuşta olabileceğinden
ilk sapmada 90 saniye beklenip bir kez daha bakılır; ikinci sapma gerçek sapmadır
ve iş akışı kırmızıya döner.

## Rollback sonrası

`Production Rollback` iş akışı geri alma sonrası yayındaki build'i `/api/version`
üzerinden okuyup iş özetine yazar. Rollback'ten sonra production `main`'in
gerisindedir; bu **kasıtlıdır** ve sürüm kontrolü, düzeltme commit'i deploy edilene
kadar kırmızı kalır. Bu süre boyunca kırmızı sinyal beklenen durumdur — özetteki
commit hangi sürümün yayında olduğunu kayda geçirir.

## Release

`Release` iş akışı tag'i `package.json` sürümüyle eşleştirir, container'a build
argümanlarını geçer ve GitHub Release gövdesine release/commit tablosunu yazar.
Yayına alındıktan sonra `/api/version` o commit'i döndürmelidir.
