import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

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
 */
export default withAuth(
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
      return NextResponse.next();
    }

    // ─── Panel sayfa koruması ────────────────────────────────────────
    if (!pathname.startsWith("/panel")) {
      return NextResponse.next();
    }

    // /panel/sifre-degistir → role-agnostic. Hem ADMIN hem diğer roller
    // (mustChangePassword=true iken) buraya direkt erişebilmeli. Aksi halde
    // segment-mismatch redirect'i forced-change ekranına ulaşmayı engeller.
    if (pathname === "/panel/sifre-degistir" || pathname.startsWith("/panel/sifre-degistir/")) {
      return NextResponse.next();
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
      return NextResponse.next();
    }

    const segment = parts[1];

    if (role === "ADMIN") return NextResponse.next();

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

    return NextResponse.next();
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

export const config = {
  matcher: [
    "/panel/:path*",
    "/api/v1/admin/:path*",
    "/api/admin/:path*",
    "/api/v1/odk/admin/:path*",
  ],
};

