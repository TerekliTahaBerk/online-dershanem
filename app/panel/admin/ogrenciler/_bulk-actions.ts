/**
 * Phase 3 / Session 8 — Student bulk action server actions.
 *
 * One action per operation. Each is admin-only and revalidates the list page
 * on success so badges update.
 */
"use server";

import { revalidatePath } from "next/cache";
import { requirePanelRole } from "@/lib/panel-access";
import {
  normalizeSelectedIds,
  bulkStudentGenerateInvites,
  bulkStudentForcePasswordChange,
  bulkStudentDisableAccounts,
  bulkStudentEnableAccounts,
  bulkStudentAssignClassroom,
  bulkStudentGrantAccessTag,
  type BulkOperationResult,
  emptyBulkResult,
} from "@/lib/panel/bulk-operations";

const PATH = "/panel/admin/ogrenciler";

function applyTruncationWarning(result: BulkOperationResult, truncated: boolean) {
  if (truncated) {
    result.warnings.unshift({
      id: "—",
      message: "Çok fazla kayıt seçildi; ilk 500 işleme alındı.",
    });
  }
}

export async function bulkStudentGenerateInvitesAction(
  _prev: BulkOperationResult | null,
  fd: FormData,
): Promise<BulkOperationResult> {
  const ctx = await requirePanelRole("admin");
  const { ids, truncated } = normalizeSelectedIds(fd);
  if (ids.length === 0) return emptyBulkResult("STUDENT_BULK_GENERATE_INVITES", 0);
  const r = await bulkStudentGenerateInvites({ actorUserId: ctx.userId, studentIds: ids });
  applyTruncationWarning(r, truncated);
  revalidatePath(PATH);
  return r;
}

export async function bulkStudentForcePasswordChangeAction(
  _prev: BulkOperationResult | null,
  fd: FormData,
): Promise<BulkOperationResult> {
  const ctx = await requirePanelRole("admin");
  const { ids, truncated } = normalizeSelectedIds(fd);
  if (ids.length === 0) return emptyBulkResult("STUDENT_BULK_FORCE_PASSWORD_CHANGE", 0);
  const r = await bulkStudentForcePasswordChange({ actorUserId: ctx.userId, studentIds: ids });
  applyTruncationWarning(r, truncated);
  revalidatePath(PATH);
  return r;
}

export async function bulkStudentDisableAction(
  _prev: BulkOperationResult | null,
  fd: FormData,
): Promise<BulkOperationResult> {
  const ctx = await requirePanelRole("admin");
  const { ids, truncated } = normalizeSelectedIds(fd);
  if (ids.length === 0) return emptyBulkResult("STUDENT_BULK_DISABLE", 0);
  const reason = (fd.get("reason") as string | null)?.trim() || null;
  const r = await bulkStudentDisableAccounts({ actorUserId: ctx.userId, studentIds: ids, reason });
  applyTruncationWarning(r, truncated);
  revalidatePath(PATH);
  return r;
}

export async function bulkStudentEnableAction(
  _prev: BulkOperationResult | null,
  fd: FormData,
): Promise<BulkOperationResult> {
  const ctx = await requirePanelRole("admin");
  const { ids, truncated } = normalizeSelectedIds(fd);
  if (ids.length === 0) return emptyBulkResult("STUDENT_BULK_ENABLE", 0);
  const r = await bulkStudentEnableAccounts({ actorUserId: ctx.userId, studentIds: ids });
  applyTruncationWarning(r, truncated);
  revalidatePath(PATH);
  return r;
}

export async function bulkStudentAssignClassroomAction(
  _prev: BulkOperationResult | null,
  fd: FormData,
): Promise<BulkOperationResult> {
  const ctx = await requirePanelRole("admin");
  const { ids, truncated } = normalizeSelectedIds(fd);
  const classroomId = String(fd.get("classroomId") ?? "").trim();
  if (ids.length === 0) return emptyBulkResult("STUDENT_BULK_ASSIGN_CLASSROOM", 0);
  const r = await bulkStudentAssignClassroom({
    actorUserId: ctx.userId,
    studentIds: ids,
    classroomId,
  });
  applyTruncationWarning(r, truncated);
  revalidatePath(PATH);
  revalidatePath(`/panel/admin/siniflar/${classroomId}`);
  return r;
}

export async function bulkStudentGrantAccessTagAction(
  _prev: BulkOperationResult | null,
  fd: FormData,
): Promise<BulkOperationResult> {
  const ctx = await requirePanelRole("admin");
  const { ids, truncated } = normalizeSelectedIds(fd);
  const accessTagId = String(fd.get("accessTagId") ?? "").trim();
  const expiresAtRaw = String(fd.get("expiresAt") ?? "").trim();
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
  if (ids.length === 0) return emptyBulkResult("STUDENT_BULK_GRANT_ACCESS_TAG", 0);
  const r = await bulkStudentGrantAccessTag({
    actorUserId: ctx.userId,
    studentIds: ids,
    accessTagId,
    expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
  });
  applyTruncationWarning(r, truncated);
  revalidatePath(PATH);
  return r;
}
