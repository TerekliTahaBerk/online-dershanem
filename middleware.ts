import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/giris"
  },
  callbacks: {
    authorized: ({ token }) => token?.role === "ADMIN"
  }
});

export const config = {
  matcher: ["/admin/:path*"]
};
