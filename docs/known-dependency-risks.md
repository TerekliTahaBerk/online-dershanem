# Bilinen bağımlılık riskleri

Bu kayıt, otomatik audit kapısında süreli olarak kabul edilen veya henüz güvenli
bir üst paket güncellemesi bulunmayan bağımlılık risklerini izler. İstisnalar
kalıcı değildir; `config/npm-audit-allowlist.json` içindeki son kullanma tarihi
geçince CI yeniden kırmızı olur.

## Lighthouse CI / extract-zip — giderildi (14 Ekim 2026)

- Advisory: `GHSA-jmr9-qjv8-65gv` ve `GHSA-7pqw-9j4j-h8q3` (yüksek).
- Eski zincir: `@lhci/cli@0.15.1` → `lighthouse@12.6.1` →
  `puppeteer-core@24.43.1` → `@puppeteer/browsers@2.13.2` →
  `extract-zip@2.0.1`.
- Çözüm: `package.json` `overrides` içinde `puppeteer-core` `25.13.0`'a
  sabitlendi. Bu sürüm `@puppeteer/browsers@3.2.4` kullanır ve `extract-zip`
  bağımlılığı tamamen kalkar. Lighthouse 12.6.1 yalnız `puppeteer.connect`
  API'sini kullanır; yerel Chromium ile hem `lighthouse` CLI hem
  `lhci collect` başarıyla çalıştırıldı.
- Audit istisnası (`config/npm-audit-allowlist.json`) kaldırıldı.
- Yeniden değerlendirme: Yeni bir `@lhci/cli` sürümü kendi Lighthouse/puppeteer
  zincirini güncellediğinde override kaldırılıp `npm run lighthouse:ci`
  yeniden çalıştırılacak.

## Storybook / tsconfck bakım durumu

- Durum: `@storybook/nextjs-vite@10.6.0` →
  `vite-plugin-storybook-nextjs@10.6.0` → `vite-tsconfig-paths@5.1.4` →
  `tsconfck@3.1.6`. `tsconfck@3.1.6` en güncel sürüm olmasına rağmen npm'de
  `unmaintained` olarak işaretlidir; bilinen bir audit advisory'si yoktur.
- Gerçek risk: Yalnızca Storybook geliştirme/CI derlemesinde yer alır;
  production bundle'a girmez. Yerel `npm run storybook:build` 10.6.0 zinciriyle
  başarıyla tamamlanmıştır.
- Neden override yok: `vite-tsconfig-paths@6.1.1` dahi aynı `tsconfck@^3.0.3`
  bağımlılığını kullanır; var olmayan bir modern `tsconfck` sürümünü zorlamak
  mümkün değildir.
- 14 Ekim 2026 değerlendirmesi: güvenlik advisory'si yok; `vite-tsconfig-paths`
  en güncel sürümü (6.1.1) dahi aynı `tsconfck@^3` bağımlılığını kullanıyor.
  Storybook adaptörü bu bağımlılığı kaldırdığında yeniden değerlendirilecek.

## Kaldırılan braces zinciri

- `GHSA-vfj7-8cjw-p6xm` için yeni bir audit istisnası eklenmedi. Tailwind 4
  geçişi Tailwind 3'ün `braces` zincirini kaldırır.
- Next ESLint halen `fast-glob` kullanır. Bu depodaki tek tüketicisinin
  `globSync(pattern, { onlyDirectories: true })` çağrısı,
  `tools/next-glob-compat` içindeki `tinyglobby` uyarlamasıyla karşılanır.
  Uyarlama literal dizinlerde alt dizin taramasını kapatır, mutlak yolları ve
  brace desenlerini korur, dizin sonundaki slash'i kaldırır.
- `lib/next-glob-compat.test.ts` gerçek kurulu Next ESLint modülü üzerinden
  bu davranışı sınar. Başka bir `fast-glob` tüketicisi eklenirse veya Next
  ESLint farklı bir API kullanmaya başlarsa override yeniden değerlendirilmeli;
  bu uyarlama genel amaçlı `fast-glob` yerine geçmez.

## Yamalı bağımlılık kopyaları (vendor) — giderildi (14 Ekim 2026)

Aşağıdaki paketlerin npm'de yamalı sürümü yoktu (en güncel sürüm de
etkileniyordu) ya da düzeltme yalnız ESM olarak yayımlanmıştı. Açıklar, paketin
yamalı bir kopyası depoya alınarak kapatıldı. Kopyalar kök bağımlılık olarak
`file:` ile eklenir, iç içe kullanımlar `overrides` içindeki `$paket`
referansıyla bu kopyaya yönlenir. Kopyaların sürümü, açık aralığının dışında
kalan ve proje yaması olduğu açıkça görülen `-od.N` ekiyle işaretlenir.

| Paket | Kopya | Advisory | Yama |
| --- | --- | --- | --- |
| `decode-uri-component` | `mobile/vendor/npm/decode-uri-component` (0.5.0) | GHSA-vcc3-ghjq-m6fr (orta) | Upstream 0.5.0 (`fa479da`) mantığı birebir, CommonJS'e taşındı; `query-string@7` (`expo-router`) `require` ile yüklüyor. Uygulama paketine girer. |
| `node-forge` | `mobile/vendor/npm/node-forge` (1.4.1-od.1) | GHSA-86w9-cpqp-85rv (yüksek) | Upstream digitalbazaar/forge#1152: iç içe DigestAlgorithm öğe sayısı denetimi (`lib/rsa.js`). |
| `braces` | `mobile/vendor/npm/braces` (3.0.4-od.1) | GHSA-vfj7-8cjw-p6xm (yüksek) | `parse()` iç içe derinliği 128 ile sınırlar (`maxDepth` seçeneğiyle düşürülebilir). |
| `sprintf-js` | `vendor/npm/sprintf-js`, `mobile/vendor/npm/sprintf-js` (1.1.4-od.1, temel 1.0.3) | GHSA-hp3w-g68c-fv3c (orta) | Hassasiyet değeri ECMAScript sınırlarına sıkıştırılır. |

- Doğrulama: `lib/vendor-patches.test.ts` ve
  `mobile/src/test/vendor-patches.test.ts` her açığı tetikleyen girdiyle yamayı
  denetler; override kaldırılırsa testler kırılır. `expo export` ile üretilen
  Hermes paketinde yamalı `decode-uri-component` kodu yer alır.
- `uuid`: `xcode@3.0.1` → `uuid@7.0.3` zinciri `mobile/package.json`
  `overrides` ile `uuid@11.1.1`'e taşındı.
- Dependabot'un mobil için açtığı `shell-quote`, `source-map-js`,
  `compression` ve `brace-expansion` güncellemeleri lockfile'da zaten bulunuyor.
- Bakım: Upstream yamalı sürüm yayımladığında ilgili kopya ve override
  kaldırılır, gerçek paket kullanılır. Expo SDK geçişlerinde `npm audit` ve
  bu testler yeniden çalıştırılır. Dockerfile bağımlılık aşaması `vendor/`
  klasörünü `npm ci`'dan önce kopyalar.

Güncel durum: kök projede ve `mobile/` içinde `npm audit` 0 açık raporlar.
