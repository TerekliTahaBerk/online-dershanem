"use server";

/**
 * Phase 3 / Session 5 — Admin enrollment server actions.
 *
 * Admin-only writes. No payment provider integration; no auto-mark paid.
 * Uses the helpers in `lib/panel/enrollment.ts` for atomic creation +
 * audit + best-effort notifications.
 */

import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createStudentEnrollmentWithPaymentPlan,
  type CreateEnrollmentInput,
  type CreateEnrollmentResult,
  type PaymentPlanInput,
} from "@/lib/panel/enrollment";
import type { EnrollmentSource, EnrollmentStatus } from "@prisma/client";
import { logAudit } from "@/lib/audit";

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}
function readAll(fd: FormData, key: string): string[] {
  return fd
    .getAll(key)
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
}
function parseAmountToKurus(input: string): number | null {
  const s = input.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}
function parseDate(input: string): Date | null {
  if (!input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

const VALID_STATUSES: EnrollmentStatus[] = [
  "LEAD",
  "TRIAL",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
];
const VALID_SOURCES: EnrollmentSource[] = [
  "MANUAL",
  "PURCHASE",
  "TRIAL",
  "CAMP",
  "SCHOLARSHIP",
];

export type EnrollmentSubmitState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | {
      status: "ok";
      result: CreateEnrollmentResult;
      studentId: string;
    };

export async function createEnrollmentAction(
  _prev: EnrollmentSubmitState,
  fd: FormData,
): Promise<EnrollmentSubmitState> {
  try {
    const ctx = await requirePanelRole("admin");

    const studentId = readStr(fd, "studentId");
    const packageId = readStr(fd, "packageId");
    const classroomId = readStr(fd, "classroomId") || null;
    const payerParentId = readStr(fd, "payerParentId") || null;
    const status = (readStr(fd, "status") || "ACTIVE") as EnrollmentStatus;
    const source = (readStr(fd, "source") || "MANUAL") as EnrollmentSource;
    const startsAt = parseDate(readStr(fd, "startsAt")) ?? new Date();
    const endsAt = parseDate(readStr(fd, "endsAt"));
    const billingPeriodLabel = readStr(fd, "billingPeriodLabel") || null;
    const notes = readStr(fd, "notes") || null;
    const odkAccessTagIds = readAll(fd, "odkAccessTagIds");

    if (!studentId) return { status: "error", error: "Öğrenci seçilmelidir" };
    if (!packageId) return { status: "error", error: "Paket seçilmelidir" };
    if (!VALID_STATUSES.includes(status))
      return { status: "error", error: "Kayıt durumu geçersiz" };
    if (!VALID_SOURCES.includes(source))
      return { status: "error", error: "Kayıt kaynağı geçersiz" };

    const listPriceKurus = parseAmountToKurus(readStr(fd, "listPrice"));
    const discountKurus = parseAmountToKurus(readStr(fd, "discountAmount"));

    // ── Payment plan ─────────────────────────────────────────────────────
    const planKind = readStr(fd, "planKind") || "NONE";
    let paymentPlan: PaymentPlanInput;
    if (planKind === "ONE_TIME") {
      const amount = parseAmountToKurus(readStr(fd, "planAmount"));
      const dueAt = parseDate(readStr(fd, "planFirstDueAt"));
      if (amount === null)
        return { status: "error", error: "Tek seferlik tutar geçersiz" };
      if (!dueAt) return { status: "error", error: "Vade tarihi geçersiz" };
      paymentPlan = {
        kind: "ONE_TIME",
        totalKurus: amount,
        firstDueAt: dueAt,
        title: readStr(fd, "planTitle") || undefined,
        note: readStr(fd, "planNote") || undefined,
      };
    } else if (planKind === "INSTALLMENTS") {
      const amount = parseAmountToKurus(readStr(fd, "planAmount"));
      const installments = Number.parseInt(readStr(fd, "planInstallments"), 10);
      const dueAt = parseDate(readStr(fd, "planFirstDueAt"));
      if (amount === null)
        return { status: "error", error: "Toplam tutar geçersiz" };
      if (!Number.isFinite(installments) || installments < 2 || installments > 36)
        return { status: "error", error: "Taksit sayısı 2–36 olmalı" };
      if (!dueAt) return { status: "error", error: "İlk vade tarihi geçersiz" };
      paymentPlan = {
        kind: "INSTALLMENTS",
        totalKurus: amount,
        installments,
        firstDueAt: dueAt,
        intervalMonths: 1,
        titlePrefix: readStr(fd, "planTitle") || undefined,
        note: readStr(fd, "planNote") || undefined,
      };
    } else {
      paymentPlan = { kind: "NONE" };
    }

    const input: CreateEnrollmentInput = {
      studentId,
      packageId,
      classroomId,
      payerParentId,
      source,
      status,
      startsAt,
      endsAt,
      listPriceKurus,
      discountKurus,
      billingPeriodLabel,
      notes,
      paymentPlan,
      odkAccessTagIds,
      actorUserId: ctx.userId,
    };

    const result = await createStudentEnrollmentWithPaymentPlan(input);

    revalidatePath("/panel/admin/kayitlar");
    revalidatePath("/panel/admin/odemeler/vadeler");
    revalidatePath(`/panel/admin/ogrenciler/${studentId}`);
    revalidatePath(`/panel/admin/ogrenciler/${studentId}/duzenle`);
    if (result.payerParentId) {
      revalidatePath(`/panel/admin/veliler/${result.payerParentId}/duzenle`);
      revalidatePath("/panel/veli/odemeler");
    }

    return { status: "ok", result, studentId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: "error", error: message };
  }
}

// ─── Lightweight lifecycle actions on enrollment rows ─────────────────────────

/**
 * Status transition policy (Phase 3 / Session 6):
 *
 *   ACTIVE     → PAUSED, COMPLETED, CANCELLED
 *   TRIAL      → ACTIVE, PAUSED, CANCELLED
 *   LEAD       → ACTIVE, TRIAL, CANCELLED
 *   PAUSED     → ACTIVE, COMPLETED, CANCELLED
 *   COMPLETED  → ACTIVE          (re-open with audit; admin override)
 *   CANCELLED  → ACTIVE          (re-open with audit; admin override)
 *
 * Status changes NEVER touch PaymentScheduleItem rows or AccountingEntry.
 */
const ALLOWED_TRANSITIONS: Record<EnrollmentStatus, EnrollmentStatus[]> = {
  ACTIVE: ["PAUSED", "COMPLETED", "CANCELLED"],
  TRIAL: ["ACTIVE", "PAUSED", "CANCELLED"],
  LEAD: ["ACTIVE", "TRIAL", "CANCELLED"],
  PAUSED: ["ACTIVE", "COMPLETED", "CANCELLED"],
  COMPLETED: ["ACTIVE"],
  CANCELLED: ["ACTIVE"],
};

export async function updateEnrollmentStatusAction(
  enrollmentId: string,
  fd: FormData,
) {
  const ctx = await requirePanelRole("admin");
  const status = readStr(fd, "status") as EnrollmentStatus;
  if (!VALID_STATUSES.includes(status)) throw new Error("Durum geçersiz");
  const before = await prisma.studentPackageEnrollment.findUnique({
    where: { id: enrollmentId },
    select: { id: true, studentId: true, status: true },
  });
  if (!before) throw new Error("Kayıt bulunamadı");
  if (before.status === status) {
    // No-op — caller likely double-clicked; keep idempotent.
    return;
  }
  const allowed = ALLOWED_TRANSITIONS[before.status] ?? [];
  if (!allowed.includes(status)) {
    throw new Error(
      `Geçersiz durum geçişi: ${before.status} → ${status}. İzin verilen: ${allowed.join(", ") || "—"}`,
    );
  }
  await prisma.studentPackageEnrollment.update({
    where: { id: enrollmentId },
    data: { status },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "StudentPackageEnrollment",
    entityId: enrollmentId,
    action: "ENROLLMENT_STATUS_UPDATE",
    payload: { from: before.status, to: status },
  });
  revalidatePath("/panel/admin/kayitlar");
  revalidatePath(`/panel/admin/kayitlar/${enrollmentId}`);
  revalidatePath(`/panel/admin/ogrenciler/${before.studentId}`);
}

export async function updateEnrollmentDatesAction(
  enrollmentId: string,
  fd: FormData,
) {
  const ctx = await requirePanelRole("admin");
  const startsAtStr = readStr(fd, "startsAt");
  const endsAtStr = readStr(fd, "endsAt");
  const startsAt = parseDate(startsAtStr);
  const endsAt = endsAtStr ? parseDate(endsAtStr) : null;
  if (!startsAt) throw new Error("Başlangıç tarihi geçersiz");
  if (endsAtStr && !endsAt) throw new Error("Bitiş tarihi geçersiz");
  if (endsAt && endsAt.getTime() < startsAt.getTime()) {
    throw new Error("Bitiş tarihi başlangıçtan önce olamaz");
  }
  const before = await prisma.studentPackageEnrollment.findUnique({
    where: { id: enrollmentId },
    select: { id: true, studentId: true, startsAt: true, endsAt: true },
  });
  if (!before) throw new Error("Kayıt bulunamadı");
  await prisma.studentPackageEnrollment.update({
    where: { id: enrollmentId },
    data: { startsAt, endsAt },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "StudentPackageEnrollment",
    entityId: enrollmentId,
    action: "ENROLLMENT_DATES_UPDATE",
    payload: {
      from: { startsAt: before.startsAt, endsAt: before.endsAt },
      to: { startsAt, endsAt },
    },
  });
  revalidatePath(`/panel/admin/kayitlar/${enrollmentId}`);
  revalidatePath(`/panel/admin/ogrenciler/${before.studentId}`);
}

export async function updateEnrollmentNoteAction(
  enrollmentId: string,
  fd: FormData,
) {
  const ctx = await requirePanelRole("admin");
  const billingPeriodLabel = readStr(fd, "billingPeriodLabel") || null;
  const notes = readStr(fd, "notes") || null;
  const before = await prisma.studentPackageEnrollment.findUnique({
    where: { id: enrollmentId },
    select: { id: true, studentId: true },
  });
  if (!before) throw new Error("Kayıt bulunamadı");
  await prisma.studentPackageEnrollment.update({
    where: { id: enrollmentId },
    data: { billingPeriodLabel, notes },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "StudentPackageEnrollment",
    entityId: enrollmentId,
    action: "ENROLLMENT_NOTE_UPDATE",
    payload: { billingPeriodLabel, notesLength: notes?.length ?? 0 },
  });
  revalidatePath(`/panel/admin/kayitlar/${enrollmentId}`);
  revalidatePath(`/panel/admin/ogrenciler/${before.studentId}`);
}

export async function pauseEnrollmentAction(enrollmentId: string) {
  const fd = new FormData();
  fd.set("status", "PAUSED");
  await updateEnrollmentStatusAction(enrollmentId, fd);
}

export async function resumeEnrollmentAction(enrollmentId: string) {
  const fd = new FormData();
  fd.set("status", "ACTIVE");
  await updateEnrollmentStatusAction(enrollmentId, fd);
}

export async function completeEnrollmentAction(enrollmentId: string) {
  const fd = new FormData();
  fd.set("status", "COMPLETED");
  await updateEnrollmentStatusAction(enrollmentId, fd);
}

export async function cancelEnrollmentAction(enrollmentId: string) {
  const fd = new FormData();
  fd.set("status", "CANCELLED");
  await updateEnrollmentStatusAction(enrollmentId, fd);
}

export async function navigateToStudentDetailAction(studentId: string) {
  await requirePanelRole("admin");
  redirect(`/panel/admin/ogrenciler/${studentId}`);
}
