"use server";
/**
 * Phase 2 / Session 11 — Teacher Payroll / Finance Hub
 * Admin-only server actions. Parents/teachers never invoke these.
 *
 * Actions:
 *   - createCompensationRuleAction
 *   - updateCompensationRuleAction
 *   - toggleCompensationRuleActiveAction
 *   - deleteCompensationRuleAction
 *   - createPayrollPeriodAction
 *   - generatePayrollPeriodItemsAction   (idempotent on (period, teacher, lesson))
 *   - approvePayrollItemAction
 *   - excludePayrollItemAction
 *   - adjustPayrollItemAction
 *   - markPayrollItemPaidAction          (optional AccountingEntry expense)
 *   - lockPayrollPeriodAction
 *   - markPayrollPeriodPaidAction
 *   - cancelPayrollPeriodAction
 *
 * All actions are admin-only and audit-logged. AccountingEntry inserts
 * are explicit (`writeAccounting=1` form flag); historical entries are
 * never modified.
 */
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { getTeacherUserId, notifyUser } from "@/lib/notifications";
import { enforceMutation } from "@/lib/security/mutation-guard";
import {
  getEligibleLessonsForPayroll,
  getPayrollRateForLesson,
  calculateLessonPayout,
} from "@/lib/panel/teacher-payroll";

function formatTRYKurus(kurus: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(kurus / 100);
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function parseAmountToKurus(input: string): number | null {
  const cleaned = input.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function parseDateOrNull(input: string): Date | null {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

const HUB_PATH = "/panel/admin/ogretmen-hakedisleri";

// ─────────────────────────────────────────────────────────────────────────
// Compensation rules
// ─────────────────────────────────────────────────────────────────────────

export async function createCompensationRuleAction(fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const teacherId = readStr(fd, "teacherId");
  if (!teacherId) throw new Error("Öğretmen zorunlu");
  const hourlyRate = parseAmountToKurus(readStr(fd, "hourlyRate"));
  if (hourlyRate === null || hourlyRate <= 0)
    throw new Error("Saatlik ücret pozitif olmalı");
  const courseId = readStr(fd, "courseId") || null;
  const classroomId = readStr(fd, "classroomId") || null;
  const startsAt = parseDateOrNull(readStr(fd, "startsAt"));
  const endsAt = parseDateOrNull(readStr(fd, "endsAt"));
  if (startsAt && endsAt && startsAt.getTime() > endsAt.getTime()) {
    throw new Error("Başlangıç tarihi bitiş tarihinden sonra olamaz");
  }
  const isActive = fd.get("isActive") !== "0";
  const note = readStr(fd, "note") || null;

  const created = await prisma.teacherCompensationRule.create({
    data: {
      teacherId,
      courseId,
      classroomId,
      hourlyRate,
      isActive,
      startsAt,
      endsAt,
      note,
      createdById: ctx.userId,
    },
    select: { id: true },
  });

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "TeacherCompensationRule",
    entityId: created.id,
    action: "PAYROLL_RULE_CREATE",
    payload: { teacherId, hourlyRate, courseId, classroomId, isActive },
  });

  revalidatePath(`${HUB_PATH}/kurallar`);
}

export async function updateCompensationRuleAction(id: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const hourlyRate = parseAmountToKurus(readStr(fd, "hourlyRate"));
  if (hourlyRate === null || hourlyRate <= 0)
    throw new Error("Saatlik ücret pozitif olmalı");
  const startsAt = parseDateOrNull(readStr(fd, "startsAt"));
  const endsAt = parseDateOrNull(readStr(fd, "endsAt"));
  if (startsAt && endsAt && startsAt.getTime() > endsAt.getTime()) {
    throw new Error("Başlangıç tarihi bitiş tarihinden sonra olamaz");
  }
  const updated = await prisma.teacherCompensationRule.update({
    where: { id },
    data: {
      hourlyRate,
      startsAt,
      endsAt,
      isActive: fd.get("isActive") !== "0",
      note: readStr(fd, "note") || null,
    },
    select: { id: true, teacherId: true, hourlyRate: true, isActive: true },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "TeacherCompensationRule",
    entityId: updated.id,
    action: "PAYROLL_RULE_UPDATE",
    payload: updated,
  });
  revalidatePath(`${HUB_PATH}/kurallar`);
}

export async function toggleCompensationRuleActiveAction(id: string) {
  const ctx = await requirePanelRole("admin");
  const rule = await prisma.teacherCompensationRule.findUnique({
    where: { id },
    select: { isActive: true },
  });
  if (!rule) throw new Error("Kural bulunamadı");
  await prisma.teacherCompensationRule.update({
    where: { id },
    data: { isActive: !rule.isActive },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "TeacherCompensationRule",
    entityId: id,
    action: rule.isActive ? "PAYROLL_RULE_DEACTIVATE" : "PAYROLL_RULE_ACTIVATE",
  });
  revalidatePath(`${HUB_PATH}/kurallar`);
}

export async function deleteCompensationRuleAction(id: string) {
  const ctx = await requirePanelRole("admin");
  // If the rule is referenced by payroll items, soft-deactivate instead of
  // a destructive delete to preserve audit trail.
  const used = await prisma.teacherPayrollItem.count({
    where: { compensationRuleId: id },
  });
  if (used > 0) {
    await prisma.teacherCompensationRule.update({
      where: { id },
      data: { isActive: false },
    });
    await logAudit({
      actorUserId: ctx.userId,
      entityType: "TeacherCompensationRule",
      entityId: id,
      action: "PAYROLL_RULE_DEACTIVATE",
      payload: { reason: "delete-requested but rule is referenced", refCount: used },
    });
  } else {
    await prisma.teacherCompensationRule.delete({ where: { id } });
    await logAudit({
      actorUserId: ctx.userId,
      entityType: "TeacherCompensationRule",
      entityId: id,
      action: "PAYROLL_RULE_DELETE",
    });
  }
  revalidatePath(`${HUB_PATH}/kurallar`);
}

// ─────────────────────────────────────────────────────────────────────────
// Payroll periods
// ─────────────────────────────────────────────────────────────────────────

export async function createPayrollPeriodAction(fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const title = readStr(fd, "title");
  const startsAt = parseDateOrNull(readStr(fd, "startsAt"));
  const endsAt = parseDateOrNull(readStr(fd, "endsAt"));
  if (!title) throw new Error("Başlık zorunlu");
  if (!startsAt || !endsAt) throw new Error("Tarih aralığı zorunlu");
  if (startsAt.getTime() >= endsAt.getTime())
    throw new Error("Başlangıç tarihi bitişten önce olmalı");

  const created = await prisma.teacherPayrollPeriod.create({
    data: {
      title,
      startsAt,
      endsAt,
      note: readStr(fd, "note") || null,
      createdById: ctx.userId,
    },
    select: { id: true },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "TeacherPayrollPeriod",
    entityId: created.id,
    action: "PAYROLL_PERIOD_CREATE",
    payload: { title, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() },
  });
  revalidatePath(HUB_PATH);
}

/**
 * Idempotent generation of DRAFT payroll items for a period.
 * - Fetch eligible lessons in the period range.
 * - For each lesson, resolve compensation rule and compute payout.
 * - Upsert one item per (period, teacher, lesson). LOCKED/PAID period
 *   refuses regeneration; PAID/EXCLUDED items are NEVER overwritten.
 */
export async function generatePayrollPeriodItemsAction(periodId: string) {
  const ctx = await requirePanelRole("admin");

  const period = await prisma.teacherPayrollPeriod.findUnique({
    where: { id: periodId },
  });
  if (!period) throw new Error("Dönem bulunamadı");
  if (period.status === "LOCKED" || period.status === "PAID") {
    throw new Error("Kilitli/ödenmiş dönem yeniden üretilemez");
  }
  if (period.status === "CANCELLED") {
    throw new Error("İptal edilmiş dönem yeniden üretilemez");
  }

  const [lessons, rules] = await Promise.all([
    getEligibleLessonsForPayroll({
      startsAt: period.startsAt,
      endsAt: period.endsAt,
    }),
    prisma.teacherCompensationRule.findMany({
      where: { isActive: true },
      select: {
        id: true,
        teacherId: true,
        courseId: true,
        classroomId: true,
        hourlyRate: true,
        isActive: true,
        startsAt: true,
        endsAt: true,
      },
    }),
  ]);

  let upserted = 0;
  let skippedLocked = 0;

  for (const lesson of lessons) {
    const rate = getPayrollRateForLesson(
      {
        teacherId: lesson.teacherId,
        courseId: lesson.courseId,
        classroomId: lesson.classroomId,
        scheduledAt: lesson.scheduledAt,
      },
      rules,
    );
    const calc = calculateLessonPayout(
      {
        id: lesson.id,
        teacherId: lesson.teacherId,
        durationMinutes: lesson.durationMinutes,
        attendanceCount: lesson.attendanceCount,
        status: lesson.status,
      },
      rate,
    );

    // Look up existing item for this (period, teacher, lesson).
    const existing = await prisma.teacherPayrollItem.findFirst({
      where: { periodId, teacherId: lesson.teacherId, lessonId: lesson.id },
      select: { id: true, status: true, adjustmentAmount: true },
    });

    if (existing) {
      // Never overwrite PAID or EXCLUDED items.
      if (existing.status === "PAID" || existing.status === "EXCLUDED") {
        skippedLocked += 1;
        continue;
      }
      const finalAmount = calc.grossAmountKurus + existing.adjustmentAmount;
      await prisma.teacherPayrollItem.update({
        where: { id: existing.id },
        data: {
          minutes: calc.minutes,
          hourlyRate: calc.hourlyRateKurus,
          grossAmount: calc.grossAmountKurus,
          finalAmount,
          rateMissing: calc.rateMissing,
          attendanceMissing: calc.attendanceMissing,
          compensationRuleId: calc.ruleId,
          // status untouched (DRAFT/REVIEWED/APPROVED retained)
        },
      });
      upserted += 1;
    } else {
      await prisma.teacherPayrollItem.create({
        data: {
          periodId,
          teacherId: lesson.teacherId,
          lessonId: lesson.id,
          compensationRuleId: calc.ruleId,
          minutes: calc.minutes,
          hourlyRate: calc.hourlyRateKurus,
          grossAmount: calc.grossAmountKurus,
          finalAmount: calc.grossAmountKurus,
          adjustmentAmount: 0,
          rateMissing: calc.rateMissing,
          attendanceMissing: calc.attendanceMissing,
          createdById: ctx.userId,
        },
      });
      upserted += 1;
    }
  }

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "TeacherPayrollPeriod",
    entityId: periodId,
    action: "PAYROLL_PERIOD_GENERATE",
    payload: {
      lessonCount: lessons.length,
      upserted,
      skippedLocked,
    },
  });

  revalidatePath(HUB_PATH);
  revalidatePath(`${HUB_PATH}/${periodId}`);
}

export async function lockPayrollPeriodAction(id: string) {
  const ctx = await requirePanelRole("admin");
  const period = await prisma.teacherPayrollPeriod.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!period) throw new Error("Dönem bulunamadı");
  if (period.status === "PAID" || period.status === "CANCELLED") {
    throw new Error("Bu dönem kilitlenemez");
  }
  await prisma.teacherPayrollPeriod.update({
    where: { id },
    data: { status: "LOCKED", lockedAt: new Date() },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "TeacherPayrollPeriod",
    entityId: id,
    action: "PAYROLL_PERIOD_LOCK",
  });
  revalidatePath(HUB_PATH);
  revalidatePath(`${HUB_PATH}/${id}`);
}

export async function markPayrollPeriodPaidAction(id: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  // Phase 2 / Session 17 — abuse hardening.
  await enforceMutation({
    action: "payroll.mark-paid",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 60, windowMs: 60 * 60_000 },
  });
  const writeAccounting = fd.get("writeAccounting") === "1";

  const period = await prisma.teacherPayrollPeriod.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!period) throw new Error("Dönem bulunamadı");
  if (period.status === "PAID") return;
  if (period.status === "CANCELLED")
    throw new Error("İptal edilmiş dönem ödenmiş olarak işaretlenemez");

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    // Mark APPROVED items as PAID; DRAFT/REVIEWED stay as-is.
    for (const it of period.items) {
      if (it.status !== "APPROVED") continue;
      let accountingEntryId: string | null = it.accountingEntryId ?? null;
      if (writeAccounting && !accountingEntryId && it.finalAmount > 0 && !it.rateMissing) {
        const entry = await tx.accountingEntry.create({
          data: {
            service: "OD",
            type: "EXPENSE",
            category: "TEACHER_PAYROLL",
            amount: it.finalAmount,
            occurredAt: now,
            description: `Bordro: ${period.title}`,
            refType: "TeacherPayrollItem",
            refId: it.id,
            teacherId: it.teacherId,
            createdById: ctx.userId,
          },
          select: { id: true },
        });
        accountingEntryId = entry.id;
      }
      await tx.teacherPayrollItem.update({
        where: { id: it.id },
        data: { status: "PAID", accountingEntryId },
      });
    }
    await tx.teacherPayrollPeriod.update({
      where: { id },
      data: { status: "PAID", paidAt: now },
    });
  });

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "TeacherPayrollPeriod",
    entityId: id,
    action: "PAYROLL_PERIOD_MARK_PAID",
    payload: { writeAccounting, itemCount: period.items.length },
  });

  // Phase 2 / Session 16 — best-effort teacher notifications. Each teacher
  // receives one summary message per period (sum of THEIR own PAID items).
  // We never expose other teachers' totals.
  try {
    const paidByTeacher = new Map<string, number>();
    for (const it of period.items) {
      if (it.status !== "APPROVED" && it.status !== "PAID") continue;
      const total = paidByTeacher.get(it.teacherId) ?? 0;
      paidByTeacher.set(it.teacherId, total + it.finalAmount);
    }
    for (const [teacherId, total] of paidByTeacher.entries()) {
      const userId = await getTeacherUserId(teacherId);
      if (!userId) continue;
      await notifyUser({
        userId,
        title: "Hakediş ödemeniz yapıldı",
        body: `${period.title}: ${formatTRYKurus(total)} hakedişiniz ödenmiş olarak işaretlendi.`,
        href: "/panel/ogretmen/hakedislerim",
        type: "PAYMENT",
        priority: "NORMAL",
        category: "FINANCE",
        inboxPriority: "NORMAL",
        createdById: ctx.userId,
        relatedEntityType: "TeacherPayrollPeriod",
        relatedEntityId: id,
      });
    }
  } catch (err) {
    console.warn("[markPayrollPeriodPaidAction] notify failed", err);
  }

  revalidatePath(HUB_PATH);
  revalidatePath(`${HUB_PATH}/${id}`);
}

export async function cancelPayrollPeriodAction(id: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  await enforceMutation({
    action: "payroll.cancel",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 60, windowMs: 60 * 60_000 },
  });
  const reason = readStr(fd, "reason") || null;
  const period = await prisma.teacherPayrollPeriod.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!period) throw new Error("Dönem bulunamadı");
  if (period.status === "PAID")
    throw new Error("Ödenmiş dönem iptal edilemez");
  await prisma.teacherPayrollPeriod.update({
    where: { id },
    data: { status: "CANCELLED", note: reason ?? undefined },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "TeacherPayrollPeriod",
    entityId: id,
    action: "PAYROLL_PERIOD_CANCEL",
    payload: { reason },
  });
  revalidatePath(HUB_PATH);
  revalidatePath(`${HUB_PATH}/${id}`);
}

// ─────────────────────────────────────────────────────────────────────────
// Payroll item review actions
// ─────────────────────────────────────────────────────────────────────────

async function assertItemMutable(id: string): Promise<{ periodId: string }> {
  const item = await prisma.teacherPayrollItem.findUnique({
    where: { id },
    select: {
      periodId: true,
      status: true,
      period: { select: { status: true } },
    },
  });
  if (!item) throw new Error("Hakediş satırı bulunamadı");
  if (item.period.status === "PAID")
    throw new Error("Ödenmiş dönem satırları değiştirilemez");
  if (item.status === "PAID")
    throw new Error("Ödenmiş satır değiştirilemez");
  return { periodId: item.periodId };
}

export async function approvePayrollItemAction(id: string) {
  const ctx = await requirePanelRole("admin");
  const { periodId } = await assertItemMutable(id);
  const item = await prisma.teacherPayrollItem.findUnique({
    where: { id },
    select: { rateMissing: true, finalAmount: true },
  });
  if (!item) throw new Error("Satır bulunamadı");
  if (item.rateMissing)
    throw new Error("Saatlik ücret tanımlı olmayan satır onaylanamaz");
  await prisma.teacherPayrollItem.update({
    where: { id },
    data: { status: "APPROVED" },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "TeacherPayrollItem",
    entityId: id,
    action: "PAYROLL_ITEM_APPROVE",
    payload: { finalAmount: item.finalAmount },
  });
  revalidatePath(`${HUB_PATH}/${periodId}`);
}

export async function reviewPayrollItemAction(id: string) {
  const ctx = await requirePanelRole("admin");
  const { periodId } = await assertItemMutable(id);
  await prisma.teacherPayrollItem.update({
    where: { id },
    data: { status: "REVIEWED" },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "TeacherPayrollItem",
    entityId: id,
    action: "PAYROLL_ITEM_REVIEW",
  });
  revalidatePath(`${HUB_PATH}/${periodId}`);
}

export async function excludePayrollItemAction(id: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const reason = readStr(fd, "reason") || null;
  const { periodId } = await assertItemMutable(id);
  await prisma.teacherPayrollItem.update({
    where: { id },
    data: {
      status: "EXCLUDED",
      note: reason ?? undefined,
    },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "TeacherPayrollItem",
    entityId: id,
    action: "PAYROLL_ITEM_EXCLUDE",
    payload: { reason },
  });
  revalidatePath(`${HUB_PATH}/${periodId}`);
}

export async function adjustPayrollItemAction(id: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const adjustmentTRY = readStr(fd, "adjustment");
  const adjustment = parseAmountToKurus(adjustmentTRY);
  if (adjustment === null) throw new Error("Düzeltme tutarı geçersiz");
  const { periodId } = await assertItemMutable(id);
  const item = await prisma.teacherPayrollItem.findUnique({
    where: { id },
    select: { grossAmount: true },
  });
  if (!item) throw new Error("Satır bulunamadı");
  const finalAmount = item.grossAmount + adjustment;
  await prisma.teacherPayrollItem.update({
    where: { id },
    data: {
      adjustmentAmount: adjustment,
      finalAmount,
      note: readStr(fd, "note") || undefined,
    },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "TeacherPayrollItem",
    entityId: id,
    action: "PAYROLL_ITEM_ADJUST",
    payload: { adjustment, finalAmount },
  });
  revalidatePath(`${HUB_PATH}/${periodId}`);
}

export async function markPayrollItemPaidAction(id: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const writeAccounting = fd.get("writeAccounting") === "1";
  const item = await prisma.teacherPayrollItem.findUnique({
    where: { id },
    include: { period: { select: { title: true, status: true } } },
  });
  if (!item) throw new Error("Satır bulunamadı");
  if (item.status === "PAID") return; // idempotent
  if (item.status === "EXCLUDED")
    throw new Error("Hariç tutulan satır ödenemez");
  if (item.rateMissing)
    throw new Error("Saatlik ücret tanımlı olmayan satır ödenemez");
  if (item.period.status === "CANCELLED")
    throw new Error("İptal edilmiş dönem satırı ödenemez");

  const now = new Date();
  let accountingEntryId: string | null = item.accountingEntryId ?? null;
  if (writeAccounting && !accountingEntryId && item.finalAmount > 0) {
    const entry = await prisma.accountingEntry.create({
      data: {
        service: "OD",
        type: "EXPENSE",
        category: "TEACHER_PAYROLL",
        amount: item.finalAmount,
        occurredAt: now,
        description: `Bordro: ${item.period.title}`,
        refType: "TeacherPayrollItem",
        refId: item.id,
        teacherId: item.teacherId,
        createdById: ctx.userId,
      },
      select: { id: true },
    });
    accountingEntryId = entry.id;
  }

  await prisma.teacherPayrollItem.update({
    where: { id },
    data: { status: "PAID", accountingEntryId },
  });

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "TeacherPayrollItem",
    entityId: id,
    action: "PAYROLL_ITEM_MARK_PAID",
    payload: {
      finalAmount: item.finalAmount,
      writeAccounting,
      accountingEntryId,
    },
  });

  // Phase 2 / Session 16 — best-effort teacher notification (only own row).
  try {
    const userId = await getTeacherUserId(item.teacherId);
    if (userId) {
      await notifyUser({
        userId,
        title: "Hakediş ödemeniz yapıldı",
        body: `${item.period.title}: ${formatTRYKurus(item.finalAmount)} hakedişiniz ödenmiş olarak işaretlendi.`,
        href: "/panel/ogretmen/hakedislerim",
        type: "PAYMENT",
        priority: "NORMAL",
        category: "FINANCE",
        inboxPriority: "NORMAL",
        createdById: ctx.userId,
        relatedEntityType: "TeacherPayrollItem",
        relatedEntityId: id,
      });
    }
  } catch (err) {
    console.warn("[markPayrollItemPaidAction] notify failed", err);
  }

  revalidatePath(`${HUB_PATH}/${item.periodId}`);
}
