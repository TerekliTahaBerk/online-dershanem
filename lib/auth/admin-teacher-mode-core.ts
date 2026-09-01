import { createHmac, timingSafeEqual } from "node:crypto";
import type { UserRole } from "@prisma/client";

/**
 * Admin → kendi öğretmen çalışma modu.
 *
 * View As (başka kullanıcı önizlemesi) DEĞİLDİR. Aynı ADMIN kullanıcısının
 * TeacherProfile üzerinden öğretmen panelinde yazabilir şekilde çalışmasıdır.
 * Öğretmenlerin yönetici hesabı yoktur — tek yönlü.
 */

export const ADMIN_TEACHER_MODE_COOKIE =
  process.env.ADMIN_TEACHER_MODE_COOKIE_NAME || "od_admin_teacher_mode";
export const ADMIN_TEACHER_MODE_TTL_MS = 12 * 60 * 60_000;

export type AdminTeacherModePayload = {
  v: 1;
  adminUserId: string;
  startedAt: string;
  exp: number;
};

export type AdminTeacherModeContext =
  | { enabled: false }
  | {
      enabled: true;
      adminUserId: string;
      startedAt: string;
      expiresAt: string;
    };

function modeSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for admin teacher mode");
  return secret;
}

function signPayload(encoded: string): string {
  return createHmac("sha256", modeSecret()).update(`admin-teacher-mode:${encoded}`).digest("base64url");
}

export function encodeAdminTeacherModeCookie(payload: AdminTeacherModePayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${signPayload(encoded)}`;
}

export function decodeAdminTeacherModeCookie(raw: string | undefined): AdminTeacherModePayload | null {
  if (!raw) return null;
  const [encoded, proof, extra] = raw.split(".");
  if (extra !== undefined || !encoded || !proof) return null;
  const expected = signPayload(encoded);
  const actualBuf = Buffer.from(proof);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as AdminTeacherModePayload;
    if (parsed.v !== 1) return null;
    if (typeof parsed.adminUserId !== "string" || !parsed.adminUserId) return null;
    if (typeof parsed.exp !== "number" || parsed.exp <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function toAdminTeacherModeContext(payload: AdminTeacherModePayload | null): AdminTeacherModeContext {
  if (!payload) return { enabled: false };
  return {
    enabled: true,
    adminUserId: payload.adminUserId,
    startedAt: payload.startedAt,
    expiresAt: new Date(payload.exp).toISOString(),
  };
}

export function canUseAdminTeacherMode(actor: { role: UserRole }): boolean {
  return actor.role === "ADMIN";
}

/**
 * Rol-bağımsız panel sayfalarında (bildirimler vb.) kabuğa verilecek rol.
 * Öğretmen çalışma modu açıkken ADMIN oturumu TEACHER menüsü gösterir;
 * yönetim sayfaları kendi guard'larıyla ADMIN geçmeye devam eder.
 */
export function panelShellRoleForContext(
  sessionRole: UserRole,
  teacherModeEnabled: boolean,
): UserRole {
  if (sessionRole === "ADMIN" && teacherModeEnabled) return "TEACHER";
  return sessionRole;
}

/** Effective session: aynı userId, role=TEACHER. */
export function toAdminTeacherModeSession<T extends {
  sessionId: string;
  userId: string;
  email: string;
  role: UserRole;
  status: string;
  fullName: string | null;
  mustChangePassword: boolean;
  mfaVerifiedAt: Date | null;
  stepUpAt: Date | null;
}>(actor: T): T {
  return {
    ...actor,
    role: "TEACHER",
    mustChangePassword: false,
  };
}
