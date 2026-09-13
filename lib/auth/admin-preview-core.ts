import { createHmac, timingSafeEqual } from "node:crypto";
import type { UserRole, UserStatus } from "@prisma/client";
import {
  ADMIN_PREVIEW_PERMISSION,
  isPreviewableRole,
  type PanelActorContext,
  type PanelPreviewContext,
  type PreviewableRole,
  type PreviewSubject,
} from "@/lib/panel/preview-context";

/** session.ts server-only olduğu için burada minimal mirror tutulur. */
export type PreviewSessionIdentity = {
  sessionId: string;
  userId: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  fullName: string | null;
  mustChangePassword: boolean;
  mfaVerifiedAt: Date | null;
  stepUpAt: Date | null;
};

export const ADMIN_PREVIEW_COOKIE = process.env.ADMIN_PREVIEW_COOKIE_NAME || "od_panel_preview";
export const ADMIN_PREVIEW_TTL_MS = 2 * 60 * 60_000;

export type PreviewCookiePayload = {
  v: 1;
  previewRole: PreviewableRole;
  previewUserId: string;
  startedByAdminId: string;
  startedAt: string;
  returnPath: string | null;
  exp: number;
};

function previewSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for admin panel preview");
  return secret;
}

function signPayload(encoded: string): string {
  return createHmac("sha256", previewSecret()).update(`admin-preview:${encoded}`).digest("base64url");
}

export function encodeAdminPreviewCookie(payload: PreviewCookiePayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${signPayload(encoded)}`;
}

export function decodeAdminPreviewCookie(raw: string | undefined): PreviewCookiePayload | null {
  if (!raw) return null;
  const [encoded, proof, extra] = raw.split(".");
  if (extra !== undefined || !encoded || !proof) return null;
  const expected = signPayload(encoded);
  const actualBuf = Buffer.from(proof);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as PreviewCookiePayload;
    if (parsed.v !== 1) return null;
    if (!isPreviewableRole(parsed.previewRole)) return null;
    if (typeof parsed.previewUserId !== "string" || !parsed.previewUserId) return null;
    if (typeof parsed.startedByAdminId !== "string" || !parsed.startedByAdminId) return null;
    if (typeof parsed.exp !== "number" || parsed.exp <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function toPreviewContext(payload: PreviewCookiePayload | null): PanelPreviewContext {
  if (!payload) return { enabled: false };
  return {
    enabled: true,
    previewRole: payload.previewRole,
    previewUserId: payload.previewUserId,
    startedByAdminId: payload.startedByAdminId,
    startedAt: payload.startedAt,
    returnPath: payload.returnPath,
    expiresAt: new Date(payload.exp).toISOString(),
  };
}

export function canUseAdminPanelPreview(actor: { role: UserRole }): boolean {
  // Gelecekte SUPPORT rolü `ADMIN_PREVIEW_PERMISSION` matrix'ine bağlanabilir.
  void ADMIN_PREVIEW_PERMISSION;
  return actor.role === "ADMIN";
}

export function hasAdminPreviewPermission(actor: { role: UserRole }): boolean {
  return canUseAdminPanelPreview(actor);
}

export function sanitizePreviewReturnPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/panel/")) return null;
  if (raw.startsWith("//")) return null;
  if (raw.includes("://")) return null;
  return raw.slice(0, 240);
}

export function buildPanelActorContext(
  actor: PreviewSessionIdentity,
  preview:
    | {
        context: Extract<PanelPreviewContext, { enabled: true }>;
        subject: PreviewSubject;
      }
    | null,
): PanelActorContext {
  return {
    actor: {
      userId: actor.userId,
      role: actor.role,
      email: actor.email,
      fullName: actor.fullName,
      sessionId: actor.sessionId,
    },
    preview: preview
      ? { role: preview.context.previewRole, userId: preview.context.previewUserId }
      : undefined,
  };
}

/**
 * Guard'ların döndürdüğü effective kimlik: subject alanları + gerçek sessionId.
 * `getSession()` hâlâ ADMIN döner.
 */
export function toEffectivePreviewSession(
  actor: PreviewSessionIdentity,
  subject: PreviewSubject,
): PreviewSessionIdentity {
  return {
    sessionId: actor.sessionId,
    userId: subject.userId,
    email: subject.email,
    role: subject.role,
    status: subject.status === "ARCHIVED" || subject.status === "SUSPENDED" ? "ACTIVE" : subject.status,
    fullName: subject.fullName,
    mustChangePassword: false,
    mfaVerifiedAt: actor.mfaVerifiedAt,
    stepUpAt: actor.stepUpAt,
  };
}
