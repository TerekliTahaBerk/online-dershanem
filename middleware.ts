import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/giris"
  },
  callbacks: {
    authorized: ({ token, req }) => {
      const pathname = req.nextUrl.pathname;

      if (pathname.startsWith("/admin") || pathname.startsWith("/odk/admin")) {
        return Boolean(token?.isAdmin);
      }

      return true;
    }
  }
});

export const config = {
  matcher: ["/admin/:path*", "/odk/admin/:path*"]
};
