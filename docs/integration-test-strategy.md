# Entegrasyon testi standardı

Bu belge `tests/integration` katmanının **neyi test ettiğini, neyi bilerek test etmediğini** ve nasıl koşulduğunu tanımlar (OD-012).

## Neden ayrı bir katman

Depoda üç doğrulama katmanı var ve üçünün kapsamı örtüşmez:

| Katman | Nerede | Neyi kanıtlar | Neyi kanıtlamaz |
|---|---|---|---|
| Unit (`npm run test:unit`) | `lib/**/*.test.ts` | Saf kural, skorlama, şema, biçimlendirme | Sorgunun gerçekten doğru satırları getirdiğini |
| Entegrasyon (`npm run test:integration`) | `tests/integration/*.integration.ts` | Yetki kapsamı + transaction + gerçek veritabanı kısıtı | Tarayıcı davranışını, oturum çerezini, render'ı |
| E2E (`npm run e2e`) | `tests/e2e/*.spec.ts` | Rol yolculuğu, erişilebilirlik, gerçek HTTP | Yarış durumlarını, benzersiz indeks davranışını |

En pahalı hata sınıfı ortadaki katmanda çıkıyor: bir `where` bloğunun sessizce genişlemesi, iyimser kilidin kaybolması, aynı isteğin iki kayıt açması. Bunların hiçbiri saf testte görünmez, E2E'de ise ancak tesadüfen yakalanır.

## Kapsam — yalnız yedi alan

Her şey entegrasyon testi yapılmaz; koşu süresi ve bakım maliyeti buna değmez. Gerçek Postgres yalnız şu yedi sözleşme için kullanılır:

| Suite | Alan | Korunan sözleşme |
|---|---|---|
| `entitlement-matrix.integration.ts` | Ürün yetkisi | Üyelik satırının başlangıç/bitiş/iptal alanları erişimi gerçekten kapatır; personel üyelik satırına bağlı değildir; materyal kapsamı rol başına daralır |
| `lesson-close.integration.ts` | Ders kapanışı | İyimser kilit kayıp güncellemeyi engeller; bayat sürüm reddedilir; tekrar gönderilen aynı kapanış replay sayılır |
| `adaptive-plan.integration.ts` | Haftalık plan | Aday toplama başka öğrencinin verisini almaz; sona ermiş kayıt plan üretmez; haftada tek plan satırı |
| `intervention-dedupe.integration.ts` | Müdahale gelen kutusu | Parmak izi tekilleştirmesi eş zamanlı üretimde de tutar; sinyaller tek bölümde birleşir; kapsam öğretmenin grubuyla sınırlı |
| `parent-scope.integration.ts` | Veli ve öğretmen kapsamı | Bağlı olmayan kimlik 404; ürün erişimi çocuğun kendi üyeliğinden gelir; bağ koptuğunda erişim aynı anda kaybolur |
| `coaching-privacy.integration.ts` | Koçluk gizliliği | `privateNote` hiçbir okuma yolunda dönmez; koç yalnız kendi öğrencisini görür |
| `dino-replay.integration.ts` | Dino AI | Aynı `requestKey` ikinci yanıt üretmez ve başkasının yanıtını açmaz; rolün göremediği veri modele gitmez; kota İstanbul gününe göre sayılır |
| `account-lifecycle.integration.ts` | Ödeme sonrası hesap devralma | Davet tek kullanımlıktır ve eskisini geçersizleştirir; parola/oturum/tercih tek işlemde yazılır; veli reddi bağı siler ve istisna doğurur |

OD-013 ile eklenen sekizinci suite aynı gerekçeyle buradadır: ödeme sonrası hesap devralma baştan sona transaction ve kısıt davranışıdır.

Ayrıca daha önce yazılmış iki suite aynı katmanda kalır: `business.integration.ts` (Instagram/finans/KVKK) ve `rate-limit.integration.ts` (paralel sunucu kotası).

## Neyi bilerek test etmiyoruz

**HTTP route handler'ları doğrudan çağrılmaz.** `cookies()` ve `headers()` Next'in istek deposunu (`work-unit-async-storage`) gerektiriyor; sahte bir depo kurmak Next'in iç API'sine sıkı bağlanır ve her sürüm yükseltmesinde sessizce kırılır. Route'ların kimlik doğrulama yüzeyi E2E'de ölçülür; kapsam ve kısıt sözleşmesi burada, route'ların çağırdığı sunucu modülleri üzerinden ölçülür. Bu yüzden ders kapanışının iyimser kilidi `lib/lesson-close-server.ts` içinde ayrı durur.

`next/navigation` Node altında `react-server` koşuluyla çözülmüyor (paketin kök `navigation.js` dosyası koşulsuz olarak istemci derlemesine gidiyor). `tests/integration/support/next-react-server.cjs` bunu `navigation.react-server.js`'e yönlendirir; `notFound()` böylece gerçek digest'iyle (`NEXT_HTTP_ERROR_FALLBACK;404`) fırlar ve kapsam dışı kimlikler doğrulanabilir.

## Koşma

Testler **varsayılan olarak atlanır**; bayrak açık değilse suite kırmızı yanmaz.

| Bayrak | Açtığı suite'ler |
|---|---|
| `PANEL_INTEGRATION_TEST=true` | Yukarıdaki yedi panel suite'i |
| `BUSINESS_INTEGRATION_TEST=true` | `business.integration.ts` |
| `RATE_LIMIT_INTEGRATION_TEST=true` | `rate-limit.integration.ts` |

```bash
createdb od_integration
export DATABASE_URL="postgresql://$(whoami)@localhost:5432/od_integration?schema=public"
export DIRECT_URL="$DATABASE_URL"
npx prisma db push --skip-generate
npm run db:seed          # yalnız business suite'i için gerekli
PANEL_INTEGRATION_TEST=true \
RATE_LIMIT_INTEGRATION_TEST=true \
BUSINESS_INTEGRATION_TEST=true \
npm run test:integration
```

CI'da `integration` işi bu üç bayrağı da açar ve suite'i geçici bir `postgres:16-alpine` servisine karşı koşar.

## Fixture kuralları

- Testler **tohum verisine dokunmaz**; her senaryo kendi kullanıcısını, grubunu ve kaydını yaratır.
- Yaratılan her şey `cleanupFixtures()` ile silinir. Silme sırası kısıtlara bağlıdır: önce gruplar (ders/ödev cascade), sonra öğrenci kullanıcıları (koçluk ve tekrar öğeleri cascade), sonra katalog sürümleri (`LessonOutcome.outcome` → `Restrict`), en son personel.
- Bu yüzden suite **aynı veritabanında art arda koşulabilir** — E2E suite'inin aksine, orada her koşu için taze bir veritabanı gerekiyor.
- Dosyalar `--test-concurrency=1` ile sırayla koşar: aynı veritabanını paylaştıkları için hem bağlantı havuzu hem de sayım doğrulamaları belirlenimli kalır.
