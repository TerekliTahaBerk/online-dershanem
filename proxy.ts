import { NextResponse, type NextRequest } from "next/server";

/**
 * İYİMSER yönlendirme — GÜVENLİK SINIRI DEĞİLDİR.
 *
 * Burada yalnızca çerezin VARLIĞINA bakılır, geçerliliğine değil: Prisma
 * Accelerate ile çalışıyoruz ve proxy katmanında veritabanına gitmek hem pahalı
 * hem de gereksiz. Amaç, oturumu olmayan ziyaretçiyi boş panel kabuğu
 * çizmeden girişe yollamak.
 *
 * Gerçek yetki kontrolü `lib/auth/guards.ts` içinde, sorgunun yanında yapılır.
 * Burası doğrudan route handler çağrısıyla veya RSC payload isteğiyle
 * atlatılabilir; "middleware zaten baktı" varsayımı bu mimarideki en olası
 * güvenlik açığıdır.
 *
 * NOT: Next.js proxy katmanında `process.env` derleme anında gömülür — Vercel'de
 * `PANEL_ENABLED` değiştirildiğinde yeni bir deploy gerekir.
 */

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "od_session";
const LOGIN_PATH = "/giris";

const scriptOrigins = [
  "https://va.vercel-scripts.com",
  "https://vercel.live",
  "https://static.cloudflareinsights.com",
  "https://www.googletagmanager.com",
  "https://connect.facebook.net",
  "https://analytics.tiktok.com",
];

function contentSecurityPolicy(nonce: string) {
  const isDevelopment = process.env.NODE_ENV === "development";
  const secureDeployment =
    process.env.VERCEL_ENV === "production" ||
    process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://");

  return [
    "default-src 'self'",
    [
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      ...(isDevelopment ? ["'unsafe-eval'"] : []),
      ...scriptOrigins,
    ].join(" "),
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    `style-src-elem 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "style-src-attr 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com data:",
    [
      "img-src 'self' data: blob:",
      "https://*.google-analytics.com",
      "https://www.facebook.com",
      "https://analytics.tiktok.com",
      "https://*.tiktok.com",
    ].join(" "),
    "media-src 'self' blob: data:",
    [
      "connect-src 'self'",
      "https://*.vercel-insights.com",
      "https://vitals.vercel-insights.com",
      "https://*.upstash.io",
      "https://api.resend.com",
      "https://cloudflareinsights.com",
      "https://www.googletagmanager.com",
      "https://*.google-analytics.com",
      "https://analytics.tiktok.com",
      "https://*.tiktok.com",
      "https://www.facebook.com",
    ].join(" "),
    "frame-src 'self' https://www.paytr.com https://www.youtube.com https://www.youtube-nocookie.com blob:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://www.paytr.com",
    "frame-ancestors 'self'",
    ...(secureDeployment ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

function withCsp(response: NextResponse, csp: string) {
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  // Panel kapalıyken karışmıyoruz: layout guard'ı 404 verecek. Tek otorite orası.
  if (
    request.nextUrl.pathname.startsWith("/panel") &&
    process.env.PANEL_ENABLED === "true" &&
    !request.cookies.has(SESSION_COOKIE_NAME)
  ) {
    return withCsp(NextResponse.redirect(new URL(LOGIN_PATH, request.url)), csp);
  }

  return withCsp(
    NextResponse.next({ request: { headers: requestHeaders } }),
    csp,
  );
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
