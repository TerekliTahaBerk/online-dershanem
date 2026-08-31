import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { DEFAULT_GROUP_CAPACITY } from "@/lib/panel-group-capacity";

const schema = z.object({
  name: z.string().trim().min(2).max(80), subject: z.string().trim().min(2).max(80), level: z.string().trim().max(40).optional(),
  teacherId: z.string().min(1), studentIds: z.array(z.string().min(1)).min(1).max(DEFAULT_GROUP_CAPACITY),
  parentLinks: z.array(z.object({ parentId: z.string().min(1), studentId: z.string().min(1) })).max(8).default([]),
  lessonTitle: z.string().trim().min(2).max(120), startsAt: z.string().datetime(), repeatWeeks: z.number().int().min(1).max(12),
  meetingUrl: z.string().url().max(500).refine((value) => value.startsWith("https://") || value.startsWith("http://")).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  const startedAt = performance.now();
  const auth = await requireApiOdRole("ADMIN");
  if (!auth.ok) return auth.response;
  const recordFinished = (outcome: "success" | "validation" | "rejected" | "system_error", counts = { studentCount: 0, parentLinkCount: 0, lessonCount: 0 }) => recordPanelProductEvent({ name: "admin_setup_finished", properties: { durationMs: Math.round(performance.now() - startedAt), outcome, ...counts } }, auth.session.role);
  const guard = await guardMutation({ action: "panel.setup.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:setup:${auth.session.userId}`, rateLimit: { max: 20, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) { await recordFinished("rejected"); return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 }); }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) { await recordFinished("validation"); return NextResponse.json({ error: "Kurulum alanlarını kontrol edin." }, { status: 400 }); }
  const data = parsed.data; const studentIds = [...new Set(data.studentIds)]; const parentIds = [...new Set(data.parentLinks.map((item) => item.parentId))];
  const counts = { studentCount: studentIds.length, parentLinkCount: data.parentLinks.length, lessonCount: data.repeatWeeks };
  if (data.parentLinks.some((link) => !studentIds.includes(link.studentId))) { await recordFinished("validation", counts); return NextResponse.json({ error: "Veli bağlantısı seçili bir öğrenciye ait değil." }, { status: 400 }); }
  const [teacher, students, parents] = await Promise.all([
    prisma.user.findFirst({ where: { id: data.teacherId, role: "TEACHER", status: "ACTIVE" }, select: { id: true } }),
    prisma.studentProfile.findMany({ where: { id: { in: studentIds }, user: { status: "ACTIVE" } }, select: { id: true } }),
    prisma.user.findMany({ where: { id: { in: parentIds }, role: "PARENT", status: "ACTIVE" }, select: { id: true } }),
  ]);
  if (!teacher || students.length !== studentIds.length || parents.length !== parentIds.length) { await recordFinished("validation", counts); return NextResponse.json({ error: "Öğretmen, öğrenci veya veli seçimini kontrol edin." }, { status: 400 }); }
  const start = new Date(data.startsAt);
  let group;
  try {
    group = await prisma.$transaction(async (tx) => {
      const created = await tx.group.create({ data: { name: data.name, subject: data.subject, level: data.level || null, teacherId: teacher.id, capacity: DEFAULT_GROUP_CAPACITY, enrollments: { create: studentIds.map((studentId) => ({ studentId })) } } });
      for (const link of data.parentLinks) await tx.parentStudent.upsert({ where: { parentId_studentId: link }, create: { ...link, relationship: "Veli" }, update: {} });
      await tx.lesson.createMany({ data: Array.from({ length: data.repeatWeeks }, (_, index) => { const startsAt = new Date(start.getTime() + index * 7 * 86400000); return { groupId: created.id, teacherId: teacher.id, title: data.lessonTitle, startsAt, endsAt: new Date(startsAt.getTime() + 3600000), meetingUrl: data.meetingUrl || null }; }) });
      return created;
    });
  } catch (error) {
    await recordFinished("system_error", counts);
    throw error;
  }
  await logAudit({ actorUserId: auth.session.userId, entityType: "Group", entityId: group.id, action: "setup.completed", summary: `${group.name} hızlı kurulumla hazırlandı`, payload: { studentCount: studentIds.length, parentLinkCount: data.parentLinks.length, lessonCount: data.repeatWeeks } });
  await recordFinished("success", counts);
  return NextResponse.json({ id: group.id, lessonCount: data.repeatWeeks });
}
