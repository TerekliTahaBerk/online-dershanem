# M1 kimlik doğrulama güvenlik incelemesi

Kapsam: native mobil oturum taşıması, çerez / Bearer ayrımı, parola ve MFA kapıları, bootstrap güvenlik sınırı, istemci tarafı token ve önbellek yönetimi. Uygulanan kod ve çalıştırılan testlere dayanır.

## 1. HEAD'deki gerçek davranış (değişiklik öncesi)

İncelenen kod: `lib/auth/session.ts`, `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`, `app/api/auth/invite/accept/route.ts`, `lib/security/origin.ts`, `lib/security/mutation-guard.ts`, `mobile/src/lib/api.ts`, `mobile/src/lib/auth-context.tsx`.

| Bulgu | Etki |
| --- | --- |
| `resolveToken()` önce çerezi, yoksa Bearer'ı okuyordu | Çerez ve Bearer birlikte gelirse **Bearer sessizce yok sayılıyordu**; istemci kendi token'ı yerine kavanozdaki başka bir kimlikle doğrulanabilirdi |
| `createSession()` her durumda httpOnly çerez yazıyordu; login / davet mobil isteğe de çerez + token döndürüyordu | Native cihaz çerez deposunda yönetilmeyen ikinci bir kimlik |
| Expo SDK 57, global `fetch`'i kendi native uygulamasıyla (`expo/fetch`) değiştiriyor; varsayılan `credentials: 'include'` | Mobil istemci çerezleri **varsayılan olarak** okuyup yazıyordu (aşağıda kaynak kod doğrulaması) |
| Mobil giriş `redirect` alanını atıyordu | Geçici parolalı kullanıcı ve ayrıcalıklı personel kapıda kalıp genel hata görüyordu |
| `assertSameOrigin`: `Origin` ve `Referer` ikisi de yoksa izin veriyor | Native istekler bu nedenle geçer; tarayıcı korumasını zayıflatmadan bırakıldı |

## 2. `credentials: "omit"` — gerçek native davranış (kaynak koddan doğrulandı)

Varsayıma dayanmamak için `mobile/node_modules` içindeki native kaynak okundu:

- Expo 57 `expo/src/winter/runtime.native.ts`: `EXPO_PUBLIC_USE_RN_FETCH` tanımlı değilse global `fetch` = `expo/fetch`.
- `expo/src/winter/fetch/fetch.ts`: `credentials` verilmezse **`'include'`**; `'same-origin'` → `'include'`.
- iOS `expo/ios/Fetch/ExpoURLSessionTask.swift`: `credentials == .include` değilse `request.httpShouldHandleCookies = false` (istek çerez göndermez, yanıttaki çerezi saklamaz).
- Android `expo/android/.../fetch/NativeRequest.kt`: `INCLUDE` değilse `clientBuilder.cookieJar(CookieJar.NO_COOKIES)`.
- (RN'nin kendi `fetch`'i kullanılsaydı: `whatwg-fetch` `omit` → `xhr.withCredentials = false` → iOS `HTTPShouldHandleCookies = NO`, Android `CookieJar.NO_COOKIES`.)

**Sonuç:** `credentials: 'omit'` her iki native yolda da çerez deposunu ne okutur ne yazdırır. Ancak bu tek başına güvenceye bırakılmadı: `expo-file-system` indirmeleri gibi `fetch` dışı ağ yolları ayrı yığın kullanır. Bu nedenle sunucu tarafında iki bağımsız savunma eklendi (§3). **Gerçek cihazda ağ trafiği gözlemlenmedi** (simülatör / cihaz yok).

## 3. Uygulanan sunucu değişiklikleri

1. **Deterministik kimlik çözümü** — `lib/auth/bearer-token.ts#resolveRequestCredential` (saf, birim testli):

   | Çerez | `Authorization` | Sonuç |
   | --- | --- | --- |
   | var | yok | çerez (tarayıcı; değişmedi) |
   | yok | `Bearer X` | X |
   | `X` | `Bearer X` | X |
   | `X` | `Bearer Y` | **conflict → oturum yok (401)** |
   | `X` | `Bearer ` (boş) | **conflict → oturum yok** |
   | `X` | `Basic …` (Bearer dışı) | çerez (staging HTTP Basic kırılmasın) |

   Geçersiz Bearer + geçerli çerez durumunda çereze **geri düşülmez**. Çakışma yalnız nedenle loglanır; token değeri loglanmaz. `getSession` ve test için `resolveSessionFromCredentials` aynı kuralı kullanır; DB kısmı `loadSessionForToken`'a ayrıldı (iptal, askı, mutlak / boşta süre ve koşullu `lastSeenAt` yazımı **değişmedi**).
2. **Mobil girişte çerez yok** — `lib/auth/client-transport.ts#loginTransport`; `createSession(..., { setCookie: false })`. Login ve davet kabulü için geçerli. Yanıtta `Cache-Control: no-store`.
3. **`X-Od-Client: mobile` yetki değildir.** Yalnız taşıma biçimini seçer. Taklit eden saldırgan, kendi parolasıyla açtığı kendi oturumunun token'ını görür; tarayıcı akışından fazlasını değil. Same-origin, rate limit, hesap kilidi ve enumeration koruması aynen çalışır.
4. **Same-origin koruması zayıflatılmadı.** `lib/security/origin.ts` değişmedi.

## 4. Parola ve MFA kapıları

- Sunucu politikası değişmedi: `postAuthenticationPath` ve `requireApiAuthorizedRole` (önce `mustChangePassword`, sonra `userRequiresLoginMfa`; ADMIN girişte muaf, ayrıcalıklı Deneme Ligi / ürün yöneticisi personeli zorunlu; hassas işlemler step-up).
- Mobil kapı kararını **bootstrap**'tan alır; `redirect` yalnız sunucunun aynı kararını taşır. İstemci bir kapıyı kendisi "geçildi" diye işaretleyemez: parola değişikliği veya MFA doğrulamasından sonra bootstrap yeniden çekilir; sunucu `READY` demedikçe ürün rotaları (`Stack.Protected`) kapalıdır.
- MFA doğrulaması `POST /api/auth/mfa/code/verify` (TOTP / kurtarma kodu) ile sunucuda yapılır; istemci `verified === true` görmeden başarı saymaz.
- Desteklenmeyen yöntemler (passkey-only, ilk MFA kurulumu): kırık durum yerine açıklama + "Web panelinde devam et" (`/giris/mfa`, token URL'e konmaz) + "Durumu kontrol et" + çıkış.
- **Bootstrap kapı sınırı:** `requireApiSessionBeforeGates` yalnız `GET /api/panel/me` tarafından kullanılır. Kapı açık değilken veri sorguları çalışmaz ve `workspace` null'a zorlanır. Kanıt: integration (geçici parola / MFA personeli → `workspace: null`, gizli bildirim başlığı ve `odk:exam:edit` yanıtta yok), E2E (kapıdaki token ile `GET /api/panel/notifications` → 403 `PASSWORD_CHANGE_REQUIRED` / `MFA_REQUIRED`, `POST active-product` → 403).

## 5. İstemci tarafı

| Konu | Uygulama |
| --- | --- |
| Token saklama | Yalnız `expo-secure-store`, `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` (yedek / iCloud ile taşınmaz). AsyncStorage / dosya yok |
| Token taşıma | Yalnız `Authorization: Bearer`; URL'de asla. Derin bağlantılarda sorgu dizesi tamamen atılır (`sanitizeIncomingPath`) |
| Çerez | `credentials: 'omit'` (tüm `apiClient` istekleri) |
| Çıkış | Önce sunucu iptali (`POST /api/auth/logout`, Bearer ile), sonra SecureStore silme + `queryClient.clear()`. Ağ hatasında yerel kimlik yine silinir; sunucu oturumu süre politikasıyla kapanır ve "Oturumlar" ekranından uzaktan kapatılabilir |
| Hesap değişimi | Girişten önce `queryClient.clear()`; sorgu anahtarları kullanıcı kimliğiyle başlar; bootstrap anahtarı token'ın geri döndürülemez parmak izi (token anahtara girmez) |
| Süresi dolmuş / iptal oturum | Kimlikli istekte 401 → merkezi işleyici yerel oturumu kapatır, "Oturumun sona erdi" gösterilir; eski ekranların ikinci `signOut` çağrısı bildirimi ezmez (testte bulunan ve düzeltilen hata) |
| Önbellek kalıcılığı | Yok — TanStack Query yalnız bellekte; hassas yanıt cihaza yazılmaz |
| Yazma tekrarı | Mutasyonlar otomatik tekrarlanmaz (`mutations.retry = 0`); okuma sorguları yalnız geçici hatalarda en fazla 2 kez |
| Web önizlemesi | Desteklenmez; token web'de saklanmaz |

## 6. Kalan riskler ve öneriler

| # | Risk | Durum / öneri |
| --- | --- | --- |
| S1 | Gerçek cihazda çerez davranışı gözlemlenmedi | Kaynak kod + sunucu tarafı iki bağımsız savunma. M9 öncesi cihazda proxy ile doğrulanmalı |
| S2 | `expo-file-system` indirmesi (Kaynaklar) ayrı ağ yığını; çerez davranışı doğrulanmadı | Sunucu artık mobil girişte çerez yazmıyor; Bearer + istemci başlıkları gönderiliyor. M2'de indirme dosya adı / önbellek temizliği gözden geçirilmeli |
| S3 | Çıkışta ağ hatası → sunucu oturumu açık kalır | Kabul edilmiş, belgelenmiş; öğrenci / veli için 7 gün boşta zaman aşımı |
| S4 | Yenileme token'ı yok; süre dolunca yeniden giriş | Mevcut politika korundu (M0 kararı) |
| S5 | Admin önizleme bayrağı mobilde yalnız bilgi amaçlı | Mobil önizleme başlatamaz; çerez tabanlı olduğu için mobil oturumda pratikte daima false |
| S6 | Passkey native değil | Web devam yolu; M8'de associated domains kararı |
| S7 | `X-Od-Client` taklidi | Yalnız taşıma biçimi; yetki etkisi yok (bkz. §3.3) |
