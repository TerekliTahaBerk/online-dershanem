# Ödeme sonrası hesap yaşam döngüsü

Bu belge OD-013 ile otomatikleşen `ödeme → hesap → veli teyidi → temel tercihler → ilk değer` akışını, operasyonun ne zaman devreye girdiğini ve güvenlik kurallarını tanımlar.

## Neden değişti

100 müşteride sürdürülebilen insan müdahalesi 10.000'de SLA üretir. Eskiden ödeme sonrası hesap otomatik açılıyordu ama **sahibi parolasını bilmiyordu**: makbuz e-postası "ekibimiz sizinle iletişime geçecektir" diyordu ve her müşteri için bir kişinin arayıp geçici parola iletmesi gerekiyordu. Veli–öğrenci bağı da doğrulanmadan kuruluyordu.

## Akış

```
PayTR callback
  └─ provisionOdOrder            hesap + profil + ProductMembership + veli bağı   [SİSTEM]
       └─ AccountClaim × (öğrenci, veli)  → EmailOutbox → "Hesabınızı kurun"      [SİSTEM]
            └─ /hesap-kur#token=…         parola + veli teyidi + temel tercihler  [MÜŞTERİ]
                 └─ autoAdvanceOdOnboarding  ACCOUNT_READY → PARENT_LINKED → PLACEMENT_PENDING  [SİSTEM]
                      └─ grup ataması → ilk ders → ACTIVE                          [İNSAN]
```

Otomasyonun **tavanı `PLACEMENT_PENDING`**'dir. Grup ataması ve ilk dersin takvime girmesi gerçek bir kapasite kararıdır; kuyruğu boşaltmak uğruna yanlış grup atamamak için otomasyon oraya uzanmaz.

## Davet (AccountClaim)

| Kural | Değer |
|---|---|
| Ömür | 14 gün |
| Hatırlatma | 3. ve 8. günde, en fazla iki kez |
| Bakım işi | `/api/cron/account-claims`, 6 saatte bir |
| Tekrar kullanım | Yok — tek kullanımlık, `status` + `expiresAt` ile korunur |
| Aynı anda geçerli davet | Kullanıcı başına bir tane; yeni davet eskisini `SUPERSEDED` yapar |

**Gizlilik modeli parola sıfırlamayla aynıdır ve bilerek ayrı bir modeldedir.** Bağlantı `<id>.<hmac>` taşır; veritabanında yalnız tam token'ın scrypt doğrulayıcısı durur. Outbox'a yazılan HTML gizli değeri değil `{{ACCOUNT_CLAIM_URL:<id>}}` işaretini içerir; gerçek bağlantı teslimden hemen önce bellekte üretilir (`materializeOutboxHtml`). Bir veritabanı ya da outbox dökümü kullanılabilir davet içermez.

Token URL **fragment**'inde taşınır, sorgu dizesinde değil: erişim loglarına ve `Referer` başlığına düşmez. HMAC alan adı (`account-claim:`) parola sıfırlamadan farklıdır; iki akışın token'ı birbirinin yerine geçemez.

**Zaten parolasını belirlemiş hesaba davet gönderilmez.** İkinci bir ürün satın alan mevcut müşteri gereksiz "hesabınızı kurun" e-postası almaz.

**Davet üretimi başarısız olursa provisioning DEVAM EDER.** Token `NEXTAUTH_SECRET`'e bağlıdır; o yapılandırma eksikse davet gönderilemez ama para çoktan alınmıştır ve hesabın açılmaması çok daha kötü bir sonuçtur. Bu durum `account_claim.issue_skipped` audit kaydı bırakır.

## Veli–öğrenci teyidi

Veli daveti kullanırken kendisine bağlanan öğrenciyi görür ve onaylar ya da reddeder.

- **Onay:** `ParentStudent.confirmedAt` / `confirmedById` yazılır. Erişim zaten açıktı; onay bağın DOĞRU çocuğa kurulduğunun insan teyididir.
- **Ret:** bağ **hemen silinir**, onboarding `MANUAL_REVIEW`'a düşer ve sipariş istisna kuyruğunda `Veli bağlantısını reddetti` koduyla görünür.
- **Onay erişimi ENGELLEMEZ.** Bağ ödenmiş bir siparişten doğuyor ve veli ödeme sırasında çocuğunu zaten bildirmişti; okuma yollarını (veli kapsamı, haftalık özet, bildirimler, Dino) onay şartına bağlamak, halihazırda çalışan ekranlarda regresyon riski taşırdı. Onaylanmadan 7 gün bekleyen bağ istisna sayılır.

## Operasyon kuyruğu — üç kova

`/panel/yonetim/isler` artık "tüm ödenmiş siparişler" listesi değildir:

1. **İstisnalar** — otomasyon ilerleyemiyor. Varsayılan görünüm.
2. **Yerleştirme kararı** — hesabı kurulmuş öğrenciler; grup ve ilk ders kararı insana aittir. Arıza değil, işin kendisi.
3. **Kendiliğinden ilerleyenler** — yalnız sayı. Satır basmak dikkat çalar.

| İstisna kodu | Tetikleyen | Sıradaki aksiyon |
|---|---|---|
| `PROVISIONING_FAILED` | `OdOrder.provisioningStatus` = `RETRY_PENDING`/`MANUAL_REVIEW` | Hatayı açıp yeniden provision et veya hesabı elle bağla |
| `IDENTITY_REVIEW` | Onboarding `MANUAL_REVIEW` | Çakışan e-posta/kimlik kaydını incele |
| `BLOCKED` | Onboarding `BLOCKED` | Blokeri çöz, önceki adıma döndür |
| `REFUND_PENDING` | `REFUND_PENDING` / `NO_SLOT_REFUND_PENDING` | İadeyi tamamla |
| `CLAIM_EXPIRED` | Davet 14 günde kullanılmadı | Yeni davet gönder veya müşteriye ulaş |
| `CLAIM_STALLED` | Davet 10 gündür açılmadı (iki hatırlatma sonrası) | Telefonla teyit et |
| `RELATIONSHIP_REJECTED` | Veli bağlantıyı reddetti | Doğru veli hesabını bul, bağı yeniden kur |
| `RELATIONSHIP_UNCONFIRMED` | Bağ 7 gündür onaylanmadı | Veliyi arayıp teyit et |
| `SLA_BREACHED` | `dueAt` geçti | Gecikme nedenini yaz, adımı tamamla |

Bir kayıt birden çok nedenle istisna olabilir; ekran hepsini basar. Tek nedene indirgemek operasyonu yanıltır.

## İlk değer kontrol listesi

Öğrenci ve veli panelinin ana sayfasında, tamamlanınca **kendini kaldıran** kısa bir liste: parola, (varsa) bağlantı teyidi, temel tercih, grup ataması, ilk ders. Yüzde, rozet ve seri yoktur — bu bir oyunlaştırma değil kurulum listesidir. Ekibi bekleyen adımlar "Ekibimizde" etiketiyle basılır ama eylem düğmesi olmadan.

Liste **türetilir, saklanmaz**: her adım asıl kayıttan okunur. Ayrı bir ilerleme tablosu veriyle kaçınılmaz olarak ayrışırdı — veli bağı silindiğinde kutucuk işaretli kalırdı.

## Yayın öncesi

- **Migration `0089_account_claim_lifecycle` CANLIYA UYGULANMADI.** Tamamen eklemelidir (`account_claims` tablosu + `parent_students`'a iki nullable sütun). Uygulama yolu için [prisma migration notlarına](./deployment-checklist.md) ve `DIRECT_URL` kuralına bakın; `prisma migrate dev` bu depoda çalışmaz.
- `NEXTAUTH_SECRET` zaten production'da zorunludur; davet token'ları aynı anahtardan HMAC türetir.
- `RESEND_API_KEY` yoksa davet outbox'ta `PENDING` kalır ve anahtar sağlandığında `email-retry` cron'u gönderir. Davet **kaybolmaz**.
- Yeni cron `/api/cron/account-claims` `vercel.json`'a eklendi ve kritik heartbeat listesindedir (6 saat kadans, 12 saat bayatlama eşiği).

## Test kapsamı

- Saf kurallar: `lib/od/account-claim.test.ts`, `lib/od/first-value.test.ts`, `lib/od/lifecycle-exceptions.test.ts`
- Gerçek Postgres: `tests/integration/account-lifecycle.integration.ts` — davet üretimi/geçersizleştirme, tek kullanımlık tüketim, parola ve oturum etkisi, veli onay/ret, bakım işi, kuyruk ayrıştırması ve kontrol listesi. Ayrıntı: [entegrasyon testi standardı](./integration-test-strategy.md).
