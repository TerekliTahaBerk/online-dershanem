# 0012 — Oturum doğrulaması ve iptali koşullu `updateMany` ile atomik yapılır

| Durum | Tarih | Sahip |
| --- | --- | --- |
| Kabul Edildi | 2026-08-13 | Taha Berk |

## Bağlam

`getSession()` önce oturumu okuyup süre/rol/durum kontrolünü uygulamada yapıyordu. Oku-sonra-yaz
arasında eşzamanlı bir istek (ör. rolü değişen veya askıya alınan kullanıcı, iptal edilmiş oturum)
eski okumaya dayanarak `lastSeenAt` yazıp süresi dolmuş oturumu "diriltebilir". Rol bazlı mutlak ve
boşta kalma süreleri [Y-75] ile eklendi.

## Karar

Oturum aktivitesi, bütün geçerlilik koşullarını `WHERE` içinde taşıyan tek bir
`session.updateMany` ile yazılır: `revokedAt: null`, `expiresAt > now`, mutlak TTL, boşta kalma
süresi ve `user: { status: "ACTIVE", role }`. `count !== 1` ise oturum geçersiz sayılır. İptaller de
`updateMany({ where: { id, revokedAt: null } })` ile idempotenttir. Aynı desen tek kullanımlık MFA
nesnelerinde de kullanılır (kurtarma kodu `usedAt: null`, WebAuthn challenge `consumedAt: null`).

## Sonuçlar / Riskler

- Karar veritabanında tek işlemde verilir; eski okuma bir oturumu uzatamaz, tek kullanımlık kod iki
  kez tüketilemez.
- `findUnique` + `updateMany` her istekte iki sorgudur; `cache()` bunu istek başına bir kereye indirir.
- `updateMany` kayıt döndürmez; kullanıcı alanları ilk okumadan gelir. Rol/durum koşulu `WHERE`
  içinde olduğu için bu okuma yetki kararında kullanılmaz.

## Kanıt

- `lib/auth/session.ts` — `getSession`, `revokeSession`, `revokeAllUserSessions`
- `lib/auth/mfa.ts`, `lib/auth/webauthn.ts` — tek kullanımlık tüketim
- `cc432ea` — [Y-75] Enforce role-based session lifetimes (#177)
