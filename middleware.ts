import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * /panel/* rotalarini korur.
 *
 * Kurallar:
 * - Login yoksa /giris\'e yonlendirilir.
 * - ADMIN: her panel segmentine erisebilir (view-as icin de gerekli).
 * - TEACHER / STUDENT / PARENT: yalniz kendi segmentine erisebilir.
 *   Yanlis segmentse kendi paneline yonlendirilir.
 *
 * /panel (segment yok) durumu sayfada handle edilir
 * (requirePanelSession + redirect).
 */
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    if (!pathname.startsWith("/panel")) {
      return NextResponse.next();
    }

    // /panel veya /panel/ -> sayfa kendi redirect\'ini yapacak
    const parts = pathname.split("/").filter(Boolean); // ["panel", "<seg>", ...]
    if (parts.length < 2) {
      return NextResponse.next();
    }

    const segment = parts[1];
    const role = token?.role as string | undefined;

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
      authorized: ({ token }) => Boolean(token),
    },
  },
);

export const config = {
  matcher: ["/panel/:path*"],
};
