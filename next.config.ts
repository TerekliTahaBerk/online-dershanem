import type { NextConfig } from "next";

/**
 * Content Security Policy — pragmatic baseline.
 *
 * - `unsafe-inline` / `unsafe-eval`: Next.js client bundle ve framer-motion için zorunlu.
 *   (Strict CSP'ye geçiş ileride bir round'da nonce-based ile yapılır.)
 * - `frame-src`: PayTR iframe, Google Meet, YouTube embed (blog), PDF iframe (ODK solver).
 * - `connect-src`: NextAuth, Vercel Analytics, Pusher, Upstash (cache), Vercel Blob, Cloudflare Insights beacon.
 * - `img-src` / `media-src`: data + blob (avatar/PDF render), Vercel Blob CDN.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vercel.live https://www.googletagmanager.com https://js.pusher.com https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https: http:",
  "media-src 'self' blob: data:",
  "connect-src 'self' https://*.vercel-insights.com https://vitals.vercel-insights.com https://*.pusher.com wss://*.pusher.com https://*.upstash.io https://*.public.blob.vercel-storage.com https://api.resend.com https://www.google-analytics.com https://cloudflareinsights.com",
  "frame-src 'self' https://www.paytr.com https://meet.google.com https://www.youtube.com https://www.youtube-nocookie.com blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://www.paytr.com",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  // Tarayıcıya: bu site'ı her zaman HTTPS üzerinden ziyaret et (1 yıl + preload).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
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
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
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
};

export default nextConfig;
