# Panel feature flag'leri

## Bugünkü durum: iki ayrı kaynak

Panel flag'leri şu anda **iki bağımsız yerden** okunuyor:

| Katman | Değişken | Okunduğu yer |
|---|---|---|
| Sunucu | `PANEL_FEATURE_*` | `lib/panel-feature-flags.ts` (sayfa ve API guard'ları) |
| İstemci | `NEXT_PUBLIC_PANEL_FEATURE_*` | `components/panel/panel-nav.tsx` (modül seviyesinde) |

İşletme tarafında da aynı ikilik var: `CRM_PANEL_ENABLED` /
`NEXT_PUBLIC_CRM_PANEL_ENABLED`, `PANEL_ENABLED` / `NEXT_PUBLIC_PANEL_ENABLED`.

### Bunun neden bir sorun olduğu

İki değişken elle senkronize tutuluyor. Biri diğeri olmadan değiştirildiğinde:

- Sunucu **açık**, istemci **kapalı** → route çalışıyor ama menüde link yok;
  özellik kullanıcıya görünmez hâle geliyor.
- Sunucu **kapalı**, istemci **açık** → menüde link var, tıklayınca 404.

`NEXT_PUBLIC_*` değerleri **derleme anında** bundle'a gömülür. Yani bu
değişkenlerden birini Vercel'de değiştirmek tek başına yetmez; yeni bir deploy
gerekir. Aynı kısıt `proxy.ts` için de geçerlidir (dosyanın kendi başlığında
not edilmiştir).

Bu davranış bu çalışmada **doğrulandı**: E2E ortamı `PANEL_ENABLED` /
`NEXT_PUBLIC_PANEL_ENABLED` ikilisi set edilmeden ayağa kaldırıldığında giriş
sayfası formu hiç render edilmedi ve bütün panel testleri sessizce zaman aşımına
uğradı.

### Doğru hedef mimari

Tek sunucu kaynağı + typed props:

```
lib/panel-feature-flags.ts        (TEK kaynak, yalnız PANEL_FEATURE_*)
  → server component flag'leri çözer
  → client component'e TYPED PROP olarak geçer
  → NEXT_PUBLIC_* tamamen kaldırılır
```

Böylece menü, sayfa guard'ı ve API guard'ı aynı değeri görür; ayrışma yapısal
olarak imkânsız hâle gelir.

**Bu geçiş bu çalışmada YAPILMADI.** `panel-nav.tsx` hâlâ modül seviyesinde
`NEXT_PUBLIC_*` okuyor. Geçiş, `PanelShell` → `PanelNav` arasındaki bütün
çağrı noktalarını değiştirmeyi gerektiriyor ve ayrı bir çalışma paketidir.

### Ara dönem kuralı

`PANEL_FEATURE_X` ve `NEXT_PUBLIC_PANEL_FEATURE_X` **her zaman birlikte** ve
aynı değerle set edilmelidir. `.github/workflows/e2e.yml` bu ikiliği çiftler
hâlinde tanımlar; yeni bir flag eklerken aynı düzeni izleyin.

`lib/pilot-rollout.ts` içindeki `FLAG_PAIRS` tablosu bu eşleşmeyi zaten
biliyor ve pilot readiness kontrolünde ikisinin de açık olmasını şart koşuyor —
yani ayrışma en azından pilot kapısında yakalanıyor.

## İşletme paneli flag'leri

| Değişken | Varsayılan | Etki |
|---|---|---|
| `CRM_PANEL_ENABLED` | açık (`!== "false"`) | Kapalıysa bütün `/panel/yonetim/isletme/*` 404 |
| `FINANCE_PANEL_ENABLED` | açık (`!== "false"`) | Kapalıysa gelirler/giderler/vergiler/mutabakat/raporlar 404 ve menüde yok |
| `INSTAGRAM_INTEGRATION_ENABLED` | kapalı (`=== "true"`) | Dış Instagram çağrıları; kapalıyken dev adapter |
| `INSTAGRAM_AI_ENABLED` | kapalı (`=== "true"`) | AI yanıt üretimi |
| `META_ADS_INTEGRATION_ENABLED` | kapalı (`=== "true"`) | Meta Ads senkronu |

Parse kuralı bilinçli olarak asimetriktir:

- **Panel/finans flag'leri** `!== "false"` — yani varsayılan AÇIK. Bunlar
  yalnızca ürün yüzeyini gösterir, dış dünyaya bir şey yapmaz.
- **Entegrasyon flag'leri** `=== "true"` — yani varsayılan KAPALI. Yanlış
  yapılandırılmış bir ortam değişkeni asla kendiliğinden dış servise istek
  atmaz, para harcamaz veya müşteriye mesaj göndermez.

Boş string, tanımsız değer ve beklenmeyen metinler entegrasyonları **açmaz**.

`FINANCE_SECTIONS` listesi `lib/business/sections.ts` içindedir ve hem menü
filtresi hem sayfa guard'ı tarafından kullanılır — finans kapatıldığında link
gizlenmesiyle route'un 404 dönmesi aynı listeden beslenir.

## Görünürlük güvenlik değildir

Flag'e veya izne göre menüde link gizlemek bir güvenlik sınırı **değildir**.
Her sayfa ve her server action kendi guard'ını çalıştırır
(`requireBusinessPage`, `authorizeBusinessRequest`). Flag kapalıyken route
doğrudan URL ile de 404 döner.
