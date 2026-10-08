# M1 API sözleşmeleri

Kaynak kod: `lib/mobile-contracts/` (tek kaynak; sunucu ve mobil aynı dosyayı derler). Bu belge uygulanmış durumu anlatır.

## 1. Paylaşılan sözleşme modülü

| Dosya | İçerik |
| --- | --- |
| `lib/mobile-contracts/bootstrap.ts` | `MobileBootstrap` tipleri + bağımlılıksız `parseMobileBootstrap()` doğrulayıcısı |
| `lib/mobile-contracts/api.ts` | Kararlı hata kodları (`MOBILE_API_ERROR_CODES`), giriş / bildirim / oturum listesi tipleri ve doğrulayıcıları |

Kurallar (CI: `scripts/check-mobile-contracts.mjs`, mobil iş akışında çalışır):

- Dizindeki dosyalar yalnız aynı dizinden göreli import yapabilir (`./x`). Prisma, `server-only`, zod, Node API'leri, `process.env`, `require`, dinamik `import()` yasak.
- `mobile/src/**` içinde `../lib/**` (sözleşmeler dışında), `@prisma/*`, `server-only`, `next/*`, `node:*` importu yasak. Mobil sözleşmelere yalnız `@contracts/*` alias'ıyla erişir (`tsconfig` + Metro `watchFolders` + Jest `moduleNameMapper`).
- Doğrulama ayrıca derleme çıktısında yapıldı: Android ve iOS Hermes paketlerinde `PrismaClient`, `@prisma`, `server-only`, `DATABASE_URL` geçmiyor; `contractVersion` geçiyor (bkz. `m1-test-results.md`).
- **Tarihler** daima ISO-8601 UTC dizgisidir (`toISOString()`); doğrulayıcı `YYYY-MM-DDTHH:mm:ss(.sss)Z` dışını reddeder.
- **Eklemeli değişiklik:** bilinmeyen ek alanlar doğrulayıcıda yok sayılır. Alan kaldırmak / anlamını değiştirmek `contractVersion` artışı ve en az iki mağaza sürümlük geçiş gerektirir.

Tip uyumu tek başına kanıt değildir; gerçek JSON şu testlerle doğrulayıcıdan geçirildi: `lib/mobile/bootstrap.test.ts` (unit), `tests/integration/mobile-auth.integration.ts` (gerçek veritabanı), `tests/e2e/mobile-api.spec.ts` (gerçek HTTP yanıtı), `mobile/src/lib/api/endpoints.test.ts` (istemci güven sınırı).

## 2. Yeni uç: `GET /api/panel/me`

Route: `app/api/panel/me/route.ts` · Veri: `lib/mobile/bootstrap-server.ts` (mevcut alan servislerini çağırır) · Saf karar katmanı: `lib/mobile/bootstrap.ts`.

**Yetki:** `requireApiSessionBeforeGates()` — geçerli oturum şart; parola ve MFA kapıları **uygulanmaz** ki uç kapı durumunu raporlayabilsin. Bu nedenle yanıt projeksiyonu kapıya bağlıdır (aşağıda). Admin önizleme / öğretmen modu bindirilmez; daima gerçek aktör.

**Sürüm kapısı:** önce `evaluateClientVersion` (bkz. §5).

**Yanıt** (`Cache-Control: no-store, private`):

```jsonc
{
  "contractVersion": 1,
  "serverTime": "2026-10-08T09:00:00.000Z",
  "user": { "id": "…", "fullName": "…", "email": "…", "role": "STUDENT" },
  "gates": {
    "status": "READY",                 // PASSWORD_CHANGE_REQUIRED | MFA_REQUIRED | READY
    "passwordChangeRequired": false,
    "mfaRequired": false,
    "mfa": null,                       // yalnız MFA_REQUIRED iken: { enrolled, totp, recoveryCodes, passkey }
    "previewActive": false
  },
  "client": { "minSupportedVersion": "1.0.0" },   // veya null
  "workspace": {                       // gates.status !== "READY" iken DAİMA null
    "products": [{ "code": "OD", "label": "onlinedershanem.", "state": "ACTIVE" }, …],  // OD, OK, ODK sabit sırada
    "activeProduct": "OD",             // yalnız ACTIVE ürün; bayat seçim null
    "selectionRequired": false,        // >1 ACTIVE ve seçim yok
    "navigation": {
      "primary":  [{ "id": "today", "label": "Bugün", "webPath": "/panel/ogrenci" }, …],   // mobilePrimaryNav
      "sections": [{ "id": "bugun", "title": "BUGÜN", "items": [ … ] }, …]               // panelNavSections
    },
    "flags": { "assignmentEvidence": false, … },     // getPanelFeatureFlags()
    "capabilities": { "staffPermissions": ["od:lesson:teach", …] },   // öğrenci/veli: []
    "parent": { "children": [{ "studentId": "…", "name": "…" }] },    // yalnız PARENT
    "unreadNotifications": 3
  }
}
```

| Alan | Kaynak (mevcut kod) |
| --- | --- |
| `gates.mfaRequired` | `userRequiresLoginMfa` (ADMIN girişte muaf; ayrıcalıklı personel zorunlu) + `session.mfaVerifiedAt` |
| `gates.mfa` | `/api/auth/mfa/status` ile aynı tablolar (`adminMfa`, `passkeyCredential`, `mfaRecoveryCode`) |
| `gates.previewActive` | `getResolvedAdminPreview`, `getResolvedAdminTeacherMode` (yalnız ADMIN) |
| `products[].state` | `loadProductPanelStates` (üyelik + OD/ODK pilot kapıları + veli `PREPARING`) |
| `activeProduct` | `Session.activeProduct` yalnız `ACTIVE` ürünlerden biriyse (`selectActiveWorkspace`) |
| `navigation` | `panelNavSections`, `mobilePrimaryNav` (rol, `getAccessibleProducts`, flag'ler, kapsam, enforce modunda personel Deneme Ligi izinleri — `PanelShell` ile aynı kural) |
| `capabilities.staffPermissions` | `effectiveStaffPermissions` (ADMIN: tüm `STAFF_PERMISSIONS`) |
| `parent.children` | `listParentVisibleChildren(userId, "academic")` (`canViewAcademic=false` çocuk yok) |
| `unreadNotifications` | `notification.count({ readAt: null, inAppVisible: true })` |

**Kapı projeksiyonu (güvenlik sınırı):** kapı `READY` değilken sunucu ürün / menü / yetenek / çocuk / bildirim sorgularını **hiç çalıştırmaz** ve `projectBootstrap` ayrıca `workspace`'i null'a zorlar; istemci doğrulayıcısı kapı açık değilken dolu `workspace`'i reddeder ve `status` ile bayrakların çelişmesini reddeder.

**Mutasyon:** yok. Her kimlikli istekte olduğu gibi oturumun `lastSeenAt` alanı güncellenir.

## 3. Yeni uç: `GET /api/auth/sessions`

`requireApiActiveUser` (kapılar uygulanır). Kaynak: `listActiveUserSessions` (web `/panel/oturumlar` ile aynı). Yanıt: `{ sessions: [{ id, current, createdAt, lastSeenAt, expiresAt, device }] }`. Token, token hash'i, IP ve ham user-agent **dönmez**; `device` = `sessionDeviceLabel(userAgent)` (`lib/auth/session-device.ts`, web oturum ekranı da artık aynı fonksiyonu kullanıyor). İptal için mevcut `DELETE /api/auth/sessions/[id]` (bu cihaz hariç) ve `POST /api/auth/sessions/others`.

## 4. Değişen uçlar (geriye uyumlu)

| Uç | Değişiklik | Web etkisi |
| --- | --- | --- |
| `POST /api/auth/login` | `X-Od-Client: mobile` → token gövdede, **Set-Cookie yok**, `Cache-Control: no-store`; desteklenmeyen mobil sürüm → `426 CLIENT_UPGRADE_REQUIRED` | Yok (başlıksız istek: çerez yazılır, token dönmez — E2E ile doğrulandı) |
| `POST /api/auth/invite/accept` | Mobil istekte çerez yazılmaz (`loginTransport`) | Yok |
| `lib/auth/session.ts#getSession` | Çerez ≠ Bearer → oturum yok (bkz. güvenlik incelemesi) | Web `Authorization` göndermez; davranış aynı |
| Merkezi API kapıları (`lib/auth/api-guards.ts`) | Mevcut `error` metinleri aynen korunarak `code` eklendi | Eklemeli; web istemcileri `error` okur |
| `POST /api/panel/active-product` | 401/403 yanıtlarına `code` eklendi | Eklemeli |

## 5. Kararlı hata kodları

| Kod | HTTP | Kaynak |
| --- | --- | --- |
| `UNAUTHENTICATED` | 401 | oturum yok / süresi dolmuş / iptal / çakışan kimlik |
| `PASSWORD_CHANGE_REQUIRED` | 403 | `mustChangePassword` |
| `MFA_REQUIRED` | 403 | ayrıcalıklı personel, MFA doğrulanmamış (önceden vardı) |
| `STEP_UP_REQUIRED` | 428 | hassas personel işlemi (önceden vardı) |
| `FORBIDDEN` | 403 | rol / personel izni yok |
| `PRODUCT_ACCESS_REQUIRED` | 404 (uçlarda), 403 (`active-product`) | ürün üyeliği yok |
| `PILOT_UNAVAILABLE` | 404 (uçlarda), 403 (`active-product`) | pilot kapsamı dışında |
| `PILOT_PAUSED` | 503 | pilot kill switch |
| `PANEL_DISABLED` | 503 | `PANEL_ENABLED=false` |
| `CLIENT_UPGRADE_REQUIRED` | 426 | mobil sürüm minimumun altında (+ `minSupportedVersion`) |
| `RATE_LIMIT`, `ORIGIN`, `ADMIN_PREVIEW_READONLY` | 429 / 403 | `mutationGuardResponse` (önceden vardı) |

Flag kapalı ve "kaynak bulunamadı" 404'leri route'lara dağınık olduğu için M1'de kod almadı; mobil bunları `not_found` sınıfında toplar ve **bootstrap'ı yenilemez** (döngü önleme). Yalnız `PASSWORD_CHANGE_REQUIRED`, `MFA_REQUIRED`, `PRODUCT_ACCESS_REQUIRED`, `PILOT_UNAVAILABLE` bootstrap yenilemesini tetikler ve 15 sn bekleme süresiyle sınırlıdır (`mobile/src/lib/auth/gate-refresh.ts`).

## 6. Sürüm uyumluluğu politikası

- İstemci her istekte `X-Od-Client: mobile` ve `X-Od-Client-Version: <kurulu sürüm>` gönderir. Sürüm `expo-application.nativeApplicationVersion`'dan (Expo Go'da `app.json` sürümü) **okunur**, sabit yazılmaz; okunamazsa başlık gönderilmez.
- Sunucu: `MOBILE_MIN_SUPPORTED_VERSION` (isteğe bağlı, `x.y.z`, `lib/env-contract.ts` biçimi doğrular). **Tanımsızsa kapı kapalıdır** — yerel geliştirme engellenmez.
- Kapı açıkken mobil isteğin sürümü eksik / geçersiz / düşükse `login` ve `GET /api/panel/me` `426 CLIENT_UPGRADE_REQUIRED` döner. Mobil olmayan (web) istekler hiç etkilenmez.
- Bootstrap yanıtı `client.minSupportedVersion` taşır; istemci kendi sürümünü karşılaştırıp "Güncelleme gerekli" ekranı gösterir (sunucu kapısının yedeği).
- Bu kontrol **güvenlik sınırı değildir**: başlık taklit edilebilir; parola / MFA / yetki kapıları her istekte sunucuda bağımsız çalışır. Desteklenmeyen istemci güvenlik kapısını atlayamaz.
- Yükseltme prosedürü: yeni sürüm mağazada yayımlandıktan sonra `MOBILE_MIN_SUPPORTED_VERSION` artırılır (dağıtım gerektirmeyen ortam değişkeni değişikliği + yeniden başlatma).

## 7. Mobilin M1'de kullandığı uçlar

| İşlem | Uç | Doğrulayıcı |
| --- | --- | --- |
| Giriş | `POST /api/auth/login` | `parseMobileLoginResponse` |
| Çıkış | `POST /api/auth/logout` | — |
| Parolamı unuttum | `POST /api/auth/forgot-password` | — |
| Bootstrap | `GET /api/panel/me` | `parseMobileBootstrap` |
| Parola değiştir | `POST /api/auth/change-password` | — (sonra bootstrap) |
| MFA doğrula | `POST /api/auth/mfa/code/verify` (`purpose: AUTHENTICATE`, `TOTP` / `RECOVERY`) | `verified === true` şart |
| Çalışma alanı | `POST /api/panel/active-product` | — (sonra bootstrap) |
| Bildirimler | `GET /api/panel/notifications?page&status` | `parseNotificationPage` |
| Okundu | `POST /api/panel/notifications/read` | `ok === true` şart |
| Oturumlar | `GET /api/auth/sessions`, `DELETE /api/auth/sessions/[id]`, `POST /api/auth/sessions/others` | `parseSessionList` |
| Korunan eski ekranlar | `student/home`, `student/lessons`, `assignments*`, `materials*`, `student/progress`, `student/weekly-goal`, `student/goals`, `mock-exams` | M2–M4'te sözleşmeye alınacak (`m2-handoff.md`) |
