import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/giris"
  },
  callbacks: {
    authorized: ({ token, req }) => {
      const pathname = req.nextUrl.pathname;

      if (
        pathname.startsWith("/admin") ||
        pathname.startsWith("/odk/admin") ||
        pathname.startsWith("/api/admin") ||
        pathname.startsWith("/api/odk/admin")
      ) {
        return Boolean(token?.isAdmin);
      }

      return true;
    }
  }
});

export const config = {
  // Include admin API routes so a forgotten auth check in one handler
  // doesn't leave it fully unauthenticated.
  matcher: [
    "/admin/:path*",
    "/odk/admin/:path*",
    "/api/admin/:path*",
    "/api/odk/admin/:path*",
  ],
};
