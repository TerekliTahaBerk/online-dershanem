import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { filterNotificationRows } from "@/lib/panel-notifications";

const schema = z.object({
  groupId: z.string().min(1),
  lessonId: z.string().min(1).nullable().optional(),
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(2000).optional(),
  dueAt: z.string().datetime(),
});

export async function POST(request: Request) {
  const auth = await requireApiRole("ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.assignments.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:assignments:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ödev bilgilerini kontrol edin." }, { status: 400 });

  const group = await prisma.group.findFirst({
    where: { id: parsed.data.groupId, isActive: true, ...(auth.session.role === "TEACHER" ? { teacherId: auth.session.userId } : {}) },
    include: { enrollments: { where: { endedAt: null }, include: { student: { select: { id: true, userId: true, parents: { select: { parentId: true } } } } } } },
  });
  if (!group) return NextResponse.json({ error: "Yetkili olduğunuz aktif grup bulunamadı." }, { status: 404 });
  if (parsed.data.lessonId) {
    const lesson = await prisma.lesson.findFirst({ where: { id: parsed.data.lessonId, groupId: group.id }, select: { id: true } });
    if (!lesson) return NextResponse.json({ error: "Seçilen ders bu gruba ait değil." }, { status: 400 });
  }

  const assignment = await prisma.assignment.create({
    data: {
      groupId: group.id,
      lessonId: parsed.data.lessonId || null,
      createdById: auth.session.userId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      dueAt: new Date(parsed.data.dueAt),
      progress: { create: group.enrollments.map((item) => ({ studentId: item.student.id })) },
    },
  });
  const body = `${assignment.title} · son tarih ${new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(assignment.dueAt)}`;
  const studentRecipients = [...new Set(group.enrollments.map((item) => item.student.userId))];
  const parentRecipients = [...new Set(group.enrollments.flatMap((item) => item.student.parents.map((link) => link.parentId)))];
  const notificationRows = await filterNotificationRows([...studentRecipients.map((userId) => ({ userId, type: "ASSIGNMENT" as const, title: "Yeni çalışma eklendi", body, href: "/panel/ogrenci/odevler" })), ...parentRecipients.map((userId) => ({ userId, type: "ASSIGNMENT" as const, title: "Yeni çalışma eklendi", body, href: "/panel/veli/takip" }))], "assignment");
  if (notificationRows.length) await prisma.notification.createMany({ data: notificationRows });
  await logAudit({ actorUserId: auth.session.userId, entityType: "Assignment", entityId: assignment.id, action: "assignment.created", summary: `${assignment.title} ödevi oluşturuldu`, payload: { groupId: group.id, dueAt: assignment.dueAt.toISOString() } });
  return NextResponse.json({ id: assignment.id });
}
