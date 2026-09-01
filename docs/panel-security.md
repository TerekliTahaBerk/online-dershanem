# Panel güvenliği

Kimlik, oturum, nesne sahipliği ve CSP modeli. RBAC ayrı dokümanda:
[`docs/business-rbac.md`](business-rbac.md).

## Oturum

- Çerezde **opak, 256-bit rastgele** token taşınır; veritabanında yalnız
  token'ın `sha256` özeti saklanır (`lib/auth/session.ts`). Veritabanı sızarsa
  oturumlar ele geçirilemez.
- Token hiçbir yerde loglanmaz.
- Çerez `HttpOnly`; `Secure` yalnız HTTPS dağıtımda. Mutlak ve boşta kalma
  sınırları sunucuda `lastSeenAt` üzerinden uygulanır:

  | Rol | Boşta kalma | Mutlak ömür |
  |---|---:|---:|
  | Öğrenci | 7 gün | 30 gün |
  | Veli | 7 gün | 30 gün |
  | Öğretmen | 24 saat | 7 gün |
  | Yönetici | 30 dakika | 12 saat |

  MFA ve adım yükseltme bu sınırları uzatmaz. Kullanıcılar
  `/panel/oturumlar` üzerinden açık oturumlarını görüp diğer cihazları
  kapatabilir.
- Parolalar scrypt ile doğrulanır.

## Yetki sınırı nerede

Gerçek yetki kontrolü **sorgunun yanında**, server-side guard'larda yapılır.
`proxy.ts` (middleware) yalnızca çerezin VARLIĞINA bakar ve **güvenlik sınırı
değildir** — doğrudan route handler çağrısıyla veya RSC payload isteğiyle
atlatılabilir. Dosyanın kendi başlığı da bunu açıkça yazar.

Yetkisiz nesnede **404** döner (403 değil), böylece nesnenin varlığı sızmaz.

Menüde link gizlemek de güvenlik sınırı değildir; her sayfa ve her server
action kendi guard'ını ayrıca çalıştırır.

## Admin panel önizleme (View As)

Yöneticiler oturumu değiştirmeden öğrenci/veli/öğretmen panelini
görüntüleyebilir. Bu **impersonation değildir**: `getSession()` ADMIN kalır;
preview yalnız sunum ve subject-scope veri katmanıdır; mutation'lar
salt-okunur engellenir.

Ayrıntılar: [`docs/admin-panel-preview.md`](admin-panel-preview.md).

## Content Security Policy

Tanım: `next.config.ts`. Regresyon testi:
`tests/e2e/security-headers.spec.ts`.

### 2026-08-04'te yapılan sıkılaştırma

| Direktif | Önce | Sonra | Gerekçe |
|---|---|---|---|
| `script-src` | `'unsafe-eval'` her ortamda | yalnız **development** | Gerekçe olarak framer-motion gösteriliyordu; o paket bu projede **bağımlılık değil** ve kod tabanında `eval`/`new Function` yok. Production Next.js bundle'ı eval gerektirmez. |
| `script-src` | pixel origin'leri **yok** | `connect.facebook.net`, `analytics.tiktok.com` eklendi | `components/analytics/pixels.tsx` bu origin'lerden script yüklüyordu; listede olmadıkları için pixel kimlikleri tanımlıyken **sessizce bloklanıyorlardı**. |
| `img-src` | `https: http:` | `https:` | Düz `http:` kaldırıldı. HTTPS sayfada zaten mixed-content olarak engellenir. |
| `connect-src` | pixel uçları yok | `analytics.tiktok.com`, `www.facebook.com` eklendi | Pixel'lerin olay göndermesi için gerekli. |

### Hâlâ gevşek kalan yer

`script-src 'unsafe-inline'` **korunuyor**. Next.js önyükleme script'leri ve
`next/script` inline blokları (GA/Meta/TikTok pixel kodları) bunu gerektiriyor.
Kaldırmak nonce tabanlı CSP'ye geçmeyi gerektirir: her istekte nonce üretip
proxy katmanından geçirmek ve `next/script` çağrılarına iletmek. Ayrı bir
çalışma paketidir ve **yapılmamıştır**.

Not: Bir CSP'de hem `'unsafe-inline'` hem nonce/hash bulunursa modern
tarayıcılar `'unsafe-inline'`'ı yok sayar — yani nonce'a geçiş kademeli
yapılabilir.

`img-src https:` de geniş bırakıldı: reklam ve analitik pikselleri çok sayıda,
değişken alan adı kullanıyor; daraltmak ölçüm kaybına yol açardı. Bu bilinçli
bir üründür, ihmal değil.

### CSP ihlal raporlama

`report-to` / `report-uri` **eklenmedi**. Eklenmesi bir toplama ucu ve saklama
politikası gerektirir; rapor gövdeleri URL ve yönlendiren bilgisi taşıdığı için
KVKK açısından ayrıca değerlendirilmelidir.

## Diğer header'lar

`Strict-Transport-Security` (yalnız HTTPS dağıtımda, 2 yıl + preload),
`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
`Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy` (kamera/mikrofon/konum kapalı),
`Cross-Origin-Opener-Policy: same-origin-allow-popups`.

Hepsi `tests/e2e/security-headers.spec.ts` içinde altı ana route üzerinde
doğrulanır.

## Mutation koruması

`lib/security/mutation-guard.ts` → `enforceMutation()`: same-origin kontrolü ve
kullanıcı bazlı rate limit. Bütün işletme server action'ları bundan geçer.
