import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";
import { filterNotificationRows, queuePanelNotificationEmails } from "@/lib/panel-notifications";

const schema = z.object({ groupId: z.string().min(1), lessonId: z.string().min(1).nullable().optional(), assignmentId: z.string().min(1).nullable().optional(), title: z.string().trim().min(2).max(140), description: z.string().trim().max(1000).optional(), url: z.string().url().max(1000).refine((value) => value.startsWith("https://") || value.startsWith("http://")), kind: z.enum(["LINK", "PDF", "VIDEO"]) });

export async function POST(request: Request) {
  const auth = await requireApiRole("ADMIN", "TEACHER"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.materials.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:materials:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } }); if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Materyal alanlarını kontrol edin." }, { status: 400 });
  const data = parsed.data;
  const group = await prisma.group.findFirst({ where: { id: data.groupId, isActive: true, ...(auth.session.role === "TEACHER" ? { teacherId: auth.session.userId } : {}) }, include: { enrollments: { where: { endedAt: null }, include: { student: { select: { userId: true, parents: { select: { parentId: true } } } } } } } });
  if (!group) return NextResponse.json({ error: "Yetkili olduğunuz grup bulunamadı." }, { status: 404 });
  if (data.lessonId && !await prisma.lesson.findFirst({ where: { id: data.lessonId, groupId: group.id }, select: { id: true } })) return NextResponse.json({ error: "Ders bu gruba ait değil." }, { status: 400 });
  if (data.assignmentId && !await prisma.assignment.findFirst({ where: { id: data.assignmentId, groupId: group.id }, select: { id: true } })) return NextResponse.json({ error: "Ödev bu gruba ait değil." }, { status: 400 });
  const material = await prisma.learningMaterial.create({ data: { groupId: group.id, lessonId: data.lessonId || null, assignmentId: data.assignmentId || null, createdById: auth.session.userId, title: data.title, description: data.description || null, url: data.url, kind: data.kind } });
  const students = [...new Set(group.enrollments.map((item) => item.student.userId))]; const parents = [...new Set(group.enrollments.flatMap((item) => item.student.parents.map((link) => link.parentId)))];
  const rawNotificationRows = [...students.map((userId) => ({ userId, type: "SYSTEM" as const, title: "Yeni ders materyali", body: material.title, href: "/panel/ogrenci/materyaller" })), ...parents.map((userId) => ({ userId, type: "SYSTEM" as const, title: "Yeni ders materyali", body: material.title, href: "/panel/veli/takip" }))];
  const notificationRows = await filterNotificationRows(rawNotificationRows);
  if (notificationRows.length) await prisma.notification.createMany({ data: notificationRows });
  await queuePanelNotificationEmails(rawNotificationRows);
  await logAudit({ actorUserId: auth.session.userId, entityType: "LearningMaterial", entityId: material.id, action: "material.created", summary: `${material.title} paylaşıldı`, payload: { groupId: group.id, kind: material.kind } });
  return NextResponse.json({ id: material.id });
}
