"use server";

import { revalidatePath } from "next/cache";
import { requirePanelRole } from "@/lib/panel-access";
import {
  normalizeSelectedIds,
  bulkParentGenerateInvites,
  bulkParentForcePasswordChange,
  bulkParentDisableAccounts,
  bulkParentEnableAccounts,
  type BulkOperationResult,
  emptyBulkResult,
} from "@/lib/panel/bulk-operations";

const PATH = "/panel/admin/veliler";

function applyTruncationWarning(result: BulkOperationResult, truncated: boolean) {
  if (truncated) {
    result.warnings.unshift({
      id: "—",
      message: "Çok fazla kayıt seçildi; ilk 500 işleme alındı.",
    });
  }
}

export async function bulkParentGenerateInvitesAction(
  _prev: BulkOperationResult | null,
  fd: FormData,
): Promise<BulkOperationResult> {
  const ctx = await requirePanelRole("admin");
  const { ids, truncated } = normalizeSelectedIds(fd);
  if (ids.length === 0) return emptyBulkResult("PARENT_BULK_GENERATE_INVITES", 0);
  const r = await bulkParentGenerateInvites({ actorUserId: ctx.userId, parentIds: ids });
  applyTruncationWarning(r, truncated);
  revalidatePath(PATH);
  return r;
}

export async function bulkParentForcePasswordChangeAction(
  _prev: BulkOperationResult | null,
  fd: FormData,
): Promise<BulkOperationResult> {
  const ctx = await requirePanelRole("admin");
  const { ids, truncated } = normalizeSelectedIds(fd);
  if (ids.length === 0) return emptyBulkResult("PARENT_BULK_FORCE_PASSWORD_CHANGE", 0);
  const r = await bulkParentForcePasswordChange({ actorUserId: ctx.userId, parentIds: ids });
  applyTruncationWarning(r, truncated);
  revalidatePath(PATH);
  return r;
}

export async function bulkParentDisableAction(
  _prev: BulkOperationResult | null,
  fd: FormData,
): Promise<BulkOperationResult> {
  const ctx = await requirePanelRole("admin");
  const { ids, truncated } = normalizeSelectedIds(fd);
  if (ids.length === 0) return emptyBulkResult("PARENT_BULK_DISABLE", 0);
  const reason = (fd.get("reason") as string | null)?.trim() || null;
  const r = await bulkParentDisableAccounts({ actorUserId: ctx.userId, parentIds: ids, reason });
  applyTruncationWarning(r, truncated);
  revalidatePath(PATH);
  return r;
}

export async function bulkParentEnableAction(
  _prev: BulkOperationResult | null,
  fd: FormData,
): Promise<BulkOperationResult> {
  const ctx = await requirePanelRole("admin");
  const { ids, truncated } = normalizeSelectedIds(fd);
  if (ids.length === 0) return emptyBulkResult("PARENT_BULK_ENABLE", 0);
  const r = await bulkParentEnableAccounts({ actorUserId: ctx.userId, parentIds: ids });
  applyTruncationWarning(r, truncated);
  revalidatePath(PATH);
  return r;
}
