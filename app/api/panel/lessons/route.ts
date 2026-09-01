import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";
import { filterNotificationRows, queuePanelNotificationEmails } from "@/lib/panel-notifications";
import { assertLessonNoConflict, LessonLifecycleError } from "@/lib/panel/lesson-lifecycle";
import {
  previewLessonSeries,
  LessonSeriesScheduleError,
  type IsoWeekday,
} from "@/lib/panel/lesson-series-schedule";
import { resolveLessonTargetGroup } from "@/lib/panel/lesson-target";

const schema = z
  .object({
    targetType: z.enum(["GROUP", "STUDENT"]).default("GROUP"),
    groupId: z.string().min(1).optional(),
    studentId: z.string().min(1).optional(),
    teacherId: z.string().min(1).optional(),
    title: z.string().trim().min(2).max(120),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime().optional(),
    mode: z.enum(["SINGLE", "SERIES"]).default("SINGLE"),
    repeatWeeks: z.number().int().min(1).max(12).default(1),
    weekdays: z.array(z.number().int().min(1).max(7)).max(7).optional(),
    startsAtTime: z
      .string()
      .regex(/^([01]?\d|2[0-3]):([0-5]\d)$/)
      .optional(),
    durationMinutes: z.number().int().min(15).max(240).optional(),
    totalOccurrences: z.number().int().min(1).max(48).optional(),
    meetingUrl: z.string().url().max(500).optional().or(z.literal("")),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (value.targetType === "GROUP" && !value.groupId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Grup seçin.", path: ["groupId"] });
    }
    if (value.targetType === "STUDENT" && !value.studentId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Öğrenci seçin.", path: ["studentId"] });
    }
    if (value.mode === "SERIES" && !value.weekdays?.length && value.repeatWeeks < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ders serisi için en az 2 hafta veya haftanın günlerini seçin.",
        path: ["repeatWeeks"],
      });
    }
  });

export async function POST(request: Request) {
  const auth = await requireApiOdRole("ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({
    action: "panel.lessons.create",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:lessons:${auth.session.userId}`,
    rateLimit: { max: 80, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ders bilgilerini kontrol edin." }, { status: 400 });
  }

  const resolved = await resolveLessonTargetGroup({
    targetType: parsed.data.targetType,
    groupId: parsed.data.groupId,
    studentId: parsed.data.studentId,
    teacherId: parsed.data.teacherId,
    actorRole: auth.session.role === "TEACHER" ? "TEACHER" : "ADMIN",
    actorUserId: auth.session.userId,
  });
  if (resolved.error || !resolved.group) {
    return NextResponse.json({ error: resolved.error || "Hedef çözülemedi." }, { status: 404 });
  }
  const group = resolved.group;

  const startsAt = new Date(parsed.data.startsAt);
  const durationMinutes =
    parsed.data.durationMinutes ??
    (parsed.data.endsAt
      ? Math.max(
          15,
          Math.round((new Date(parsed.data.endsAt).getTime() - startsAt.getTime()) / 60_000),
        )
      : 60);

  const useWeekdaySeries =
    parsed.data.mode === "SERIES" &&
    ((parsed.data.weekdays && parsed.data.weekdays.length > 0) ||
      Boolean(parsed.data.totalOccurrences));

  let occurrenceStarts: Date[] = [];
  let occurrenceEnds: Date[] = [];

  try {
    if (useWeekdaySeries) {
      const time =
        parsed.data.startsAtTime ||
        new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/Istanbul",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(startsAt);
      const preview = previewLessonSeries({
        seriesStartsOn: startsAt,
        startsAtTime: time,
        durationMinutes,
        weekdays: (parsed.data.weekdays || []) as IsoWeekday[],
        totalOccurrences: parsed.data.totalOccurrences || parsed.data.repeatWeeks || 8,
      });
      occurrenceStarts = preview.occurrences.map((o) => o.startsAt);
      occurrenceEnds = preview.occurrences.map((o) => o.endsAt);
    } else {
      const isSeries = parsed.data.mode === "SERIES" || parsed.data.repeatWeeks > 1;
      const lessonCount = isSeries ? parsed.data.repeatWeeks : 1;
      for (let index = 0; index < lessonCount; index += 1) {
        const lessonStart = new Date(startsAt.getTime() + index * 7 * 86400000);
        occurrenceStarts.push(lessonStart);
        occurrenceEnds.push(new Date(lessonStart.getTime() + durationMinutes * 60_000));
      }
    }
  } catch (error) {
    if (error instanceof LessonSeriesScheduleError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    throw error;
  }

  const studentIds = group.enrollments.map((item) => item.student.id);
  const isSeries = occurrenceStarts.length > 1;

  try {
    const lessons = await prisma.$transaction(async (tx) => {
      const series = isSeries
        ? await tx.lessonSeries.create({
            data: {
              groupId: group.id,
              teacherId: group.teacherId,
              title: parsed.data.title,
              meetingUrl: parsed.data.meetingUrl || null,
              weekdays: parsed.data.weekdays || [],
              startsAtTime: parsed.data.startsAtTime || null,
              durationMinutes,
              seriesStartsOn: startsAt,
              totalOccurrences: occurrenceStarts.length,
              timezone: "Europe/Istanbul",
            },
          })
        : null;

      const created: Array<{ id: string }> = [];
      for (let index = 0; index < occurrenceStarts.length; index += 1) {
        await assertLessonNoConflict(tx, {
          lessonId: `${group.id}-${index}`,
          teacherId: group.teacherId,
          groupId: group.id,
          startsAt: occurrenceStarts[index],
          endsAt: occurrenceEnds[index],
          studentIds,
        });
        const lesson = await tx.lesson.create({
          data: {
            groupId: group.id,
            seriesId: series?.id ?? null,
            teacherId: group.teacherId,
            title: parsed.data.title,
            startsAt: occurrenceStarts[index],
            endsAt: occurrenceEnds[index],
            meetingUrl: parsed.data.meetingUrl || null,
          },
          select: { id: true },
        });
        created.push(lesson);
      }
      return created;
    });

    const dateLabel = new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Istanbul",
    }).format(startsAt);
    const body =
      lessons.length > 1
        ? `${parsed.data.title} · ${dateLabel} başlangıçlı ${lessons.length} derslik program`
        : `${parsed.data.title} · ${dateLabel}`;
    const rawNotificationRows = [
      {
        userId: group.teacherId,
        type: "SYSTEM" as const,
        title: "Ders programlandı",
        body,
        href: "/panel/ogretmen/takvim",
      },
      ...group.enrollments.map((item) => ({
        userId: item.student.userId,
        type: "SYSTEM" as const,
        title: "Yeni ders programı",
        body,
        href: "/panel/ogrenci/takvim",
      })),
      ...group.enrollments.flatMap((item) =>
        item.student.parents.map((link) => ({
          userId: link.parentId,
          type: "SYSTEM" as const,
          title: "Yeni ders programı",
          body,
          href: `/panel/veli/takvim?studentId=${item.student.id}`,
        })),
      ),
    ];
    const notificationRows = await filterNotificationRows(rawNotificationRows);
    if (notificationRows.length) await prisma.notification.createMany({ data: notificationRows });
    await queuePanelNotificationEmails(rawNotificationRows);
    await logAudit({
      actorUserId: auth.session.userId,
      entityType: "Lesson",
      entityId: lessons[0].id,
      action: "lesson.created",
      summary: `${parsed.data.title} dersi planlandı`,
      payload: {
        groupId: group.id,
        count: lessons.length,
        startsAt: startsAt.toISOString(),
        mode: isSeries ? "SERIES" : "SINGLE",
        weekdays: parsed.data.weekdays || [],
      },
    });
    return NextResponse.json({ id: lessons[0].id, count: lessons.length });
  } catch (error) {
    if (error instanceof LessonLifecycleError && error.code === "SCHEDULE_CONFLICT") {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    throw error;
  }
}
