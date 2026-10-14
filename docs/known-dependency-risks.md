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

## Lighthouse CI / sprintf-js (orta)

- Advisory: `GHSA-hp3w-g68c-fv3c` (orta, DoS).
- Zincir: `@lhci/utils@0.15.1` → `js-yaml@3.15.2` → `argparse@1.0.10` →
  `sprintf-js@1.0.3`. Yamalı `sprintf-js` sürümü yok; `js-yaml` 4'e zorlamak
  `@lhci/utils`'in kullandığı `safeLoad` API'sini kırar.
- Gerçek risk: Yalnız CI'da, repodaki `lighthouserc.json` (YAML değil)
  okunurken yüklenir; dışarıdan girdi almaz. Audit kapısı yalnız high/critical
  bulguları engellediği için istisna gerekmez.

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
- Yeniden değerlendirme: 14 Ekim 2026 veya Storybook adaptörü bu bağımlılığı
  kaldırdığında (hangisi önceyse).

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

## Mobil (Expo SDK 57) bağımlılıkları

- `uuid` (orta, `GHSA` buffer bounds): `xcode@3.0.1` → `uuid@7.0.3` zinciri
  `mobile/package.json` `overrides` ile `uuid@11.1.1`'e taşındı (kök projeyle
  aynı). `xcode` yalnız `require('uuid').v4` kullanır; `expo config --type
  prebuild` ve tüm mobil testler başarıyla çalıştı.
- Dependabot'un mobil için açtığı `shell-quote@1.12.0`, `source-map-js@1.2.2`,
  `compression@1.8.2` ve `brace-expansion@1.1.21` güncellemeleri lockfile'da
  zaten bulunuyor.
- Kalan bulgular (`braces`, `node-forge`, `decode-uri-component`, `sprintf-js`
  ve bunlara bağlı Expo/Jest/React Native paketleri) için yamalı sürüm yok
  (`braces`, `node-forge` tüm sürümler) ya da düzeltme Expo SDK 58'e major
  geçiş gerektiriyor. `decode-uri-component@0.5` yalnız ESM olduğu için
  `query-string@7`'ye zorlanamaz. Bu paketler derleme/test araçlarında veya
  build zamanı config eklentilerinde çalışır; uygulama paketine girmez.
- Yeniden değerlendirme: Expo SDK 58 geçişinde.
