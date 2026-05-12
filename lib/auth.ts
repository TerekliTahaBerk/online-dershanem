import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { credentialsSchema } from "@/lib/validators";

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
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

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
