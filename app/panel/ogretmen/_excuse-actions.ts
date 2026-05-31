"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/panel-teacher";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";
import {
  applyApprovedExcuseToAttendance,
  canTeacherReviewExcuse,
} from "@/lib/panel/absence-excuses";

/**
 * Teacher review actions for AbsenceExcuse.
 *
 * Permission: requireTeacher() + canTeacherReviewExcuse(teacherId, excuseId).
 * Status guard: only PENDING rows can be transitioned to APPROVED / REJECTED.
 *
 * On APPROVE we ALSO touch Attendance via applyApprovedExcuseToAttendance:
 *   - missing row → create EXCUSED (source=MANUAL, recordedById=reviewer userId)
 *   - existing ABSENT → upgrade to EXCUSED
 *   - PRESENT/LATE/LEFT_EARLY/already-EXCUSED → leave alone (manual readings sacred)
 */

const ReviewSchema = z.object({
  id: z.string().min(1),
  reviewNote: z.string().trim().max(2000).optional().or(z.literal("")),
});

function fd(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" ? v : undefined;
}

async function notifyParent(opts: {
  excuseId: string;
  parentUserId: string | null;
  approverUserId: string | null;
  approved: boolean;
  studentName: string;
  reviewNote: string | null;
}) {
  if (!opts.parentUserId) return;
  try {
    await notifyUser({
      userId: opts.parentUserId,
      title: opts.approved ? "Mazeretiniz onaylandı" : "Mazeretiniz reddedildi",
      body: opts.approved
        ? `${opts.studentName} için ilettiğiniz mazeret onaylandı.`
        : `${opts.studentName} için ilettiğiniz mazeret reddedildi.${
            opts.reviewNote ? ` Not: ${opts.reviewNote}` : ""
          }`,
      href: "/panel/veli/mazeret",
      type: "ANNOUNCEMENT",
      category: "ATTENDANCE",
      relatedEntityType: "AbsenceExcuse",
      relatedEntityId: opts.excuseId,
      createdById: opts.approverUserId,
    });
  } catch (err) {
    console.warn("[excuse:review] notify parent failed", err);
  }
}

export async function approveAbsenceExcuseAction(formData: FormData): Promise<void> {
  const { ctx, teacher } = await requireTeacher();
  if (!teacher) return;

  const parsed = ReviewSchema.safeParse({
    id: fd(formData, "id"),
    reviewNote: fd(formData, "reviewNote") ?? "",
  });
  if (!parsed.success) return;

  const allowed = await canTeacherReviewExcuse(teacher.id, parsed.data.id);
  if (!allowed) return;

  const current = await prisma.absenceExcuse.findUnique({
    where: { id: parsed.data.id },
    select: {
      id: true,
      status: true,
      studentId: true,
      startsAt: true,
      endsAt: true,
      reason: true,
      parent: { select: { userId: true } },
      student: { select: { fullName: true } },
    },
  });
  if (!current || current.status !== "PENDING") return;

  const reviewNote = (parsed.data.reviewNote ?? "").trim() || null;

  await prisma.absenceExcuse.update({
    where: { id: current.id },
    data: {
      status: "APPROVED",
      reviewedById: ctx.userId,
      reviewedAt: new Date(),
      reviewNote,
    },
  });

  // Attendance side-effect — non-throwing on partial failures
  let counts = { created: 0, updated: 0, skipped: 0 };
  try {
    counts = await applyApprovedExcuseToAttendance({
      excuseId: current.id,
      studentId: current.studentId,
      startsAt: current.startsAt,
      endsAt: current.endsAt,
      reviewerUserId: ctx.userId,
      reason: current.reason,
    });
  } catch (err) {
    console.warn("[excuse:approve] attendance apply failed", err);
  }

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "AbsenceExcuse",
    entityId: current.id,
    action: "EXCUSE_APPROVE",
    summary: current.student?.fullName ?? null,
    payload: {
      reviewerRole: "teacher",
      teacherId: teacher.id,
      attendance: counts,
      reviewNote,
    },
  });

  await notifyParent({
    excuseId: current.id,
    parentUserId: current.parent?.userId ?? null,
    approverUserId: ctx.userId,
    approved: true,
    studentName: current.student?.fullName ?? "Öğrenci",
    reviewNote,
  });

  revalidatePath("/panel/ogretmen");
  revalidatePath("/panel/ogretmen/siniflarim");
  revalidatePath("/panel/veli/mazeret");
  revalidatePath("/panel/veli");
}

export async function rejectAbsenceExcuseAction(formData: FormData): Promise<void> {
  const { ctx, teacher } = await requireTeacher();
  if (!teacher) return;

  const parsed = ReviewSchema.safeParse({
    id: fd(formData, "id"),
    reviewNote: fd(formData, "reviewNote") ?? "",
  });
  if (!parsed.success) return;

  const allowed = await canTeacherReviewExcuse(teacher.id, parsed.data.id);
  if (!allowed) return;

  const current = await prisma.absenceExcuse.findUnique({
    where: { id: parsed.data.id },
    select: {
      id: true,
      status: true,
      parent: { select: { userId: true } },
      student: { select: { fullName: true } },
    },
  });
  if (!current || current.status !== "PENDING") return;

  const reviewNote = (parsed.data.reviewNote ?? "").trim() || null;

  await prisma.absenceExcuse.update({
    where: { id: current.id },
    data: {
      status: "REJECTED",
      reviewedById: ctx.userId,
      reviewedAt: new Date(),
      reviewNote,
    },
  });

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "AbsenceExcuse",
    entityId: current.id,
    action: "EXCUSE_REJECT",
    summary: current.student?.fullName ?? null,
    payload: { reviewerRole: "teacher", teacherId: teacher.id, reviewNote },
  });

  await notifyParent({
    excuseId: current.id,
    parentUserId: current.parent?.userId ?? null,
    approverUserId: ctx.userId,
    approved: false,
    studentName: current.student?.fullName ?? "Öğrenci",
    reviewNote,
  });

  revalidatePath("/panel/ogretmen");
  revalidatePath("/panel/ogretmen/siniflarim");
  revalidatePath("/panel/veli/mazeret");
}
