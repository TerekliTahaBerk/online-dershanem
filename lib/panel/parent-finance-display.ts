/**
 * Phase 2 / Session 13 — Client-safe display helpers for parent finance.
 *
 * Pure functions and types with NO `server-only` marker, so they can be
 * imported from `"use client"` components (badge, tables) without
 * pulling Prisma/server-only into the client bundle.
 *
 * The server module `lib/panel/parent-finance.ts` re-exports from here.
 */
import type { PaymentScheduleStatus } from "@prisma/client";

/** Display status — base status plus the derived "OVERDUE". */
export type PaymentScheduleDisplayStatus =
  | "PENDING"
  | "PAID"
  | "CANCELLED"
  | "PARTIAL"
  | "OVERDUE";

export type PaymentScheduleRow = {
  id: string;
  title: string;
  amountKurus: number;
  paidAmountKurus: number;
  remainingKurus: number;
  dueDate: Date;
  status: PaymentScheduleStatus;
  /** Derived for display (incl. OVERDUE). */
  displayStatus: PaymentScheduleDisplayStatus;
  paidAt: Date | null;
  paymentLink: string | null;
  note: string | null;
  createdAt: Date;

  studentId: string | null;
  studentFullName: string | null;
  parentId: string | null;
  packageId: string | null;
  packageName: string | null;
  purchaseIntentId: string | null;
  accountingEntryId: string | null;
  /** Days from today (negative if overdue). */
  daysUntilDue: number;
};

export function getPaymentScheduleStatusLabel(s: PaymentScheduleDisplayStatus): string {
  switch (s) {
    case "PENDING":   return "Bekliyor";
    case "PAID":      return "Ödendi";
    case "OVERDUE":   return "Gecikti";
    case "PARTIAL":   return "Kısmi ödendi";
    case "CANCELLED": return "İptal";
    default:          return s;
  }
}

export function getPaymentScheduleStatusTone(
  s: PaymentScheduleDisplayStatus,
): "ok" | "warn" | "bad" | "neutral" | "accent" {
  switch (s) {
    case "PAID":      return "ok";
    case "PARTIAL":   return "accent";
    case "PENDING":   return "warn";
    case "OVERDUE":   return "bad";
    case "CANCELLED": return "neutral";
    default:          return "neutral";
  }
}

/** Kuruş → "₺123,45" (Turkish locale, two fraction digits). */
export function formatMoneyTRY(kurus: number): string {
  const sign = kurus < 0 ? "-" : "";
  const abs = Math.abs(kurus);
  return `${sign}₺${(abs / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
