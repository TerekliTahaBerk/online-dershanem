import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { rolePath } from "@/lib/auth/roles";
import type { SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { ADMIN_PREVIEW_COOKIE } from "@/lib/auth/admin-preview-core";
import {
  ADMIN_TEACHER_MODE_COOKIE,
  ADMIN_TEACHER_MODE_TTL_MS,
  canUseAdminTeacherMode,
  decodeAdminTeacherModeCookie,
  encodeAdminTeacherModeCookie,
  toAdminTeacherModeContext,
  type AdminTeacherModeContext,
  type AdminTeacherModePayload,
} from "@/lib/auth/admin-teacher-mode-core";

export {
  ADMIN_TEACHER_MODE_COOKIE,
  ADMIN_TEACHER_MODE_TTL_MS,
  canUseAdminTeacherMode,
  toAdminTeacherModeSession,
} from "@/lib/auth/admin-teacher-mode-core";

const SECURE_COOKIE =
  process.env.VERCEL_ENV === "production" || process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") === true;

/**
 * Her ADMIN için TeacherProfile garantiler.
 * Öğretmen rolü yaratmaz — User.role ADMIN kalır; profil öğretmen paneli
 * ilişkileri (koçluk vb.) için gerekir. Grup ataması ayrıca yapılır.
 */
export async function ensureAdminTeacherProfile(adminUserId: string): Promise<{ profileId: string }> {
  const existing = await prisma.teacherProfile.findUnique({
    where: { userId: adminUserId },
    select: { id: true },
  });
  if (existing) return { profileId: existing.id };

  const user = await prisma.user.findUnique({
    where: { id: adminUserId },
    select: { id: true, role: true },
  });
  if (!user || user.role !== "ADMIN") {
    throw new Error("TeacherProfile yalnız ADMIN kullanıcılar için otomatik açılır.");
  }

  const created = await prisma.teacherProfile.create({
    data: { userId: adminUserId, subjects: [], bio: null },
    select: { id: true },
  });
  return { profileId: created.id };
}

export const readAdminTeacherModeCookie = cache(async (): Promise<AdminTeacherModeContext> => {
  const store = await cookies();
  return toAdminTeacherModeContext(decodeAdminTeacherModeCookie(store.get(ADMIN_TEACHER_MODE_COOKIE)?.value));
});

export const getResolvedAdminTeacherMode = cache(async (actor: SessionUser): Promise<AdminTeacherModeContext> => {
  if (!canUseAdminTeacherMode(actor)) return { enabled: false };
  const context = await readAdminTeacherModeCookie();
  if (!context.enabled) return { enabled: false };
  if (context.adminUserId !== actor.userId) return { enabled: false };
  return context;
});

export type StartAdminTeacherModeResult =
  | { ok: true; homePath: string }
  | { ok: false; error: "NOT_ADMIN" | "PROFILE_FAILED" };

export async function startAdminTeacherMode(actor: SessionUser): Promise<StartAdminTeacherModeResult> {
  if (!canUseAdminTeacherMode(actor)) return { ok: false, error: "NOT_ADMIN" };

  try {
    await ensureAdminTeacherProfile(actor.userId);
  } catch {
    return { ok: false, error: "PROFILE_FAILED" };
  }

  const startedAt = new Date();
  const exp = startedAt.getTime() + ADMIN_TEACHER_MODE_TTL_MS;
  const payload: AdminTeacherModePayload = {
    v: 1,
    adminUserId: actor.userId,
    startedAt: startedAt.toISOString(),
    exp,
  };

  const store = await cookies();
  // View As ile çakışmasın — öğretmen çalışma modu yazılabilir.
  store.delete(ADMIN_PREVIEW_COOKIE);
  store.set(ADMIN_TEACHER_MODE_COOKIE, encodeAdminTeacherModeCookie(payload), {
    httpOnly: true,
    secure: SECURE_COOKIE,
    sameSite: "lax",
    path: "/",
    expires: new Date(exp),
  });

  await logAudit({
    actorUserId: actor.userId,
    entityType: "User",
    entityId: actor.userId,
    action: "ADMIN_TEACHER_MODE_STARTED",
    summary: "Yönetici öğretmen çalışma moduna geçti",
    payload: { mode: "TEACHER_WORKSPACE" },
  });

  return { ok: true, homePath: rolePath("TEACHER") };
}

export async function endAdminTeacherMode(actor: SessionUser): Promise<{ ok: true; returnPath: string }> {
  const current = await readAdminTeacherModeCookie();
  const store = await cookies();
  store.delete(ADMIN_TEACHER_MODE_COOKIE);

  if (current.enabled && current.adminUserId === actor.userId) {
    await logAudit({
      actorUserId: actor.userId,
      entityType: "User",
      entityId: actor.userId,
      action: "ADMIN_TEACHER_MODE_ENDED",
      summary: "Yönetici öğretmen çalışma modundan çıktı",
      payload: { mode: "TEACHER_WORKSPACE", startedAt: current.startedAt },
    });
  }

  return { ok: true, returnPath: rolePath("ADMIN") };
}

/** Mevcut ADMIN kullanıcılar için eksik TeacherProfile'ları doldurur. */
export async function backfillAdminTeacherProfiles(): Promise<{ created: number }> {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", teacherProfile: null },
    select: { id: true },
  });
  let created = 0;
  for (const admin of admins) {
    await ensureAdminTeacherProfile(admin.id);
    created += 1;
  }
  return { created };
}
