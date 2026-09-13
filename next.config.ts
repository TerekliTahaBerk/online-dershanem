import type { NextConfig } from "next";

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
