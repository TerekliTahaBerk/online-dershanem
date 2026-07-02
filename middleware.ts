import { withAuth } from "next-auth/middleware";
import type { NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import { isPanelEnabled, PANEL_MAINTENANCE_PATH } from "@/lib/panel-config";

function nextWithPathname(req: NextRequest): NextResponse {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-od-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

/**
 * /panel/* ve admin API'lerini korur.
 *
 * /panel/* kuralları:
 * - Login yoksa /giris'e yonlendirilir.
 * - ADMIN: her panel segmentine erisebilir (view-as icin de gerekli).
 * - TEACHER / STUDENT / PARENT: yalniz kendi segmentine erisebilir.
 *   Yanlis segmentse kendi paneline yonlendirilir.
 *
 * /panel (segment yok) durumu sayfada handle edilir
 * (requirePanelSession + redirect).
 *
 * Admin API kuralları (defense-in-depth):
 * - /api/v1/admin/*, /api/admin/*, /api/v1/odk/admin/* → ADMIN olmalı.
 * - Handler-level requireAdminApi() korumalarına ek katman.
 * - Başarısızsa 401 JSON döner (redirect değil).
 *
 * NOT (panel feature-flag): Bu withAuth middleware'i yalnızca PANEL_ENABLED=true
 * iken çalışır. Panel kapalıyken aşağıdaki `middleware` wrapper'ı devreye girer;
 * panel sayfalarını /panel-yenileniyor'a yönlendirir, panel API'lerini 503 yapar.
 */
const authMiddleware = withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    const role = token?.role as string | undefined;

    // ─── Admin API koruması ──────────────────────────────────────────
    const isAdminApi =
      pathname.startsWith("/api/v1/admin") ||
      pathname.startsWith("/api/admin") ||
      pathname.startsWith("/api/v1/odk/admin");

    if (isAdminApi) {
      if (role !== "ADMIN") {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Admin yetkisi gerekli." } },
          { status: 403 },
        );
      }
      return nextWithPathname(req);
    }

    // ─── Panel sayfa koruması ────────────────────────────────────────
    if (!pathname.startsWith("/panel")) {
      return nextWithPathname(req);
    }

    // /panel/sifre-degistir → role-agnostic. Hem ADMIN hem diğer roller
    // (mustChangePassword=true iken) buraya direkt erişebilmeli. Aksi halde
    // segment-mismatch redirect'i forced-change ekranına ulaşmayı engeller.
    if (pathname === "/panel/sifre-degistir" || pathname.startsWith("/panel/sifre-degistir/")) {
      return nextWithPathname(req);
    }

    // Phase 3 / Session 2 — defense-in-depth. JWT'de mustChangePassword
    // varsa, server-guard'a güvenmek yerine middleware burada da
    // /panel/sifre-degistir'e çevirir. JWT eskimişse (DB değişmiş ama
    // token tazelenmemiş) server-guard yine yakalar.
    if (token?.mustChangePassword === true) {
      const url = req.nextUrl.clone();
      url.pathname = "/panel/sifre-degistir";
      return NextResponse.redirect(url);
    }

    // /panel veya /panel/ -> sayfa kendi redirect'ini yapacak
    const parts = pathname.split("/").filter(Boolean); // ["panel", "<seg>", ...]
    if (parts.length < 2) {
      return nextWithPathname(req);
    }

    const segment = parts[1];

    if (role === "ADMIN") return nextWithPathname(req);

    const allowedSegment =
      role === "TEACHER" ? "ogretmen" :
      role === "STUDENT" ? "ogrenci" :
      role === "PARENT" ? "veli" : null;

    if (!allowedSegment) {
      const url = req.nextUrl.clone();
      url.pathname = "/giris";
      return NextResponse.redirect(url);
    }

    if (segment !== allowedSegment) {
      const url = req.nextUrl.clone();
      url.pathname = `/panel/${allowedSegment}`;
      return NextResponse.redirect(url);
    }

    return nextWithPathname(req);
  },
  {
    pages: { signIn: "/giris" },
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        // Admin API: token olmasa bile middleware fonksiyonu çağrılsın
        // ki JSON 403 dönsün (redirect yerine).
        const isAdminApi =
          pathname.startsWith("/api/v1/admin") ||
          pathname.startsWith("/api/admin") ||
          pathname.startsWith("/api/v1/odk/admin");
        if (isAdminApi) return Boolean(token);
        // Panel sayfaları: token şart
        return Boolean(token);
      },
    },
  },
);

// ─── Panel feature-flag wrapper ────────────────────────────────────────────
// PANEL_ENABLED !== true iken eski panele erişimi kapatır. Public site
// route'larına (landing, paketler, blog, ödeme/lead) dokunmaz; bu paths
// zaten matcher'da değil.

const AUTH_PAGES = ["/giris", "/kayit", "/sifremi-unuttum"];

function isPanelPage(pathname: string): boolean {
  if (pathname === PANEL_MAINTENANCE_PATH) return false; // bakım sayfasının kendisi
  if (pathname === "/panel" || pathname.startsWith("/panel/")) return true;
  return AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isPanelApi(pathname: string): boolean {
  return (
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/v1/admin") ||
    pathname.startsWith("/api/v1/odk/admin")
  );
}

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  if (!isPanelEnabled()) {
    // Panel/admin API → 503 JSON (public satın alma / PayTR callback dokunulmaz)
    if (isPanelApi(pathname)) {
      return NextResponse.json(
        {
          error: {
            code: "PANEL_DISABLED",
            message: "Panel geçici olarak yenileniyor.",
          },
        },
        { status: 503 },
      );
    }

    // Panel sayfaları + eski auth ekranları → bakım sayfasına yönlendir
    if (isPanelPage(pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = PANEL_MAINTENANCE_PATH;
      url.search = "";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // PANEL_ENABLED=true → eski davranış.
  // Eski auth ekranları (/giris, /kayit, /sifremi-unuttum) eskiden de
  // korumasızdı; withAuth'a göndermeyelim (signIn redirect döngüsü olmasın).
  if (AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  return authMiddleware(req as NextRequestWithAuth, event);
}

export const config = {
  matcher: [
    "/panel",
    "/panel/:path*",
    "/giris",
    "/kayit",
    "/sifremi-unuttum",
    "/api/v1/admin/:path*",
    "/api/admin/:path*",
    "/api/v1/odk/admin/:path*",
  ],
};
