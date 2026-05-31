"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireParent } from "@/lib/panel-parent";
import {
  canParentSubmitExcuse,
} from "@/lib/panel/absence-excuses";
import { logAudit } from "@/lib/audit";
import { notifyUsers } from "@/lib/notifications";
import { guardMutation } from "@/lib/security/mutation-guard";

const REASONS = ["ILLNESS", "FAMILY", "TECHNICAL", "TRAVEL", "OTHER"] as const;

/** Maksimum mazeret aralığı — UX/anti-abuse: tek bir mazeret 14 günü aşamaz. */
const MAX_RANGE_DAYS = 14;

const CreateSchema = z
  .object({
    studentId: z.string().min(1, "Çocuk seçilmedi"),
    startsAt: z.string().min(1, "Başlangıç tarihi gerekli"),
    endsAt: z.string().min(1, "Bitiş tarihi gerekli"),
    reason: z.enum(REASONS),
    note: z.string().trim().max(1000).optional().or(z.literal("")),
    attachmentUrl: z.string().trim().url().max(2000).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const s = new Date(data.startsAt);
    const e = new Date(data.endsAt);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
      ctx.addIssue({ code: "custom", path: ["startsAt"], message: "Geçerli tarih girin" });
      return;
    }
    if (e.getTime() < s.getTime()) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Bitiş, başlangıçtan önce olamaz",
      });
    }
    const span = (e.getTime() - s.getTime()) / 86400000;
    if (span > MAX_RANGE_DAYS) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: `En fazla ${MAX_RANGE_DAYS} günlük mazeret bildirebilirsiniz`,
      });
    }
    if (data.reason === "OTHER" && !(data.note ?? "").trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["note"],
        message: "Diğer seçildiğinde açıklama zorunludur",
      });
    }
  });

export type CreateExcuseState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function fd(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" ? v : undefined;
}

export async function createAbsenceExcuseAction(
  _prev: CreateExcuseState,
  formData: FormData,
): Promise<CreateExcuseState> {
  const { ctx, parent } = await requireParent();
  if (!parent) return { ok: false, error: "Veli kaydı bulunamadı." };

  // Phase 2 / Session 17 — abuse hardening: per-parent rate-limit + same-origin.
  // 10 mazeret / 10 dakika — gerçek kullanım için bol, scripted floods için sıkı.
  const guard = await guardMutation({
    action: "absence-excuse.create",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 10, windowMs: 10 * 60_000 },
  });
  if (!guard.ok) return { ok: false, error: guard.message };

  const parsed = CreateSchema.safeParse({
    studentId: fd(formData, "studentId"),
    startsAt: fd(formData, "startsAt"),
    endsAt: fd(formData, "endsAt"),
    reason: fd(formData, "reason"),
    note: fd(formData, "note"),
    attachmentUrl: fd(formData, "attachmentUrl"),
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
  const isLinked = await canParentSubmitExcuse(parent.id, data.studentId);
  if (!isLinked) {
    return { ok: false, error: "Bu öğrenci hesabınıza bağlı değil." };
  }

  // End-date inclusive — mazeretin bitiş tarihi tüm günü kapsasın.
  const startsAt = new Date(`${data.startsAt}T00:00:00`);
  const endsAt = new Date(`${data.endsAt}T23:59:59`);

  const created = await prisma.absenceExcuse.create({
    data: {
      parentId: parent.id,
      studentId: data.studentId,
      startsAt,
      endsAt,
      reason: data.reason,
      note: (data.note ?? "").trim() || null,
      attachmentUrl: (data.attachmentUrl ?? "").trim() || null,
      status: "PENDING",
    },
    select: { id: true, studentId: true },
  });

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "AbsenceExcuse",
    entityId: created.id,
    action: "EXCUSE_CREATE",
    summary: `Veli mazeret bildirdi (${data.reason})`,
    payload: {
      studentId: data.studentId,
      startsAt,
      endsAt,
      reason: data.reason,
    },
  });

  // Notify the student's teacher(s) + admins (best effort).
  try {
    const recipients = await resolveExcuseReviewerUserIds(data.studentId);
    if (recipients.length > 0) {
      const studentName =
        (await prisma.student.findUnique({
          where: { id: data.studentId },
          select: { fullName: true },
        }))?.fullName ?? "Öğrenci";
      await notifyUsers(recipients, {
        title: "Yeni mazeret bildirimi",
        body: `${studentName} için ${parent.fullName} bir mazeret iletti.`,
        href: "/panel/ogretmen?tab=excuses",
        type: "ANNOUNCEMENT",
        category: "ATTENDANCE",
        relatedEntityType: "AbsenceExcuse",
        relatedEntityId: created.id,
        createdById: ctx.userId,
      });
    }
  } catch (err) {
    console.warn("[excuse:create] notify failed", err);
  }

  revalidatePath("/panel/veli/mazeret");
  revalidatePath("/panel/veli");
  redirect("/panel/veli/mazeret?ok=1");
}

const CancelSchema = z.object({ id: z.string().min(1) });

export async function cancelAbsenceExcuseAction(formData: FormData): Promise<void> {
  const { ctx, parent } = await requireParent();
  if (!parent) return;
  const parsed = CancelSchema.safeParse({ id: fd(formData, "id") });
  if (!parsed.success) return;

  const ex = await prisma.absenceExcuse.findUnique({
    where: { id: parsed.data.id },
    select: { parentId: true, status: true },
  });
  if (!ex || ex.parentId !== parent.id) return;
  if (ex.status !== "PENDING") return;

  await prisma.absenceExcuse.update({
    where: { id: parsed.data.id },
    data: { status: "CANCELLED" },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "AbsenceExcuse",
    entityId: parsed.data.id,
    action: "EXCUSE_CANCEL",
  });
  revalidatePath("/panel/veli/mazeret");
}

// ─────────────────────────────────────────────────────────────────────────────
// Local helper: resolve teacher + admin user IDs to notify on submission.
// ─────────────────────────────────────────────────────────────────────────────

async function resolveExcuseReviewerUserIds(studentId: string): Promise<string[]> {
  // Teachers: classroom-assigned + direct lesson teachers.
  const [classroomLinks, lessons, admins] = await Promise.all([
    prisma.classroomTeacher.findMany({
      where: {
        classroom: { students: { some: { studentId, leftAt: null } } },
      },
      select: { teacher: { select: { userId: true } } },
    }),
    prisma.lesson.findMany({
      where: { studentId },
      select: { teacher: { select: { userId: true } } },
      distinct: ["teacherId"],
      take: 50,
    }),
    prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
      take: 20,
    }),
  ]);

  const set = new Set<string>();
  for (const c of classroomLinks) {
    if (c.teacher?.userId) set.add(c.teacher.userId);
  }
  for (const l of lessons) {
    if (l.teacher?.userId) set.add(l.teacher.userId);
  }
  for (const a of admins) set.add(a.id);
  return Array.from(set);
}
