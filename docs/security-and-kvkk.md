# Güvenlik ve KVKK

Mesaj, telefon ve e-posta kişisel veridir. Logger PII’yi maskeler; içerik/credential loglanmaz. Erişim iş birimi ve permission ile sınırlı, export audit’lidir. Secret’lar server env veya encryption abstraction’ında tutulur ve client’a dönmez.

Saklama süresi iş birimi ayarındaki `retentionDays` ile yönetilir (varsayılan 730, panel sınırı 30–3650 gün). Günlük `APPLY_BUSINESS_RETENTION` işi süresi dolmuş `CLOSED`/`SPAM` konuşmaların mesaj içeriği, medya/provider metadata’sı ve lead PII’sini anonimleştirir; finans/audit yasal saklama nedeniyle silinmez. Hukuki saklama zorunluluğu bulunan kayıtlar anonimleştirmeden önce operasyon tarafından açık konuşma durumunda tutulmalıdır. KVKK talebi kimlik doğrulama, kapsam, istisna, anonimleştirme ve audit adımlarından geçer.

Replay koruması unique event/idempotency, sahte teslim koruması raw-body HMAC, muhasebe bütünlüğü dönem kilidi ve ters kayıtla sağlanır. CSV spreadsheet formula injection’a karşı korunur.
# Distributed rate limiting

The application uses an exact PostgreSQL sliding window. Each allowed request
stores one `RateLimitEntry`; rejected requests store nothing. A transaction-level
advisory lock derived from the normalized key serializes the read/insert decision
across all serverless instances. The oldest active token determines `Retry-After`,
and the daily prune job removes entries older than 24 hours.

Client IP trust is topology-specific:

- On Vercel (the default), only `x-vercel-forwarded-for` is accepted in
  production. Arbitrary `x-forwarded-for`, `x-real-ip`, and Cloudflare headers
  are not fallback identities.
- Set `RATE_LIMIT_PROXY_MODE=cloudflare` only when every public request must pass
  through Cloudflare and direct access to the Vercel deployment URL is blocked.
  In that mode only the single, validated `CF-Connecting-IP` value is accepted.
- Local development accepts validated forwarding headers to support browser and
  integration tests. Invalid/missing values share the fail-closed `unknown` key.

[Vercel documents](https://examples.vercel.com/docs/headers/request-headers)
that it overwrites `X-Forwarded-For` unless Trusted Proxy is enabled and provides
`x-vercel-forwarded-for` as its stable platform header. [Cloudflare
documents](https://developers.cloudflare.com/fundamentals/reference/http-headers/#cf-connecting-ip)
`CF-Connecting-IP` as the single visitor address sent to an origin, but it is
trustworthy only when the origin accepts traffic exclusively from Cloudflare.
