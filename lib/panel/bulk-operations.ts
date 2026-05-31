/**
 * Phase 3 / Session 8 — D2: Bulk operations toolkit (server-only).
 *
 * Generic primitives + thin wrappers over single-row helpers so admin lists
 * can perform repeated operational tasks safely.
 *
 * Design rules:
 *   • Admin-only at the action layer (`requirePanelRole("admin")`).
 *   • Idempotent: if a row is already in the desired state we count it as
 *     "skipped" with a reason instead of failing.
 *   • Audited via `logAuditMany` — one batch row + per-target rows when the
 *     existing single-row helper already audits.
 *   • Result shape is stable: { attempted, succeeded, skipped, failed,
 *     errors, warnings } — UI surfaces it via <BulkOperationResult/>.
 *   • No bulk delete. No financial / payroll mutations. No password rotation
 *     (force-change-on-next-login is allowed; raw passwords are out of scope
 *     for bulk).
 *   • Sensitive fields (password hashes, raw invite tokens) never leave the
 *     server — invite issuance returns the URL list to the admin, not stored.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { logAudit, logAuditMany } from "@/lib/audit";
import {
  regenerateUserInvite,
  disableUserAccount,
  enableUserAccount,
  forceUserPasswordChange,
} from "./account-onboarding";

// ─────────────────────────────────────────────────────────────────────────────
// Result shape
// ─────────────────────────────────────────────────────────────────────────────

export type BulkOperationError = {
  id: string;
  reason: string;
};

export type BulkOperationWarning = {
  id: string;
  message: string;
};

export type BulkOperationResult = {
  ok: boolean;
  op: string;
  attempted: number;
  succeeded: number;
  skipped: number;
  failed: number;
  errors: BulkOperationError[];
  warnings: BulkOperationWarning[];
  /** Optional payload — e.g. invite URL list for admin to copy out-of-band. */
  data?: Record<string, unknown>;
};

export function emptyBulkResult(op: string, attempted = 0): BulkOperationResult {
  return {
    ok: true,
    op,
    attempted,
    succeeded: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    warnings: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Input normalisation
// ─────────────────────────────────────────────────────────────────────────────

/** Hard cap to avoid runaway operations from a manipulated form. */
export const BULK_MAX_IDS = 500;

/**
 * Normalises a list of selected ids:
 *   • accepts FormData (`ids` repeated), comma-string, or string[]
 *   • trims, dedupes, drops empties
 *   • caps to BULK_MAX_IDS — extras are dropped with a warning by the caller
 *
 * Returns ids in stable order (input order, deduped).
 */
export function normalizeSelectedIds(
  input: FormData | string | string[] | null | undefined,
): { ids: string[]; truncated: boolean } {
  let raw: string[];
  if (!input) {
    raw = [];
  } else if (Array.isArray(input)) {
    raw = input.map((s) => String(s ?? ""));
  } else if (typeof input === "string") {
    raw = input.split(",");
  } else {
    raw = input.getAll("ids").map((v) => String(v ?? ""));
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of raw) {
    const t = v.trim();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  const truncated = out.length > BULK_MAX_IDS;
  return { ids: truncated ? out.slice(0, BULK_MAX_IDS) : out, truncated };
}

export function chunkIds<T>(ids: T[], size: number): T[][] {
  if (size <= 0) return [ids];
  const out: T[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit batch summary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Logs a single audit row summarizing the batch. Per-target audit rows are
 * written by the underlying single-row helpers (regenerateUserInvite etc.).
 */
export async function auditBulkOperation(opts: {
  actorUserId: string;
  entityType: string;
  action: string;
  result: BulkOperationResult;
  /** Targets at the entity level — e.g. studentIds or parentIds. */
  targetIds: string[];
  extra?: Record<string, unknown>;
}): Promise<void> {
  await logAudit({
    actorUserId: opts.actorUserId,
    entityType: opts.entityType,
    entityId: opts.targetIds[0] ?? "—",
    action: opts.action,
    summary: `${opts.result.succeeded}/${opts.result.attempted} ✓ · ${opts.result.skipped} atlandı · ${opts.result.failed} hata`,
    payload: {
      attempted: opts.result.attempted,
      succeeded: opts.result.succeeded,
      skipped: opts.result.skipped,
      failed: opts.result.failed,
      ids: opts.targetIds,
      errors: opts.result.errors.slice(0, 50),
      warnings: opts.result.warnings.slice(0, 50),
      ...(opts.extra ?? {}),
    },
  });
}

// re-export for callers that want to write per-target audit rows in one batch
export { logAuditMany };

// ─────────────────────────────────────────────────────────────────────────────
// Core wrappers — operate on User ids
// ─────────────────────────────────────────────────────────────────────────────

type UserAccountSlim = {
  id: string;
  userId: string | null;
  fullName: string | null;
  email: string | null;
  user: {
    id: string;
    email: string | null;
    accountDisabledAt: Date | null;
    mustChangePassword: boolean;
    userInviteToken: string | null;
    userInviteTokenExpiresAt: Date | null;
  } | null;
};

/** Generic per-id loop with consistent skipped/failed accounting. */
async function runPerId<T>(
  ids: string[],
  op: string,
  worker: (id: string) => Promise<{ kind: "ok" } | { kind: "skipped"; reason: string } | { kind: "warn"; message: string }>,
): Promise<BulkOperationResult> {
  const result = emptyBulkResult(op, ids.length);
  for (const id of ids) {
    try {
      const r = await worker(id);
      if (r.kind === "ok") result.succeeded += 1;
      else if (r.kind === "skipped") {
        result.skipped += 1;
        result.warnings.push({ id, message: r.reason });
      } else {
        result.succeeded += 1;
        result.warnings.push({ id, message: r.message });
      }
    } catch (e) {
      result.failed += 1;
      result.errors.push({ id, reason: e instanceof Error ? e.message : String(e) });
    }
  }
  result.ok = result.failed === 0;
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Student bulk operations (operate via Student → User)
// ─────────────────────────────────────────────────────────────────────────────

async function loadStudentsWithUser(ids: string[]): Promise<UserAccountSlim[]> {
  return prisma.student.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      userId: true,
      fullName: true,
      email: true,
      user: {
        select: {
          id: true,
          email: true,
          accountDisabledAt: true,
          mustChangePassword: true,
          userInviteToken: true,
          userInviteTokenExpiresAt: true,
        },
      },
    },
  });
}

export async function bulkStudentGenerateInvites(opts: {
  actorUserId: string;
  studentIds: string[];
}): Promise<BulkOperationResult & { data: { invites: Array<{ studentId: string; url: string; expiresAt: string }> } }> {
  const rows = await loadStudentsWithUser(opts.studentIds);
  const map = new Map(rows.map((r) => [r.id, r]));
  const invites: Array<{ studentId: string; url: string; expiresAt: string }> = [];
  const result = await runPerId(opts.studentIds, "STUDENT_BULK_GENERATE_INVITES", async (id) => {
    const s = map.get(id);
    if (!s) return { kind: "skipped", reason: "Öğrenci bulunamadı." };
    if (!s.userId || !s.user) return { kind: "skipped", reason: "Bu öğrencinin kullanıcı hesabı yok." };
    if (s.user.accountDisabledAt) return { kind: "skipped", reason: "Hesap devre dışı; önce aktifleştirin." };
    const r = await regenerateUserInvite({ userId: s.userId, actorUserId: opts.actorUserId });
    invites.push({ studentId: id, url: r.url, expiresAt: r.expiresAt.toISOString() });
    return { kind: "ok" };
  });
  await auditBulkOperation({
    actorUserId: opts.actorUserId,
    entityType: "Student",
    action: "STUDENT_BULK_GENERATE_INVITES",
    result,
    targetIds: opts.studentIds,
  });
  return { ...result, data: { invites } };
}

export async function bulkStudentForcePasswordChange(opts: {
  actorUserId: string;
  studentIds: string[];
}): Promise<BulkOperationResult> {
  const rows = await loadStudentsWithUser(opts.studentIds);
  const map = new Map(rows.map((r) => [r.id, r]));
  const result = await runPerId(opts.studentIds, "STUDENT_BULK_FORCE_PASSWORD_CHANGE", async (id) => {
    const s = map.get(id);
    if (!s) return { kind: "skipped", reason: "Öğrenci bulunamadı." };
    if (!s.userId || !s.user) return { kind: "skipped", reason: "Hesap yok." };
    if (s.user.accountDisabledAt) return { kind: "skipped", reason: "Hesap devre dışı." };
    if (s.user.mustChangePassword) return { kind: "skipped", reason: "Zaten zorunlu işaretli." };
    await forceUserPasswordChange({ userId: s.userId, actorUserId: opts.actorUserId });
    return { kind: "ok" };
  });
  await auditBulkOperation({
    actorUserId: opts.actorUserId,
    entityType: "Student",
    action: "STUDENT_BULK_FORCE_PASSWORD_CHANGE",
    result,
    targetIds: opts.studentIds,
  });
  return result;
}

export async function bulkStudentDisableAccounts(opts: {
  actorUserId: string;
  studentIds: string[];
  reason?: string | null;
}): Promise<BulkOperationResult> {
  const rows = await loadStudentsWithUser(opts.studentIds);
  const map = new Map(rows.map((r) => [r.id, r]));
  const result = await runPerId(opts.studentIds, "STUDENT_BULK_DISABLE", async (id) => {
    const s = map.get(id);
    if (!s) return { kind: "skipped", reason: "Öğrenci bulunamadı." };
    if (!s.userId || !s.user) return { kind: "skipped", reason: "Hesap yok." };
    if (s.user.accountDisabledAt) return { kind: "skipped", reason: "Zaten devre dışı." };
    await disableUserAccount({ userId: s.userId, actorUserId: opts.actorUserId, reason: opts.reason ?? null });
    return { kind: "ok" };
  });
  await auditBulkOperation({
    actorUserId: opts.actorUserId,
    entityType: "Student",
    action: "STUDENT_BULK_DISABLE",
    result,
    targetIds: opts.studentIds,
    extra: { reason: opts.reason ?? null },
  });
  return result;
}

export async function bulkStudentEnableAccounts(opts: {
  actorUserId: string;
  studentIds: string[];
}): Promise<BulkOperationResult> {
  const rows = await loadStudentsWithUser(opts.studentIds);
  const map = new Map(rows.map((r) => [r.id, r]));
  const result = await runPerId(opts.studentIds, "STUDENT_BULK_ENABLE", async (id) => {
    const s = map.get(id);
    if (!s) return { kind: "skipped", reason: "Öğrenci bulunamadı." };
    if (!s.userId || !s.user) return { kind: "skipped", reason: "Hesap yok." };
    if (!s.user.accountDisabledAt) return { kind: "skipped", reason: "Zaten aktif." };
    await enableUserAccount({ userId: s.userId, actorUserId: opts.actorUserId });
    return { kind: "ok" };
  });
  await auditBulkOperation({
    actorUserId: opts.actorUserId,
    entityType: "Student",
    action: "STUDENT_BULK_ENABLE",
    result,
    targetIds: opts.studentIds,
  });
  return result;
}

export async function bulkStudentAssignClassroom(opts: {
  actorUserId: string;
  studentIds: string[];
  classroomId: string;
}): Promise<BulkOperationResult> {
  if (!opts.classroomId) {
    const r = emptyBulkResult("STUDENT_BULK_ASSIGN_CLASSROOM", opts.studentIds.length);
    r.ok = false;
    r.failed = opts.studentIds.length;
    r.errors = opts.studentIds.map((id) => ({ id, reason: "Sınıf seçilmedi." }));
    return r;
  }
  const classroom = await prisma.classroom.findUnique({
    where: { id: opts.classroomId },
    select: { id: true, name: true, isActive: true, capacity: true, _count: { select: { students: true } } },
  });
  const result = emptyBulkResult("STUDENT_BULK_ASSIGN_CLASSROOM", opts.studentIds.length);
  if (!classroom) {
    result.ok = false;
    result.failed = opts.studentIds.length;
    result.errors = opts.studentIds.map((id) => ({ id, reason: "Sınıf bulunamadı." }));
    return result;
  }
  if (!classroom.isActive) {
    result.warnings.push({ id: classroom.id, message: "Pasif sınıf — atama yine de yapıldı." });
  }
  const existing = await prisma.classroomStudent.findMany({
    where: { classroomId: classroom.id, studentId: { in: opts.studentIds } },
    select: { studentId: true },
  });
  const already = new Set(existing.map((r) => r.studentId));
  const toAdd = opts.studentIds.filter((id) => !already.has(id));
  for (const id of opts.studentIds) {
    if (already.has(id)) {
      result.skipped += 1;
      result.warnings.push({ id, message: "Bu sınıfta zaten kayıtlı." });
    }
  }
  if (toAdd.length === 0) {
    result.ok = true;
    await auditBulkOperation({
      actorUserId: opts.actorUserId,
      entityType: "Classroom",
      action: "CLASSROOM_STUDENT_ASSIGN_BATCH",
      result,
      targetIds: [classroom.id],
      extra: { classroomId: classroom.id, classroomName: classroom.name, attempted: opts.studentIds.length, addedIds: [] },
    });
    return result;
  }
  const created = await prisma.classroomStudent.createMany({
    data: toAdd.map((studentId) => ({ classroomId: classroom.id, studentId })),
    skipDuplicates: true,
  });
  result.succeeded = created.count;
  // Anything not created and not skipped → failed (rare: race against another writer)
  const accountedFor = result.succeeded + result.skipped;
  if (accountedFor < result.attempted) {
    const missing = result.attempted - accountedFor;
    result.failed = missing;
    result.ok = false;
  }
  await auditBulkOperation({
    actorUserId: opts.actorUserId,
    entityType: "Classroom",
    action: "CLASSROOM_STUDENT_ASSIGN_BATCH",
    result,
    targetIds: [classroom.id],
    extra: {
      classroomId: classroom.id,
      classroomName: classroom.name,
      attempted: opts.studentIds.length,
      addedIds: toAdd,
    },
  });
  return result;
}

export async function bulkStudentGrantAccessTag(opts: {
  actorUserId: string;
  studentIds: string[];
  accessTagId: string;
  expiresAt?: Date | null;
}): Promise<BulkOperationResult> {
  const result = emptyBulkResult("STUDENT_BULK_GRANT_ACCESS_TAG", opts.studentIds.length);
  if (!opts.accessTagId) {
    result.ok = false;
    result.failed = opts.studentIds.length;
    result.errors = opts.studentIds.map((id) => ({ id, reason: "Erişim etiketi seçilmedi." }));
    return result;
  }
  const tag = await prisma.odkAccessTag.findUnique({
    where: { id: opts.accessTagId },
    select: { id: true, key: true, service: true, isActive: true },
  });
  if (!tag || !tag.isActive) {
    result.ok = false;
    result.failed = opts.studentIds.length;
    result.errors = opts.studentIds.map((id) => ({ id, reason: "Etiket bulunamadı veya pasif." }));
    return result;
  }
  const students = await loadStudentsWithUser(opts.studentIds);
  const map = new Map(students.map((s) => [s.id, s]));
  const audits: Parameters<typeof logAuditMany>[0] = [];
  for (const id of opts.studentIds) {
    try {
      const s = map.get(id);
      if (!s) {
        result.skipped += 1;
        result.warnings.push({ id, message: "Öğrenci bulunamadı." });
        continue;
      }
      if (!s.userId) {
        result.skipped += 1;
        result.warnings.push({ id, message: "Kullanıcı hesabı olmayan öğrenciye etiket verilmedi." });
        continue;
      }
      const existing = await prisma.odkUserAccessTag.findFirst({
        where: { userId: s.userId, accessTagId: tag.id, revokedAt: null },
        select: { id: true },
      });
      if (existing) {
        result.skipped += 1;
        result.warnings.push({ id, message: "Etiket zaten verilmiş." });
        continue;
      }
      await prisma.odkUserAccessTag.create({
        data: {
          userId: s.userId,
          accessTagId: tag.id,
          grantedById: opts.actorUserId,
          expiresAt: opts.expiresAt ?? null,
          source: "MANUAL",
        },
      });
      result.succeeded += 1;
      audits.push({
        actorUserId: opts.actorUserId,
        entityType: "User",
        entityId: s.userId,
        action: "USER_ACCESS_TAG_GRANT",
        summary: `${tag.service}:${tag.key}`,
        payload: { accessTagId: tag.id, expiresAt: opts.expiresAt?.toISOString() ?? null, via: "BULK" },
      });
    } catch (e) {
      result.failed += 1;
      result.errors.push({ id, reason: e instanceof Error ? e.message : String(e) });
    }
  }
  result.ok = result.failed === 0;
  if (audits.length > 0) await logAuditMany(audits);
  await auditBulkOperation({
    actorUserId: opts.actorUserId,
    entityType: "AccessTag",
    action: "STUDENT_BULK_GRANT_ACCESS_TAG",
    result,
    targetIds: opts.studentIds,
    extra: { accessTagId: tag.id, accessTagKey: tag.key, service: tag.service },
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parent bulk operations
// ─────────────────────────────────────────────────────────────────────────────

async function loadParentsWithUser(ids: string[]) {
  return prisma.parent.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      userId: true,
      fullName: true,
      email: true,
      user: {
        select: {
          id: true,
          email: true,
          accountDisabledAt: true,
          mustChangePassword: true,
        },
      },
    },
  });
}

export async function bulkParentGenerateInvites(opts: {
  actorUserId: string;
  parentIds: string[];
}): Promise<BulkOperationResult & { data: { invites: Array<{ parentId: string; url: string; expiresAt: string }> } }> {
  const rows = await loadParentsWithUser(opts.parentIds);
  const map = new Map(rows.map((r) => [r.id, r]));
  const invites: Array<{ parentId: string; url: string; expiresAt: string }> = [];
  const result = await runPerId(opts.parentIds, "PARENT_BULK_GENERATE_INVITES", async (id) => {
    const p = map.get(id);
    if (!p) return { kind: "skipped", reason: "Veli bulunamadı." };
    if (!p.userId || !p.user) return { kind: "skipped", reason: "Bu velinin kullanıcı hesabı yok." };
    if (p.user.accountDisabledAt) return { kind: "skipped", reason: "Hesap devre dışı." };
    const r = await regenerateUserInvite({ userId: p.userId, actorUserId: opts.actorUserId });
    invites.push({ parentId: id, url: r.url, expiresAt: r.expiresAt.toISOString() });
    return { kind: "ok" };
  });
  await auditBulkOperation({
    actorUserId: opts.actorUserId,
    entityType: "Parent",
    action: "PARENT_BULK_GENERATE_INVITES",
    result,
    targetIds: opts.parentIds,
  });
  return { ...result, data: { invites } };
}

export async function bulkParentForcePasswordChange(opts: {
  actorUserId: string;
  parentIds: string[];
}): Promise<BulkOperationResult> {
  const rows = await loadParentsWithUser(opts.parentIds);
  const map = new Map(rows.map((r) => [r.id, r]));
  const result = await runPerId(opts.parentIds, "PARENT_BULK_FORCE_PASSWORD_CHANGE", async (id) => {
    const p = map.get(id);
    if (!p) return { kind: "skipped", reason: "Veli bulunamadı." };
    if (!p.userId || !p.user) return { kind: "skipped", reason: "Hesap yok." };
    if (p.user.accountDisabledAt) return { kind: "skipped", reason: "Hesap devre dışı." };
    if (p.user.mustChangePassword) return { kind: "skipped", reason: "Zaten zorunlu işaretli." };
    await forceUserPasswordChange({ userId: p.userId, actorUserId: opts.actorUserId });
    return { kind: "ok" };
  });
  await auditBulkOperation({
    actorUserId: opts.actorUserId,
    entityType: "Parent",
    action: "PARENT_BULK_FORCE_PASSWORD_CHANGE",
    result,
    targetIds: opts.parentIds,
  });
  return result;
}

export async function bulkParentDisableAccounts(opts: {
  actorUserId: string;
  parentIds: string[];
  reason?: string | null;
}): Promise<BulkOperationResult> {
  const rows = await loadParentsWithUser(opts.parentIds);
  const map = new Map(rows.map((r) => [r.id, r]));
  const result = await runPerId(opts.parentIds, "PARENT_BULK_DISABLE", async (id) => {
    const p = map.get(id);
    if (!p) return { kind: "skipped", reason: "Veli bulunamadı." };
    if (!p.userId || !p.user) return { kind: "skipped", reason: "Hesap yok." };
    if (p.user.accountDisabledAt) return { kind: "skipped", reason: "Zaten devre dışı." };
    await disableUserAccount({ userId: p.userId, actorUserId: opts.actorUserId, reason: opts.reason ?? null });
    return { kind: "ok" };
  });
  await auditBulkOperation({
    actorUserId: opts.actorUserId,
    entityType: "Parent",
    action: "PARENT_BULK_DISABLE",
    result,
    targetIds: opts.parentIds,
    extra: { reason: opts.reason ?? null },
  });
  return result;
}

export async function bulkParentEnableAccounts(opts: {
  actorUserId: string;
  parentIds: string[];
}): Promise<BulkOperationResult> {
  const rows = await loadParentsWithUser(opts.parentIds);
  const map = new Map(rows.map((r) => [r.id, r]));
  const result = await runPerId(opts.parentIds, "PARENT_BULK_ENABLE", async (id) => {
    const p = map.get(id);
    if (!p) return { kind: "skipped", reason: "Veli bulunamadı." };
    if (!p.userId || !p.user) return { kind: "skipped", reason: "Hesap yok." };
    if (!p.user.accountDisabledAt) return { kind: "skipped", reason: "Zaten aktif." };
    await enableUserAccount({ userId: p.userId, actorUserId: opts.actorUserId });
    return { kind: "ok" };
  });
  await auditBulkOperation({
    actorUserId: opts.actorUserId,
    entityType: "Parent",
    action: "PARENT_BULK_ENABLE",
    result,
    targetIds: opts.parentIds,
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Teacher bulk operations
// ─────────────────────────────────────────────────────────────────────────────

async function loadTeachersWithUser(ids: string[]) {
  return prisma.teacher.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      userId: true,
      fullName: true,
      email: true,
      user: {
        select: {
          id: true,
          email: true,
          accountDisabledAt: true,
          mustChangePassword: true,
        },
      },
    },
  });
}

export async function bulkTeacherGenerateInvites(opts: {
  actorUserId: string;
  teacherIds: string[];
}): Promise<BulkOperationResult & { data: { invites: Array<{ teacherId: string; url: string; expiresAt: string }> } }> {
  const rows = await loadTeachersWithUser(opts.teacherIds);
  const map = new Map(rows.map((r) => [r.id, r]));
  const invites: Array<{ teacherId: string; url: string; expiresAt: string }> = [];
  const result = await runPerId(opts.teacherIds, "TEACHER_BULK_GENERATE_INVITES", async (id) => {
    const t = map.get(id);
    if (!t) return { kind: "skipped", reason: "Öğretmen bulunamadı." };
    if (!t.userId || !t.user) return { kind: "skipped", reason: "Bu öğretmenin kullanıcı hesabı yok." };
    if (t.user.accountDisabledAt) return { kind: "skipped", reason: "Hesap devre dışı." };
    const r = await regenerateUserInvite({ userId: t.userId, actorUserId: opts.actorUserId });
    invites.push({ teacherId: id, url: r.url, expiresAt: r.expiresAt.toISOString() });
    return { kind: "ok" };
  });
  await auditBulkOperation({
    actorUserId: opts.actorUserId,
    entityType: "Teacher",
    action: "TEACHER_BULK_GENERATE_INVITES",
    result,
    targetIds: opts.teacherIds,
  });
  return { ...result, data: { invites } };
}

export async function bulkTeacherForcePasswordChange(opts: {
  actorUserId: string;
  teacherIds: string[];
}): Promise<BulkOperationResult> {
  const rows = await loadTeachersWithUser(opts.teacherIds);
  const map = new Map(rows.map((r) => [r.id, r]));
  const result = await runPerId(opts.teacherIds, "TEACHER_BULK_FORCE_PASSWORD_CHANGE", async (id) => {
    const t = map.get(id);
    if (!t) return { kind: "skipped", reason: "Öğretmen bulunamadı." };
    if (!t.userId || !t.user) return { kind: "skipped", reason: "Hesap yok." };
    if (t.user.accountDisabledAt) return { kind: "skipped", reason: "Hesap devre dışı." };
    if (t.user.mustChangePassword) return { kind: "skipped", reason: "Zaten zorunlu işaretli." };
    await forceUserPasswordChange({ userId: t.userId, actorUserId: opts.actorUserId });
    return { kind: "ok" };
  });
  await auditBulkOperation({
    actorUserId: opts.actorUserId,
    entityType: "Teacher",
    action: "TEACHER_BULK_FORCE_PASSWORD_CHANGE",
    result,
    targetIds: opts.teacherIds,
  });
  return result;
}

export async function bulkTeacherDisableAccounts(opts: {
  actorUserId: string;
  teacherIds: string[];
  reason?: string | null;
}): Promise<BulkOperationResult> {
  const rows = await loadTeachersWithUser(opts.teacherIds);
  const map = new Map(rows.map((r) => [r.id, r]));
  const result = await runPerId(opts.teacherIds, "TEACHER_BULK_DISABLE", async (id) => {
    const t = map.get(id);
    if (!t) return { kind: "skipped", reason: "Öğretmen bulunamadı." };
    if (!t.userId || !t.user) return { kind: "skipped", reason: "Hesap yok." };
    if (t.user.accountDisabledAt) return { kind: "skipped", reason: "Zaten devre dışı." };
    await disableUserAccount({ userId: t.userId, actorUserId: opts.actorUserId, reason: opts.reason ?? null });
    return { kind: "ok" };
  });
  await auditBulkOperation({
    actorUserId: opts.actorUserId,
    entityType: "Teacher",
    action: "TEACHER_BULK_DISABLE",
    result,
    targetIds: opts.teacherIds,
    extra: { reason: opts.reason ?? null },
  });
  return result;
}

export async function bulkTeacherEnableAccounts(opts: {
  actorUserId: string;
  teacherIds: string[];
}): Promise<BulkOperationResult> {
  const rows = await loadTeachersWithUser(opts.teacherIds);
  const map = new Map(rows.map((r) => [r.id, r]));
  const result = await runPerId(opts.teacherIds, "TEACHER_BULK_ENABLE", async (id) => {
    const t = map.get(id);
    if (!t) return { kind: "skipped", reason: "Öğretmen bulunamadı." };
    if (!t.userId || !t.user) return { kind: "skipped", reason: "Hesap yok." };
    if (!t.user.accountDisabledAt) return { kind: "skipped", reason: "Zaten aktif." };
    await enableUserAccount({ userId: t.userId, actorUserId: opts.actorUserId });
    return { kind: "ok" };
  });
  await auditBulkOperation({
    actorUserId: opts.actorUserId,
    entityType: "Teacher",
    action: "TEACHER_BULK_ENABLE",
    result,
    targetIds: opts.teacherIds,
  });
  return result;
}
