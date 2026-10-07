import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiStaffPermission } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { applySessionPlanEdits, readSessionPlan, sessionPlanWorkingMinutes } from "@/lib/odk/exam-sessions";

const schema = z.object({
  sessions: z
    .array(z.object({ key: z.string().min(1).max(40), durationMinutes: z.number().int(), breakAfterMinutes: z.number().int() }))
    .min(2)
    .max(6),
});

/**
 * Oturumlu denemenin (LGS) süre / ara düzenlemesi. Yalnız taslak sürümde;
 * oturum anahtarları ve bölüm dağılımı şablondan gelir, değişmez. Sürüm süresi
 * oturum sürelerinin toplamına eşitlenir (başlatma ucu planı okur).
 */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiStaffPermission("odk:exam:edit"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.exam.sessions.update", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:sessions:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Oturum alanlarını kontrol edin." }, { status: 400 });
  const { id } = await context.params;
  const exam = await prisma.odkExam.findFirst({
    where: { id, status: "DRAFT", currentVersion: { status: "DRAFT" } },
    select: { currentVersion: { select: { id: true, settings: true } } },
  });
  if (!exam?.currentVersion) return NextResponse.json({ error: "Kilitlenmiş veya bulunamayan sürüm düzenlenemez." }, { status: 409 });
  const plan = readSessionPlan(exam.currentVersion.settings);
  if (!plan) return NextResponse.json({ error: "Bu denemenin oturum planı yok." }, { status: 409 });
  const result = applySessionPlanEdits(plan, parsed.data.sessions);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  const settings = { ...(exam.currentVersion.settings as Record<string, unknown>), sessions: result.plan };
  await prisma.odkExamVersion.update({
    where: { id: exam.currentVersion.id },
    data: { settings: settings as Prisma.InputJsonValue, durationMinutes: sessionPlanWorkingMinutes(result.plan) },
  });
  await logAudit({
    actorUserId: auth.session.userId,
    entityType: "OdkExam",
    entityId: id,
    action: "odk.exam_sessions_updated",
    summary: "Oturumlu deneme süre ve ara planı güncellendi",
    payload: { sessions: result.plan.map((item) => ({ key: item.key, durationMinutes: item.durationMinutes, breakAfterMinutes: item.breakAfterMinutes })) },
  });
  return NextResponse.json({ ok: true, sessions: result.plan });
}
