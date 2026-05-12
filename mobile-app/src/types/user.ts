/** Web'deki Prisma UserRole ile birebir eşleşir. */
export type UserRole = "ADMIN" | "STUDENT" | "TEACHER" | "PARENT";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  /** Profil resmi URL'i (mobil-spesifik, opsiyonel). */
  avatarUrl?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Unix epoch ms — access token expiry. */
  accessExpiresAt: number;
}
