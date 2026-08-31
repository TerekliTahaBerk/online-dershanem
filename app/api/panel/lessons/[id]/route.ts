import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";
import { filterNotificationRows, queuePanelNotificationEmails } from "@/lib/panel-notifications";
import {
  LessonLifecycleError,
  assertLessonNoConflict,
  assertTeacherActive,
  resolveScopedLessons,
  type LessonScope,
} from "@/lib/panel/lesson-lifecycle";

const scope = z.enum(["ONE", "FOLLOWING"]).default("ONE");

const updateSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("UPDATE"),
    scope,
    title: z.string().trim().min(2).max(120).optional(),
    startsAt: z.string().datetime().optional(),
    status: z.enum(["PLANNED", "COMPLETED", "CANCELLED"]).optional(),
    meetingUrl: z.string().url().max(500).optional().or(z.literal("")),
  }),
  z.object({
    action: z.literal("RESCHEDULE"),
    scope,
    startsAt: z.string().datetime(),
    keepDurationMinutes: z.number().int().min(15).max(240).optional(),
  }),
  z.object({
    action: z.literal("CANCEL"),
    scope,
  }),
  z.object({
    action: z.literal("SUBSTITUTE"),
    scope,
    teacherId: z.string().min(1),
  }),
  z.object({
    action: z.literal("MAKE_UP"),
    startsAt: z.string().datetime(),
    teacherId: z.string().min(1).optional(),
    title: z.string().trim().min(2).max(120).optional(),
    meetingUrl: z.string().url().max(500).optional().or(z.literal("")),
  }),
]);

const legacySchema = z.object({
  title: z.string().trim().min(2).max(120),
  startsAt: z.string().datetime(),
  status: z.enum(["PLANNED", "COMPLETED", "CANCELLED"]),
  meetingUrl: z.string().url().max(500).optional().or(z.literal("")),
});

function scopeLabel(value: LessonScope) {
  return value === "FOLLOWING" ? "bu ve sonraki dersler" : "sadece bu ders";
}

function lifecycleError(error: unknown) {
  if (!(error instanceof LessonLifecycleError)) return null;
  if (error.code === "LESSON_NOT_FOUND") return NextResponse.json({ error: error.message }, { status: 404 });
  if (error.code === "TEACHER_NOT_FOUND") return NextResponse.json({ error: error.message }, { status: 400 });
  if (error.code === "SCOPE_NOT_AVAILABLE") return NextResponse.json({ error: error.message }, { status: 409 });
  if (error.code === "SCHEDULE_CONFLICT") return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ error: "Ders işlemi tamamlanamadı." }, { status: 400 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOdRole("ADMIN");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({
    action: "panel.lessons.update",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:lessons:update:${auth.session.userId}`,
    rateLimit: { max: 120, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });

  const { id } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  const legacy = parsed.success ? null : legacySchema.safeParse(payload);
  if (!parsed.success && !legacy?.success) return NextResponse.json({ error: "Ders bilgilerini kontrol edin." }, { status: 400 });
  const legacyData = legacy && legacy.success ? legacy.data : null;
  const action = parsed.success
    ? parsed.data
    : ({ action: "UPDATE", scope: "ONE", title: legacyData!.title, startsAt: legacyData!.startsAt, status: legacyData!.status, meetingUrl: legacyData!.meetingUrl } as const);

  const base = await prisma.lesson.findUnique({
    where: { id },
    include: {
      group: {
        include: {
          enrollments: {
            where: { endedAt: null },
            include: {
              student: { select: { id: true, userId: true, parents: { select: { parentId: true } } } },
            },
          },
        },
      },
    },
  });
  if (!base) return NextResponse.json({ error: "Ders bulunamadı." }, { status: 404 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (action.action === "MAKE_UP") {
        const teacherId = action.teacherId || base.teacherId;
        await assertTeacherActive(tx, teacherId);
        const start = new Date(action.startsAt);
        const end = new Date(start.getTime() + (base.endsAt.getTime() - base.startsAt.getTime()));
        await assertLessonNoConflict(tx, {
          lessonId: base.id,
          teacherId,
          groupId: base.groupId,
          startsAt: start,
          endsAt: end,
        });
        const makeUp = await tx.lesson.create({
          data: {
            groupId: base.groupId,
            seriesId: base.seriesId,
            teacherId,
            title: action.title || `${base.title} (Telafi)`,
            startsAt: start,
            endsAt: end,
            status: "PLANNED",
            meetingUrl: action.meetingUrl === undefined ? base.meetingUrl : action.meetingUrl || null,
          },
          select: { id: true, title: true, startsAt: true, teacherId: true, groupId: true },
        });
        return {
          updatedIds: [makeUp.id],
          summary: `${base.title} dersi için telafi planlandı`,
          notificationTitle: "Telafi dersi planlandı",
          notificationBody: `${makeUp.title} · ${new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(makeUp.startsAt)}`,
          auditAction: "lesson.makeup_created",
          extraTeacherId: makeUp.teacherId === base.teacherId ? null : makeUp.teacherId,
        };
      }

      const scopedLessons = await resolveScopedLessons(tx, id, action.scope);
      const targetIds = scopedLessons.map((lesson) => lesson.id);
      const anchor = scopedLessons[0];
      const updates = new Map<
        string,
        { title: string; startsAt: Date; endsAt: Date; status: "PLANNED" | "COMPLETED" | "CANCELLED"; teacherId: string; groupId: string; meetingUrl: string | null }
      >();

      if (action.action === "RESCHEDULE") {
        const nextStart = new Date(action.startsAt);
        const delta = nextStart.getTime() - anchor.startsAt.getTime();
        for (const lesson of scopedLessons) {
          const durationMs = action.keepDurationMinutes
            ? action.keepDurationMinutes * 60 * 1000
            : lesson.endsAt.getTime() - lesson.startsAt.getTime();
          const startsAt = new Date(lesson.startsAt.getTime() + delta);
          const endsAt = new Date(startsAt.getTime() + durationMs);
          updates.set(lesson.id, {
            title: lesson.title,
            startsAt,
            endsAt,
            status: lesson.status,
            teacherId: lesson.teacherId,
            groupId: lesson.groupId,
            meetingUrl: lesson.meetingUrl,
          });
        }
      } else if (action.action === "CANCEL") {
        for (const lesson of scopedLessons) {
          updates.set(lesson.id, {
            title: lesson.title,
            startsAt: lesson.startsAt,
            endsAt: lesson.endsAt,
            status: "CANCELLED",
            teacherId: lesson.teacherId,
            groupId: lesson.groupId,
            meetingUrl: lesson.meetingUrl,
          });
        }
      } else if (action.action === "SUBSTITUTE") {
        await assertTeacherActive(tx, action.teacherId);
        for (const lesson of scopedLessons) {
          updates.set(lesson.id, {
            title: lesson.title,
            startsAt: lesson.startsAt,
            endsAt: lesson.endsAt,
            status: lesson.status,
            teacherId: action.teacherId,
            groupId: lesson.groupId,
            meetingUrl: lesson.meetingUrl,
          });
        }
      } else {
        if (!action.title && !action.startsAt && !action.status && action.meetingUrl === undefined) {
          throw new LessonLifecycleError("SCOPE_NOT_AVAILABLE", "Güncelleme alanı bulunamadı.");
        }
        for (const lesson of scopedLessons) {
          const startsAt = action.startsAt
            ? lesson.id === anchor.id
              ? new Date(action.startsAt)
              : lesson.startsAt
            : lesson.startsAt;
          const durationMs = lesson.endsAt.getTime() - lesson.startsAt.getTime();
          updates.set(lesson.id, {
            title: action.title ?? lesson.title,
            startsAt,
            endsAt: new Date(startsAt.getTime() + durationMs),
            status: action.status ?? lesson.status,
            teacherId: lesson.teacherId,
            groupId: lesson.groupId,
            meetingUrl: action.meetingUrl === undefined ? lesson.meetingUrl : action.meetingUrl || null,
          });
        }
      }

      for (const [lessonId, next] of updates.entries()) {
        if (next.status !== "PLANNED") continue;
        await assertLessonNoConflict(tx, {
          lessonId,
          excludeIds: targetIds,
          teacherId: next.teacherId,
          groupId: next.groupId,
          startsAt: next.startsAt,
          endsAt: next.endsAt,
        });
      }

      for (const [lessonId, next] of updates.entries()) {
        await tx.lesson.update({
          where: { id: lessonId },
          data: {
            title: next.title,
            startsAt: next.startsAt,
            endsAt: next.endsAt,
            status: next.status,
            teacherId: next.teacherId,
            meetingUrl: next.meetingUrl,
          },
        });
      }

      if (action.action === "SUBSTITUTE") {
        await tx.lessonSeries.updateMany({
          where: { id: { in: [...new Set(scopedLessons.map((item) => item.seriesId).filter(Boolean) as string[])] } },
          data: { teacherId: action.teacherId },
        });
      }
      if (action.action === "UPDATE" && action.meetingUrl !== undefined) {
        await tx.lessonSeries.updateMany({
          where: { id: { in: [...new Set(scopedLessons.map((item) => item.seriesId).filter(Boolean) as string[])] } },
          data: { meetingUrl: action.meetingUrl || null },
        });
      }
      if (action.action === "UPDATE" && action.title) {
        await tx.lessonSeries.updateMany({
          where: { id: { in: [...new Set(scopedLessons.map((item) => item.seriesId).filter(Boolean) as string[])] } },
          data: { title: action.title },
        });
      }

      const first = updates.get(anchor.id) || {
        title: anchor.title,
        startsAt: anchor.startsAt,
        endsAt: anchor.endsAt,
        status: anchor.status,
        teacherId: anchor.teacherId,
        groupId: anchor.groupId,
        meetingUrl: anchor.meetingUrl,
      };
      const title = action.action === "CANCEL" ? "Ders iptal edildi" : action.action === "SUBSTITUTE" ? "Ders öğretmeni güncellendi" : action.action === "RESCHEDULE" ? "Ders saati güncellendi" : "Ders planı güncellendi";
      return {
        updatedIds: targetIds,
        summary: `${anchor.title} (${scopeLabel(action.scope)}) güncellendi`,
        notificationTitle: title,
        notificationBody: `${first.title} · ${new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(first.startsAt)}${targetIds.length > 1 ? ` · ${targetIds.length} ders` : ""}`,
        auditAction:
          action.action === "CANCEL"
            ? "lesson.cancelled"
            : action.action === "RESCHEDULE"
              ? "lesson.rescheduled"
              : action.action === "SUBSTITUTE"
                ? "lesson.substitute_assigned"
                : "lesson.updated",
        extraTeacherId: action.action === "SUBSTITUTE" && action.teacherId !== base.teacherId ? action.teacherId : null,
      };
    });

    const rawNotificationRows = [
      { userId: base.teacherId, type: "SYSTEM" as const, title: result.notificationTitle, body: result.notificationBody, href: "/panel/ogretmen/takvim" },
      ...base.group.enrollments.map((item) => ({ userId: item.student.userId, type: "SYSTEM" as const, title: result.notificationTitle, body: result.notificationBody, href: "/panel/ogrenci/takvim" })),
      ...base.group.enrollments.flatMap((item) => item.student.parents.map((link) => ({ userId: link.parentId, type: "SYSTEM" as const, title: result.notificationTitle, body: result.notificationBody, href: `/panel/veli/takvim?studentId=${item.student.id}` }))),
      ...(result.extraTeacherId ? [{ userId: result.extraTeacherId, type: "SYSTEM" as const, title: result.notificationTitle, body: result.notificationBody, href: "/panel/ogretmen/takvim" }] : []),
    ];
    const notificationRows = await filterNotificationRows(rawNotificationRows);
    if (notificationRows.length) await prisma.notification.createMany({ data: notificationRows });
    await queuePanelNotificationEmails(rawNotificationRows);

    await logAudit({
      actorUserId: auth.session.userId,
      entityType: "Lesson",
      entityId: id,
      action: result.auditAction,
      summary: result.summary,
      payload: { updatedLessonIds: result.updatedIds },
    });
    return NextResponse.json({ ok: true, updatedCount: result.updatedIds.length });
  } catch (error) {
    const mapped = lifecycleError(error);
    if (mapped) return mapped;
    throw error;
  }
}
