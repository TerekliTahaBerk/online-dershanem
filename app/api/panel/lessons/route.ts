import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";

const schema = z.object({ groupId: z.string().min(1), title: z.string().trim().min(2).max(120), startsAt: z.string().datetime(), repeatWeeks: z.number().int().min(1).max(12).default(1) });

export async function POST(request: Request) {
  const auth = await requireApiRole("ADMIN");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.lessons.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:lessons:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ders bilgilerini kontrol edin." }, { status: 400 });
  const group = await prisma.group.findFirst({ where: { id: parsed.data.groupId, isActive: true }, select: { id: true, teacherId: true } });
  if (!group) return NextResponse.json({ error: "Aktif grup bulunamadı." }, { status: 404 });
  const startsAt = new Date(parsed.data.startsAt);
  const lessons = await prisma.$transaction(Array.from({ length: parsed.data.repeatWeeks }, (_, index) => {
    const lessonStart = new Date(startsAt.getTime() + index * 7 * 86400000);
    return prisma.lesson.create({ data: { groupId: group.id, teacherId: group.teacherId, title: parsed.data.title, startsAt: lessonStart, endsAt: new Date(lessonStart.getTime() + 60 * 60 * 1000) } });
  }));
  return NextResponse.json({ id: lessons[0].id, count: lessons.length });
}
