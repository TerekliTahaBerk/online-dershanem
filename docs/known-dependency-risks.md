# Bilinen bağımlılık riskleri

Bu kayıt, otomatik audit kapısında süreli olarak kabul edilen veya henüz güvenli
bir üst paket güncellemesi bulunmayan bağımlılık risklerini izler. İstisnalar
kalıcı değildir; `config/npm-audit-allowlist.json` içindeki son kullanma tarihi
geçince CI yeniden kırmızı olur.

## Lighthouse CI / extract-zip

- Advisory: `GHSA-jmr9-qjv8-65gv` ve `GHSA-7pqw-9j4j-h8q3` (yüksek).
- Zincir: `@lhci/cli@0.15.1` → `lighthouse@12.6.1` →
  `puppeteer-core@24.43.1` → `@puppeteer/browsers@2.13.2` →
  `extract-zip@2.0.1`.
- Neden şimdi düzeltilemiyor: 14 Eylül 2026 itibarıyla yayımlanmış en güncel
  `@lhci/cli` sürümü 0.15.1 ve Lighthouse 12.6.1'i sabitliyor. Audit'in önerdiği
  0.12.0'a dönüş gerçek bir güvenlik düzeltmesi değil; güncel Lighthouse
  `13.4.1`i zorlamak ise upstream tarafından test edilmemiş bir major geçiş.
- Gerçek risk: Bu zincir yalnızca geliştirme/CI ortamında çalışır ve production
  bundle'a girmez. Saldırı, CI runner'ın kötü niyetli veya değiştirilmiş bir
  Chromium arşivini açmasını gerektirir; production kullanıcı isteği doğrudan
  bu kod yoluna erişmez. Yine de runner dosya bütünlüğü açısından yüksek önemle
  izlenir.
- Azaltımlar: Lighthouse yalnızca repoda sabitlenmiş URL'leri kontrollü CI
  runner'ında tarar. `chrome-launcher@1.2.1` override'ı eski
  `rimraf@3`/`glob@7`/`inflight` zincirini kaldırır. Audit kapısı yalnızca bu iki
  advisory kimliğine süreli izin verir; aynı paketlerde çıkacak yeni advisory'ler
  de dahil olmak üzere diğer tüm high/critical bulgular CI'ı kırar.
- Yeniden değerlendirme: 14 Ekim 2026 veya yeni bir `@lhci/cli` sürümü
  yayımlandığında (hangisi önceyse). Güvenli sürüm çıktığında override/istisna
  kaldırılıp `npm run lighthouse:ci` yeniden çalıştırılacak.

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
