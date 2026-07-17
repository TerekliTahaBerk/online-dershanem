import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";

const schema = z.object({ title: z.string().trim().min(2).max(120), startsAt: z.string().datetime(), status: z.enum(["PLANNED", "COMPLETED", "CANCELLED"]), meetingUrl: z.string().url().max(500).optional().or(z.literal("")) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.lessons.update", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:lessons:update:${auth.session.userId}`, rateLimit: { max: 100, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ders bilgilerini kontrol edin." }, { status: 400 });
  const { id } = await context.params;
  const startsAt = new Date(parsed.data.startsAt);
  const result = await prisma.lesson.updateMany({ where: { id }, data: { title: parsed.data.title, startsAt, endsAt: new Date(startsAt.getTime() + 3600000), status: parsed.data.status, meetingUrl: parsed.data.meetingUrl === undefined ? undefined : parsed.data.meetingUrl || null } });
  if (!result.count) return NextResponse.json({ error: "Ders bulunamadı." }, { status: 404 });
  await logAudit({ actorUserId: auth.session.userId, entityType: "Lesson", entityId: id, action: "lesson.updated", summary: `${parsed.data.title} dersi güncellendi`, payload: { startsAt: startsAt.toISOString(), status: parsed.data.status } });
  return NextResponse.json({ ok: true });
}
