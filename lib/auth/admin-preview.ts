import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { rolePath } from "@/lib/auth/roles";
import type { SessionUser } from "@/lib/auth/session";
import {
  ADMIN_PREVIEW_COOKIE,
  ADMIN_PREVIEW_TTL_MS,
  canUseAdminPanelPreview,
  decodeAdminPreviewCookie,
  encodeAdminPreviewCookie,
  sanitizePreviewReturnPath,
  toPreviewContext,
  type PreviewCookiePayload,
} from "@/lib/auth/admin-preview-core";
import { ADMIN_TEACHER_MODE_COOKIE } from "@/lib/auth/admin-teacher-mode-core";
import type { PanelPreviewContext, PreviewableRole, PreviewSubject } from "@/lib/panel/preview-context";
import { resolvePreviewSubject, type PreviewResolutionError } from "@/lib/panel/preview-resolution";
import { logAudit } from "@/lib/audit";

export {
  ADMIN_PREVIEW_COOKIE,
  ADMIN_PREVIEW_TTL_MS,
  canUseAdminPanelPreview,
  hasAdminPreviewPermission,
  buildPanelActorContext,
  toEffectivePreviewSession,
} from "@/lib/auth/admin-preview-core";

const SECURE_COOKIE =
  process.env.VERCEL_ENV === "production" || process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") === true;

/** İstek başına bir kez cookie okur. Authorization için tek başına kullanma — subject doğrula. */
export const readAdminPreviewCookie = cache(async (): Promise<PanelPreviewContext> => {
  const store = await cookies();
  return toPreviewContext(decodeAdminPreviewCookie(store.get(ADMIN_PREVIEW_COOKIE)?.value));
});

export type ResolvedAdminPreview = {
  context: Extract<PanelPreviewContext, { enabled: true }>;
  subject: PreviewSubject;
};

/**
 * Actor + cookie + subject DB doğrulaması.
 * Cookie'deki userId'ye güvenilmez; her request'te yeniden doğrulanır.
 */
export const getResolvedAdminPreview = cache(async (actor: SessionUser): Promise<ResolvedAdminPreview | null> => {
  if (!canUseAdminPanelPreview(actor)) return null;
  const context = await readAdminPreviewCookie();
  if (!context.enabled) return null;
  if (context.startedByAdminId !== actor.userId) return null;

  const resolved = await resolvePreviewSubject({
    previewRole: context.previewRole,
    previewUserId: context.previewUserId,
  });
  if (!resolved.ok) return null;

  return { context, subject: resolved.subject };
});

export type StartAdminPreviewResult =
  | { ok: true; homePath: string; context: Extract<PanelPreviewContext, { enabled: true }> }
  | { ok: false; error: PreviewResolutionError | "FORBIDDEN" | "NOT_ADMIN" };

export async function startAdminPreview(input: {
  actor: SessionUser;
  previewRole: PreviewableRole;
  previewUserId: string;
  returnPath?: string | null;
}): Promise<StartAdminPreviewResult> {
  if (!canUseAdminPanelPreview(input.actor)) {
    return { ok: false, error: "NOT_ADMIN" };
  }

  const resolved = await resolvePreviewSubject({
    previewRole: input.previewRole,
    previewUserId: input.previewUserId,
  });
  if (!resolved.ok) return { ok: false, error: resolved.error };

  const startedAt = new Date();
  const exp = startedAt.getTime() + ADMIN_PREVIEW_TTL_MS;
  const returnPath = sanitizePreviewReturnPath(input.returnPath);
  const payload: PreviewCookiePayload = {
    v: 1,
    previewRole: input.previewRole,
    previewUserId: resolved.subject.userId,
    startedByAdminId: input.actor.userId,
    startedAt: startedAt.toISOString(),
    returnPath,
    exp,
  };

  const store = await cookies();
  // Öğretmen çalışma modu ile View As çakışmasın.
  store.delete(ADMIN_TEACHER_MODE_COOKIE);
  store.set(ADMIN_PREVIEW_COOKIE, encodeAdminPreviewCookie(payload), {
    httpOnly: true,
    secure: SECURE_COOKIE,
    sameSite: "lax",
    path: "/",
    expires: new Date(exp),
  });

  await logAudit({
    actorUserId: input.actor.userId,
    entityType: "User",
    entityId: resolved.subject.userId,
    action: "ADMIN_PREVIEW_STARTED",
    summary: `Yönetici paneli önizlemesi başladı (${input.previewRole})`,
    payload: {
      previewRole: input.previewRole,
      subjectUserId: resolved.subject.userId,
      notices: resolved.subject.notices,
      returnPath,
    },
  });

  const context = toPreviewContext(payload) as Extract<PanelPreviewContext, { enabled: true }>;
  return { ok: true, homePath: rolePath(input.previewRole), context };
}

export type EndAdminPreviewResult = {
  ok: true;
  returnPath: string;
};

export async function endAdminPreview(actor: SessionUser): Promise<EndAdminPreviewResult> {
  const current = await readAdminPreviewCookie();
  const store = await cookies();
  store.delete(ADMIN_PREVIEW_COOKIE);

  if (current.enabled && current.startedByAdminId === actor.userId) {
    await logAudit({
      actorUserId: actor.userId,
      entityType: "User",
      entityId: current.previewUserId,
      action: "ADMIN_PREVIEW_ENDED",
      summary: `Yönetici paneli önizlemesi bitti (${current.previewRole})`,
      payload: {
        previewRole: current.previewRole,
        subjectUserId: current.previewUserId,
        startedAt: current.startedAt,
      },
    });
  }

  const returnPath =
    current.enabled && current.returnPath ? current.returnPath : rolePath("ADMIN");
  return { ok: true, returnPath };
}
