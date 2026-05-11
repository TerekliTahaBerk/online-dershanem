import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Middleware — TÜM panel ve API route'larını korur.
 * Her route prefix'ine göre uygun token claim'i match edilir.
 *
 * Kural: hiçbir route handler "unutulmuş guard" yüzünden açıkta kalmasın.
 * Sayfa-level guard (`requirePagePermission`) ek granularity için.
 */
export default withAuth(
  function onAuthorized() {
    return NextResponse.next();
  },
  {
    pages: { signIn: "/giris" },
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        // Admin alanları
        if (
          pathname.startsWith("/admin") ||
          pathname.startsWith("/v2/admin") ||
          pathname.startsWith("/odk/admin") ||
          pathname.startsWith("/api/admin") ||
          pathname.startsWith("/api/odk/admin") ||
          pathname.startsWith("/api/v1/admin")
        ) {
          return Boolean(token?.isAdmin);
        }

        // Öğretmen
        if (
          pathname.startsWith("/ogretmen") ||
          pathname.startsWith("/v2/ogretmen") ||
          pathname.startsWith("/api/v1/teacher")
        ) {
          return Boolean(token?.hasTeacherAccess) || Boolean(token?.isAdmin);
        }

        // Öğrenci
        if (
          pathname === "/panel" || pathname.startsWith("/panel/") ||
          pathname === "/v2/panel" || pathname.startsWith("/v2/panel/") ||
          pathname.startsWith("/api/v1/student")
        ) {
          return Boolean(token?.hasStudentAccess) || Boolean(token?.isAdmin);
        }

        // Veli
        if (
          pathname.startsWith("/veli") ||
          pathname.startsWith("/v2/veli") ||
          pathname.startsWith("/api/v1/parent")
        ) {
          return Boolean(token?.hasParentAccess) || Boolean(token?.isAdmin);
        }

        // ODK öğrenci paneli
        if (pathname.startsWith("/odk/panel") || pathname.startsWith("/api/odk/panel")) {
          return Boolean(token?.hasOdkAccess) || Boolean(token?.isAdmin);
        }

        // Self / me API
        if (pathname.startsWith("/api/v1/me")) {
          return Boolean(token);
        }

        return true;
      }
    }
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/v2/:path*",
    "/ogretmen/:path*",
    "/panel",
    "/panel/:path*",
    "/veli/:path*",
    "/odk/admin/:path*",
    "/odk/panel/:path*",
    "/api/admin/:path*",
    "/api/odk/admin/:path*",
    "/api/odk/panel/:path*",
    "/api/v1/:path*"
  ]
};
