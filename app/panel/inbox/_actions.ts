"use server";

import { revalidatePath } from "next/cache";
import { requirePanelSession } from "@/lib/panel-access";
import {
  markAllInboxMessagesRead,
  markInboxMessageReadById,
} from "@/lib/notifications";

/**
 * Phase 2 / Session 16 — Inbox actions.
 *
 * All actions are scoped by `requirePanelSession()` so they always operate
 * on the current user's own inbox row only. The helpers below silently
 * ignore mismatched ownership — never throw on cross-row attempts.
 */

export async function markInboxMessageReadAction(messageId: string) {
  const ctx = await requirePanelSession();
  await markInboxMessageReadById(ctx.userId, messageId);
  revalidatePath("/panel/inbox");
  revalidatePath("/panel/admin/inbox");
}

export async function markAllInboxMessagesReadAction() {
  const ctx = await requirePanelSession();
  await markAllInboxMessagesRead(ctx.userId);
  revalidatePath("/panel/inbox");
  revalidatePath("/panel/admin/inbox");
}
