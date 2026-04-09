import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { type NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database"
  },
  pages: {
    signIn: "/giris"
  },
  providers: [
    CredentialsProvider({
      name: "Yönetim Girişi",
      credentials: {
        email: {
          label: "E-posta",
          type: "email"
        },
        password: {
          label: "Şifre",
          type: "password"
        }
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);

        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: parsed.data.email
          }
        });

        if (!user) {
          return null;
        }

        const isPasswordValid = await compare(parsed.data.password, user.passwordHash);
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
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = (user as { role?: "ADMIN" }).role ?? "ADMIN";
      }

      return session;
    }
  }
};

export function auth() {
  return getServerSession(authOptions);
}
