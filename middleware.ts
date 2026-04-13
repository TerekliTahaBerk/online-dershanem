import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/giris"
  },
  callbacks: {
    authorized: ({ token }) => Boolean(token?.isAdmin)
  }
});

export const config = {
  matcher: ["/admin/:path*"]
};
