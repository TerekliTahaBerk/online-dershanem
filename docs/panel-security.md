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

## Admin öğretmen çalışma modu

Her yöneticinin bir `TeacherProfile`'ı vardır. Admin **kendi** öğretmen
paneline geçip yazabilir; öğretmenlerin yönetici hesabı yoktur.

Ayrıntılar: [`docs/admin-teacher-mode.md`](admin-teacher-mode.md).

## Content Security Policy

Tanım: `proxy.ts`. Regresyon testi:
`tests/e2e/security-headers.spec.ts`.

### 2026-08-04'te yapılan sıkılaştırma

| Direktif | Önce | Sonra | Gerekçe |
|---|---|---|---|
| `script-src` | `'unsafe-eval'` her ortamda | yalnız **development** | Gerekçe olarak framer-motion gösteriliyordu; o paket bu projede **bağımlılık değil** ve kod tabanında `eval`/`new Function` yok. Production Next.js bundle'ı eval gerektirmez. |
| `script-src` | pixel origin'leri **yok** | `connect.facebook.net`, `analytics.tiktok.com` eklendi | `components/analytics/pixels.tsx` bu origin'lerden script yüklüyordu; listede olmadıkları için pixel kimlikleri tanımlıyken **sessizce bloklanıyorlardı**. |
| `img-src` | `https: http:` | `https:` | Düz `http:` kaldırıldı. HTTPS sayfada zaten mixed-content olarak engellenir. |
| `connect-src` | pixel uçları yok | `analytics.tiktok.com`, `www.facebook.com` eklendi | Pixel'lerin olay göndermesi için gerekli. |

### 2026-09-13 nonce geçişi

Proxy her HTML isteği için kriptografik olarak rastgele bir nonce üretir; CSP'yi
hem request hem response header'ına yazar. Next.js framework script'leri nonce'u
request CSP'sinden alır. Tema başlangıç script'i, JSON-LD blokları ve GA/Meta/
TikTok `next/script` bileşenleri de aynı nonce'u açıkça taşır.

`script-src` artık `'unsafe-inline'` içermez; `'nonce-<istek-değeri>'` ve
`'strict-dynamic'` kullanır. Development React hata ayıklaması için
`'unsafe-eval'` yalnız development ortamında eklenir.

React bileşenlerinde dinamik progress/ölçü değerleri için çok sayıda güvenli
`style` prop'u bulunduğundan style attribute'ları `style-src-attr
'unsafe-inline'` ile sınırlı biçimde korunur. Inline `<style>` etiketleri ise
`style-src-elem` üzerinden nonce gerektirir.

`img-src https:` kaldırılmıştır. İzinli uzak görsel/beacon kaynakları yalnız
Google Analytics alt alanları, `www.facebook.com`, `analytics.tiktok.com` ve
TikTok alt alanlarıdır. Uygulama görselleri ve özel Blob dosyaları aynı-origin
URL/API route'ları üzerinden sunulur.

Nonce tüm sayfaları dinamik render'a geçirir; statik HTML/CDN cache'i yerine her
istekte yeni nonce üretilmesi güvenlik gereğidir.

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
