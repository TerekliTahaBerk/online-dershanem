import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";
import { filterNotificationRows, queuePanelNotificationEmails } from "@/lib/panel-notifications";
import { assertLessonNoConflict, LessonLifecycleError } from "@/lib/panel/lesson-lifecycle";
import {
  LessonSeriesScheduleError,
} from "@/lib/panel/lesson-series-schedule";
import { resolveLessonTargetGroup } from "@/lib/panel/lesson-target";
import { lessonCreationSchema, resolveLessonCreationOccurrences } from "@/lib/panel/lesson-creation";

/**
 * Seri alanları önizleme ucuyla ORTAK şemadan gelir (`seriesEndsOn` dahil).
 * Eskiden oluşturma `seriesEndsOn`u hiç tanımıyor ve `totalOccurrences`
 * varsayılanı önizlemedekinden farklı davranıyordu; aynı gövde iki uçta farklı
 * sayıda ders üretebiliyordu.
 */
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

  const parsed = lessonCreationSchema.safeParse(await request.json().catch(() => null));
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

  // Seri modunda HER ZAMAN ortak üreticiyi kullan. Eskiden `weekdays` ve
  // `totalOccurrences` boşsa naif bir "+7 gün" döngüsüne düşülüyordu; o döngü
  // ne bitiş tarihini ne de Istanbul takvim normalizasyonunu biliyordu, yani
  // önizlemeyle aynı sonucu üretmesi tesadüfe kalıyordu.
  let occurrenceStarts: Date[] = [];
  let occurrenceEnds: Date[] = [];

  try {
    const occurrences = resolveLessonCreationOccurrences(parsed.data, durationMinutes);
    occurrenceStarts = occurrences.starts;
    occurrenceEnds = occurrences.ends;
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
