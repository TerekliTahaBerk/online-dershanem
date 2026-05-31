/**
 * Phase 2 / Session 16 — Inbox display helpers (client-safe).
 *
 * Pure label / tone mappings for `InboxCategory` and `InboxPriority`.
 * No `server-only` import → safe to consume from client components.
 */
import type { InboxCategory, InboxPriority } from "@prisma/client";

export type InboxTone = "ok" | "warn" | "neutral" | "bad" | "accent";

const CATEGORY_LABEL: Record<InboxCategory, string> = {
  SYSTEM: "Sistem",
  FINANCE: "Finans",
  EDUCATION: "Eğitim",
  ANNOUNCEMENT: "Duyuru",
  TEACHER_MESSAGE: "Öğretmen mesajı",
  ATTENDANCE: "Devam",
  ASSIGNMENT: "Ödev",
};

export function getInboxCategoryLabel(c: InboxCategory): string {
  return CATEGORY_LABEL[c] ?? String(c);
}

export function getInboxCategoryTone(c: InboxCategory): InboxTone {
  switch (c) {
    case "FINANCE": return "warn";
    case "ATTENDANCE": return "warn";
    case "ASSIGNMENT": return "accent";
    case "EDUCATION": return "accent";
    case "TEACHER_MESSAGE": return "accent";
    case "ANNOUNCEMENT": return "ok";
    case "SYSTEM":
    default: return "neutral";
  }
}

const PRIORITY_LABEL: Record<InboxPriority, string> = {
  LOW: "Düşük",
  NORMAL: "Normal",
  HIGH: "Yüksek",
  URGENT: "Acil",
};

export function getInboxPriorityLabel(p: InboxPriority): string {
  return PRIORITY_LABEL[p] ?? String(p);
}

export function getInboxPriorityTone(p: InboxPriority): InboxTone {
  switch (p) {
    case "URGENT": return "bad";
    case "HIGH": return "warn";
    case "LOW": return "neutral";
    case "NORMAL":
    default: return "neutral";
  }
}

export const INBOX_VIEWS = ["all", "unread", "archived"] as const;
export type InboxView = (typeof INBOX_VIEWS)[number];

export function getInboxViewLabel(v: InboxView): string {
  switch (v) {
    case "all": return "Tümü";
    case "unread": return "Okunmamış";
    case "archived": return "Arşiv";
  }
}
