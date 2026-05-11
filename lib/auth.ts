import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { ensureUserAccessLinksByEmail } from "@/lib/user-links";
import { credentialsSchema } from "@/lib/validators";

async function syncUserPanelLinks(userId: string, email?: string | null, role?: "ADMIN" | "STUDENT" | "TEACHER" | "PARENT" | null) {
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
          name: true,
          student: { select: { id: true } },
          teacher: { select: { id: true } },
          parent: { select: { id: true } },
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
      token.hasParentAccess = currentUser.role === "PARENT" || Boolean(currentUser.parent);

      // Query OD/ODK access from access tags. Admin always sees everything.
      let hasOdAccess = currentUser.role === "ADMIN";
      let hasOdkAccess = currentUser.role === "ADMIN";

      if (!token.isAdmin) {
        try {
          const activeTags = await prisma.odkUserAccessTag.findMany({
            where: {
              userId: token.sub,
              revokedAt: null,
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
              accessTag: { isActive: true },
            },
            select: { accessTag: { select: { service: true } } },
          });
          for (const t of activeTags) {
            if (t.accessTag?.service === "OD") hasOdAccess = true;
            if (t.accessTag?.service === "ODK") hasOdkAccess = true;
          }
        } catch {
          // Table/column doesn't exist yet — fall back to legacy relation-based access for OD.
          hasOdAccess = token.hasStudentAccess || token.hasTeacherAccess;
        }

        // Legacy fallback: if user has Student/Teacher relation but no OD tag yet,
        // still grant OD panel access so existing users never lose access mid-migration.
        if (!hasOdAccess && (token.hasStudentAccess || token.hasTeacherAccess)) {
          hasOdAccess = true;
        }
      }

      token.hasOdAccess = hasOdAccess;
      token.hasOdkAccess = hasOdkAccess;

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as "ADMIN" | "STUDENT" | "TEACHER" | "PARENT") ?? "ADMIN";
        session.user.name = token.name ?? session.user.name;
        session.user.isAdmin = Boolean(token.isAdmin);
        session.user.hasStudentAccess = Boolean(token.hasStudentAccess);
        session.user.hasTeacherAccess = Boolean(token.hasTeacherAccess);
        session.user.hasParentAccess = Boolean(token.hasParentAccess);
        session.user.hasOdAccess = Boolean(token.hasOdAccess);
        session.user.hasOdkAccess = Boolean(token.hasOdkAccess);
      }

      return session;
    }
  }
};

export function getServerAuthSession() {
  return getServerSession(authOptions);
}
