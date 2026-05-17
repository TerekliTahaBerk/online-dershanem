import type { NextConfig } from "next";

const securityHeaders = [
  // Tarayıcıya: bu site'ı her zaman HTTPS üzerinden ziyaret et (1 yıl).
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // MIME-type sniffing engelle
  { key: "X-Content-Type-Options", value: "nosniff" },
  // iframe içine alınmayı engelle (clickjacking)
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Referer policy — cross-origin'e tam URL gönderme
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Permissions — varsayılan kısıtlayıcı
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
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
