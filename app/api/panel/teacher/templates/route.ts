import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";

const schema = z.object({ title: z.string().trim().min(2).max(60), note: z.string().trim().max(2000).default(""), nextGoal: z.string().trim().max(500).default(""), homework: z.string().trim().max(1000).default("") });

export async function POST(request: Request) {
  const auth = await requireApiRole("TEACHER");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.teacher.templates.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:teacher-template:${auth.session.userId}`, rateLimit: { max: 30, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Şablon alanlarını kontrol edin." }, { status: 400 });
  const count = await prisma.teacherNoteTemplate.count({ where: { teacherId: auth.session.userId } });
  if (count >= 20) return NextResponse.json({ error: "En fazla 20 kişisel şablon kaydedebilirsiniz." }, { status: 400 });
  const template = await prisma.teacherNoteTemplate.create({ data: { teacherId: auth.session.userId, title: parsed.data.title, note: parsed.data.note || null, nextGoal: parsed.data.nextGoal || null, homework: parsed.data.homework || null } });
  await logAudit({ actorUserId: auth.session.userId, entityType: "TeacherNoteTemplate", entityId: template.id, action: "teacher.template_created", summary: `${template.title} şablonu oluşturuldu` });
  return NextResponse.json(template);
}
