# Production rollback runbook

Canlı uygulamanın mevcut deployment yolu Vercel'dir. `release.yml` ayrıca GHCR'a
çok mimarili bir container image yayımlar ve digest/provenance üretir, fakat bu
image'i production'a deploy eden bir adım içermez. Bu nedenle rollback workflow'u
bir GHCR digest'i değil, daha önce başarılı olmuş bir **Vercel production
deployment URL veya ID'si** kabul eder. Container tabanlı production'a geçilirse
önce gerçek deploy hedefi (Kubernetes, VM, ECS vb.) repo içinde tanımlanmalı;
ancak ondan sonra registry digest doğrulaması ve o hedefe rollout eklenmelidir.

## Ne zaman rollback yapılır

- Production health/readiness başarısızsa veya kritik kullanıcı akışı bozulduysa.
- Yetki, veri bütünlüğü, ödeme ya da sınav sonucu açısından yüksek etkili bir
  regresyon varsa.
- İleri düzeltmenin hazırlanması, bilinen iyi deployment'a dönmekten daha uzun
  ve riskliyse.

Migration geriye uyumlu değilse yalnız uygulama rollback'i yeterli olmayabilir.
Veritabanına ters migration'ı otomatik uygulamayın; veri etkisini ayrıca inceleyin.

## Bilinen iyi deployment'ı bulma

Vercel dashboard'da proje için **Deployments** sayfasını açın, production filtresi
uygulayın ve olaydan önce health/smoke kontrolleri geçen deployment'ın URL veya
ID'sini kopyalayın. CLI erişimi olan operatör aynı listeyi `vercel ls --prod`
ile inceleyebilir ve adayı `vercel inspect <url-or-id>` ile doğrulayabilir.

GHCR artefact geçmişi yalnız sürüm/digest denetimi içindir. GitHub'da
**Actions → Release → başarılı run → Publish container / release özeti** yolundan
image digest bulunabilir; bu digest mevcut Vercel rollback hedefi değildir.

## Tek tık rollback

1. GitHub'da **Actions → Production Rollback → Run workflow** yoluna gidin.
2. Daha önce başarılı olan Vercel deployment URL/ID'sini `deployment` alanına
   girin; olay veya karar kaydını `reason` alanına yazın.
3. Production environment protection reviewer'ı olarak hedefi ve nedeni
   doğrulayıp job'ı onaylayın.
4. Workflow önce `vercel inspect` ile hedefin erişilebilir olduğunu doğrular,
   sonra production alias'ını `vercel rollback` ile o deployment'a çevirir.
5. Son adım mevcut production health sözleşmesini çalıştırır ve sonucu job
   summary'ye yazar.

Workflow için repository/environment secrets olarak `VERCEL_TOKEN`,
`VERCEL_ORG_ID` ve `VERCEL_PROJECT_ID` gereklidir. `production` GitHub
environment'ında required reviewer tanımlanmalıdır; aksi halde workflow manuel
başlatılsa da ikinci bir insan onayı kapısı oluşmaz.

## Rollback sonrası

- `/api/health` için status `ok` veya `degraded`, `db.ok=true` olduğunu doğrulayın.
- `Production Smoke` workflow'unu manuel çalıştırın.
- Kritik admin, öğretmen, öğrenci ve veli akışlarında kısa kabul testi yapın.
- Son bir saatlik production error loglarını ve cron/background job durumunu
  inceleyin.
- Incident kaydına rollback run URL'sini, hedef deployment'ı, zamanı, karar
  sahibini ve takip düzeltmesini ekleyin.

Bu workflow gerçek production'a karşı çalıştırılmadan eklenmiştir. İlk gerçek
kullanımdan önce düşük riskli bir Vercel proje/ortamında aynı komut ve secrets
sözleşmesiyle prova edilmelidir.
