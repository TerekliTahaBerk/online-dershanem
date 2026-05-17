import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { credentialsSchema } from "@/lib/validators";
import { isLockedOut, recordFailedAttempt, isIpLockedOut, recordIpFailedAttempt, extractClientIp } from "@/lib/login-attempts";
import { logAudit } from "@/lib/audit";
import { log } from "@/lib/logger";

/**
 * NextAuth temel konfigurasyonu.
 *
 * JWT/Session sadece temel kimlik (id, email, name, role) tasiyor.
 * Panel-spesifik yetkiler her sayfa-server'inda Prisma'dan canli okunur.
 */
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/giris",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Sifre", type: "password" },
      },
      async authorize(credentials, req) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();
        const ip = extractClientIp(req?.headers ?? {});

        // IP-based brute-force (credential stuffing)
        if (await isIpLockedOut(ip)) {
          log.warn("auth.ip_locked_out", { ip });
          return null;
        }

        // Email-based brute-force — 5 fail / 15dk lockout
        if (await isLockedOut(email)) {
          log.warn("auth.login_locked_out", { email, ip });
          // null → NextAuth "CredentialsSignin" hatası verir; UI generic mesaj gösterir.
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) {
          const res = await recordFailedAttempt(email);
          await recordIpFailedAttempt(ip);
          log.warn("auth.login_failed", { email, ip, reason: "no_user", remaining: res.remaining });
          return null;
        }

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) {
          const res = await recordFailedAttempt(email);
          await recordIpFailedAttempt(ip);
          log.warn("auth.login_failed", { email, ip, reason: "bad_password", remaining: res.remaining, lockedNow: res.lockedNow });
          if (res.lockedNow) {
            void logAudit({
              actorUserId: user.id,
              entityType: "User",
              entityId: user.id,
              action: "LOGIN_LOCKOUT",
              summary: `${email} — 5 başarısız deneme, 15dk lockout`,
              payload: { email, ip },
            });
          }
          return null;
        }

        log.info("auth.login_ok", { userId: user.id, role: user.role, ip });
        void logAudit({
          actorUserId: user.id,
          entityType: "User",
          entityId: user.id,
          action: "LOGIN_SUCCESS",
          summary: `${email} giriş yaptı`,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      if (!token.sub) return token;

      const currentUser = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { role: true, name: true },
      });
      if (!currentUser) return token;

      token.role = currentUser.role;
      token.name = currentUser.name ?? token.name;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role =
          (token.role as "ADMIN" | "STUDENT" | "TEACHER" | "PARENT") ?? "STUDENT";
        session.user.name = token.name ?? session.user.name;
      }
      return session;
    },
  },
};

export function getServerAuthSession() {
  return getServerSession(authOptions);
}
