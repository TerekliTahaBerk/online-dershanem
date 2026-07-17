import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";

const attendance = z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);
const schema = z.object({
  topic: z.string().trim().max(160).default(""),
  note: z.string().trim().max(2000).default(""),
  nextGoal: z.string().trim().max(500).default(""),
  homework: z.string().trim().max(1000).default(""),
  complete: z.boolean().default(false),
  students: z.array(z.object({ studentId: z.string().min(1), note: z.string().trim().max(1000).default(""), attendance })),
});

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("TEACHER");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.lesson_notes.save", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:notes:${auth.session.userId}`, rateLimit: { max: 240, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Notlar kaydedilemedi; alanları kontrol edin." }, { status: 400 });
  const { id } = await context.params;
  const lesson = await prisma.lesson.findFirst({
    where: { id, teacherId: auth.session.userId },
    include: { group: { include: { enrollments: { where: { endedAt: null }, include: { student: { select: { id: true, userId: true, parents: { select: { parentId: true } } } } } } } } },
  });
  if (!lesson) return NextResponse.json({ error: "Ders bulunamadı." }, { status: 404 });
  const allowed = new Set(lesson.group.enrollments.map((item) => item.student.id));
  if (parsed.data.students.some((item) => !allowed.has(item.studentId))) return NextResponse.json({ error: "Bu gruba ait olmayan öğrenci gönderildi." }, { status: 403 });

  await prisma.$transaction(async (tx) => {
    const common = await tx.lessonNote.findFirst({ where: { lessonId: id, studentId: null }, select: { id: true } });
    const commonData = { topic: parsed.data.topic || null, note: parsed.data.note || null, nextGoal: parsed.data.nextGoal || null, homework: parsed.data.homework || null };
    if (common) await tx.lessonNote.update({ where: { id: common.id }, data: commonData });
    else await tx.lessonNote.create({ data: { lessonId: id, ...commonData } });

    for (const item of parsed.data.students) {
      const existing = await tx.lessonNote.findFirst({ where: { lessonId: id, studentId: item.studentId }, select: { id: true } });
      if (item.note) {
        if (existing) await tx.lessonNote.update({ where: { id: existing.id }, data: { note: item.note } });
        else await tx.lessonNote.create({ data: { lessonId: id, studentId: item.studentId, note: item.note } });
      } else if (existing) await tx.lessonNote.delete({ where: { id: existing.id } });
      await tx.attendance.upsert({ where: { lessonId_studentId: { lessonId: id, studentId: item.studentId } }, create: { lessonId: id, studentId: item.studentId, status: item.attendance }, update: { status: item.attendance } });
    }
    if (parsed.data.complete) {
      await tx.lesson.update({ where: { id }, data: { status: "COMPLETED" } });
      if (lesson.status !== "COMPLETED") {
        const summary = parsed.data.topic || lesson.title;
        const studentRows = lesson.group.enrollments.map((item) => ({ userId: item.student.userId, type: "LESSON_SUMMARY" as const, title: "Ders özeti hazır", body: `${lesson.title} · ${summary}`, href: "/panel/ogrenci" }));
        const parentRows = lesson.group.enrollments.flatMap((item) => item.student.parents.map((link) => ({ userId: link.parentId, type: "LESSON_SUMMARY" as const, title: "Ders özeti hazır", body: `${lesson.title} · ${summary}`, href: `/panel/veli?studentId=${item.student.id}` })));
        const absenceRows = parsed.data.students.filter((item) => item.attendance === "ABSENT").flatMap((absent) => lesson.group.enrollments.find((item) => item.student.id === absent.studentId)?.student.parents.map((link) => ({ userId: link.parentId, type: "ABSENCE" as const, title: "Devamsızlık bilgisi", body: `${lesson.title} dersine katılım görünmüyor.`, href: `/panel/veli?studentId=${absent.studentId}` })) || []);
        await tx.notification.createMany({ data: [...studentRows, ...parentRows, ...absenceRows] });
      }
    }
  });
  return NextResponse.json({ savedAt: new Date().toISOString() });
}
