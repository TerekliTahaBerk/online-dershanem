import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";
import { filterNotificationRows } from "@/lib/panel-notifications";

const schema = z.object({ groupId: z.string().min(1), title: z.string().trim().min(2).max(120), startsAt: z.string().datetime(), repeatWeeks: z.number().int().min(1).max(12).default(1), meetingUrl: z.string().url().max(500).optional().or(z.literal("")) });

export async function POST(request: Request) {
  const auth = await requireApiRole("ADMIN");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.lessons.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:lessons:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ders bilgilerini kontrol edin." }, { status: 400 });
  const group = await prisma.group.findFirst({ where: { id: parsed.data.groupId, isActive: true }, include: { enrollments: { where: { endedAt: null }, include: { student: { select: { id: true, userId: true, parents: { select: { parentId: true } } } } } } } });
  if (!group) return NextResponse.json({ error: "Aktif grup bulunamadı." }, { status: 404 });
  const startsAt = new Date(parsed.data.startsAt);
  const lessons = await prisma.$transaction(Array.from({ length: parsed.data.repeatWeeks }, (_, index) => {
    const lessonStart = new Date(startsAt.getTime() + index * 7 * 86400000);
    return prisma.lesson.create({ data: { groupId: group.id, teacherId: group.teacherId, title: parsed.data.title, startsAt: lessonStart, endsAt: new Date(lessonStart.getTime() + 60 * 60 * 1000), meetingUrl: parsed.data.meetingUrl || null } });
  }));
  const dateLabel = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(startsAt);
  const body = parsed.data.repeatWeeks > 1 ? `${parsed.data.title} · ${dateLabel} başlangıçlı ${parsed.data.repeatWeeks} haftalık program` : `${parsed.data.title} · ${dateLabel}`;
  const notificationRows = await filterNotificationRows([
    { userId: group.teacherId, type: "SYSTEM", title: "Ders programlandı", body, href: "/panel/ogretmen/takvim" },
    ...group.enrollments.map((item) => ({ userId: item.student.userId, type: "SYSTEM" as const, title: "Yeni ders programı", body, href: "/panel/ogrenci/takvim" })),
    ...group.enrollments.flatMap((item) => item.student.parents.map((link) => ({ userId: link.parentId, type: "SYSTEM" as const, title: "Yeni ders programı", body, href: `/panel/veli/takvim?studentId=${item.student.id}` }))),
  ]);
  if (notificationRows.length) await prisma.notification.createMany({ data: notificationRows });
  await logAudit({ actorUserId: auth.session.userId, entityType: "Lesson", entityId: lessons[0].id, action: "lesson.created", summary: `${parsed.data.title} dersi planlandı`, payload: { groupId: group.id, repeatWeeks: lessons.length, startsAt: startsAt.toISOString() } });
  return NextResponse.json({ id: lessons[0].id, count: lessons.length });
}
