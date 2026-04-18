import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { ensureUserAccessLinksByEmail } from "@/lib/user-links";
import { credentialsSchema } from "@/lib/validators";

async function syncUserPanelLinks(userId: string, email?: string | null, role?: "ADMIN" | "STUDENT" | "TEACHER" | null) {
  try {
    await ensureUserAccessLinksByEmail(userId, email, role);
  } catch (error) {
    console.error("[auth] failed to sync panel links", { userId, email, role, error });
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/giris"
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    }),
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

        if (!user || !user.passwordHash) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(parsed.data.password, user.passwordHash);

        if (!isPasswordValid) {
          return null;
        }

        await syncUserPanelLinks(user.id, user.email, user.role);

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
    async jwt({ token, user, account }) {
      // Google OAuth: find or create user in DB, set token.sub to our DB ID
      if (account?.provider === "google" && user?.email) {
        const email = user.email.toLowerCase();
        let dbUser = await prisma.user.findUnique({ where: { email } });

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email,
              name: user.name ?? null,
              // Keep OAuth-only users compatible with environments where the
              // generated Prisma client still expects a non-null passwordHash.
              passwordHash: "",
              role: "STUDENT"
            }
          });
        }

        await syncUserPanelLinks(dbUser.id, dbUser.email, dbUser.role);
        token.sub = dbUser.id;
      } else if (user) {
        token.sub = user.id;
      }

      if (!token.sub) {
        return token;
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: token.sub },
        select: {
          role: true,
          name: true,
          student: { select: { id: true } },
          teacher: { select: { id: true } },
        }
      });

      if (!currentUser) {
        return token;
      }

      token.role = currentUser.role;
      token.name = currentUser.name ?? token.name;
      token.isAdmin = currentUser.role === "ADMIN";
      token.hasStudentAccess = currentUser.role === "STUDENT" || Boolean(currentUser.student);
      token.hasTeacherAccess = Boolean(currentUser.teacher);

      // Query ODK access separately — table may not exist yet before db push
      let hasOdkAccess = false;
      try {
        const odkTag = await prisma.odkUserAccessTag.findFirst({
          where: {
            userId: token.sub,
            revokedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
          },
          select: { id: true }
        });
        hasOdkAccess = Boolean(odkTag);
      } catch {
        // Table doesn't exist yet — treat as no access
      }
      token.hasOdkAccess = hasOdkAccess;

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
        session.user.hasOdkAccess = Boolean(token.hasOdkAccess);
      }

      return session;
    }
  }
};

export function getServerAuthSession() {
  return getServerSession(authOptions);
}
