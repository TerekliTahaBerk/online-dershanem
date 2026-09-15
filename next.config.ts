import { readFileSync } from "node:fs";
import type { NextConfig } from "next";
import { resolveBuildInfo } from "./lib/build-info";

/**
 * Build kimliği burada bir kez çözülür ve üç yere birden gider:
 *  1. `env` — artefaktın içine gömülür, runtime'da `lib/build-info` okur.
 *  2. `headers()` — her yanıtta `x-build-*` olarak görünür; production'ın hangi
 *     commit'te olduğunu tek `curl -I` ile doğrulamayı mümkün kılar.
 *  3. `/api/version` ve footer damgası aynı gömülü değerleri kullanır.
 */
const packageVersion = (
  JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version?: string }
).version;

/**
 * `APP_BUILD_TIME` bilerek burada üretilmez: Next bu dosyayı build sırasında
 * birden çok süreçte değerlendirir, `new Date()` her seferinde başka bir değer
 * verir ve aynı build `x-build-time` başlığında bir, `/api/version` gövdesinde
 * başka bir zaman bildirir. Tek doğru zaman damgasını build hattı verir
 * (`vercel.json` buildCommand ve `Dockerfile`); verilmezse alan `null` kalır.
 */
const build = resolveBuildInfo({
  ...process.env,
  APP_BUILD_VERSION: process.env.APP_BUILD_VERSION ?? packageVersion,
});

/** Değeri olmayan anahtarı gömmeyiz: boş string "bilinmiyor"dan daha yanıltıcı. */
const buildEnv = Object.fromEntries(
  Object.entries({
    APP_BUILD_SHA: build.commitSha,
    APP_BUILD_REF: build.commitRef,
    APP_BUILD_VERSION: build.version,
    APP_BUILD_RELEASE: build.releaseTag,
    APP_BUILD_TIME: build.builtAt,
  }).filter((entry): entry is [string, string] => Boolean(entry[1])),
);

const buildHeaders = Object.entries({
  "x-build-version": build.version,
  "x-build-sha": build.commitSha,
  "x-build-ref": build.commitRef,
  "x-build-time": build.builtAt,
})
  .filter((entry): entry is [string, string] => Boolean(entry[1]))
  .map(([key, value]) => ({ key, value }));

const secureDeployment = process.env.VERCEL_ENV === "production" || process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://");
const isVercelBuild = process.env.VERCEL === "1";

const securityHeaders = [
  // Tarayıcıya: bu site'ı her zaman HTTPS üzerinden ziyaret et (1 yıl + preload).
  ...(secureDeployment ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
  // MIME-type sniffing engelle
  { key: "X-Content-Type-Options", value: "nosniff" },
  // iframe içine alınmayı engelle (clickjacking)
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Referer policy — cross-origin'e tam URL gönderme
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Permissions — varsayılan kısıtlayıcı (kamera/mikrofon Meet'te kullanılır; iframe oradan açıyor)
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // Cross-Origin Opener Policy — Spectre koruması (OAuth popup'larda gevşetilebilir)
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  // Çalışan artefaktın kimliği — `curl -I` ile production/main karşılaştırması.
  ...buildHeaders,
];

const nextConfig: NextConfig = {
  // Vercel packages the native Next.js output itself. Forcing standalone there
  // makes its post-build tracing hook look for a server trace that Next 16.3
  // may already have moved into the standalone bundle. Docker still consumes
  // `.next/standalone` and therefore keeps the self-hosted output mode.
  ...(isVercelBuild ? {} : { output: "standalone" as const }),
  env: buildEnv,
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  /**
   * Eski URL'ler BURADA yönlendirilir, sayfa içinde `permanentRedirect()` ile
   * DEĞİL: kökte `app/loading.tsx` olduğu için her dinamik sayfa stream
   * ediliyor ve sayfa içi yönlendirme tarayıcıya 200 gövdesinin İÇİNDE
   * ulaşıyor. Arama motoru 301 değil, kök layout metadata'sıyla boş bir 200
   * görüyordu (`/matematik-ders-paketi` indekslenmiş bir adresti).
   */
  async redirects() {
    return [
      { source: "/matematik-ders-paketi", destination: "/ders-paketleri", permanent: true },
      { source: "/paket", destination: "/ders-paketleri", permanent: true },
      { source: "/tyt", destination: "/yks", permanent: true },
      { source: "/ayt", destination: "/yks", permanent: true },
      { source: "/online-dershane", destination: "/urunler/online-dershanem", permanent: true },
      { source: "/deneme-kulubu", destination: "/urunler/online-deneme-kulubum", permanent: true },
      { source: "/odk", destination: "/urunler/online-deneme-kulubum", permanent: true },
      { source: "/odk-paketleri", destination: "/urunler/online-deneme-kulubum", permanent: true },
      { source: "/online-deneme-kulubu", destination: "/urunler/online-deneme-kulubum", permanent: true },
      { source: "/deneme-paketleri", destination: "/urunler/online-deneme-kulubum", permanent: true },
      { source: "/tyt-deneme-kulubu", destination: "/urunler/online-deneme-kulubum", permanent: true },
      { source: "/lgs-deneme-kulubu", destination: "/urunler/online-deneme-kulubum", permanent: true },
      // Panel IA vocabulary aliases — canonical paths korunur.
      {
        source: "/panel/yonetim/ogretmenler",
        destination: "/panel/yonetim/egitmenler",
        permanent: false,
      },
      {
        source: "/panel/yonetim/kullanicilar",
        destination: "/panel/yonetim/kisiler",
        permanent: false,
      },
      {
        source: "/panel/ogrenci/calismalar",
        destination: "/panel/ogrenci/odevler",
        permanent: false,
      },
      {
        source: "/panel/ogretmen/calismalar",
        destination: "/panel/ogretmen/odevler",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
