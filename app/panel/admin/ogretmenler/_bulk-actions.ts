"use server";

import { revalidatePath } from "next/cache";
import { requirePanelRole } from "@/lib/panel-access";
import {
  normalizeSelectedIds,
  bulkTeacherGenerateInvites,
  bulkTeacherForcePasswordChange,
  bulkTeacherDisableAccounts,
  bulkTeacherEnableAccounts,
  type BulkOperationResult,
  emptyBulkResult,
} from "@/lib/panel/bulk-operations";

const PATH = "/panel/admin/ogretmenler";

function applyTruncationWarning(result: BulkOperationResult, truncated: boolean) {
  if (truncated) {
    result.warnings.unshift({
      id: "—",
      message: "Çok fazla kayıt seçildi; ilk 500 işleme alındı.",
    });
  }
}

export async function bulkTeacherGenerateInvitesAction(
  _prev: BulkOperationResult | null,
  fd: FormData,
): Promise<BulkOperationResult> {
  const ctx = await requirePanelRole("admin");
  const { ids, truncated } = normalizeSelectedIds(fd);
  if (ids.length === 0) return emptyBulkResult("TEACHER_BULK_GENERATE_INVITES", 0);
  const r = await bulkTeacherGenerateInvites({ actorUserId: ctx.userId, teacherIds: ids });
  applyTruncationWarning(r, truncated);
  revalidatePath(PATH);
  return r;
}

export async function bulkTeacherForcePasswordChangeAction(
  _prev: BulkOperationResult | null,
  fd: FormData,
): Promise<BulkOperationResult> {
  const ctx = await requirePanelRole("admin");
  const { ids, truncated } = normalizeSelectedIds(fd);
  if (ids.length === 0) return emptyBulkResult("TEACHER_BULK_FORCE_PASSWORD_CHANGE", 0);
  const r = await bulkTeacherForcePasswordChange({ actorUserId: ctx.userId, teacherIds: ids });
  applyTruncationWarning(r, truncated);
  revalidatePath(PATH);
  return r;
}

export async function bulkTeacherDisableAction(
  _prev: BulkOperationResult | null,
  fd: FormData,
): Promise<BulkOperationResult> {
  const ctx = await requirePanelRole("admin");
  const { ids, truncated } = normalizeSelectedIds(fd);
  if (ids.length === 0) return emptyBulkResult("TEACHER_BULK_DISABLE", 0);
  const reason = (fd.get("reason") as string | null)?.trim() || null;
  const r = await bulkTeacherDisableAccounts({ actorUserId: ctx.userId, teacherIds: ids, reason });
  applyTruncationWarning(r, truncated);
  revalidatePath(PATH);
  return r;
}

export async function bulkTeacherEnableAction(
  _prev: BulkOperationResult | null,
  fd: FormData,
): Promise<BulkOperationResult> {
  const ctx = await requirePanelRole("admin");
  const { ids, truncated } = normalizeSelectedIds(fd);
  if (ids.length === 0) return emptyBulkResult("TEACHER_BULK_ENABLE", 0);
  const r = await bulkTeacherEnableAccounts({ actorUserId: ctx.userId, teacherIds: ids });
  applyTruncationWarning(r, truncated);
  revalidatePath(PATH);
  return r;
}
