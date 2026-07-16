import { NextResponse, type NextRequest } from "next/server";

/**
 * İYİMSER yönlendirme — GÜVENLİK SINIRI DEĞİLDİR.
 *
 * Burada yalnızca çerezin VARLIĞINA bakılır, geçerliliğine değil: Prisma
 * Accelerate ile çalışıyoruz ve Edge middleware'de veritabanına gitmek hem
 * pahalı hem karmaşık. Amaç, oturumu olmayan ziyaretçiyi boş panel kabuğu
 * çizmeden girişe yollamak.
 *
 * Gerçek yetki kontrolü `lib/auth/guards.ts` içinde, sorgunun yanında yapılır.
 * Burası doğrudan route handler çağrısıyla veya RSC payload isteğiyle
 * atlatılabilir; "middleware zaten baktı" varsayımı bu mimarideki en olası
 * güvenlik açığıdır.
 *
 * NOT: Next.js middleware'de `process.env` derleme anında gömülür — Vercel'de
 * `PANEL_ENABLED` değiştirildiğinde yeni bir deploy gerekir.
 */

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "od_session";
const LOGIN_PATH = "/giris";

export function middleware(request: NextRequest) {
  // Panel kapalıyken karışmıyoruz: layout guard'ı 404 verecek. Tek otorite orası.
  if (process.env.PANEL_ENABLED !== "true") {
    return NextResponse.next();
  }

  if (!request.cookies.has(SESSION_COOKIE_NAME)) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/panel/:path*"],
};
