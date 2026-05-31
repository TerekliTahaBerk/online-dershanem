/**
 * Phase 3 / Session 1 — Account onboarding helpers.
 *
 * Centralized primitives for "give a Student/Teacher a User account, optionally
 * issue them an invite link or a temporary password, and let admins manage that
 * account state". Mirrors the parent invite flow (`lib/parent-invites.ts` +
 * `lib/parents.ts`) but extends it onto `User` so STUDENT and TEACHER roles
 * can use the same primitives.
 *
 * Server-only — imports `node:crypto`, `bcryptjs`, Prisma, and writes audit
 * rows. Do not import from client components.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notifyUser, notifyAdmins } from "@/lib/notifications";
import type { UserRole } from "@prisma/client";
import {
  deriveUserAccountState,
  getUserAccountStateLabel,
  getUserAccountStateTone,
  type UserAccountState,
} from "./account-onboarding-shared";

// ─── Constants ───────────────────────────────────────────────────────────────

/** User invite TTL — 14 days, identical to parent invite default. */
export const DEFAULT_USER_INVITE_TTL_DAYS = 14;

/** Length of generated temporary password (printable charset). */
const TEMP_PASSWORD_LENGTH = 12;

// ─── Token + temp password primitives ────────────────────────────────────────

/** 24 bytes → 32 chars base64url, identical to parent invite token. */
export function generateUserInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Default expiry helper. */
export function defaultUserInviteExpiresAt(
  ttlDays = DEFAULT_USER_INVITE_TTL_DAYS,
): Date {
  const d = new Date();
  d.setDate(d.getDate() + ttlDays);
  return d;
}

/**
 * Returns the public URL where a user can set their password. Mirrors
 * `buildParentInviteUrl`. The consumer page (`/davet/<token>`) is
 * Phase 3 / Session 6 work — until then admins copy/paste the URL out-of-band.
 */
export function buildUserInviteUrl(token: string, base?: string): string {
  const origin = (base ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return `${origin}/davet/${token}`;
}

/**
 * Generates a printable temporary password.
 *
 * Charset excludes ambiguous chars (0/O, 1/l/I) for hand-typing. 12 chars over
 * a 56-char alphabet ≈ 70 bits of entropy — fine for a one-time use that the
 * user MUST rotate at next login (`mustChangePassword: true`).
 */
export function generateTemporaryPassword(length = TEMP_PASSWORD_LENGTH): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += charset[bytes[i] % charset.length];
  }
  return out;
}

// ─── Account state machine (derived) ─────────────────────────────────────────

// Pure state machine helpers + types live in a sibling file so client
// components can import them without pulling in `server-only`. Re-exported
// here for backward compatibility with existing server callers.
export {
  getUserAccountStateLabel,
  getUserAccountStateTone,
  deriveUserAccountState,
} from "./account-onboarding-shared";
export type { UserAccountState } from "./account-onboarding-shared";

// ─── Onboarding checklist (derived per-student) ──────────────────────────────

export type OnboardingCheckSeverity = "required" | "recommended";

export type OnboardingCheckItem = {
  id:
    | "identity"
    | "account"
    | "password-or-invite"
    | "parent"
    | "classroom"
    | "package"
    | "access"
    | "goal";
  label: string;
  done: boolean;
  severity: OnboardingCheckSeverity;
  hint?: string;
};

export type StudentOnboardingChecklistInput = {
  fullName: string | null | undefined;
  phone: string | null | undefined;
  email: string | null | undefined;
  targetGoal: string | null | undefined;
  targetSchool: string | null | undefined;
  user: {
    passwordHash?: string | null;
    passwordChangedAt?: Date | null;
    lastLoginAt?: Date | null;
    mustChangePassword?: boolean | null;
    accountDisabledAt?: Date | null;
    userInviteToken?: string | null;
    userInviteTokenExpiresAt?: Date | null;
  } | null;
  parentLinkCount: number;
  classroomLinkCount: number;
  packageLinkCount: number;
  hasAnyAccessTag: boolean;
};

export function deriveStudentOnboardingChecklist(
  s: StudentOnboardingChecklistInput,
): OnboardingCheckItem[] {
  const accountState = deriveUserAccountState(s.user);
  const hasAccount = !!s.user && accountState !== "NO_ACCOUNT" && accountState !== "DISABLED";
  const hasPasswordOrInvite =
    accountState === "ACTIVE" ||
    accountState === "MUST_CHANGE_PASSWORD" ||
    accountState === "INVITE_PENDING" ||
    !!s.user?.passwordChangedAt;

  return [
    {
      id: "identity",
      label: "Kimlik bilgileri",
      done: !!s.fullName && (!!s.phone || !!s.email),
      severity: "required",
      hint: "Ad Soyad ve telefon (veya email) zorunlu.",
    },
    {
      id: "account",
      label: "Kullanıcı hesabı",
      done: hasAccount,
      severity: "required",
      hint: hasAccount ? undefined : "Öğrencinin panele girebilmesi için hesap oluşturun.",
    },
    {
      id: "password-or-invite",
      label: "Şifre / davet",
      done: hasPasswordOrInvite,
      severity: "required",
      hint: hasPasswordOrInvite ? undefined : "Davet linki üretin veya geçici şifre oluşturun.",
    },
    {
      id: "parent",
      label: "Veli bağlantısı",
      done: s.parentLinkCount > 0,
      severity: "required",
      hint: s.parentLinkCount > 0 ? undefined : "En az bir veli kaydını öğrenciye bağlayın.",
    },
    {
      id: "classroom",
      label: "Sınıf ataması",
      done: s.classroomLinkCount > 0,
      severity: "recommended",
      hint: "Grup dersi alacaksa sınıf ataması gerekir.",
    },
    {
      id: "package",
      label: "Paket / kayıt",
      done: s.packageLinkCount > 0,
      severity: "recommended",
      hint: "Hangi paket/programa kayıtlı?",
    },
    {
      id: "access",
      label: "OD / ODK erişimi",
      done: s.hasAnyAccessTag,
      severity: "recommended",
      hint: "Hangi servislere erişebilecek?",
    },
    {
      id: "goal",
      label: "Hedef tanımı",
      done: !!(s.targetGoal || s.targetSchool),
      severity: "recommended",
      hint: "Hedef üniversite/bölüm gir.",
    },
  ];
}

export type OnboardingChecklistSummary = {
  total: number;
  done: number;
  requiredTotal: number;
  requiredDone: number;
  isComplete: boolean;
};

export function summarizeOnboardingChecklist(items: OnboardingCheckItem[]): OnboardingChecklistSummary {
  const requiredItems = items.filter((i) => i.severity === "required");
  const requiredDone = requiredItems.filter((i) => i.done).length;
  const done = items.filter((i) => i.done).length;
  return {
    total: items.length,
    done,
    requiredTotal: requiredItems.length,
    requiredDone,
    isComplete: requiredDone === requiredItems.length,
  };
}

// ─── Duplicate detection ─────────────────────────────────────────────────────

export type DuplicateMatch = {
  field: "phoneKey" | "email" | "user.email" | "phone" | "fullName";
  existingId: string;
  existingLabel: string;
  entity: "Student" | "Parent" | "User" | "Teacher";
};

/**
 * Checks for existing records that would conflict with creating a new student.
 * Does not mutate. Returns an array (possibly empty) — caller decides whether
 * to block or warn.
 *
 * `phoneKey` already has a unique index on Student → creating two students
 * with the same normalized phone would 500. We detect that **before** the
 * insert and return a structured warning the form can render.
 */
export async function findStudentDuplicates(opts: {
  phoneKey: string | null;
  email: string | null;
}): Promise<DuplicateMatch[]> {
  const { phoneKey, email } = opts;
  const matches: DuplicateMatch[] = [];

  if (phoneKey) {
    const s = await prisma.student.findUnique({
      where: { phoneKey },
      select: { id: true, fullName: true },
    });
    if (s) matches.push({ field: "phoneKey", existingId: s.id, existingLabel: s.fullName, entity: "Student" });

    const p = await prisma.parent.findUnique({
      where: { phoneKey },
      select: { id: true, fullName: true },
    });
    if (p) matches.push({ field: "phoneKey", existingId: p.id, existingLabel: p.fullName, entity: "Parent" });
  }

  if (email) {
    const lower = email.toLowerCase();
    const u = await prisma.user.findUnique({
      where: { email: lower },
      select: { id: true, name: true, email: true },
    });
    if (u) {
      matches.push({
        field: "user.email",
        existingId: u.id,
        existingLabel: u.name ?? u.email,
        entity: "User",
      });
    }
  }

  return matches;
}

/**
 * Phase 3 / Session 3 — duplicate detection for parents.
 *
 * Checks for existing records that would conflict with creating a new parent:
 *   - Parent with same normalized phone (phoneKey is @unique)
 *   - Parent with same email (Parent.email is @unique)
 *   - Student with same normalized phone (cross-entity warning)
 *   - User with same email (would block account creation, even without an
 *     attached Parent)
 *
 * Does not mutate. Returns an array (possibly empty) — caller decides
 * whether to block (e.g. same Parent.phoneKey) or warn (e.g. Student match).
 */
export async function findParentDuplicates(opts: {
  phoneKey: string | null;
  email: string | null;
  /** Exclude this parent id from the search (used on the edit page). */
  excludeParentId?: string;
}): Promise<DuplicateMatch[]> {
  const { phoneKey, excludeParentId } = opts;
  const matches: DuplicateMatch[] = [];

  if (phoneKey) {
    const p = await prisma.parent.findUnique({
      where: { phoneKey },
      select: { id: true, fullName: true },
    });
    if (p && p.id !== excludeParentId) {
      matches.push({ field: "phoneKey", existingId: p.id, existingLabel: p.fullName, entity: "Parent" });
    }
    const s = await prisma.student.findUnique({
      where: { phoneKey },
      select: { id: true, fullName: true },
    });
    if (s) matches.push({ field: "phoneKey", existingId: s.id, existingLabel: s.fullName, entity: "Student" });
  }

  if (opts.email) {
    const lower = opts.email.toLowerCase();
    const p = await prisma.parent.findUnique({
      where: { email: lower },
      select: { id: true, fullName: true },
    });
    if (p && p.id !== excludeParentId) {
      matches.push({ field: "email", existingId: p.id, existingLabel: p.fullName, entity: "Parent" });
    }
    const u = await prisma.user.findUnique({
      where: { email: lower },
      select: { id: true, name: true, email: true },
    });
    if (u) {
      matches.push({
        field: "user.email",
        existingId: u.id,
        existingLabel: u.name ?? u.email,
        entity: "User",
      });
    }
  }

  return matches;
}

// ─── Account creation primitives ─────────────────────────────────────────────

export type AccountCreateMode = "none" | "invite" | "tempPassword";

export type AccountCreateResult =
  | { ok: true; mode: "none"; userId: null }
  | { ok: true; mode: "invite"; userId: string; token: string; url: string; expiresAt: Date }
  | { ok: true; mode: "tempPassword"; userId: string; tempPassword: string };

/**
 * Creates a `User` row for a Student that doesn't have one yet, optionally
 * issuing an invite token (preferred) or a temporary password.
 *
 * Returns immediately if the student already has `userId` set — the caller is
 * expected to have called `regenerateUserInvite` instead.
 */
export async function createUserAccountForStudent(opts: {
  studentId: string;
  email: string;
  fullName: string;
  mode: AccountCreateMode;
  actorUserId: string;
}): Promise<AccountCreateResult> {
  const { studentId, mode, actorUserId } = opts;
  const email = opts.email.toLowerCase().trim();
  const fullName = opts.fullName.trim();

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, userId: true, fullName: true },
  });
  if (!student) throw new Error("Öğrenci bulunamadı");
  if (student.userId) throw new Error("Bu öğrencinin hesabı zaten var");
  if (mode === "none") return { ok: true, mode: "none", userId: null };
  if (!email) throw new Error("Email zorunlu (hesap oluşturmak için)");

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new Error(`Bu email zaten kullanılıyor (User ${existing.id})`);

  if (mode === "invite") {
    return createWithInvite({ studentId, email, fullName, actorUserId, role: "STUDENT" });
  }
  return createWithTempPassword({ studentId, email, fullName, actorUserId, role: "STUDENT" });
}

/**
 * Phase 3 / Session 3 — Creates a `User` row (role=PARENT) for a Parent
 * that doesn't have one yet, optionally issuing an invite token or a
 * temporary password. Mirrors `createUserAccountForStudent`.
 */
export async function createUserAccountForParent(opts: {
  parentId: string;
  email: string;
  fullName: string;
  mode: AccountCreateMode;
  actorUserId: string;
}): Promise<AccountCreateResult> {
  const { parentId, mode, actorUserId } = opts;
  const email = opts.email.toLowerCase().trim();
  const fullName = opts.fullName.trim();

  const parent = await prisma.parent.findUnique({
    where: { id: parentId },
    select: { id: true, userId: true, fullName: true },
  });
  if (!parent) throw new Error("Veli bulunamadı");
  if (parent.userId) throw new Error("Bu velinin hesabı zaten var");
  if (mode === "none") return { ok: true, mode: "none", userId: null };
  if (!email) throw new Error("Email zorunlu (hesap oluşturmak için)");

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new Error(`Bu email zaten kullanılıyor (User ${existing.id})`);

  if (mode === "invite") {
    return createWithInvite({ parentId, email, fullName, actorUserId, role: "PARENT" });
  }
  return createWithTempPassword({ parentId, email, fullName, actorUserId, role: "PARENT" });
}

async function createWithInvite(args: {
  studentId?: string;
  teacherId?: string;
  parentId?: string;
  email: string;
  fullName: string;
  actorUserId: string;
  role: UserRole;
}): Promise<Extract<AccountCreateResult, { mode: "invite" }>> {
  const token = generateUserInviteToken();
  const expiresAt = defaultUserInviteExpiresAt();

  const user = await prisma.user.create({
    data: {
      email: args.email,
      name: args.fullName,
      role: args.role,
      userInviteToken: token,
      userInviteTokenExpiresAt: expiresAt,
      userInviteSentAt: new Date(),
      mustChangePassword: false, // they'll set it via invite
    },
    select: { id: true },
  });

  if (args.studentId) {
    await prisma.student.update({ where: { id: args.studentId }, data: { userId: user.id } });
  }
  if (args.teacherId) {
    await prisma.teacher.update({ where: { id: args.teacherId }, data: { userId: user.id } });
  }
  if (args.parentId) {
    await prisma.parent.update({ where: { id: args.parentId }, data: { userId: user.id } });
  }

  await logAudit({
    actorUserId: args.actorUserId,
    entityType: "User",
    entityId: user.id,
    action: "USER_CREATE_VIA_INVITE",
    summary: args.fullName,
    payload: {
      role: args.role,
      studentId: args.studentId,
      teacherId: args.teacherId,
      parentId: args.parentId,
      expiresAt: expiresAt.toISOString(),
    },
  });

  await notifyUser({
    userId: user.id,
    type: "ANNOUNCEMENT",
    title: "Hoş geldiniz! Hesabınızı tamamlayın",
    body: "Yöneticiniz size bir davet gönderdi. Şifrenizi belirleyerek panele giriş yapabilirsiniz.",
    relatedEntityType: "User",
    relatedEntityId: user.id,
  });

  return {
    ok: true,
    mode: "invite",
    userId: user.id,
    token,
    url: buildUserInviteUrl(token),
    expiresAt,
  };
}

async function createWithTempPassword(args: {
  studentId?: string;
  teacherId?: string;
  parentId?: string;
  email: string;
  fullName: string;
  actorUserId: string;
  role: UserRole;
}): Promise<Extract<AccountCreateResult, { mode: "tempPassword" }>> {
  const tempPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      email: args.email,
      name: args.fullName,
      role: args.role,
      passwordHash,
      mustChangePassword: true,
    },
    select: { id: true },
  });

  if (args.studentId) {
    await prisma.student.update({ where: { id: args.studentId }, data: { userId: user.id } });
  }
  if (args.teacherId) {
    await prisma.teacher.update({ where: { id: args.teacherId }, data: { userId: user.id } });
  }
  if (args.parentId) {
    await prisma.parent.update({ where: { id: args.parentId }, data: { userId: user.id } });
  }

  await logAudit({
    actorUserId: args.actorUserId,
    entityType: "User",
    entityId: user.id,
    action: "USER_CREATE_VIA_TEMP_PASSWORD",
    summary: args.fullName,
    payload: { role: args.role, studentId: args.studentId, teacherId: args.teacherId, parentId: args.parentId },
  });

  await notifyUser({
    userId: user.id,
    type: "ANNOUNCEMENT",
    title: "Hesabınız oluşturuldu",
    body: "İlk girişte şifrenizi değiştirmeniz gerekecek.",
    relatedEntityType: "User",
    relatedEntityId: user.id,
  });

  return { ok: true, mode: "tempPassword", userId: user.id, tempPassword };
}

/**
 * Issues (or rotates) an invite token for an existing User. If the user
 * already has a passwordHash, it is preserved — the invite consumer page
 * (Session 6) will overwrite it on completion.
 */
export async function regenerateUserInvite(opts: {
  userId: string;
  actorUserId: string;
}): Promise<{ ok: true; token: string; url: string; expiresAt: Date }> {
  const token = generateUserInviteToken();
  const expiresAt = defaultUserInviteExpiresAt();
  const user = await prisma.user.update({
    where: { id: opts.userId },
    data: {
      userInviteToken: token,
      userInviteTokenExpiresAt: expiresAt,
      userInviteSentAt: new Date(),
    },
    select: { id: true, name: true, email: true },
  });
  await logAudit({
    actorUserId: opts.actorUserId,
    entityType: "User",
    entityId: user.id,
    action: "USER_INVITE_GENERATE",
    summary: user.name ?? user.email,
    payload: { expiresAt: expiresAt.toISOString() },
  });
  return { ok: true, token, url: buildUserInviteUrl(token), expiresAt };
}

/** Revoke an active invite without disabling the account. */
export async function revokeUserInvite(opts: {
  userId: string;
  actorUserId: string;
}): Promise<{ ok: true }> {
  await prisma.user.update({
    where: { id: opts.userId },
    data: {
      userInviteToken: null,
      userInviteTokenExpiresAt: null,
      userInviteSentAt: null,
    },
  });
  await logAudit({
    actorUserId: opts.actorUserId,
    entityType: "User",
    entityId: opts.userId,
    action: "USER_INVITE_REVOKE",
    summary: opts.userId,
  });
  return { ok: true };
}

/**
 * Disables a user account (operational, not deletion). Login is blocked at
 * `lib/auth.ts::authorize` because that path now reads `accountDisabledAt`.
 */
export async function disableUserAccount(opts: {
  userId: string;
  actorUserId: string;
  reason?: string | null;
}): Promise<{ ok: true }> {
  const user = await prisma.user.update({
    where: { id: opts.userId },
    data: { accountDisabledAt: new Date() },
    select: { id: true, name: true, email: true },
  });
  await logAudit({
    actorUserId: opts.actorUserId,
    entityType: "User",
    entityId: user.id,
    action: "USER_ACCOUNT_DISABLE",
    summary: user.name ?? user.email,
    payload: { reason: opts.reason ?? null },
  });
  await notifyUser({
    userId: user.id,
    type: "ANNOUNCEMENT",
    title: "Hesabınız devre dışı",
    body: "Sorularınız için yöneticiniz ile iletişime geçin.",
    relatedEntityType: "User",
    relatedEntityId: user.id,
  });
  await notifyAdmins({
    type: "SYSTEM",
    title: "Hesap devre dışı bırakıldı",
    body: `${user.name ?? user.email} (${user.id})`,
    relatedEntityType: "User",
    relatedEntityId: user.id,
  });
  return { ok: true };
}

export async function enableUserAccount(opts: {
  userId: string;
  actorUserId: string;
}): Promise<{ ok: true }> {
  const user = await prisma.user.update({
    where: { id: opts.userId },
    data: { accountDisabledAt: null },
    select: { id: true, name: true, email: true },
  });
  await logAudit({
    actorUserId: opts.actorUserId,
    entityType: "User",
    entityId: user.id,
    action: "USER_ACCOUNT_ENABLE",
    summary: user.name ?? user.email,
  });
  await notifyUser({
    userId: user.id,
    type: "ANNOUNCEMENT",
    title: "Hesabınız tekrar aktif",
    body: "Tekrar giriş yapabilirsiniz.",
    relatedEntityType: "User",
    relatedEntityId: user.id,
  });
  return { ok: true };
}

/**
 * Forces the user to change their password on next login. Does not reset the
 * password itself — admin must separately rotate it via temp-password flow if
 * desired.
 */
export async function forceUserPasswordChange(opts: {
  userId: string;
  actorUserId: string;
}): Promise<{ ok: true }> {
  const user = await prisma.user.update({
    where: { id: opts.userId },
    data: { mustChangePassword: true },
    select: { id: true, name: true, email: true },
  });
  await logAudit({
    actorUserId: opts.actorUserId,
    entityType: "User",
    entityId: user.id,
    action: "USER_PASSWORD_FORCE_CHANGE",
    summary: user.name ?? user.email,
  });
  await notifyUser({
    userId: user.id,
    type: "ANNOUNCEMENT",
    title: "Şifrenizi değiştirmeniz gerekiyor",
    body: "Bir sonraki girişinizde yeni bir şifre belirlemeniz istenecek.",
    relatedEntityType: "User",
    relatedEntityId: user.id,
  });
  return { ok: true };
}

// ─── Phase 3 / Session 2 — Invite consumption + password flow ────────────────

/** Minimum password length. Matches existing `reset-password` route. */
export const MIN_PASSWORD_LENGTH = 8;

export type InviteValidationResult =
  | {
      ok: true;
      user: {
        id: string;
        email: string;
        name: string | null;
        role: UserRole;
        hasPasswordHash: boolean;
      };
    }
  | { ok: false; reason: "NOT_FOUND" | "EXPIRED" | "DISABLED" };

/**
 * Read-only token validation. Returns a discriminated result the consumer page
 * can pattern-match on. Does NOT mutate (no token rotation here).
 */
export async function validateInviteToken(token: string): Promise<InviteValidationResult> {
  if (!token || token.length < 16) return { ok: false, reason: "NOT_FOUND" };
  const user = await prisma.user.findUnique({
    where: { userInviteToken: token },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
      userInviteTokenExpiresAt: true,
      accountDisabledAt: true,
    },
  });
  if (!user) return { ok: false, reason: "NOT_FOUND" };
  if (user.accountDisabledAt) return { ok: false, reason: "DISABLED" };
  if (user.userInviteTokenExpiresAt && user.userInviteTokenExpiresAt.getTime() <= Date.now()) {
    return { ok: false, reason: "EXPIRED" };
  }
  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hasPasswordHash: !!user.passwordHash,
    },
  };
}

/**
 * Common password policy validator. Returns the first violation message in
 * Turkish or `null` if valid. Caller is expected to also compare against
 * the confirmation field before invoking.
 */
export function validateNewPassword(pw: string): string | null {
  if (typeof pw !== "string") return "Şifre zorunludur.";
  if (pw.length < MIN_PASSWORD_LENGTH) return `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`;
  if (pw.length > 128) return "Şifre çok uzun (maks. 128 karakter).";
  if (/\s/.test(pw)) return "Şifre boşluk içeremez.";
  return null;
}

/**
 * Atomically consumes a valid invite token and sets the new password.
 *
 * Atomicity is guaranteed by the `where: { ... userInviteToken: <token> }`
 * clause on the UPDATE — only one request can succeed in clearing the
 * token. Subsequent attempts hit `count === 0` and we reject.
 *
 * Re-checks `accountDisabledAt` and expiry inside the same transaction.
 *
 * Returns the updated user id + role so the caller can derive the post-login
 * redirect target.
 */
export async function consumeUserInviteToken(opts: {
  token: string;
  newPassword: string;
  /** Optional — caller's IP/user-agent for the audit trail. */
  ip?: string | null;
  userAgent?: string | null;
}): Promise<
  | { ok: true; userId: string; email: string; role: UserRole }
  | { ok: false; reason: "NOT_FOUND" | "EXPIRED" | "DISABLED" | "WEAK_PASSWORD"; message: string }
> {
  const policyError = validateNewPassword(opts.newPassword);
  if (policyError) return { ok: false, reason: "WEAK_PASSWORD", message: policyError };

  // Pre-flight read (lets us return a specific error code; the UPDATE below
  // is still the source of truth for atomicity).
  const pre = await validateInviteToken(opts.token);
  if (!pre.ok) {
    const message =
      pre.reason === "EXPIRED"
        ? "Davet bağlantısının süresi dolmuş."
        : pre.reason === "DISABLED"
          ? "Bu hesap devre dışı bırakılmış. Yöneticinizle iletişime geçin."
          : "Davet bağlantısı geçersiz.";
    return { ok: false, reason: pre.reason, message };
  }

  const passwordHash = await bcrypt.hash(opts.newPassword, 12);
  const now = new Date();

  // Atomic single-use: the token is part of the WHERE; if anyone else already
  // consumed it, `count` is 0.
  const res = await prisma.user.updateMany({
    where: {
      id: pre.user.id,
      userInviteToken: opts.token,
      accountDisabledAt: null,
      OR: [
        { userInviteTokenExpiresAt: null },
        { userInviteTokenExpiresAt: { gt: now } },
      ],
    },
    data: {
      passwordHash,
      passwordChangedAt: now,
      mustChangePassword: false,
      userInviteToken: null,
      userInviteTokenExpiresAt: null,
      // We intentionally keep userInviteSentAt so the audit trail of "when
      // was the invite issued" remains visible to admins.
    },
  });

  if (res.count !== 1) {
    return { ok: false, reason: "EXPIRED", message: "Davet bağlantısı geçersiz veya başka bir sekmede kullanıldı." };
  }

  await logAudit({
    actorUserId: pre.user.id,
    entityType: "User",
    entityId: pre.user.id,
    action: "USER_INVITE_ACCEPT",
    summary: pre.user.email,
    payload: { ip: opts.ip ?? null, userAgent: opts.userAgent ?? null, role: pre.user.role },
  });
  await notifyAdmins({
    type: "SYSTEM",
    title: "Davet kabul edildi",
    body: `${pre.user.name ?? pre.user.email} hesabını aktifleştirdi.`,
    relatedEntityType: "User",
    relatedEntityId: pre.user.id,
  });
  await notifyUser({
    userId: pre.user.id,
    type: "ANNOUNCEMENT",
    title: "Hesabınız aktif",
    body: "Şifreniz başarıyla belirlendi. Artık giriş yapabilirsiniz.",
    relatedEntityType: "User",
    relatedEntityId: pre.user.id,
  });

  return { ok: true, userId: pre.user.id, email: pre.user.email, role: pre.user.role };
}

/**
 * Changes the password of the currently authenticated user. Used by the
 * `/panel/sifre-degistir` flow (both voluntary changes and forced ones when
 * `mustChangePassword=true`).
 *
 * Requires the current password — even forced flows still verify the temp
 * password the admin issued. Disabled accounts are rejected.
 */
export async function changePasswordForUser(opts: {
  userId: string;
  currentPassword: string;
  newPassword: string;
  ip?: string | null;
}): Promise<
  | { ok: true }
  | { ok: false; reason: "USER_NOT_FOUND" | "DISABLED" | "BAD_CURRENT" | "WEAK_PASSWORD" | "SAME_AS_OLD"; message: string }
> {
  const policyError = validateNewPassword(opts.newPassword);
  if (policyError) return { ok: false, reason: "WEAK_PASSWORD", message: policyError };

  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { id: true, email: true, passwordHash: true, accountDisabledAt: true },
  });
  if (!user) return { ok: false, reason: "USER_NOT_FOUND", message: "Hesap bulunamadı." };
  if (user.accountDisabledAt) return { ok: false, reason: "DISABLED", message: "Hesap devre dışı." };
  if (!user.passwordHash) {
    return { ok: false, reason: "BAD_CURRENT", message: "Mevcut şifre tanımlı değil — davet bağlantısını kullanın." };
  }

  const currentOk = await bcrypt.compare(opts.currentPassword, user.passwordHash);
  if (!currentOk) return { ok: false, reason: "BAD_CURRENT", message: "Mevcut şifre hatalı." };

  const sameAsOld = await bcrypt.compare(opts.newPassword, user.passwordHash);
  if (sameAsOld) return { ok: false, reason: "SAME_AS_OLD", message: "Yeni şifre eskisiyle aynı olamaz." };

  const newHash = await bcrypt.hash(opts.newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      passwordChangedAt: new Date(),
      mustChangePassword: false,
    },
  });

  await logAudit({
    actorUserId: user.id,
    entityType: "User",
    entityId: user.id,
    action: "USER_PASSWORD_CHANGE",
    summary: user.email,
    payload: { ip: opts.ip ?? null },
  });
  return { ok: true };
}

/** Returns the dashboard path for a given role. Wrapper around
 *  `roleToSegment` for use in plain auth flows that don't already import
 *  panel-access. */
export function getPostLoginRedirectForRole(role: UserRole): string {
  switch (role) {
    case "ADMIN":   return "/panel/admin";
    case "TEACHER": return "/panel/ogretmen";
    case "STUDENT": return "/panel/ogrenci";
    case "PARENT":  return "/panel/veli";
  }
}

// ─── Phase 3 / Session 4 — Teacher onboarding helpers ────────────────────────

/**
 * Phase 3 / Session 4 — duplicate detection for teachers.
 *
 * Teacher.email is @unique; Teacher.phone is NOT unique (free string). So we:
 *   - hard-block on Teacher.email match
 *   - hard-block on User.email (would block account creation)
 *   - soft-warn on Teacher.phone substring match
 *   - soft-warn on identical Teacher.fullName (case-insensitive)
 */
export async function findTeacherDuplicates(opts: {
  phone: string | null;
  email: string | null;
  fullName: string | null;
  excludeTeacherId?: string;
}): Promise<DuplicateMatch[]> {
  const { phone, email, fullName, excludeTeacherId } = opts;
  const matches: DuplicateMatch[] = [];

  if (email) {
    const lower = email.toLowerCase();
    const t = await prisma.teacher.findUnique({
      where: { email: lower },
      select: { id: true, fullName: true },
    });
    if (t && t.id !== excludeTeacherId) {
      matches.push({ field: "email", existingId: t.id, existingLabel: t.fullName, entity: "Teacher" });
    }
    const u = await prisma.user.findUnique({
      where: { email: lower },
      select: { id: true, name: true, email: true },
    });
    if (u) {
      matches.push({
        field: "user.email",
        existingId: u.id,
        existingLabel: u.name ?? u.email,
        entity: "User",
      });
    }
  }

  if (phone && phone.trim().length >= 6) {
    const ts = await prisma.teacher.findMany({
      where: {
        phone: { contains: phone.trim() },
        ...(excludeTeacherId ? { NOT: { id: excludeTeacherId } } : {}),
      },
      select: { id: true, fullName: true },
      take: 5,
    });
    for (const t of ts) {
      matches.push({ field: "phone", existingId: t.id, existingLabel: t.fullName, entity: "Teacher" });
    }
  }

  if (fullName && fullName.trim().length >= 3) {
    const ts = await prisma.teacher.findMany({
      where: {
        fullName: { equals: fullName.trim(), mode: "insensitive" },
        ...(excludeTeacherId ? { NOT: { id: excludeTeacherId } } : {}),
      },
      select: { id: true, fullName: true },
      take: 5,
    });
    for (const t of ts) {
      // de-dupe with email/phone hits
      if (matches.some((m) => m.entity === "Teacher" && m.existingId === t.id)) continue;
      matches.push({ field: "fullName", existingId: t.id, existingLabel: t.fullName, entity: "Teacher" });
    }
  }

  return matches;
}

/**
 * Phase 3 / Session 4 — Creates a `User` row (role=TEACHER) for a Teacher
 * that doesn't have one yet, optionally issuing an invite token or a
 * temporary password. Mirrors `createUserAccountForParent`.
 */
export async function createUserAccountForTeacher(opts: {
  teacherId: string;
  email: string;
  fullName: string;
  mode: AccountCreateMode;
  actorUserId: string;
}): Promise<AccountCreateResult> {
  const { teacherId, mode, actorUserId } = opts;
  const email = opts.email.toLowerCase().trim();
  const fullName = opts.fullName.trim();

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { id: true, userId: true, fullName: true },
  });
  if (!teacher) throw new Error("Öğretmen bulunamadı");
  if (teacher.userId) throw new Error("Bu öğretmenin hesabı zaten var");
  if (mode === "none") return { ok: true, mode: "none", userId: null };
  if (!email) throw new Error("Email zorunlu (hesap oluşturmak için)");

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new Error(`Bu email zaten kullanılıyor (User ${existing.id})`);

  if (mode === "invite") {
    return createWithInvite({ teacherId, email, fullName, actorUserId, role: "TEACHER" });
  }
  return createWithTempPassword({ teacherId, email, fullName, actorUserId, role: "TEACHER" });
}
