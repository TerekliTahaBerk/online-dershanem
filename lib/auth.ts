import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { credentialsSchema } from "@/lib/validators";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/giris"
  },
  providers: [
    CredentialsProvider({
      name: "Yonetici Girisi",
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" }
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.email.toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email }
        });

        if (!user) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(parsed.data.password, user.passwordHash);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }

      if (!token.sub) {
        return token;
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: token.sub },
        select: {
          role: true,
          isAdmin: true,
          name: true,
          student: { select: { id: true } },
          teacher: { select: { id: true } }
        }
      });

      if (!currentUser) {
        return token;
      }

      token.role = currentUser.role;
      token.name = currentUser.name ?? token.name;
      token.isAdmin = Boolean(currentUser.isAdmin) || currentUser.role === "ADMIN";
      token.hasStudentAccess = Boolean(currentUser.student);
      token.hasTeacherAccess = Boolean(currentUser.teacher);

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as "ADMIN" | "STUDENT" | "TEACHER") ?? "ADMIN";
        session.user.name = token.name ?? session.user.name;
        session.user.isAdmin = Boolean(token.isAdmin);
        session.user.hasStudentAccess = Boolean(token.hasStudentAccess);
        session.user.hasTeacherAccess = Boolean(token.hasTeacherAccess);
      }

      return session;
    }
  }
};

export function getServerAuthSession() {
  return getServerSession(authOptions);
}
