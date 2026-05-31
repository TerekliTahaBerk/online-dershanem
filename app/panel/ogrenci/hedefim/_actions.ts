"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/panel-student";
import { logAudit } from "@/lib/audit";

/**
 * Student-only academic goal CRUD.
 *
 * Single active goal at a time: when the student creates or updates the
 * goal, all other rows for the same `studentId` are flipped to
 * `isActive=false`. We keep historical rows (no DELETE) so trend / audit
 * surfaces stay intact.
 *
 * Permission boundary: requireStudent() — the action ALWAYS uses the
 * authenticated student's id. The form has no studentId field; tampering
 * is structurally impossible.
 */

const EXAM_TYPES = ["TYT", "AYT", "LGS", "YKS", "OTHER"] as const;

const GoalSchema = z.object({
  examType: z.enum(EXAM_TYPES).optional().or(z.literal("")),
  targetUniversity: z.string().trim().max(160).optional().or(z.literal("")),
  targetDepartment: z.string().trim().max(160).optional().or(z.literal("")),
  targetSchool: z.string().trim().max(160).optional().or(z.literal("")),
  targetScore: z.string().trim().max(16).optional().or(z.literal("")),
  targetNet: z.string().trim().max(16).optional().or(z.literal("")),
  targetRank: z.string().trim().max(16).optional().or(z.literal("")),
  targetDate: z.string().trim().max(32).optional().or(z.literal("")),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
});

type ActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function fd(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" ? v : undefined;
}

function parseDecimal(raw: string | undefined): number | null | "invalid" {
  if (!raw || raw.trim() === "") return null;
  const cleaned = raw.replace(",", ".").trim();
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return "invalid";
  return num;
}

function parseInteger(raw: string | undefined): number | null | "invalid" {
  if (!raw || raw.trim() === "") return null;
  const num = Number(raw.trim());
  if (!Number.isFinite(num) || !Number.isInteger(num) || num < 0) {
    return "invalid";
  }
  return num;
}

function parseDateOnly(raw: string | undefined): Date | null | "invalid" {
  if (!raw || raw.trim() === "") return null;
  // Expect YYYY-MM-DD from <input type="date">
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "invalid";
  return d;
}

export async function createOrUpdateStudentGoalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { ctx, student } = await requireStudent();
  if (!student) {
    return {
      ok: false,
      error: "Öğrenci profili bulunamadı.",
    };
  }

  const parsed = GoalSchema.safeParse({
    examType: fd(formData, "examType") ?? "",
    targetUniversity: fd(formData, "targetUniversity") ?? "",
    targetDepartment: fd(formData, "targetDepartment") ?? "",
    targetSchool: fd(formData, "targetSchool") ?? "",
    targetScore: fd(formData, "targetScore") ?? "",
    targetNet: fd(formData, "targetNet") ?? "",
    targetRank: fd(formData, "targetRank") ?? "",
    targetDate: fd(formData, "targetDate") ?? "",
    note: fd(formData, "note") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0] ?? "_");
      if (!fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { ok: false, error: "Form geçerli değil.", fieldErrors };
  }
  const data = parsed.data;

  const targetScore = parseDecimal(data.targetScore || "");
  const targetNet = parseDecimal(data.targetNet || "");
  const targetRank = parseInteger(data.targetRank || "");
  const targetDate = parseDateOnly(data.targetDate || "");

  const fieldErrors: Record<string, string> = {};
  if (targetScore === "invalid") fieldErrors.targetScore = "Sayısal değer girin.";
  if (targetNet === "invalid") fieldErrors.targetNet = "Sayısal değer girin.";
  if (targetRank === "invalid") fieldErrors.targetRank = "Pozitif tam sayı girin.";
  if (targetDate === "invalid") fieldErrors.targetDate = "Geçerli bir tarih girin.";
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Form geçerli değil.", fieldErrors };
  }

  const examType = data.examType ? data.examType : null;
  const targetUniversity = (data.targetUniversity || "").trim() || null;
  const targetDepartment = (data.targetDepartment || "").trim() || null;
  const targetSchool = (data.targetSchool || "").trim() || null;
  const note = (data.note || "").trim() || null;

  // Require at least one meaningful target field.
  const hasAnyTarget = !!(
    examType ||
    targetUniversity ||
    targetDepartment ||
    targetSchool ||
    targetScore !== null ||
    targetNet !== null ||
    targetRank !== null ||
    targetDate !== null ||
    note
  );
  if (!hasAnyTarget) {
    return {
      ok: false,
      error: "En az bir hedef alanı doldurmalısın.",
    };
  }

  const dataWrite = {
    studentId: student.id,
    examType: examType as
      | "TYT"
      | "AYT"
      | "LGS"
      | "YKS"
      | "OTHER"
      | null,
    targetUniversity,
    targetDepartment,
    targetSchool,
    targetScore: targetScore as number | null,
    targetNet: targetNet as number | null,
    targetRank: targetRank as number | null,
    targetDate: targetDate as Date | null,
    note,
    isActive: true,
    createdById: ctx.userId,
  };

  // Single-active-goal invariant: deactivate any other ACTIVE row first,
  // then upsert. We don't carry an `id`; the form is intent-driven (latest
  // active wins). This keeps the form simple and the DB consistent.
  const existing = await prisma.studentAcademicGoal.findFirst({
    where: { studentId: student.id, isActive: true },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  let goalId: string;
  if (existing) {
    await prisma.studentAcademicGoal.update({
      where: { id: existing.id },
      data: {
        examType: dataWrite.examType,
        targetUniversity: dataWrite.targetUniversity,
        targetDepartment: dataWrite.targetDepartment,
        targetSchool: dataWrite.targetSchool,
        targetScore: dataWrite.targetScore,
        targetNet: dataWrite.targetNet,
        targetRank: dataWrite.targetRank,
        targetDate: dataWrite.targetDate,
        note: dataWrite.note,
        isActive: true,
      },
    });
    goalId = existing.id;
  } else {
    // Also deactivate any historical inactive duplicates is unnecessary;
    // they are already inactive.
    const created = await prisma.studentAcademicGoal.create({
      data: dataWrite,
      select: { id: true },
    });
    goalId = created.id;
  }

  // Make sure no other active rows exist (paranoid safety).
  await prisma.studentAcademicGoal.updateMany({
    where: {
      studentId: student.id,
      isActive: true,
      NOT: { id: goalId },
    },
    data: { isActive: false },
  });

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "StudentAcademicGoal",
    entityId: goalId,
    action: existing ? "ACADEMIC_GOAL_UPDATE" : "ACADEMIC_GOAL_CREATE",
    summary: targetUniversity ?? targetSchool ?? targetDepartment ?? null,
    payload: {
      examType: dataWrite.examType,
      targetNet: dataWrite.targetNet,
      targetScore: dataWrite.targetScore,
      targetRank: dataWrite.targetRank,
    },
  });

  revalidatePath("/panel/ogrenci/hedefim");
  revalidatePath("/panel/ogrenci");
  redirect("/panel/ogrenci/hedefim?ok=1");
}

const ClearSchema = z.object({ id: z.string().min(1) });

export async function clearStudentGoalAction(formData: FormData): Promise<void> {
  const { ctx, student } = await requireStudent();
  if (!student) return;
  const parsed = ClearSchema.safeParse({ id: fd(formData, "id") });
  if (!parsed.success) return;

  // Hard ownership check before flipping inactive.
  const target = await prisma.studentAcademicGoal.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, studentId: true },
  });
  if (!target || target.studentId !== student.id) return;

  await prisma.studentAcademicGoal.update({
    where: { id: target.id },
    data: { isActive: false },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "StudentAcademicGoal",
    entityId: target.id,
    action: "ACADEMIC_GOAL_CLEAR",
  });
  revalidatePath("/panel/ogrenci/hedefim");
  revalidatePath("/panel/ogrenci");
}
