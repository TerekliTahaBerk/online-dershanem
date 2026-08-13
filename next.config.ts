import type { NextConfig } from "next";

/**
 * Content Security Policy.
 *
 * - `'unsafe-eval'` YALNIZ development'ta verilir. Eski gerekçe "framer-motion
 *   için zorunlu" idi; framer-motion bu projede bağımlılık DEĞİL ve kod
 *   tabanında `eval`/`new Function` kullanımı yok. Production Next.js bundle'ı
 *   eval gerektirmez — dev'de webpack/React Refresh gerektirir.
 * - `'unsafe-inline'` script tarafında hâlâ gerekli: Next.js önyükleme ve
 *   `next/script` inline bloklarını (GA/Meta/TikTok pixel) çalıştırıyor.
 *   Kaldırılması nonce tabanlı CSP'ye geçmeyi gerektirir; bu ayrı bir pakettir.
 * - `script-src` içindeki pixel origin'leri: `components/analytics/pixels.tsx`
 *   bunlardan script yüklüyor. Daha önce listede DEĞİLLERDİ, yani pixel
 *   kimlikleri tanımlıyken bu scriptler CSP tarafından bloklanıyordu.
 * - `img-src`: düz `http:` kaldırıldı (HTTPS sayfada zaten mixed-content olarak
 *   engellenir). Genel `https:` korunuyor — reklam/analitik pikselleri çok
 *   sayıda ve değişken alan adı kullanıyor; daraltmak ölçüm kaybına yol açar.
 * - `frame-src`: PayTR iframe ve YouTube gömüleri.
 */
const secureDeployment = process.env.VERCEL_ENV === "production" || process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://");
const isDevelopment = process.env.NODE_ENV === "development";
const isVercelBuild = process.env.VERCEL === "1";

/** `components/analytics/pixels.tsx` tarafından yüklenen üçüncü taraf origin'ler. */
const analyticsScriptOrigins = [
  "https://www.googletagmanager.com",
  "https://connect.facebook.net",
  "https://analytics.tiktok.com",
];
const analyticsConnectOrigins = [
  "https://www.google-analytics.com",
  "https://analytics.tiktok.com",
  "https://www.facebook.com",
];

const csp = [
  "default-src 'self'",
  [
    "script-src 'self' 'unsafe-inline'",
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
    "https://va.vercel-scripts.com",
    "https://vercel.live",
    "https://static.cloudflareinsights.com",
    ...analyticsScriptOrigins,
  ].join(" "),
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: data:",
  [
    "connect-src 'self'",
    "https://*.vercel-insights.com",
    "https://vitals.vercel-insights.com",
    "https://*.upstash.io",
    "https://api.resend.com",
    "https://cloudflareinsights.com",
    ...analyticsConnectOrigins,
  ].join(" "),
  "frame-src 'self' https://www.paytr.com https://www.youtube.com https://www.youtube-nocookie.com blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://www.paytr.com",
  "frame-ancestors 'self'",
  ...(secureDeployment ? ["upgrade-insecure-requests"] : []),
].join("; ");

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
  // Content-Security-Policy
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  // Vercel packages the native Next.js output itself. Forcing standalone there
  // makes its post-build tracing hook look for a server trace that Next 16.3
  // may already have moved into the standalone bundle. Docker still consumes
  // `.next/standalone` and therefore keeps the self-hosted output mode.
  ...(isVercelBuild ? {} : { output: "standalone" as const }),
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
  async redirects() {
    return [
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
    ];
  },
};

export default nextConfig;
