import type { DefaultSession } from "next-auth";

type UserRole = "ADMIN" | "STUDENT" | "TEACHER" | "PARENT";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: UserRole;
      /**
       * Phase 3 / Session 2 — when true, the panel server-guard redirects
       * every panel request (except the change-password page itself) to
       * `/panel/sifre-degistir`. Cached on the JWT, refreshed at sign-in.
       */
      mustChangePassword: boolean;
    };
  }

  interface User {
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    mustChangePassword?: boolean;
  }
}
