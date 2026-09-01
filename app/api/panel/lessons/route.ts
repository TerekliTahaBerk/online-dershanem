import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";
import { filterNotificationRows, queuePanelNotificationEmails } from "@/lib/panel-notifications";
import { assertLessonNoConflict } from "@/lib/panel/lesson-lifecycle";

const schema = z
  .object({
    groupId: z.string().min(1),
    title: z.string().trim().min(2).max(120),
    startsAt: z.string().datetime(),
    mode: z.enum(["SINGLE", "SERIES"]).default("SINGLE"),
    repeatWeeks: z.number().int().min(1).max(12).default(1),
    meetingUrl: z.string().url().max(500).optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (value.mode === "SERIES" && value.repeatWeeks < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ders serisi için en az 2 hafta seçin.",
        path: ["repeatWeeks"],
      });
    }
  });

export async function POST(request: Request) {
  const auth = await requireApiOdRole("ADMIN");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.lessons.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:lessons:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ders bilgilerini kontrol edin." }, { status: 400 });
  const group = await prisma.group.findFirst({ where: { id: parsed.data.groupId, isActive: true }, include: { enrollments: { where: { endedAt: null }, include: { student: { select: { id: true, userId: true, parents: { select: { parentId: true } } } } } } } });
  if (!group) return NextResponse.json({ error: "Aktif grup bulunamadı." }, { status: 404 });
  const startsAt = new Date(parsed.data.startsAt);
  const isSeries = parsed.data.mode === "SERIES" || parsed.data.repeatWeeks > 1;
  const lessonCount = isSeries ? parsed.data.repeatWeeks : 1;
  const enrollments = group.enrollments;
  const studentIds = enrollments.map((item) => item.student.id);
  const lessons = await prisma.$transaction(async (tx) => {
    const series = isSeries
      ? await tx.lessonSeries.create({
          data: {
            groupId: group.id,
            teacherId: group.teacherId,
            title: parsed.data.title,
            meetingUrl: parsed.data.meetingUrl || null,
          },
        })
      : null;
    const created: Array<{ id: string }> = [];
    for (let index = 0; index < lessonCount; index += 1) {
      const lessonStart = new Date(startsAt.getTime() + index * 7 * 86400000);
      const lessonEnd = new Date(lessonStart.getTime() + 60 * 60 * 1000);
      await assertLessonNoConflict(tx, {
        lessonId: group.id,
        teacherId: group.teacherId,
        groupId: group.id,
        startsAt: lessonStart,
        endsAt: lessonEnd,
        studentIds,
      });
      const lesson = await tx.lesson.create({
        data: {
          groupId: group.id,
          seriesId: series?.id ?? null,
          teacherId: group.teacherId,
          title: parsed.data.title,
          startsAt: lessonStart,
          endsAt: lessonEnd,
          meetingUrl: parsed.data.meetingUrl || null,
        },
        select: { id: true },
      });
      created.push(lesson);
    }
    return created;
  });
  const dateLabel = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(startsAt);
  const body = lessonCount > 1 ? `${parsed.data.title} · ${dateLabel} başlangıçlı ${lessonCount} haftalık program` : `${parsed.data.title} · ${dateLabel}`;
  const rawNotificationRows = [
    { userId: group.teacherId, type: "SYSTEM" as const, title: "Ders programlandı", body, href: "/panel/ogretmen/takvim" },
    ...group.enrollments.map((item) => ({ userId: item.student.userId, type: "SYSTEM" as const, title: "Yeni ders programı", body, href: "/panel/ogrenci/takvim" })),
    ...group.enrollments.flatMap((item) => item.student.parents.map((link) => ({ userId: link.parentId, type: "SYSTEM" as const, title: "Yeni ders programı", body, href: `/panel/veli/takvim?studentId=${item.student.id}` }))),
  ];
  const notificationRows = await filterNotificationRows(rawNotificationRows);
  if (notificationRows.length) await prisma.notification.createMany({ data: notificationRows });
  await queuePanelNotificationEmails(rawNotificationRows);
  await logAudit({ actorUserId: auth.session.userId, entityType: "Lesson", entityId: lessons[0].id, action: "lesson.created", summary: `${parsed.data.title} dersi planlandı`, payload: { groupId: group.id, repeatWeeks: lessons.length, startsAt: startsAt.toISOString(), mode: isSeries ? "SERIES" : "SINGLE" } });
  return NextResponse.json({ id: lessons[0].id, count: lessons.length });
}
