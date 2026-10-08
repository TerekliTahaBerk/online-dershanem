# Mobil Tasarım Sistemi Planı (M0)

Kaynak: `app/globals.css` `.pn-scope` katmanı (satır ~530–660), `docs/panel-design-roadmap.md` §5–§8 (Faz 0–8 "Done" durumları), `lib/panel/status-vocabulary.ts`, `lib/panel/domain-vocabulary.ts`, `components/panel/primitives/**`, mevcut `mobile/src/constants/theme.ts` ve `mobile/src/components/panel-ui.tsx`.

## 1. Bugünkü durum

| Konu | Web paneli (güncel) | Mobil (2026-09-14) | Fark |
| --- | --- | --- | --- |
| Token kaynağı | `--pn-*` panel katmanı (`--dc-*` temeli üstünde) | `--dc-*` değerlerinin elle kopyası | Panel katmanı yok |
| Ürün vurgusu | `data-product="od|yon|dl"` → `--pn-accent*` | Tek yeşil marka | Yön mavisi ve Deneme Ligi moru yok |
| Zemin | Beyaz çalışma alanı `#FFFFFF`, kenar çubuğu `#F7F8F7` | `#FBFCFA` zemin, `#F4F8F6` kart | Eski "sıcak kart" dili |
| Yüzey dili | Bölüm başlığı + üst çizgi + satır listeleri; kartlar yalnız istisna | Kutulu kartlar (radius 14–16) | Tasarım Faz 2'de web kart dilinden çıktı |
| Durum renkleri | 5 semantik ton (neutral/info/success/warning/critical) + live | Elle `#B3261E` vb. | Tek kaynak yok |
| Tipografi | Manrope; sayfa başlığı mobil 20/28/700; gövde 14/22; metadata 12/16; büyük harf etiket yok | Sistem fontu; `SectionLabel` büyük harf | Ölçek ve kural farklı |
| Radius | Kontrol/rozet 6, çekmece/diyalog/kart 10 | 14–16 | Daha yumuşak |
| Gölge | Akış içi yok | Yok | Uyumlu |
| Yoğunluk | Öğrenci/veli "comfortable" 48px satır | Tanımsız | — |
| Koyu tema | Kapsam dışı | Kapsam dışı (koyu = açık) | Uyumlu |
| Yüksek kontrast | `html[data-panel-contrast="high"]` | Yok | Erişilebilirlik tercihi yansıtılmıyor |

## 2. Hedef mimari

```text
packages: yok (tek repo içinde, mobile/src/design altında)

mobile/src/design/
  tokens.ts            pn-* nötr temel + semantik tonlar + tipografi + boşluk + radius + yoğunluk
  products.ts          productTheme("OD" | "OK" | "ODK") → { accent, accentSoft, accentMarker, label }
  theme-provider.tsx   aktif çalışma alanından ürün temasını sağlar; erişilebilirlik tercihlerini uygular
  primitives/          Text, Screen, PageHeader, Section, Row, PropertyList, StatusBadge, Button,
                       Field, EmptyState, ErrorState, Skeleton, Banner, ProgressBar, Sparkline,
                       SegmentedTabs, Sheet, WorkspaceSwitcher, ListFooter
```

İlkeler:

1. **Tek kaynak web'dir.** Mobil token değerleri `app/globals.css` `.pn-scope` ile birebir aynıdır; her değerin yanında CSS değişken adı yorum olarak tutulur. Senkronizasyon için M1'de küçük bir doğrulama betiği (`mobile/scripts/check-tokens.mjs`): `globals.css`'ten `--pn-*` değerlerini okuyup `tokens.ts` ile karşılaştırır; CI'da çalışır. Ayrı bir token derleme altyapısı (Style Dictionary vb.) **eklenmez**.
2. **Ürün vurgusu yalnız P4 kullanımlarda:** aktif sekme, rozet, küçük işaret, grafik, seçili satır. Sayfa zemini ve birincil butonlar ürünle boyanmaz (web kuralı, `globals.css` yorumu).
3. **Durum etiketi ve tonu sunucudan gelir.** Okuma modelleri `{ label, tone }` taşır (`statusPresentation`); mobil `StatusBadge tone=…` ile yalnız renklendirir. Mobilde enum → etiket tablosu tutulmaz.
4. **Metinler `PANEL_DOMAIN` sözlüğüyle aynı.** Navigasyon etiketleri bootstrap'tan gelir; ekran başlıkları için mobilde küçük bir sözlük (`mobile/src/design/copy.ts`) web sözlüğünün alt kümesi olarak tutulur ve M1'deki betikle karşılaştırılır.

## 3. Token tablosu (mobil karşılıkları)

### 3.1 Nötr temel

| Mobil anahtar | Değer | Web değişkeni |
| --- | --- | --- |
| `canvas` | `#FFFFFF` | `--pn-canvas` |
| `sidebar` / `sheet` | `#F7F8F7` | `--pn-sidebar` |
| `surfaceSubtle` | `#FAFBFA` | `--pn-surface-subtle` |
| `pressed` | `rgba(20,32,28,0.045)` | `--pn-hover` |
| `selected` | `rgba(20,32,28,0.07)` | `--pn-selected` |
| `border` | `#E9ECEA` | `--pn-border` |
| `borderStrong` | `#D9DEDB` | `--pn-border-strong` |
| `text` | `#14201C` | `--pn-text` (= `--dc-ink`) |
| `textSecondary` | `#4E5C56` | `--pn-text-secondary` |
| `textMuted` | `#5F6E67` | `--pn-text-muted` |
| `focus` | `#0C7C57` | `--pn-focus` |

### 3.2 Ürün vurguları

| Ürün | `accent` (metin/ikon, AA) | `accentSoft` (rozet zemini) | `accentMarker` (grafik) | Web |
| --- | --- | --- | --- | --- |
| onlinedershanem. (`OD`) | `#0C7C57` | `#EDF7F2` | `#14976B` | `--pn-accent-od*` |
| Yön Koçluk (`OK`) | `#0754C9` | `#E8F1FE` | `#0673F5` | `--pn-accent-yon*` |
| Deneme Ligi (`ODK`) | `#5B2599` | `#F1EAFA` | `#6C35AC` | `--pn-accent-dl*` |

### 3.3 Semantik tonlar (üründen bağımsız)

| Ton | Metin | Zemin |
| --- | --- | --- |
| neutral | `#4E5C56` | `#F1F3F2` |
| info | `#1E4E8C` | `#EAF2FB` |
| success | `#1F6B45` | `#E8F4EC` |
| warning | `#7A5A0B` | `#FDF5DC` |
| critical | `#9A2B1F` | `#FBEAE6` |
| live | critical + nabız noktası (azaltılmış harekette sabit) | critical zemin |

### 3.4 Tipografi (mobil ölçek, `panel-design-roadmap.md` §5.3)

| Rol | Boyut/satır/ağırlık |
| --- | --- |
| Sayfa başlığı | 20/28/700, -0.015em |
| Bölüm başlığı | 15/22/650 |
| Alt bölüm | 13.5/20/650 |
| Özellik etiketi | 12.5/18/500 muted |
| Gövde | 14/22/400 |
| İkincil | 13/20/400 secondary |
| Metadata | 12/16/500 muted |
| Sayısal (net, sayaç) | JetBrains Mono, tabular, 13–20 |

- Font: Manrope (`expo-font`, yerel dosya; ağ üzerinden yükleme yok). JetBrains Mono yalnız sayısal alanlar.
- Dinamik yazı boyutu (iOS Dynamic Type / Android font scale) desteklenir; `maxFontSizeMultiplier` yalnız sekme etiketlerinde sınırlanır.
- Panel kuralı: büyük harf eyebrow yok (mevcut mobil `SectionLabel` büyük harf kullanıyor → kaldırılır), `font-black` yalnız sınav sayacında.

### 3.5 Boşluk, radius, yoğunluk

- 4px taban; mobil sayfa kenar boşluğu 16; bölümler arası 32; başlık ile ilk bölüm arası 24.
- Radius: kontrol/rozet 6, sheet/diyalog/kart 10, avatar tam.
- Satır yüksekliği: öğrenci/veli 48 ("comfortable"), öğretmen/koç 44 (dokunma hedefi nedeniyle web'in 40'ı yerine; minimum 44pt).
- Gölge: akış içi yok; yalnız sheet/menü.

## 4. Primitives ve mevcut bileşenlerin dönüşümü

| Primitive | Web karşılığı | Mevcut mobil kaynak | Not |
| --- | --- | --- | --- |
| `Screen` | `PanelShell` içerik alanı | her ekrandaki `ThemedView`+`SafeAreaView`+`ScrollView` tekrarı | Yükleme/hata/boş/çevrimdışı durumlarını tek yerde ele alır; pull-to-refresh |
| `PageHeader` | `PageHeader` | `PanelHeading` | Başlık + açıklama + ürün işareti + (veli) "Öğrenci: …" bağlam satırı |
| `Section` | `Section` | `Card` + `SectionLabel` | Üst çizgi + başlık; kutu yok |
| `Row` | `PanelTableRow` (mobilde kart) | ekran içi satırlar | Sol meta (saat), gövde, sağ rozet/chevron; 48px |
| `PropertyList` | `PropertyList`/`PropertyRow` | `profil` alanları | Ders/deneme detay sayfaları |
| `StatusBadge` | `StatusBadge` | `odevler` içi rozet stilleri | `tone` girdisi |
| `Button` | `buttonClass` | sign-in butonu | primary (marka yeşili, ürün bağımsız), secondary, quiet, destructive; 44pt min |
| `Field` | `.pn-field` | sign-in alanı | Etiket + kontrol + hata |
| `EmptyState` / `ErrorState` | `EmptyState`, `panel-error-state.tsx` | `EmptyState`, `ListEmpty` | Hata kodu → mesaj eşlemesi (screen-gap-analysis §4) |
| `Skeleton` | iskelet satırlar | yok | Azaltılmış harekette shimmer yok |
| `Banner` | bilgi/uyarı şeritleri | sign-in hata kutusu | Çevrimdışı, pilot durdu, bakım |
| `ProgressBar` | `h-2` bar | `ProgressBar` | KEEP |
| `Sparkline` | `primitives/sparkline.tsx` | `TrendSparkline`, `LineChart` | Her grafiğin üstünde metin özeti + erişilebilir tablo alternatifi (web kuralı §5.9) |
| `SegmentedTabs` | `ViewTabs` | `FilterChip` | `?gorunum=` karşılığı |
| `Sheet` | drawer / URL drawer | yok | Ders/görev detayı hızlı bakış |
| `WorkspaceSwitcher` | `WorkspaceSwitcher` | yok | Ürün adı + vurgu; kilitli/pilot kapalı durumları; satın alma bağlantısı yok |

## 5. Navigasyon kabuğu

- **Öğrenci/veli:** alt sekme çubuğu = bootstrap `navigation.primary` (≤4) + "Menü". Menü ekranı `navigation.sections` + Bildirimler + Ayarlar + çalışma alanı değiştirici. Sekme simgeleri `id` → SF Symbol / Material ikon eşlemesi mobilde tutulur.
- **Öğretmen/koç:** alt çubuk yok (web kararı); tek yığın + üstte çalışma alanı değiştirici + "Bugün" kökü; liste→detay akışları; ekran içi sabit alt aksiyon ("Dersi kapat", "Notu kaydet").
- Bildirim zili ve okunmamış rozeti başlıkta (tüm roller).
- Çalışma alanı değişince tema (`accent`) ve sekmeler değişir; geçişte yığın sıfırlanır.

## 6. Erişilebilirlik

- WCAG AA kontrast: tüm metin token'ları web'de AA için koyulaştırılmış; mobil aynı değerleri kullanır.
- Kullanıcının panel tercihleri (`accessibilityProfile` flag'i açık; `PATCH /api/panel/accessibility/preferences`): yüksek kontrast → `highContrast` token haritası (web'deki `html[data-panel-contrast="high"]` değerleri), azaltılmış hareket → animasyonlar kapalı, rahat aralık. Okuma ucu M8'de; o zamana kadar işletim sistemi ayarları (`AccessibilityInfo.isReduceMotionEnabled`, bold text) uygulanır.
- Her etkileşimli öğe `accessibilityRole`, `accessibilityLabel`, `accessibilityState`; 44pt minimum dokunma hedefi; odak sırası VoiceOver/TalkBack ile manuel test edilir.
- Grafikler metin özeti taşır.

## 7. Kaldırılacak/değişecek görsel öğeler

- `SectionLabel` büyük harf etiketleri → `Section` başlığı.
- Kutulu `Card` her yerde → bölüm + satır; kart yalnız "Şimdi" vurgusu gibi tek odak öğelerinde.
- Elle yazılmış renkler (`#B3261E`, `#8A9691`, `#5C6B65`, `#FBEEEC`) → semantik token.
- Şablon ikonları (`tabIcons/*`, React/Expo logoları).
- Uygulama ikonu ve açılış ekranı marka varlıkları (`/design/od-logo.png` web'de mevcut) M9'da güncellenir.

## 8. Doğrulama

- Token senkron betiği (CI).
- Storybook mobil için **eklenmez**; bunun yerine `mobile/src/app/(dev)/primitives.tsx` geliştirici ekranı (yalnız `__DEV__`) tüm primitive durumlarını listeler.
- Görsel karşılaştırma: M2 sonunda OD Bugün, M3 sonunda Yön Bugün, M4 sonunda Deneme Ligi Bugün için web mobil görünümüyle yan yana ekran görüntüsü incelemesi (manuel, PR'a eklenir).
