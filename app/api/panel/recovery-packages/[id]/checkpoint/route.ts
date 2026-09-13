import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

const schema = z.object({ response: z.enum(["NOT_YET", "NEED_HELP", "READY"]) }).strict(); const MAX_AGE = 365 * 24 * 60 * 60 * 1000;
function recoveryAgeBand(lessonEndedAt: Date): "0-24H" | "25H-7D" | "8D+" {
  const elapsed = Math.max(0, Date.now() - lessonEndedAt.getTime());
  const day = 24 * 60 * 60 * 1000;
  if (elapsed <= day) return "0-24H";
  if (elapsed <= 7 * day) return "25H-7D";
  return "8D+";
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOdRole("STUDENT"); if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().recoveryPackage) return NextResponse.json({ error: "Telafi paketi henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.recovery.checkpoint", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:recovery-checkpoint:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } }); if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Mini kontrol yanıtı geçersiz." }, { status: 400 }); const { id } = await context.params;
  const item = await prisma.recoveryPackage.findFirst({ where: { id, status: "PUBLISHED", student: { userId: auth.session.userId } }, include: { lesson: { select: { endsAt: true } }, items: { select: { completedAt: true } } } }); if (!item) return NextResponse.json({ error: "Telafi paketi bulunamadı." }, { status: 404 });
  const completed = item.items.every((row) => row.completedAt !== null); const now = new Date();
  await prisma.recoveryPackage.update({ where: { id }, data: { checkpointResponse: parsed.data.response, ...(completed ? { status: "COMPLETED", completedAt: now } : {}), version: { increment: 1 } } });
  await recordPanelProductEvent({ name: "recovery_checkpoint_submitted", properties: { response: parsed.data.response } }, auth.session.role);
  if (completed) await recordPanelProductEvent({ name: "recovery_package_completed", properties: { completionDurationMs: Math.min(MAX_AGE, Math.max(0, now.getTime() - item.lesson.endsAt.getTime())), within72h: now <= item.dueAt, itemCount: item.items.length } }, auth.session.role);
  if (completed) {
    await recordPanelProductEvent({
      name: "student_next_action_completed",
      properties: {
        product: "OD",
        actionKind: "COMPLETE_RECOVERY",
        reasonCode: "MISSED_LESSON",
        ageBand: recoveryAgeBand(item.lesson.endsAt),
        evidenceBand: "NA",
        role: "STUDENT",
      },
    }, auth.session.role);
  }
  return NextResponse.json({ completed });
}
